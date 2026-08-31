/* ============================================================
   SCREENINGS4U LEARNING CENTER — TRAINING SUPPORT
   ============================================================ */

(() => {
  "use strict";

  const S = {
    db: null,
    user: null,
    tickets: [],
    threads: [],
    selected: null,
    tab: "all",
    channel: null,
    loading: false
  };

  const $ = (id) => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bind();

    try {
      let auth = null;

      if (window.LMS?.ready) {
        auth = await window.LMS.ready;
      } else if (
        window.S4UTrainingAuth &&
        typeof window.S4UTrainingAuth.protect === "function"
      ) {
        const state = await window.S4UTrainingAuth.protect();

        if (state?.user) {
          auth = {
            client: window.S4UAuth?.getClient?.(),
            user: state.user,
            profile: state.profile || null
          };
        }
      }

      S.db =
        auth?.client ||
        window.S4UAuth?.getClient?.() ||
        window.getScreenings4uSupabase?.() ||
        window.screenings4uSupabase ||
        window.supabaseClient ||
        null;

      S.user =
        auth?.user ||
        window.S4UTrainingAuthState?.user ||
        null;

      if (!S.db || !S.user) {
        throw new Error("Training session is unavailable.");
      }

      await load(false);
      subscribe();
      openFromUrl();
    } catch (error) {
      fail(error);
      renderLoadFailure(error);
    }
  }

  function bind() {
    document.querySelectorAll("[data-support-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        S.tab = button.dataset.supportTab || "all";

        document.querySelectorAll("[data-support-tab]").forEach((item) => {
          item.classList.toggle("is-active", item === button);
        });

        renderList();
      });
    });

    $("new-ticket-btn")?.addEventListener("click", () => {
      modal("ticket-modal", true);
    });

    $("start-chat-btn")?.addEventListener("click", () => {
      modal("chat-modal", true);
    });

    document.querySelectorAll("[data-close-modal]").forEach((item) => {
      item.addEventListener("click", () => modal("ticket-modal", false));
    });

    document.querySelectorAll("[data-close-chat]").forEach((item) => {
      item.addEventListener("click", () => modal("chat-modal", false));
    });

    $("ticket-form")?.addEventListener("submit", createTicket);
    $("chat-form")?.addEventListener("submit", createChat);
    $("support-reply-form")?.addEventListener("submit", reply);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      modal("ticket-modal", false);
      modal("chat-modal", false);
    });

    window.addEventListener("beforeunload", cleanup);
  }

  async function call(action, payload = {}) {
    if (!S.db) {
      throw new Error("Support service is unavailable.");
    }

    const { data, error } = await S.db.functions.invoke(
      "training-support-actions",
      {
        body: {
          action,
          ...payload
        }
      }
    );

    if (error) {
      const detail =
        error?.context?.body?.error ||
        error?.message ||
        "Unable to contact Training Support.";

      throw new Error(detail);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data || {};
  }

  async function load(keepSelection = true) {
    if (S.loading) return;
    S.loading = true;

    const selected = keepSelection ? S.selected : null;

    try {
      const data = await call("list");

      S.tickets = Array.isArray(data.tickets) ? data.tickets : [];
      S.threads = Array.isArray(data.threads) ? data.threads : [];

      counts();
      renderList();

      if (selected) {
        const item = find(selected.kind, selected.id);

        if (item) {
          select(selected.kind, item, false);
        } else {
          clearSelection();
        }
      }
    } finally {
      S.loading = false;
    }
  }

  function counts() {
    const open = S.tickets.filter((item) => {
      return !["closed", "resolved"].includes(
        String(item.status || "").toLowerCase()
      );
    }).length;

    $("support-open-count").textContent = String(open);
    $("support-message-count").textContent = String(S.threads.length);

    const replies = [...S.tickets, ...S.threads].reduce((count, item) => {
      return count + (Array.isArray(item.messages) ? item.messages.length : 0);
    }, 0);

    $("support-reply-count").textContent = String(replies);
  }

  function renderList() {
    const box = $("support-conversations");
    if (!box) return;

    let rows = [];

    if (S.tab !== "chat") {
      rows.push(
        ...S.tickets.map((item) => ({
          kind: "ticket",
          item
        }))
      );
    }

    if (S.tab !== "tickets") {
      rows.push(
        ...S.threads.map((item) => ({
          kind: "chat",
          item
        }))
      );
    }

    rows.sort((a, b) => {
      return dateValue(b.item.last_message_at) - dateValue(a.item.last_message_at);
    });

    box.innerHTML = "";

    if (!rows.length) {
      box.innerHTML =
        '<div class="lms-support-no-conversations">No training support conversations yet.</div>';
      return;
    }

    rows.forEach(({ kind, item }) => {
      const button = document.createElement("button");
      button.type = "button";

      button.className =
        "lms-support-conversation" +
        (S.selected?.kind === kind && S.selected?.id === item.id
          ? " is-active"
          : "");

      button.innerHTML = `
        <div>
          <span>${kind === "ticket" ? "TICKET" : "LIVE CHAT"}</span>
          <time>${esc(shortDate(item.last_message_at))}</time>
        </div>
        <strong>${esc(item.subject || "Training Support")}</strong>
        <small>${esc(
          kind === "ticket"
            ? item.ticket_number || title(item.status || "open")
            : title(item.status || "open")
        )}</small>
      `;

      button.addEventListener("click", () => {
        select(kind, item);
      });

      box.appendChild(button);
    });
  }

  function select(kind, item, updateUrl = true) {
    S.selected = {
      kind,
      id: item.id
    };

    $("support-thread-empty").hidden = true;
    $("support-thread-view").hidden = false;

    $("support-thread-type").textContent =
      kind === "ticket"
        ? `TRAINING SUPPORT TICKET · ${item.ticket_number || ""}`
        : "TRAINING LIVE SUPPORT";

    $("support-thread-subject").textContent =
      item.subject || "Training Support";

    $("support-thread-status").textContent =
      title(item.status || "open");

    renderMessages(item.messages || []);
    renderList();

    if (updateUrl) {
      const key = kind === "ticket" ? "ticket" : "thread";

      history.replaceState(
        null,
        "",
        `lms-support.html?${key}=${encodeURIComponent(item.id)}`
      );
    }
  }

  function clearSelection() {
    S.selected = null;

    $("support-thread-empty").hidden = false;
    $("support-thread-view").hidden = true;

    renderList();

    if (location.search) {
      history.replaceState(null, "", "lms-support.html");
    }
  }

  function renderMessages(messages) {
    const box = $("support-messages");
    if (!box) return;

    box.innerHTML = "";

    if (!messages.length) {
      box.innerHTML =
        '<div class="lms-support-no-messages">No messages yet.</div>';
      return;
    }

    messages.forEach((message) => {
      const mine =
        message.sender_user_id === S.user.id ||
        ["customer", "learner"].includes(
          String(message.sender_type || "").toLowerCase()
        );

      const row = document.createElement("div");
      row.className =
        "lms-support-message " +
        (mine ? "is-customer" : "is-support");

      row.innerHTML = `
        <div class="lms-support-message-author">
          ${mine ? "You" : "Screenings4u Support"}
        </div>
        <div class="lms-support-message-bubble">${esc(message.body || "")}</div>
        <time>${esc(longDate(message.created_at))}</time>
      `;

      box.appendChild(row);
    });

    box.scrollTop = box.scrollHeight;
  }

  async function createTicket(event) {
    event.preventDefault();

    const submitter =
      event.submitter ||
      event.currentTarget.querySelector('button[type="submit"]');

    busy(submitter, true);

    try {
      const subject = $("ticket-subject").value.trim();
      const body = $("ticket-body").value.trim();

      if (!subject || !body) {
        throw new Error("Subject and message are required.");
      }

      const data = await call("create_ticket", {
        subject,
        category: $("ticket-category").value,
        priority: $("ticket-priority").value,
        body
      });

      modal("ticket-modal", false);
      event.currentTarget.reset();

      await load(false);

      const ticket = find("ticket", data.ticket?.id) || data.ticket;

      if (ticket) {
        select("ticket", ticket);
      }

      toast("Training support ticket created.", "success");
    } catch (error) {
      fail(error);
    } finally {
      busy(submitter, false);
    }
  }

  async function createChat(event) {
    event.preventDefault();

    const submitter =
      event.submitter ||
      event.currentTarget.querySelector('button[type="submit"]');

    busy(submitter, true);

    try {
      const body = $("chat-body").value.trim();

      if (!body) {
        throw new Error("Message is required.");
      }

      const data = await call("create_chat", {
        subject: $("chat-subject").value.trim() || "Training Support",
        body
      });

      modal("chat-modal", false);
      event.currentTarget.reset();
      $("chat-subject").value = "Training Support";

      await load(false);

      const thread = find("chat", data.thread?.id) || data.thread;

      if (thread) {
        select("chat", thread);
      }

      toast("Training support conversation started.", "success");
    } catch (error) {
      fail(error);
    } finally {
      busy(submitter, false);
    }
  }

  async function reply(event) {
    event.preventDefault();

    if (!S.selected) return;

    const body = $("support-reply-body").value.trim();
    if (!body) return;

    const submitter =
      event.submitter ||
      event.currentTarget.querySelector('button[type="submit"]');

    busy(submitter, true);

    try {
      if (S.selected.kind === "ticket") {
        await call("reply_ticket", {
          ticket_id: S.selected.id,
          body
        });
      } else {
        await call("reply_chat", {
          thread_id: S.selected.id,
          body
        });
      }

      $("support-reply-body").value = "";
      await load(true);
    } catch (error) {
      fail(error);
    } finally {
      busy(submitter, false);
    }
  }

  function subscribe() {
    if (!S.db || !S.user) return;

    cleanup();

    S.channel = S.db
      .channel(`training-support-${S.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_ticket_messages"
        },
        () => {
          load(true).catch(fail);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "communication_messages"
        },
        () => {
          load(true).catch(fail);
        }
      )
      .subscribe();
  }

  function cleanup() {
    if (S.channel && S.db) {
      try {
        S.db.removeChannel(S.channel);
      } catch (_) {}
    }

    S.channel = null;
  }

  function openFromUrl() {
    const query = new URLSearchParams(location.search);
    const ticketId = query.get("ticket");
    const threadId = query.get("thread");

    if (ticketId) {
      const item = find("ticket", ticketId);
      if (item) select("ticket", item, false);
      return;
    }

    if (threadId) {
      const item = find("chat", threadId);
      if (item) select("chat", item, false);
    }
  }

  function find(kind, id) {
    const rows = kind === "ticket" ? S.tickets : S.threads;
    return rows.find((item) => item.id === id);
  }

  function modal(id, visible) {
    const element = $(id);
    if (!element) return;

    element.hidden = !visible;

    if (visible) {
      document.body.classList.add("lms-support-modal-open");

      setTimeout(() => {
        element.querySelector("input, textarea, select")?.focus();
      }, 0);
    } else {
      if (
        $("ticket-modal")?.hidden !== false &&
        $("chat-modal")?.hidden !== false
      ) {
        document.body.classList.remove("lms-support-modal-open");
      }
    }
  }

  function busy(button, value) {
    if (!button) return;
    button.disabled = value;
    button.classList.toggle("is-loading", value);
  }

  function title(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function shortDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric"
    }).format(date);
  }

  function longDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function dateValue(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function esc(value) {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
  }

  function toast(message, type = "info") {
    if (window.S4UUI?.toast) {
      return window.S4UUI.toast(message, type);
    }

    if (window.Screenings4uUI?.toast) {
      return window.Screenings4uUI.toast(message, type);
    }

    if (typeof window.showToast === "function") {
      return window.showToast(message, type);
    }

    console[type === "error" ? "error" : "log"](message);
  }

  function fail(error) {
    console.error("[Training Support]", error);

    toast(
      error?.message || "Something went wrong with Training Support.",
      "error"
    );
  }

  function renderLoadFailure(error) {
    const box = $("support-conversations");
    if (!box) return;

    box.innerHTML = `
      <div class="lms-support-no-conversations">
        ${esc(error?.message || "Unable to load Training Support.")}
      </div>
    `;
  }
})();
