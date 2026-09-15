(() => {
  "use strict";

  const state = {
    db: null,
    orders: [],
    filter: "all",
    search: ""
  };

  const $ = (id) => document.getElementById(id);

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  document.addEventListener("DOMContentLoaded", init);

  async function getClient() {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        if (typeof window.getScreenings4uSupabase === "function") {
          const client = window.getScreenings4uSupabase();
          if (client?.functions) return client;
        }
        if (window.screenings4uSupabase?.functions) return window.screenings4uSupabase;
        if (window.supabaseClient?.functions) return window.supabaseClient;
      } catch (_) {}
      await new Promise((resolve) => setTimeout(resolve, 75));
    }
    throw new Error("Unable to connect to the Learning Center.");
  }

  async function invoke(body) {
    const { data, error } = await state.db.functions.invoke("customer-orders-actions", { body });
    if (error) {
      let message = error.message || "Unable to load LMS purchases.";
      try {
        const detail = await error.context?.clone?.().json();
        message = detail?.error || message;
      } catch (_) {}
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data || {};
  }

  async function init() {
    bindControls();

    try {
      state.db = await getClient();
      const data = await invoke({ action: "list" });

      // The Edge Function now returns LMS-only orders. Keep this second
      // filter as a defensive guard for older cached function versions.
      state.orders = (data.orders || [])
        .map(normalizeOrder)
        .filter((order) => order.order_items.length > 0 || isTrainingOrder(order));

      updateStats();
      render();
    } catch (error) {
      showMessage(error?.message || "Unable to load your LMS purchases.");
      $("ordersList").innerHTML = `
        <div class="orders-empty">
          <div class="orders-empty-icon">!</div>
          <h3>Purchase history unavailable</h3>
          <p>We could not load your Learning Center purchases. Refresh the page and try again.</p>
        </div>`;
    }
  }

  function bindControls() {
    $("ordersSearch")?.addEventListener("input", (event) => {
      state.search = String(event.target.value || "").trim().toLowerCase();
      render();
    });

    document.querySelectorAll("[data-orders-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.ordersFilter || "all";
        document.querySelectorAll("[data-orders-filter]").forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });
        render();
      });
    });
  }

  function isTrainingOrder(order) {
    return String(order?.fulfillment_type || "").toLowerCase() === "training";
  }

  function isLmsItem(item, order) {
    if (!item) return false;
    if (item.training_product_id || item.lms_product?.id || item.training_product?.id) return true;

    const productType = String(item.services?.product_type || "").toLowerCase();
    if (productType === "training" || productType === "course") return true;

    const metadata = item.metadata || {};
    if (
      metadata.course_id ||
      metadata.course_name ||
      metadata.course_title ||
      metadata.training_product_id ||
      metadata.lms_product_id ||
      metadata.enrollment_id ||
      metadata.product_kind === "course" ||
      metadata.product_kind === "group" ||
      metadata.product_kind === "extension" ||
      metadata.product_kind === "supplies"
    ) return true;

    const serviceName = String(item.services?.name || metadata.name || "").toLowerCase();
    if (isTrainingOrder(order) && (!item.services || /training|course|extension|seat|supplies/.test(serviceName))) return true;

    return false;
  }

  function normalizeOrder(order) {
    const items = Array.isArray(order?.order_items) ? order.order_items : [];
    const lmsItems = items.filter((item) => isLmsItem(item, order));
    return { ...order, order_items: lmsItems };
  }

  function productInfo(item) {
    const product = item.lms_product || item.training_product || null;
    const metadata = item.metadata || {};
    const service = item.services || {};
    const name =
      product?.name ||
      product?.short_name ||
      service.name ||
      metadata.course_name ||
      metadata.course_title ||
      metadata.name ||
      "Learning Center purchase";

    const lowerName = String(name).toLowerCase();
    let kind = String(product?.product_kind || metadata.product_kind || "").toLowerCase();
    if (!kind) {
      if (/extension/.test(lowerName)) kind = "extension";
      else if (/suppl/.test(lowerName)) kind = "supplies";
      else if (/group|seat/.test(lowerName)) kind = "group";
      else if (String(service.product_type || "").toLowerCase() === "training" ||
               String(service.product_type || "").toLowerCase() === "course" ||
               metadata.course_id || metadata.course_name || metadata.course_title) kind = "course";
      else kind = "training";
    }

    return { kind, name };
  }

  function itemCategory(item) {
    const kind = productInfo(item).kind;
    return kind === "course" ? "course" : "other";
  }

  function updateStats() {
    const items = state.orders.flatMap((order) => order.order_items || []);
    const courseItems = items.filter((item) => itemCategory(item) === "course");
    const otherItems = items.filter((item) => itemCategory(item) !== "course");

    $("ordersCount").textContent = String(state.orders.length);
    $("courseItemCount").textContent = String(courseItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0));
    $("otherItemCount").textContent = String(otherItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0));
  }

  function money(value, currency = "USD") {
    const amount = Number(value || 0);
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: String(currency || "USD").toUpperCase()
      }).format(amount);
    } catch (_) {
      return `$${amount.toFixed(2)}`;
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function statusLabel(order) {
    const value = String(order.payment_status || order.status || "paid").replaceAll("_", " ");
    return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function orderLmsTotal(order) {
    if (order.lms_total != null) return Number(order.lms_total || 0);
    const items = order.order_items || [];
    if (!items.length) return Number(order.total || 0);
    return items.reduce((sum, item) => sum + Number(item.line_total ?? (Number(item.unit_price || 0) * Number(item.quantity || 1))), 0);
  }

  function visibleOrders() {
    return state.orders.filter((order) => {
      const items = order.order_items || [];
      const categories = new Set(items.map(itemCategory));
      if (state.filter === "course" && !categories.has("course")) return false;
      if (state.filter === "other" && !categories.has("other")) return false;

      if (!state.search) return true;
      const haystack = [
        order.order_number,
        order.tracking_number,
        ...items.flatMap((item) => {
          const info = productInfo(item);
          return [info.name, info.kind, item.services?.sku];
        })
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(state.search);
    });
  }

  function render() {
    const list = $("ordersList");
    if (!list) return;

    if (!state.orders.length) {
      list.innerHTML = `
        <div class="orders-empty">
          <div class="orders-empty-icon">▶</div>
          <h3>No LMS purchases yet</h3>
          <p>Courses and other Learning Center purchases tied to your account will appear here.</p>
          <a href="lms-courses.html">Browse Courses</a>
        </div>`;
      return;
    }

    const orders = visibleOrders();
    if (!orders.length) {
      list.innerHTML = `<div class="orders-no-match">No LMS purchases match this filter.</div>`;
      return;
    }

    list.innerHTML = orders.map(renderOrder).join("");
    document.querySelectorAll("[data-receipt]").forEach((button) => {
      button.addEventListener("click", () => openReceipt(button, button.dataset.receipt));
    });
  }

  function renderOrder(order) {
    const items = order.order_items || [];
    const courseCount = items.filter((item) => itemCategory(item) === "course").length;
    const otherCount = items.length - courseCount;
    const title = items.length === 1
      ? productInfo(items[0]).name
      : `${items.length} Learning Center item${items.length === 1 ? "" : "s"}`;

    const subtitleParts = [];
    if (courseCount) subtitleParts.push(`${courseCount} course${courseCount === 1 ? "" : "s"}`);
    if (otherCount) subtitleParts.push(`${otherCount} other LMS item${otherCount === 1 ? "" : "s"}`);

    const payment = String(order.payment_method || order.payment_provider || "Paid").replaceAll("_", " ");
    const statusClass = String(order.payment_status || order.status || "paid").toLowerCase();

    return `
      <article class="order-card">
        <div class="order-summary-row">
          <div class="order-main">
            <div class="order-meta-line">
              <span class="order-number">${esc(order.order_number || order.tracking_number || `Order ${String(order.id || "").slice(0, 8)}`)}</span>
              <span class="order-date">Purchased ${esc(formatDate(order.created_at))}</span>
              <span class="order-status ${esc(statusClass)}">${esc(statusLabel(order))}</span>
            </div>
            <h3>${esc(title)}</h3>
            <p class="order-card-subtitle">${esc(subtitleParts.join(" · ") || "Learning Center purchase")}</p>
            <div class="order-items">
              ${items.map((item) => renderItem(item, order)).join("") || renderFallbackItem(order)}
            </div>
          </div>

          <aside class="order-side">
            <div class="order-financials">
              <div><span>Payment</span><strong>${esc(payment)}</strong></div>
              <div><span>Tracking</span><strong>${esc(order.tracking_number || "—")}</strong></div>
              <div class="order-total"><span>LMS total</span><strong>${money(orderLmsTotal(order), order.currency)}</strong></div>
            </div>
            <div class="order-actions">
              ${courseCount ? '<a class="learning-button" href="lms-my-courses.html">My Courses</a>' : ''}
              <button type="button" class="receipt-button" data-receipt="${esc(order.id)}">View Receipt</button>
            </div>
          </aside>
        </div>
      </article>`;
  }

  function renderItem(item, order) {
    const info = productInfo(item);
    const category = itemCategory(item);
    const quantity = Number(item.quantity || 1);
    const total = item.line_total ?? (Number(item.unit_price || 0) * quantity);
    const kindLabel = labelForKind(info.kind);

    return `
      <div class="order-item">
        <div class="order-item-copy">
          <span class="order-item-type ${category === "course" ? "" : "other"}">${category === "course" ? "▶" : "＋"}</span>
          <div>
            <strong>${esc(info.name)}</strong>
            <small>${esc(kindLabel)}${quantity > 1 ? ` · Qty ${quantity}` : ""}</small>
          </div>
        </div>
        <span class="order-price">${money(total, order.currency)}</span>
      </div>`;
  }

  function renderFallbackItem(order) {
    return `
      <div class="order-item">
        <div class="order-item-copy">
          <span class="order-item-type other">＋</span>
          <div><strong>Learning Center purchase</strong><small>Training order</small></div>
        </div>
        <span class="order-price">${money(order.total, order.currency)}</span>
      </div>`;
  }

  function labelForKind(kind) {
    const labels = {
      course: "Course",
      group: "Group training seats",
      extension: "Course access extension",
      supplies: "Training supplies",
      training: "Training purchase"
    };
    return labels[kind] || "LMS purchase";
  }

  async function openReceipt(button, orderId) {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Opening…";

    try {
      const data = await invoke({ action: "download_receipt", order_id: orderId });
      if (!data.url) throw new Error("Receipt is not available for this purchase.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      showMessage(error?.message || "Unable to open this receipt.");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function showMessage(message) {
    const element = $("ordersMessage");
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
  }
})();
