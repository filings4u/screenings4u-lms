(() => {
  "use strict";

  const EDGE_FUNCTION = "training-support-actions";
  const $ = (id) => document.getElementById(id);

  let session = null;
  let conversations = [];
  let activeConversation = null;
  let activeTab = "all";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function formatDate(value, includeTime = false) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const options = includeTime
      ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", year: "numeric" };
    return date.toLocaleString(undefined, options);
  }

  function readable(value, fallback = "Open") {
    const text = String(value || fallback).replaceAll("_", " ");
    return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function statusClass(status) {
    const normalized = String(status || "open").toLowerCase();
    if (["closed", "resolved", "complete", "completed"].includes(normalized)) return "is-closed";
    if (["pending", "waiting", "on_hold", "on hold"].includes(normalized)) return "is-pending";
    return "is-open";
  }

  function isClosed(status) {
    return ["closed", "resolved", "complete", "completed"].includes(String(status || "").toLowerCase());
  }

  function showMessage(message) {
    const box = $("supportMessage");
    if (!box) return;
    box.hidden = !message;
    box.textContent = message || "";
  }

  function showError(title, error) {
    const message = error?.message || String(error || "Unable to complete this request.");
    showMessage(message);
    if (window.S4UUI?.modal) {
      window.S4UUI.modal({
        title,
        message,
        type: "error",
        confirmText: "Close"
      });
    }
  }

  async function call(body) {
    if (!session?.access_token) throw new Error("Your training session is unavailable. Please sign in again.");

    const response = await fetch(
      `${window.SCREENINGS4U_SUPABASE_URL}/functions/v1/${EDGE_FUNCTION}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: window.SCREENINGS4U_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body)
      }
    );

    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}

    if (!response.ok) {
      throw new Error(data.error || `Support request failed (${response.status}).`);
    }

    return data;
  }

  function normalizeData(data) {
    const tickets = (Array.isArray(data.tickets) ? data.tickets : []).map((ticket) => ({
      ...ticket,
      kind: "ticket",
      label: "Support Ticket",
      sortDate: ticket.last_message_at || ticket.updated_at || ticket.created_at,
      messages: Array.isArray(ticket.messages) ? ticket.messages : []
    }));

    const threads = (Array.isArray(data.threads) ? data.threads : []).map((thread) => ({
      ...thread,
      kind: "chat",
      label: "Live Chat",
      sortDate: thread.last_message_at || thread.updated_at || thread.created_at,
      messages: Array.isArray(thread.messages) ? thread.messages : []
    }));

    return [...tickets, ...threads].sort((a, b) => {
      const aTime = new Date(a.sortDate || 0).getTime() || 0;
      const bTime = new Date(b.sortDate || 0).getTime() || 0;
      return bTime - aTime;
    });
  }

  function updateSummary() {
    const tickets = conversations.filter((item) => item.kind === "ticket");
    const openTickets = tickets.filter((item) => !isClosed(item.status)).length;
    const supportReplies = conversations.reduce((total, item) => {
      return total + item.messages.filter((message) => String(message.sender_type || "").toLowerCase() !== "customer").length;
    }, 0);

    if ($("support-open-count")) $("support-open-count").textContent = String(openTickets);
    if ($("support-message-count")) $("support-message-count").textContent = String(conversations.length);
    if ($("support-reply-count")) $("support-reply-count").textContent = String(supportReplies);
  }

  function conversationSearchText(item) {
    return [
      item.subject,
      item.ticket_number,
      item.status,
      item.priority,
      item.category,
      item.label,
      ...(item.messages || []).map((message) => message.body)
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function visibleConversations() {
    const query = String($("supportSearch")?.value || "").trim().toLowerCase();
    return conversations.filter((item) => {
      const tabMatch = activeTab === "all" || (activeTab === "tickets" && item.kind === "ticket") || (activeTab === "chat" && item.kind === "chat");
      const searchMatch = !query || conversationSearchText(item).includes(query);
      return tabMatch && searchMatch;
    });
  }

  function messagePreview(item) {
    const last = item.messages?.[item.messages.length - 1];
    return String(last?.body || "No messages yet.").replace(/\s+/g, " ").trim();
  }

  function renderConversations() {
    const target = $("support-conversations");
    if (!target) return;

    const items = visibleConversations();
    if (!items.length) {
      target.innerHTML = `<div class="support-no-conversations">No support conversations match this view.</div>`;
      return;
    }

    target.innerHTML = items.map((item) => {
      const active = activeConversation?.id === item.id && activeConversation?.kind === item.kind;
      return `
        <button class="support-conversation${active ? " is-active" : ""}" data-kind="${escapeHtml(item.kind)}" data-id="${escapeHtml(item.id)}" type="button">
          <span class="support-conversation-top">
            <span class="support-kind">${escapeHtml(item.label)}</span>
            <time>${escapeHtml(formatDate(item.sortDate))}</time>
          </span>
          <strong>${escapeHtml(item.subject || "Training Support")}</strong>
          <span class="support-conversation-preview">${escapeHtml(messagePreview(item))}</span>
          <span class="support-conversation-footer">
            <span class="support-ticket-number">${escapeHtml(item.ticket_number || readable(item.priority || "normal"))}</span>
            <span class="support-mini-status ${statusClass(item.status)}">${escapeHtml(readable(item.status))}</span>
          </span>
        </button>`;
    }).join("");

    target.querySelectorAll(".support-conversation").forEach((button) => {
      button.addEventListener("click", () => selectConversation(button.dataset.kind, button.dataset.id));
    });
  }

  function renderMessages(item) {
    const target = $("support-messages");
    if (!target) return;

    if (!item.messages.length) {
      target.innerHTML = `<div class="support-no-conversations">There are no messages in this conversation yet.</div>`;
      return;
    }

    target.innerHTML = item.messages.map((message) => {
      const customer = String(message.sender_type || "").toLowerCase() === "customer";
      const sender = customer ? "You" : "screenings4u Support";
      return `
        <div class="support-message-row${customer ? " is-customer" : ""}">
          <div class="support-message-bubble">
            <p>${escapeHtml(message.body || "")}</p>
            <div class="support-message-meta">
              <span>${escapeHtml(sender)}</span>
              <time>${escapeHtml(formatDate(message.created_at, true))}</time>
            </div>
          </div>
        </div>`;
    }).join("");

    target.scrollTop = target.scrollHeight;
  }

  function renderThread(item) {
    const empty = $("support-thread-empty");
    const view = $("support-thread-view");
    if (!empty || !view) return;

    if (!item) {
      empty.hidden = false;
      view.hidden = true;
      return;
    }

    empty.hidden = true;
    view.hidden = false;

    $("support-thread-type").textContent = item.kind === "ticket" ? "TRAINING SUPPORT TICKET" : "LIVE SUPPORT";
    $("support-thread-subject").textContent = item.subject || "Training Support";
    $("support-thread-status").textContent = readable(item.status);
    $("support-thread-status").className = `support-status-badge ${statusClass(item.status)}`;

    const detail = item.kind === "ticket"
      ? [item.ticket_number, readable(item.category || "training"), `${readable(item.priority || "normal")} priority`].filter(Boolean).join(" · ")
      : [`Started ${formatDate(item.created_at)}`, `${readable(item.priority || "normal")} priority`].join(" · ");
    $("support-thread-detail").textContent = detail;

    renderMessages(item);
  }

  function selectConversation(kind, id) {
    activeConversation = conversations.find((item) => item.kind === kind && item.id === id) || null;
    renderConversations();
    renderThread(activeConversation);
  }

  async function loadSupport(preferred = null) {
    showMessage("");
    const data = await call({ action: "list" });
    conversations = normalizeData(data);
    updateSummary();

    let next = null;
    if (preferred) {
      next = conversations.find((item) => item.kind === preferred.kind && item.id === preferred.id) || null;
    }
    if (!next && activeConversation) {
      next = conversations.find((item) => item.kind === activeConversation.kind && item.id === activeConversation.id) || null;
    }
    if (!next) next = conversations[0] || null;

    activeConversation = next;
    renderConversations();
    renderThread(activeConversation);
  }

  function openModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add("support-modal-open");
    requestAnimationFrame(() => modal.querySelector("input,textarea,select")?.focus());
  }

  function closeModal(id) {
    const modal = $(id);
    if (!modal) return;
    modal.hidden = true;
    if (!document.querySelector(".support-modal:not([hidden])")) {
      document.body.classList.remove("support-modal-open");
    }
  }

  function setupModals() {
    $("new-ticket-btn")?.addEventListener("click", () => openModal("ticket-modal"));
    $("start-chat-btn")?.addEventListener("click", () => openModal("chat-modal"));

    document.querySelectorAll("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", () => closeModal("ticket-modal"));
    });
    document.querySelectorAll("[data-close-chat]").forEach((button) => {
      button.addEventListener("click", () => closeModal("chat-modal"));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeModal("ticket-modal");
      closeModal("chat-modal");
    });
  }

  function setupFilters() {
    document.querySelectorAll("[data-support-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        activeTab = button.dataset.supportTab || "all";
        document.querySelectorAll("[data-support-tab]").forEach((tab) => {
          const selected = tab === button;
          tab.classList.toggle("is-active", selected);
          tab.setAttribute("aria-selected", selected ? "true" : "false");
        });
        renderConversations();
      });
    });

    $("supportSearch")?.addEventListener("input", renderConversations);
  }

  async function handleTicketSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const original = button?.textContent || "Submit Ticket";

    try {
      if (button) { button.disabled = true; button.textContent = "Submitting…"; }
      const data = await call({
        action: "create_ticket",
        subject: $("ticket-subject")?.value.trim(),
        category: $("ticket-category")?.value || "training",
        priority: $("ticket-priority")?.value || "normal",
        body: $("ticket-body")?.value.trim()
      });

      closeModal("ticket-modal");
      form.reset();
      await loadSupport(data.ticket?.id ? { kind: "ticket", id: data.ticket.id } : null);
    } catch (error) {
      showError("Support Ticket", error);
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  async function handleChatSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const original = button?.textContent || "Start Chat";

    try {
      if (button) { button.disabled = true; button.textContent = "Starting…"; }
      const data = await call({
        action: "create_chat",
        subject: $("chat-subject")?.value.trim() || "Training Support",
        body: $("chat-body")?.value.trim()
      });

      closeModal("chat-modal");
      form.reset();
      if ($("chat-subject")) $("chat-subject").value = "Training Support";
      await loadSupport(data.thread?.id ? { kind: "chat", id: data.thread.id } : null);
    } catch (error) {
      showError("Live Support", error);
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  async function handleReply(event) {
    event.preventDefault();
    if (!activeConversation) return;

    const body = $("support-reply-body")?.value.trim() || "";
    if (!body) return;

    const button = event.currentTarget.querySelector('button[type="submit"]');
    const original = button?.textContent || "Send Reply";
    const current = { kind: activeConversation.kind, id: activeConversation.id };

    try {
      if (button) { button.disabled = true; button.textContent = "Sending…"; }
      await call(activeConversation.kind === "ticket"
        ? { action: "reply_ticket", ticket_id: activeConversation.id, body }
        : { action: "reply_chat", thread_id: activeConversation.id, body });

      $("support-reply-body").value = "";
      await loadSupport(current);
    } catch (error) {
      showError("Send Reply", error);
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  async function init() {
    try {
      setupModals();
      setupFilters();
      $("ticket-form")?.addEventListener("submit", handleTicketSubmit);
      $("chat-form")?.addEventListener("submit", handleChatSubmit);
      $("support-reply-form")?.addEventListener("submit", handleReply);

      const state = await window.S4UTrainingReady;
      if (!state?.session?.access_token) return;
      session = state.session;
      await loadSupport();
    } catch (error) {
      console.error("[LMS support]", error);
      showError("Training Support", error);
      const target = $("support-conversations");
      if (target) target.innerHTML = `<div class="support-no-conversations">Support could not be loaded. Please try again.</div>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
