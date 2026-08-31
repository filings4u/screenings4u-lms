/* ============================================================
   SCREENINGS4U LMS — LEARNER NOTIFICATIONS
   Matches lms-notifications.html and the current Supabase schema.
   ============================================================ */

(function () {
  "use strict";

  let db = null;
  let user = null;
  let rows = [];
  let readIds = new Set();
  let summaryFilter = "all";
  let typeFilter = "all";
  let bound = false;

  document.addEventListener("DOMContentLoaded", function () {
    init().catch(fail);
  });

  async function init() {
    setLoading(true);

    if (!window.LMS?.ready) {
      throw new Error("Shared LMS authentication is unavailable.");
    }

    const state = await window.LMS.ready;
    db = state?.client || null;
    user = state?.user || null;

    if (!db || !user?.id) {
      throw new Error("No authenticated Training user is available.");
    }

    if (!bound) {
      bind();
      bound = true;
    }

    await loadNotifications();
    render();
  }

  async function loadNotifications() {
    const notificationResult = await db
      .from("notifications")
      .select("id,recipient_user_id,channel,status,subject,body,metadata,scheduled_for,sent_at,delivered_at,created_at")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (notificationResult.error) {
      throw notificationResult.error;
    }

    rows = notificationResult.data || [];

    const readResult = await db
      .from("customer_notification_reads")
      .select("notification_id,read_at")
      .eq("user_id", user.id);

    if (readResult.error) {
      throw readResult.error;
    }

    readIds = new Set(
      (readResult.data || [])
        .map(function (row) { return row.notification_id; })
        .filter(Boolean)
    );
  }

  function bind() {
    document
      .querySelectorAll("[data-notification-filter]")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          document
            .querySelectorAll("[data-notification-filter]")
            .forEach(function (item) {
              item.classList.remove("active");
            });

          button.classList.add("active");
          summaryFilter = button.dataset.notificationFilter || "all";
          render();
        });
      });

    document
      .getElementById("notifications-type-filter")
      ?.addEventListener("change", function (event) {
        typeFilter = event.target.value || "all";
        render();
      });

    document
      .getElementById("mark-all-read")
      ?.addEventListener("click", function () {
        markAll().catch(fail);
      });

    document
      .getElementById("notifications-refresh")
      ?.addEventListener("click", function () {
        refresh().catch(fail);
      });
  }

  async function refresh() {
    setLoading(true);
    await loadNotifications();
    render();
  }

  function notificationType(notification) {
    const metadata = normalizeMetadata(notification.metadata);

    const source = [
      metadata.type,
      metadata.notification_type,
      metadata.category,
      metadata.event,
      notification.channel,
      notification.subject,
      notification.body
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (source.includes("certificate")) return "certificates";
    if (source.includes("assessment") || source.includes("quiz") || source.includes("exam")) return "assessments";
    if (source.includes("support") || source.includes("message") || source.includes("conversation")) return "support";
    if (source.includes("account") || source.includes("profile") || source.includes("password") || source.includes("login")) return "account";

    return "courses";
  }

  function normalizeMetadata(value) {
    if (!value) return {};
    if (typeof value === "object") return value;

    try {
      return JSON.parse(value);
    } catch (_) {
      return {};
    }
  }

  function isRead(notification) {
    return readIds.has(notification.id);
  }

  function getVisibleRows() {
    return rows.filter(function (notification) {
      const currentType = notificationType(notification);

      const passesSummary =
        summaryFilter === "all" ||
        (summaryFilter === "unread" && !isRead(notification)) ||
        currentType === summaryFilter;

      const passesType =
        typeFilter === "all" ||
        currentType === typeFilter;

      return passesSummary && passesType;
    });
  }

  function render() {
    const visible = getVisibleRows();
    const list = document.getElementById("notifications-list");
    const empty = document.getElementById("notifications-empty");

    if (!list || !empty) {
      throw new Error("Notifications page markup is incomplete.");
    }

    updateCounts();

    list.innerHTML = visible.map(card).join("");

    list
      .querySelectorAll("[data-mark-read]")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          markRead(button.dataset.id).catch(fail);
        });
      });

    const hasRows = visible.length > 0;
    list.hidden = !hasRows;
    empty.hidden = hasRows;

    const resultCount = document.getElementById("notifications-result-count");
    if (resultCount) {
      resultCount.textContent =
        "Showing " +
        visible.length +
        " notification" +
        (visible.length === 1 ? "" : "s") +
        ".";
    }

    const markAllButton = document.getElementById("mark-all-read");
    if (markAllButton) {
      markAllButton.disabled = rows.every(isRead);
    }

    const topDot = document.querySelector(".lms-notification-dot");
    if (topDot) {
      topDot.style.display = rows.some(function (row) { return !isRead(row); }) ? "" : "none";
    }

    setLoading(false);
  }

  function updateCounts() {
    const unread = rows.filter(function (row) { return !isRead(row); }).length;
    const courses = rows.filter(function (row) { return notificationType(row) === "courses"; }).length;
    const account = rows.filter(function (row) { return notificationType(row) === "account"; }).length;

    setText("notifications-total", rows.length);
    setText("notifications-unread", unread);
    setText("notifications-courses", courses);
    setText("notifications-account", account);
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  function card(notification) {
    const currentType = notificationType(notification);
    const unread = !isRead(notification);
    const link = target(notification, currentType);
    const title = notification.subject || "Learning update";
    const message = notification.body || "";

    return `
      <article class="notification-item${unread ? " unread" : ""}" data-type="${esc(currentType)}">
        <div class="notification-icon ${iconClass(currentType)}">
          ${icon(currentType)}
        </div>

        <div class="notification-body">
          <div class="notification-topline">
            <div class="notification-title-row">
              <h2 class="notification-title">${esc(title)}</h2>
              ${unread ? '<span class="unread-dot" aria-label="Unread"></span>' : ""}
            </div>
            <span class="notification-time">${esc(when(notification.created_at || notification.sent_at))}</span>
          </div>

          <p class="notification-message">${esc(message)}</p>

          <div class="notification-actions">
            ${link ? `<a href="${esc(link)}" class="notification-link">View</a>` : ""}
            ${unread ? `<button type="button" class="notification-action mark-read" data-mark-read data-id="${esc(notification.id)}">Mark as Read</button>` : ""}
          </div>
        </div>
      </article>
    `;
  }

  function iconClass(type) {
    if (type === "certificates") return "certificate";
    if (type === "assessments") return "assessment";
    if (type === "support") return "support";
    if (type === "account") return "account";
    return "course";
  }

  function target(notification, type) {
    const metadata = normalizeMetadata(notification.metadata);
    const supplied = metadata.url || metadata.href || metadata.link;

    if (typeof supplied === "string" && supplied.trim()) {
      return supplied.trim();
    }

    if (type === "certificates") return "lms-certificates.html";
    if (type === "support") return "lms-support.html";
    if (type === "account") return "lms-account.html";

    return "lms-my-courses.html";
  }

  async function markRead(id) {
    if (!id || readIds.has(id)) return;

    const result = await db
      .from("customer_notification_reads")
      .upsert(
        {
          notification_id: id,
          user_id: user.id,
          read_at: new Date().toISOString()
        },
        {
          onConflict: "notification_id,user_id"
        }
      );

    if (result.error) throw result.error;

    readIds.add(id);
    render();
  }

  async function markAll() {
    const unread = rows.filter(function (row) { return !isRead(row); });
    if (!unread.length) return;

    const now = new Date().toISOString();
    const data = unread.map(function (notification) {
      return {
        notification_id: notification.id,
        user_id: user.id,
        read_at: now
      };
    });

    const result = await db
      .from("customer_notification_reads")
      .upsert(data, {
        onConflict: "notification_id,user_id"
      });

    if (result.error) throw result.error;

    unread.forEach(function (notification) {
      readIds.add(notification.id);
    });

    render();
  }

  function setLoading(show) {
    const loading = document.getElementById("notifications-loading");
    const list = document.getElementById("notifications-list");
    const empty = document.getElementById("notifications-empty");

    if (loading) loading.hidden = !show;

    if (show) {
      if (list) list.hidden = true;
      if (empty) empty.hidden = true;
    }
  }

  function fail(error) {
    console.error("[LMS Notifications]", error);
    setLoading(false);

    const list = document.getElementById("notifications-list");
    const empty = document.getElementById("notifications-empty");
    const resultCount = document.getElementById("notifications-result-count");

    if (list) list.hidden = true;
    if (empty) empty.hidden = false;

    if (resultCount) {
      resultCount.textContent =
        error?.message || "Unable to load notifications.";
    }
  }

  function when(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const day = 86400000;

    if (
      diff >= 0 &&
      diff < day &&
      date.toDateString() === now.toDateString()
    ) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit"
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  }

  function icon(type) {
    if (type === "certificates") {
      return '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"></circle><path d="m8.5 12.5-1 8L12 18l4.5 2.5-1-8"></path></svg>';
    }

    if (type === "assessments") {
      return '<svg viewBox="0 0 24 24"><path d="M9 11h6"></path><path d="M9 15h4"></path><path d="M8 3h8l2 2v16H6V5z"></path></svg>';
    }

    if (type === "support") {
      return '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"></path></svg>';
    }

    if (type === "account") {
      return '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path></svg>';
    }

    return '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"></path><path d="M4 5.5v16"></path></svg>';
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>\'\"]/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
      }[character];
    });
  }
})();
