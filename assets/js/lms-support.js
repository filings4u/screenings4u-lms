/* SOURCE: assets/js/ui.js */
/* ============================================================
   screenings4u — CORE UI
   Replaces browser alert()/confirm() for application actions.
   ============================================================ */

(() => {
  "use strict";

  let activeModal = null;
  let activeResolve = null;

  function ensureRoot() {
    let root = document.getElementById("s4uModalRoot");

    if (!root) {
      root = document.createElement("div");
      root.id = "s4uModalRoot";
      root.className = "s4u-modal-root";
      document.body.appendChild(root);
    }

    return root;
  }

  function close(result = false) {
    if (!activeModal) return;
    activeModal.remove();
    activeModal = null;
    document.body.classList.remove("s4u-modal-open");
    if (activeResolve) {
      const resolve = activeResolve;
      activeResolve = null;
      resolve(result);
    }
  }

  function modal({
    title = "screenings4u",
    message = "",
    type = "info",
    confirmText = "Continue",
    cancelText = "Cancel",
    showCancel = false,
    onConfirm = null
  } = {}) {
    close();

    const root = ensureRoot();
    const wrapper = document.createElement("div");

    wrapper.className = `s4u-modal ${type}`;
    wrapper.setAttribute("role", "dialog");
    wrapper.setAttribute("aria-modal", "true");

    wrapper.innerHTML = `
      <div class="s4u-modal-backdrop" data-modal-close></div>
      <section class="s4u-modal-panel">
        <div class="s4u-modal-brand">
          <img class="s4u-modal-brand-logo" src="https://rgsrubdtljyxmnihwlah.supabase.co/storage/v1/object/public/branding/logo.png" alt="screenings4u">
        </div>
        <div class="s4u-modal-body">
          <div class="s4u-modal-icon" aria-hidden="true"></div>
          <div class="s4u-modal-content">
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(message)}</p>
          </div>
          <div class="s4u-modal-actions">
            ${showCancel ? `<button class="s4u-modal-button secondary" type="button" data-modal-cancel>${escapeHtml(cancelText)}</button>` : ""}
            <button class="s4u-modal-button primary" type="button" data-modal-confirm>${escapeHtml(confirmText)}</button>
          </div>
        </div>
      </section>
    `;

    root.appendChild(wrapper);
    activeModal = wrapper;
    document.body.classList.add("s4u-modal-open");

    wrapper
      .querySelector("[data-modal-close]")
      ?.addEventListener("click", () => close(false));

    wrapper
      .querySelector("[data-modal-cancel]")
      ?.addEventListener("click", () => close(false));

    wrapper
      .querySelector("[data-modal-confirm]")
      ?.addEventListener("click", async () => {
        const button =
          wrapper.querySelector("[data-modal-confirm]");

        button.disabled = true;

        try {
          if (typeof onConfirm === "function") {
            await onConfirm();
          }

          close(true);
        } catch (error) {
          button.disabled = false;

          toast(
            error?.message ||
              "Unable to complete this action.",
            "error"
          );
        }
      });

    const promise = new Promise(resolve => { activeResolve = resolve; });
    promise.close = () => close(false);
    return promise;
  }

  function toast(
    message,
    type = "info"
  ) {
    let root =
      document.getElementById(
        "s4uToastRoot"
      );

    if (!root) {
      root =
        document.createElement("div");

      root.id = "s4uToastRoot";
      root.className =
        "s4u-toast-root";

      document.body.appendChild(
        root
      );
    }

    const item =
      document.createElement("div");

    item.className =
      `s4u-toast ${type}`;

    item.textContent =
      message;

    root.appendChild(
      item
    );

    requestAnimationFrame(
      () =>
        item.classList.add(
          "show"
        )
    );

    setTimeout(() => {
      item.classList.remove(
        "show"
      );

      setTimeout(
        () => item.remove(),
        180
      );
    }, 4200);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formModal({
    title = "screenings4u",
    message = "",
    fields = [],
    confirmText = "Save",
    cancelText = "Cancel",
    onSubmit = null
  } = {}) {
    close();

    const root = ensureRoot();
    const wrapper =
      document.createElement("div");

    wrapper.className =
      "s4u-modal info";

    wrapper.setAttribute(
      "role",
      "dialog"
    );

    wrapper.setAttribute(
      "aria-modal",
      "true"
    );

    wrapper.innerHTML = `
      <div class="s4u-modal-backdrop" data-modal-close></div>
      <section class="s4u-modal-panel s4u-form-modal-panel">
        <div class="s4u-modal-brand">
          <img class="s4u-modal-brand-logo" src="https://rgsrubdtljyxmnihwlah.supabase.co/storage/v1/object/public/branding/logo.png" alt="screenings4u">
        </div>
        <div class="s4u-modal-body">
          <div class="s4u-modal-content">
            <h2>${escapeHtml(title)}</h2>
            ${message ? `<p>${escapeHtml(message)}</p>` : ""}
            <form class="s4u-form-modal-form">
            ${fields.map((field) => `
              <label class="s4u-form-modal-field">
                <span>${escapeHtml(field.label || field.name)}</span>
                ${field.type === "textarea"
                  ? `<textarea name="${escapeHtml(field.name)}" rows="4">${escapeHtml(field.value ?? "")}</textarea>`
                  : field.type === "select"
                    ? `<select name="${escapeHtml(field.name)}">${(field.options || []).map(o => `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(field.value) ? "selected" : ""}>${escapeHtml(o.label)}</option>`).join("")}</select>`
                    : `<input type="${escapeHtml(field.type || "text")}" name="${escapeHtml(field.name)}" value="${escapeHtml(field.value ?? "")}" ${field.required ? "required" : ""} ${field.min !== undefined ? `min="${escapeHtml(field.min)}"` : ""} ${field.max !== undefined ? `max="${escapeHtml(field.max)}"` : ""}>`}
              </label>
            `).join("")}
            <div class="s4u-modal-actions">
              <button class="s4u-modal-button secondary" type="button" data-modal-cancel>${escapeHtml(cancelText)}</button>
              <button class="s4u-modal-button primary" type="submit">${escapeHtml(confirmText)}</button>
            </div>
          </form>
          </div>
        </div>
      </section>
    `;

    root.appendChild(
      wrapper
    );

    activeModal = wrapper;

    document.body.classList.add(
      "s4u-modal-open"
    );

    wrapper
      .querySelector("[data-modal-close]")
      ?.addEventListener(
        "click",
        close
      );

    wrapper
      .querySelector("[data-modal-cancel]")
      ?.addEventListener(
        "click",
        close
      );

    wrapper
      .querySelector("form")
      ?.addEventListener(
        "submit",
        async (event) => {
          event.preventDefault();

          const button =
            wrapper.querySelector(
              'button[type="submit"]'
            );

          button.disabled =
            true;

          const formData =
            new FormData(
              event.currentTarget
            );

          const values =
            Object.fromEntries(
              formData.entries()
            );

          try {
            if (
              typeof onSubmit ===
              "function"
            ) {
              await onSubmit(
                values
              );
            }

            close();
          } catch (error) {
            button.disabled =
              false;

            toast(
              error?.message ||
                "Unable to complete this action.",
              "error"
            );
          }
        }
      );

    wrapper
      .querySelector(
        "input, select, textarea"
      )
      ?.focus();

    return {
      close
    };
  }

  window.S4UUI =
    Object.freeze({
      modal,
      formModal,
      toast,
      closeModal: close
    });
})();

;
/* SOURCE: assets/js/training-auth-guard.js */
/**
 * screenings4u — Training LMS bootstrap
 * One authentication/onboarding pipeline shared by every LMS script.
 */
(() => {
  "use strict";

  const CONSENT_VERSION = "2026-08-23";
  const ONBOARDING_PAGE = "lms-welcome.html";

  function currentPage() {
    return (location.pathname.split("/").pop() || "").split("?")[0].toLowerCase();
  }

  function onboardingCacheKey(userId) {
    return `s4u:lms:onboarding:${CONSENT_VERSION}:${userId}`;
  }

  async function verifyOnboarding(state) {
    if (currentPage() === ONBOARDING_PAGE) return true;

    const userId = state?.user?.id;
    if (!userId) throw new Error("Training user is unavailable.");

    try {
      if (sessionStorage.getItem(onboardingCacheKey(userId)) === "1") return true;
    } catch (_) {}

    document.documentElement.classList.add("s4u-onboarding-pending");

    const client = window.getScreenings4uSupabase?.();
    if (!client) throw new Error("Supabase client is unavailable.");

    const session = state.session;
    if (!session?.access_token) throw new Error("Training session is unavailable.");

    const response = await fetch(
      `${window.SCREENINGS4U_SUPABASE_URL}/functions/v1/lms-learner-documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: window.SCREENINGS4U_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action: "status" })
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to verify onboarding status.");

    const consent = data.consent || {};
    const complete = Boolean(
      consent.consent_version === CONSENT_VERSION &&
      consent.accepted_terms &&
      consent.accepted_refund_policy &&
      consent.accepted_disclaimer &&
      consent.accepted_mock_requirements
    );

    if (!complete) {
      const target = new URL(ONBOARDING_PAGE, location.href);
      target.searchParams.set("returnTo", location.pathname + location.search + location.hash);
      location.replace(target.href);
      return false;
    }

    try { sessionStorage.setItem(onboardingCacheKey(userId), "1"); } catch (_) {}
    document.documentElement.classList.remove("s4u-onboarding-pending");
    return true;
  }

  async function bootstrap() {
    document.documentElement.classList.add("s4u-auth-pending");
    if (currentPage() !== ONBOARDING_PAGE) {
      document.documentElement.classList.add("s4u-onboarding-pending");
    }

    try {
      if (!window.S4UAuth?.requireAuth) {
        throw new Error("core-auth.js must load before training-auth-guard.js.");
      }

      const state = await window.S4UAuth.requireAuth({
        portal: "training",
        loginPage: "training-login.html"
      });
      if (!state) return null;

      if (!(await verifyOnboarding(state))) return null;

      document.documentElement.classList.remove("s4u-auth-pending", "s4u-onboarding-pending");
      document.documentElement.classList.add("s4u-authenticated");

      window.S4UTrainingAuthState = state;
      window.dispatchEvent(new CustomEvent("s4u:training-ready", { detail: state }));
      return state;
    } catch (error) {
      console.error("[Training bootstrap]", error);
      document.documentElement.classList.add("s4u-auth-error");
      document.documentElement.classList.remove("s4u-authenticated");
      throw error;
    }
  }

  // Starts as soon as this script is parsed; no DOMContentLoaded delay.
  window.S4UTrainingReady = bootstrap();
})();

;
/* SOURCE: assets/js/lms-sidebar.js */
/* ============================================================
   SCREENINGS4U LEARNING CENTER
   DYNAMIC LMS SIDEBAR
   Mimics the Customer Portal sidebar shell behavior while
   preserving Learning Center navigation and LMS class names.
   ============================================================ */

(function () {
  "use strict";

  const DESKTOP_BREAKPOINT = 860;

  // This navigation file may be loaded normally or injected by the portal shell.
  // If DOMContentLoaded has already fired, waiting for it again leaves the
  // mobile toggle unbound. Initialize immediately in that case.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLmsSidebar, {
      once: true
    });
  } else {
    initializeLmsSidebar();
  }

  /* ============================================================
     INITIALIZE
     ============================================================ */

  function initializeLmsSidebar() {
    if (document.documentElement.dataset.lmsNavigationInitialized === "true") {
      return;
    }

    document.documentElement.dataset.lmsNavigationInitialized = "true";

    injectLmsSidebar();
    injectMobileDropdownNavigation();
    setActiveNavigation();
    initializeDesktopAccordion();
    initializeMobileNavigation();
    initializeShellEnhancements();
    window.dispatchEvent(new CustomEvent("lms:sidebar-ready"));
  }


  /* ============================================================
     SIDEBAR
     ============================================================ */

  function injectLmsSidebar() {
    const sidebarTarget = document.getElementById(
      "lms-sidebar-target"
    );

    if (!sidebarTarget) {
      return;
    }

    sidebarTarget.innerHTML = getSidebarMarkup();
  }


  /* ============================================================
     SIDEBAR MARKUP
     ============================================================ */

  function getSidebarMarkup() {
    return `
      <aside
        class="lms-sidebar"
        id="lms-sidebar"
        aria-label="Learning navigation"
      >
        <div class="lms-sidebar-inner">

          <!-- =================================================
               BRAND
               ================================================= -->

          <div class="lms-sidebar-brand">

            <a
              href="lms-dashboard.html"
              class="lms-brand"
              aria-label="Screenings4u Learning Center"
            >
              <img
                src="images/logo2.png"
                alt="screenings4u"
                class="lms-brand-logo"
              />

              <div class="lms-brand-copy">
                <span class="lms-brand-subtitle">
                  Learning Center
                </span>
              </div>
            </a>
          </div>


          <!-- =================================================
               NAVIGATION
               ================================================= -->

          <div class="lms-sidebar-scroll">


            <!-- LEARNING -->

            <div class="lms-nav-group">

              <button type="button" class="lms-nav-label" aria-expanded="false">
                <span>Learning</span>
              </button>

              <nav class="lms-nav">

                <!-- HOME -->

                <a
                  href="lms-dashboard.html"
                  class="lms-nav-link"
                  data-lms-page="lms-dashboard.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 10.5 12 3l9 7.5"></path>
                      <path d="M5 9.5V21h14V9.5"></path>
                      <path d="M9 21v-6h6v6"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    Home
                  </span>
                </a>


                <!-- WELCOME & POLICIES -->

                <a
                  href="lms-welcome.html"
                  class="lms-nav-link"
                  data-lms-page="lms-welcome.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                      <path d="M8 9h8M8 13h8M8 17h5"></path>
                    </svg>
                  </span>
                  <span class="lms-nav-text">Welcome &amp; Policies</span>
                </a>


                <!-- MY LEARNING -->

                <a
                  href="lms-my-courses.html"
                  class="lms-nav-link"
                  data-lms-page="lms-my-courses.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="16"
                        rx="2"
                      ></rect>
                      <path d="M7 8h10"></path>
                      <path d="M7 12h7"></path>
                      <path d="M7 16h5"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    My Learning
                  </span>
                </a>


                <!-- COURSE LIBRARY -->

                <a
                  href="lms-courses.html"
                  class="lms-nav-link"
                  data-lms-page="lms-courses.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"></path>
                      <path d="M4 5.5v16"></path>
                      <path d="M8 7h8"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    Course Library
                  </span>
                </a>

              </nav>

            </div>


            <!-- TRACK -->

            <div class="lms-nav-group">

              <button type="button" class="lms-nav-label" aria-expanded="false">
                <span>Track</span>
              </button>

              <nav class="lms-nav">

                <!-- PROGRESS -->

                <a
                  href="lms-progress.html"
                  class="lms-nav-link"
                  data-lms-page="lms-progress.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 19V9"></path>
                      <path d="M10 19V5"></path>
                      <path d="M16 19v-7"></path>
                      <path d="M22 19V3"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    Progress
                  </span>
                </a>


                <!-- CERTIFICATES -->

                <a
                  href="lms-certificates.html"
                  class="lms-nav-link"
                  data-lms-page="lms-certificates.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle
                        cx="12"
                        cy="8"
                        r="5"
                      ></circle>
                      <path d="m8.5 12.5-1 8L12 18l4.5 2.5-1-8"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    Certificates
                  </span>
                </a>

              </nav>

            </div>


            <!-- APPOINTMENTS -->

            <div class="lms-nav-group">

              <button type="button" class="lms-nav-label" aria-expanded="false">
                <span>Appointments</span>
              </button>

              <nav class="lms-nav">

                <a href="lms-schedule-appointment.html" class="lms-nav-link" data-lms-page="lms-schedule-appointment.html">
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18M12 13v5M9.5 15.5h5"></path></svg>
                  </span>
                  <span class="lms-nav-text">Schedule Appointment</span>
                </a>

                <a href="lms-my-appointments.html" class="lms-nav-link" data-lms-page="lms-my-appointments.html">
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18M8 15l2.5 2.5L16 12"></path></svg>
                  </span>
                  <span class="lms-nav-text">My Appointments</span>
                </a>

                <a href="lms-live-training.html" class="lms-nav-link" data-lms-page="lms-live-training.html">
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="m10 9 5 3-5 3V9z"></path></svg>
                  </span>
                  <span class="lms-nav-text">Live Training</span>
                </a>

              </nav>

            </div>


            <!-- ACCOUNT -->

            <div class="lms-nav-group">

              <button type="button" class="lms-nav-label" aria-expanded="false">
                <span>Account</span>
              </button>

              <nav class="lms-nav">

                <!-- ORDERS -->

                <a
                  href="lms-orders.html"
                  class="lms-nav-link"
                  data-lms-page="lms-orders.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"></path>
                      <path d="M9 8h6M9 12h6"></path>
                    </svg>
                  </span>
                  <span class="lms-nav-text">Orders</span>
                </a>


                <!-- DOCUMENTS -->

                <a
                  href="lms-documents.html"
                  class="lms-nav-link"
                  data-lms-page="lms-documents.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 3h8l4 4v14H6z"></path>
                      <path d="M14 3v5h5"></path>
                      <path d="M9 13h6M9 17h6"></path>
                    </svg>
                  </span>
                  <span class="lms-nav-text">Documents</span>
                </a>


                <!-- MY ACCOUNT -->

                <a
                  href="lms-account.html"
                  class="lms-nav-link"
                  data-lms-page="lms-account.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle
                        cx="12"
                        cy="8"
                        r="4"
                      ></circle>
                      <path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    My Account
                  </span>
                </a>


                <!-- TRAINING SUPPORT -->

                <a
                  href="lms-support.html"
                  class="lms-nav-link"
                  data-lms-page="lms-support.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="9"></circle>
                      <path d="M9.5 9a2.7 2.7 0 0 1 5.2 1c0 2-2.7 2.3-2.7 4"></path>
                      <path d="M12 18h.01"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    Support
                  </span>
                </a>

              </nav>

            </div>

          </div>


          <!-- =================================================
               SIDEBAR FOOTER
               ================================================= -->

          <div class="lms-sidebar-footer">

            <div class="lms-sidebar-footer-links">

              <!-- BACK TO MAIN WEBSITE -->

              <a
                href="https://screenings4u.com"
                class="lms-return-link"
              >
                <span class="lms-nav-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 12H5"></path>
                    <path d="m12 19-7-7 7-7"></path>
                  </svg>
                </span>

                <span class="lms-return-text">
                  Back to Screenings4u
                </span>
              </a>
            </div>

          </div>

        </div>
      </aside>


      <!-- MOBILE OVERLAY -->

      <div
        class="lms-sidebar-overlay"
        id="lms-sidebar-overlay"
        data-lms-sidebar-overlay
        aria-hidden="true"
      ></div>
    `;
  }


  /* ============================================================
     PAGE + DESKTOP ACCORDION
     ============================================================ */

  function currentPageName() {
    let page = window.location.pathname.split("/").pop() || "lms-dashboard.html";
    page = page.split("?")[0].split("#")[0];

    if (page === "lms-customer-scheduling.html") {
      page = "lms-schedule-appointment.html";
    }

    return page;
  }

  function initializeDesktopAccordion() {
    const sidebar = document.getElementById("lms-sidebar");
    if (!sidebar) return;

    const groups = Array.from(sidebar.querySelectorAll(".lms-nav-group"));
    if (!groups.length) return;

    function setGroupState(group, open) {
      group.classList.toggle("is-open", open);
      const button = group.querySelector(".lms-nav-label");
      if (button) button.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function openOnly(target) {
      groups.forEach(function (group) {
        setGroupState(group, group === target);
      });
    }

    groups.forEach(function (group) {
      const button = group.querySelector(".lms-nav-label");
      if (!button) return;

      button.addEventListener("click", function () {
        if (window.innerWidth <= 1100) return;
        const willOpen = !group.classList.contains("is-open");
        groups.forEach(function (item) {
          setGroupState(item, willOpen && item === group);
        });
      });
    });

    const activeLink = sidebar.querySelector(".lms-nav-link.active");
    const activeGroup = activeLink ? activeLink.closest(".lms-nav-group") : null;
    openOnly(activeGroup || groups[0]);

    window.addEventListener("resize", function () {
      if (window.innerWidth <= 1100) {
        groups.forEach(function (group) { setGroupState(group, true); });
      } else {
        const currentOpen = groups.find(function (group) { return group.classList.contains("is-open"); });
        openOnly(activeGroup || currentOpen || groups[0]);
      }
    });
  }


  /* ============================================================
     ACTIVE NAVIGATION
     ============================================================ */

  function setActiveNavigation() {
    const current = currentPageName();

    document
      .querySelectorAll("[data-lms-page]")
      .forEach(function (link) {
        const page =
          String(link.dataset.lmsPage || "")
            .split("?")[0]
            .split("#")[0];

        const isActive = page === current;

        link.classList.toggle("active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });

  }

  /* ============================================================
     MOBILE DROPDOWN NAVIGATION
     ============================================================ */

  function injectMobileDropdownNavigation() {
    if (
      document.getElementById(
        "lms-mobile-dropdown"
      )
    ) {
      return;
    }

    if (!document.body) {
      return;
    }

    const backdrop =
      document.createElement("div");

    backdrop.id =
      "lms-mobile-dropdown-backdrop";

    backdrop.className =
      "lms-mobile-dropdown-backdrop";

    backdrop.hidden = true;


    const dropdown =
      document.createElement("div");

    dropdown.id =
      "lms-mobile-dropdown";

    dropdown.className =
      "lms-mobile-dropdown";

    dropdown.hidden = true;

    dropdown.setAttribute(
      "role",
      "navigation"
    );

    dropdown.setAttribute(
      "aria-label",
      "Learning Center navigation"
    );


    document.body.append(
      backdrop,
      dropdown
    );

    injectMobileStyles();
  }


  function rebuildMobileDropdown() {
    const sidebar =
      document.getElementById(
        "lms-sidebar"
      );

    const dropdown =
      document.getElementById(
        "lms-mobile-dropdown"
      );

    if (!sidebar || !dropdown) {
      return;
    }

    dropdown.innerHTML = "";

    const groups =
      sidebar.querySelectorAll(
        ".lms-nav-group"
      );

    groups.forEach(function (group) {
      const links =
        group.querySelectorAll(
          ".lms-nav-link"
        );

      if (!links.length) {
        return;
      }

      const section =
        document.createElement("section");

      section.className =
        "lms-mobile-dropdown-section";

      const sourceLabel =
        group.querySelector(
          ".lms-nav-label"
        );

      if (sourceLabel) {
        const heading =
          document.createElement("div");

        heading.className =
          "lms-mobile-dropdown-label";

        heading.textContent =
          sourceLabel.textContent.trim();

        section.appendChild(heading);
      }

      links.forEach(function (sourceLink) {
        const link =
          document.createElement("a");

        link.href =
          sourceLink.getAttribute("href") || "#";

        link.className =
          "lms-mobile-dropdown-link";

        const text =
          sourceLink.querySelector(
            ".lms-nav-text"
          );

        link.textContent =
          text
            ? text.textContent.trim()
            : sourceLink.textContent
                .replace(/\s+/g, " ")
                .trim();

        if (
          sourceLink.classList.contains(
            "active"
          )
        ) {
          link.classList.add("active");

          link.setAttribute(
            "aria-current",
            "page"
          );
        }

        section.appendChild(link);
      });

      dropdown.appendChild(section);
    });


    const footer =
      sidebar.querySelector(
        ".lms-sidebar-footer"
      );

    const returnLink =
      footer
        ? footer.querySelector(
            ".lms-return-link"
          )
        : null;

    if (returnLink) {
      const section =
        document.createElement("section");

      section.className =
        "lms-mobile-dropdown-section lms-mobile-dropdown-return";

      const link =
        document.createElement("a");

      link.href =
        returnLink.getAttribute("href") || "#";

      link.className =
        "lms-mobile-dropdown-link";

      const text =
        returnLink.querySelector(
          ".lms-return-text"
        );

      link.textContent =
        text
          ? text.textContent.trim()
          : "Back to Screenings4u";

      section.appendChild(link);
      dropdown.appendChild(section);
    }
  }


  function injectMobileStyles() {
    if (
      document.getElementById(
        "lms-mobile-dropdown-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "lms-mobile-dropdown-styles";

    style.textContent = `
      @media (max-width: ${DESKTOP_BREAKPOINT}px) {

        /*
         * Mobile uses the dropdown only.
         * The desktop Learning Center sidebar is completely hidden.
         */
        .lms-sidebar,
        #lms-sidebar,
        .lms-sidebar-overlay,
        #lms-sidebar-overlay {
          display: none !important;
        }

        body.sidebar-open {
          overflow: auto !important;
        }

        .lms-main,
        .lms-content,
        main {
          width: 100% !important;
          max-width: 100% !important;
          margin-left: 0 !important;
        }

        .lms-mobile-dropdown-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(17, 36, 67, .18);
        }

        .lms-mobile-dropdown {
          position: fixed;
          left: 12px;
          right: 12px;
          top: 76px;
          z-index: 9999;

          overflow-y: auto;
          overscroll-behavior: contain;

          background: #ffffff;
          border: 1px solid #d8e0ec;
          border-radius: 12px;
          box-shadow: 0 18px 42px rgba(18, 45, 82, .18);
        }

        .lms-mobile-dropdown[hidden],
        .lms-mobile-dropdown-backdrop[hidden] {
          display: none !important;
        }

        .lms-mobile-dropdown-section {
          padding: 8px;
          border-bottom: 1px solid #edf1f5;
        }

        .lms-mobile-dropdown-section:last-child {
          border-bottom: 0;
        }

        .lms-mobile-dropdown-label {
          padding: 8px 10px 6px;
          color: #748197;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .lms-mobile-dropdown-link {
          display: flex;
          align-items: center;
          min-height: 42px;
          padding: 0 10px;
          border-radius: 8px;
          color: #273348;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
        }

        .lms-mobile-dropdown-link:hover,
        .lms-mobile-dropdown-link.active {
          background: #f2f6fb;
          color: #173d78;
        }

        [data-lms-menu-toggle][aria-expanded="true"] {
          background: #f2f6fb;
        }
      }


      @media (min-width: ${DESKTOP_BREAKPOINT + 1}px) {
        .lms-mobile-dropdown,
        .lms-mobile-dropdown-backdrop {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }


  function positionMobileDropdown(
    button,
    dropdown
  ) {
    const header =
      button.closest(
        ".lms-topbar, .lms-header, header"
      );

    const referenceRect =
      header
        ? header.getBoundingClientRect()
        : button.getBoundingClientRect();

    const top =
      Math.max(
        8,
        Math.round(
          referenceRect.bottom + 8
        )
      );

    dropdown.style.top =
      top + "px";

    dropdown.style.maxHeight =
      "calc(100vh - " +
      (top + 12) +
      "px)";
  }


  /* ============================================================
     DESKTOP SIDEBAR
     ============================================================

     The Learning Center stylesheet already owns the desktop sidebar
     presentation. Do not inject Customer Portal collapse/reopen controls
     here because those controls use different CSS classes.
  */


  /* ============================================================
     MOBILE NAVIGATION
     ============================================================ */

  function initializeMobileNavigation() {
    const button =
      document.querySelector(
        "[data-lms-menu-toggle]"
      );

    const dropdown =
      document.getElementById(
        "lms-mobile-dropdown"
      );

    const backdrop =
      document.getElementById(
        "lms-mobile-dropdown-backdrop"
      );

    if (!button) {
      return;
    }

    // Desktop show/hide must work even if the mobile dropdown is unavailable.
    if (window.innerWidth > DESKTOP_BREAKPOINT) {
      let collapsed = false;
      try { collapsed = localStorage.getItem("s4u-lms-sidebar-collapsed") === "1"; } catch (_) {}
      document.body.classList.toggle("lms-nav-collapsed", collapsed);
      button.setAttribute("aria-expanded", collapsed ? "false" : "true");
      button.setAttribute("aria-label", collapsed ? "Show navigation" : "Hide navigation");

      button.addEventListener("click", function (event) {
        if (window.innerWidth <= DESKTOP_BREAKPOINT) return;
        event.preventDefault();
        event.stopPropagation();
        const next = document.body.classList.toggle("lms-nav-collapsed");
        button.setAttribute("aria-expanded", next ? "false" : "true");
        button.setAttribute("aria-label", next ? "Show navigation" : "Hide navigation");
        try { localStorage.setItem("s4u-lms-sidebar-collapsed", next ? "1" : "0"); } catch (_) {}
      });

      if (!dropdown) return;
    }

    if (!dropdown) return;

    button.setAttribute(
      "aria-controls",
      "lms-mobile-dropdown"
    );

    button.setAttribute(
      "aria-expanded",
      "false"
    );


    function closeMenu() {
      dropdown.hidden = true;

      if (backdrop) {
        backdrop.hidden = true;
      }

      button.setAttribute(
        "aria-expanded",
        "false"
      );

      button.setAttribute(
        "aria-label",
        "Open navigation"
      );
    }


    function openMenu() {
      rebuildMobileDropdown();

      positionMobileDropdown(
        button,
        dropdown
      );

      if (backdrop) {
        backdrop.hidden = false;
      }

      dropdown.hidden = false;

      button.setAttribute(
        "aria-expanded",
        "true"
      );

      button.setAttribute(
        "aria-label",
        "Close navigation"
      );
    }


    button.addEventListener(
      "click",
      function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (window.innerWidth > DESKTOP_BREAKPOINT) return;

        const isOpen = button.getAttribute("aria-expanded") === "true";
        if (isOpen) closeMenu();
        else openMenu();
      }
    );

    dropdown.addEventListener(
      "click",
      function (event) {
        event.stopPropagation();

        const link =
          event.target.closest("a");

        if (link) {
          closeMenu();
        }
      }
    );


    if (backdrop) {
      backdrop.addEventListener(
        "click",
        closeMenu
      );
    }


    document.addEventListener(
      "click",
      function (event) {
        if (
          window.innerWidth <=
            DESKTOP_BREAKPOINT &&
          !dropdown.contains(event.target) &&
          !button.contains(event.target)
        ) {
          closeMenu();
        }
      }
    );


    document.addEventListener(
      "keydown",
      function (event) {
        if (event.key === "Escape") {
          closeMenu();
        }
      }
    );


    window.addEventListener(
      "resize",
      closeMenu
    );
  }


  /* ============================================================
     SHELL ENHANCEMENTS
     Replaces lms-shell-v2.js and lms-shell-v3.js without observers.
     ============================================================ */
  function initializeShellEnhancements() {
    const page = (location.pathname.split("/").pop() || "lms-dashboard.html").toLowerCase();

    if (page === "lms-welcome.html") {
      document.body.classList.add("lms-onboarding-mode");
      const app = document.querySelector(".lms-app");
      if (app && !document.querySelector(".onboard-brandbar")) {
        const bar = document.createElement("div");
        bar.className = "onboard-brandbar";
        bar.innerHTML = '<img src="images/logo2.png" alt="screenings4u"><span class="divider" aria-hidden="true"></span><span>Learning Center</span><b>New Learner Orientation</b>';
        app.parentNode.insertBefore(bar, app);
      }
      return;
    }

    const button = document.querySelector("[data-lms-menu-toggle]");
    if (button && window.innerWidth > DESKTOP_BREAKPOINT) {
      let collapsed = false;
      try { collapsed = localStorage.getItem("s4u-lms-sidebar-collapsed") === "1"; } catch (_) {}
      document.body.classList.toggle("lms-nav-collapsed", collapsed);
      button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    }

    const titles = {
      "lms-dashboard.html":"Home", "lms-my-courses.html":"My Learning", "lms-courses.html":"Course Library",
      "lms-course-details.html":"Course Details", "lms-progress.html":"Progress", "lms-certificates.html":"Certificates",
      "lms-documents.html":"Documents", "lms-orders.html":"Orders", "lms-live-training.html":"Live Training",
      "lms-my-appointments.html":"My Appointments", "lms-schedule-appointment.html":"Schedule Appointment",
      "lms-customer-scheduling.html":"Scheduling", "lms-support.html":"Training Support", "lms-notifications.html":"Notifications",
      "lms-account.html":"Account", "lms-quiz.html":"Knowledge Check", "lms-assessment.html":"Assessment"
    };
    const left = document.querySelector(".lms-topbar-left");
    if (left && !left.querySelector(".s4u-page-title")) {
      const title = document.createElement("span");
      title.className = "s4u-page-title";
      title.textContent = titles[page] || document.title.split("|")[0].trim() || "Learning Center";
      left.appendChild(title);
    }
  }

})();

;
/* SOURCE: assets/js/lms.js */
/* ============================================================
   SCREENINGS4U LEARNING CENTER
   SHARED LMS APPLICATION JAVASCRIPT
   ============================================================ */

(function () {
  "use strict";

  var authState = {
    client: null,
    user: null,
    profile: null
  };

  var readyResolve;
  var readyReject;

  var ready = new Promise(function (resolve, reject) {
    readyResolve = resolve;
    readyReject = reject;
  });

  function initializeLms() {
    initializeNavigation();
    initializeNotificationBellNavigation();
    initializeUserMenu();
    initializeSearchShortcut();
    initializeSignOut();

    initializeAuthenticatedLearner()
      .then(async function () {
        initializeActiveNavigation();

        try {
          await refreshNotificationBell();
        } catch (notificationError) {
          console.warn("[LMS] Notification bell could not be refreshed:", notificationError);
        }

        readyResolve({
          client: authState.client,
          user: authState.user,
          profile: authState.profile
        });
      })
      .catch(function (error) {
        console.error("[LMS] Initialization failed:", error);
        readyReject(error);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLms);
  } else {
    initializeLms();
  }

  async function initializeAuthenticatedLearner() {
    if (!window.S4UTrainingReady) {
      throw new Error("Training bootstrap is unavailable. Load training-auth-guard.js before lms.js.");
    }

    var trainingState = await window.S4UTrainingReady;
    if (!trainingState?.user) {
      throw new Error("Training authentication could not be completed.");
    }

    authState.client = await getSupabaseClient();
    authState.user = trainingState.user;
    authState.profile = trainingState.profile || {
      id: trainingState.user.id,
      email: trainingState.user.email || ""
    };

    if (authState.profile.is_active === false) {
      try { await window.S4UAuth?.signOutSilently?.(); } catch (_) {}
      window.location.replace("training-login.html");
      throw new Error("This account is inactive.");
    }

    var profile = authState.profile;
    setLearnerProfile({
      name: profile.display_name ||
        [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
        trainingState.user.email || "Learner",
      email: profile.email || trainingState.user.email || ""
    });
  }

  function initializeNavigation() {
    // The shared lms-sidebar.js owns the show/hide button on every LMS page.
    // Do not bind the same button here or a click toggles twice and appears broken.
    var overlay = document.querySelector("[data-lms-sidebar-overlay]");

    if (overlay) {
      overlay.addEventListener("click", closeMobileNavigation);
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeMobileNavigation();
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 860) {
        closeMobileNavigation();
      }
    });
  }

  function closeMobileNavigation() {
    document.body.classList.remove("lms-navigation-open");
  }

  function initializeActiveNavigation() {
    var currentPage = window.location.pathname.split("/").pop();

    if (!currentPage) {
      currentPage = "lms-dashboard.html";
    }

    function update() {
      var links = document.querySelectorAll(".lms-nav-link");

      links.forEach(function (link) {
        var href = link.getAttribute("href");
        if (!href) return;

        var cleanHref = href.split("?")[0].split("#")[0];
        link.classList.toggle("active", cleanHref === currentPage);

        if (!link.dataset.lmsMobileCloseBound) {
          link.dataset.lmsMobileCloseBound = "1";
          link.addEventListener("click", function () {
            if (window.innerWidth <= 860) {
              closeMobileNavigation();
            }
          });
        }
      });
    }

    update();

    // Sidebar is injected deterministically by lms-sidebar.js.
    // No document-wide MutationObserver is needed.
    window.addEventListener("lms:sidebar-ready", update, { once: true });
  }

  function initializeNotificationBellNavigation() {
    document
      .querySelectorAll('.lms-icon-button[aria-label="Notifications"]')
      .forEach(function (bell) {
        if (bell.tagName === "A") {
          if (!bell.getAttribute("href")) {
            bell.setAttribute("href", "lms-notifications.html");
          }
          bell.setAttribute("title", "Notifications");
          return;
        }

        if (!bell.dataset.lmsNotificationBound) {
          bell.dataset.lmsNotificationBound = "1";
          bell.setAttribute("title", "Notifications");
          bell.addEventListener("click", function () {
            window.location.href = "lms-notifications.html";
          });
        }
      });
  }

  async function refreshNotificationBell() {
    if (!authState.client || !authState.user?.id) return;

    var notificationsResult = await authState.client
      .from("notifications")
      .select("id")
      .eq("recipient_user_id", authState.user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (notificationsResult.error) {
      throw notificationsResult.error;
    }

    var notificationIds = (notificationsResult.data || [])
      .map(function (row) { return row.id; })
      .filter(Boolean);

    var readIds = new Set();

    if (notificationIds.length) {
      var readsResult = await authState.client
        .from("customer_notification_reads")
        .select("notification_id")
        .eq("user_id", authState.user.id)
        .in("notification_id", notificationIds);

      if (readsResult.error) {
        throw readsResult.error;
      }

      (readsResult.data || []).forEach(function (row) {
        if (row.notification_id) readIds.add(row.notification_id);
      });
    }

    var unreadCount = notificationIds.filter(function (id) {
      return !readIds.has(id);
    }).length;

    document.querySelectorAll(".lms-notification-dot").forEach(function (dot) {
      dot.style.display = unreadCount > 0 ? "" : "none";
      dot.setAttribute("aria-hidden", "true");
    });

    document
      .querySelectorAll('.lms-icon-button[aria-label="Notifications"]')
      .forEach(function (bell) {
        var label = unreadCount > 0
          ? "Notifications, " + unreadCount + " unread"
          : "Notifications";
        bell.setAttribute("aria-label", label);
        bell.setAttribute("title", label);
      });

    window.dispatchEvent(new CustomEvent("lms:notifications-updated", {
      detail: { unreadCount: unreadCount }
    }));
  }

  function initializeUserMenu() {
    var userButton = document.querySelector("[data-lms-user-button]");
    var userMenu = document.querySelector("[data-lms-user-menu]");

    if (!userButton || !userMenu) return;

    userButton.addEventListener("click", function (event) {
      event.stopPropagation();

      var isOpen = userMenu.classList.toggle("is-open");
      userButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    document.addEventListener("click", function (event) {
      if (
        !userButton.contains(event.target) &&
        !userMenu.contains(event.target)
      ) {
        userMenu.classList.remove("is-open");
        userButton.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initializeSearchShortcut() {
    document.addEventListener("keydown", function (event) {
      var isModifier = event.ctrlKey || event.metaKey;

      if (isModifier && event.key.toLowerCase() === "k") {
        event.preventDefault();

        var searchInput = document.querySelector("[data-lms-search]");
        if (searchInput) searchInput.focus();
      }
    });
  }

  function setLearnerProfile(profile) {
    profile = profile || {};

    var name = profile.name || "Learner";
    var email = profile.email || "";
    var initials = profile.initials || getInitials(name);

    updateElements("[data-lms-learner-name]", name);
    updateElements("[data-lms-learner-initials]", initials);
    updateElements("[data-lms-user-menu-name]", name);
    updateElements("[data-lms-user-menu-email]", email);
  }

  function updateElements(selector, value) {
    document.querySelectorAll(selector).forEach(function (element) {
      element.textContent = value;
    });
  }

  function getInitials(name) {
    if (!name) return "L";

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0).toUpperCase();
      })
      .join("");
  }

  function initializeSignOut() {
    document.querySelectorAll("[data-lms-sign-out]").forEach(function (button) {
      button.addEventListener("click", async function () {
        button.disabled = true;

        try {
          if (
            window.S4UAuth &&
            typeof window.S4UAuth.signOut === "function"
          ) {
            await window.S4UAuth.signOut({
              redirectTo: "training-login.html"
            });
            return;
          }

          var client = await getSupabaseClient();
          await client.auth.signOut();
        } catch (error) {
          console.error("[LMS] Sign out error:", error);
        }

        window.location.replace("training-login.html");
      });
    });
  }

  async function getSupabaseClient() {
    if (
      typeof window.getScreenings4uSupabase === "function"
    ) {
      return await window.getScreenings4uSupabase();
    }

    if (
      window.screenings4uSupabase &&
      window.screenings4uSupabase.auth
    ) {
      return window.screenings4uSupabase;
    }

    if (
      window.supabaseClient &&
      window.supabaseClient.auth
    ) {
      return window.supabaseClient;
    }

    throw new Error(
      "Supabase client is unavailable. Load supabase-config.js before lms.js."
    );
  }

  window.LMS = window.LMS || {};
  window.LMS.ready = ready;
  window.LMS.setLearnerProfile = setLearnerProfile;
  window.LMS.getInitials = getInitials;
  window.LMS.closeNavigation = closeMobileNavigation;
  window.LMS.getSupabaseClient = getSupabaseClient;
  window.LMS.refreshNotificationBell = refreshNotificationBell;
  window.LMS.getCurrentUser = function () {
    return authState.user;
  };
  window.LMS.getProfile = function () {
    return authState.profile;
  };
})();

;
/* SOURCE: assets/js/lms-support.js */
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

;
/* SOURCE: assets/js/branded-popups.js */
(() => {
  'use strict';

  const BRAND = '#ff6b00';
  const BRAND_LOGO = 'https://rgsrubdtljyxmnihwlah.supabase.co/storage/v1/object/public/branding/logo.png';
  const state = { resolve: null, confirmResolve: null, lastMessage: '', lastAt: 0 };

  function ensurePopup() {
    if (document.getElementById('s4u-global-popup')) return;
    const style = document.createElement('style');
    style.id = 's4u-global-popup-style';
    style.textContent = `
      [role="alert"].login-status,[role="alert"].handoff-error{display:none!important}
      .s4u-popup{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:20px;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .s4u-popup.is-open{display:flex}
      .s4u-popup__backdrop{position:absolute;inset:0;background:rgba(15,23,42,.58);backdrop-filter:blur(4px)}
      .s4u-popup__card{position:relative;width:min(440px,100%);background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.24);text-align:center;animation:s4uPopupIn .18s ease-out}
      .s4u-popup__brand{padding:20px 24px 17px;border-bottom:3px solid ${BRAND};background:#fff}.s4u-popup__brand img{display:block;width:min(220px,70%);height:auto;margin:auto}.s4u-popup__body{padding:26px 26px 24px}
      .s4u-popup__title{margin:0 0 9px;color:#24467f;font-size:22px;line-height:1.25;font-weight:800}
      .s4u-popup__message{margin:0;color:#475569;font-size:15px;line-height:1.65;white-space:pre-line;overflow-wrap:anywhere}
      .s4u-popup__actions{display:flex;justify-content:center;gap:10px;margin-top:23px}
      .s4u-popup__button{min-width:120px;min-height:44px;border:0;border-radius:12px;padding:11px 18px;background:${BRAND};color:#fff;font:inherit;font-weight:800;cursor:pointer}.s4u-popup__button--secondary{background:#e2e8f0;color:#0f172a}
      .s4u-popup__button:hover{background:#e66000}
      .s4u-popup__button:focus-visible{outline:3px solid rgba(255,107,0,.24);outline-offset:3px}
      @keyframes s4uPopupIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
      @media(max-width:520px){.s4u-popup{padding:14px}.s4u-popup__card{padding:26px 18px 20px;border-radius:18px}.s4u-popup__actions{display:grid}.s4u-popup__button{width:100%}}
    `;
    document.head.appendChild(style);

    const popup = document.createElement('div');
    popup.id = 's4u-global-popup';
    popup.className = 's4u-popup';
    popup.setAttribute('aria-hidden', 'true');
    popup.innerHTML = `
      <div class="s4u-popup__backdrop" data-s4u-popup-close></div>
      <section class="s4u-popup__card" role="dialog" aria-modal="true" aria-labelledby="s4u-popup-title" aria-describedby="s4u-popup-message">
        <div class="s4u-popup__brand"><img src="${BRAND_LOGO}" alt="screenings4u"></div>
        <div class="s4u-popup__body">
          <h2 class="s4u-popup__title" id="s4u-popup-title">screenings4u</h2>
          <p class="s4u-popup__message" id="s4u-popup-message"></p>
          <div class="s4u-popup__actions"><button class="s4u-popup__button s4u-popup__button--secondary" type="button" data-s4u-popup-cancel hidden>Cancel</button><button class="s4u-popup__button" type="button" data-s4u-popup-ok>OK</button></div>
        </div>
      </section>`;
    document.body.appendChild(popup);
    popup.querySelector('[data-s4u-popup-ok]').addEventListener('click', () => finishPopup(true));
    popup.querySelector('[data-s4u-popup-cancel]').addEventListener('click', () => finishPopup(false));
    popup.querySelector('[data-s4u-popup-close]').addEventListener('click', closePopup);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && popup.classList.contains('is-open')) closePopup(); });
  }

  function finishPopup(value) {
    if (state.confirmResolve) { const resolve = state.confirmResolve; state.confirmResolve = null; resolve(value); }
    closePopup();
  }

  function closePopup() {
    const popup = document.getElementById('s4u-global-popup');
    if (!popup) return;
    const active = document.activeElement;
    if (active && popup.contains(active) && typeof active.blur === 'function') active.blur();
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    if (state.resolve) { const resolve = state.resolve; state.resolve = null; resolve(); }
  }

  function showPopup(message, options = {}) {
    const text = String(message ?? '').trim();
    if (!text) return Promise.resolve();
    const now = Date.now();
    if (text === state.lastMessage && now - state.lastAt < 700) return Promise.resolve();
    state.lastMessage = text; state.lastAt = now;
    ensurePopup();
    const popup = document.getElementById('s4u-global-popup');
    popup.querySelector('#s4u-popup-title').textContent = options.title || 'Screenings4u';
    popup.querySelector('#s4u-popup-message').textContent = text;
    popup.querySelector('[data-s4u-popup-ok]').textContent = options.confirmText || 'OK';
    const cancel = popup.querySelector('[data-s4u-popup-cancel]'); cancel.hidden = true;
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
    setTimeout(() => popup.querySelector('[data-s4u-popup-ok]')?.focus(), 0);
    return new Promise(resolve => { state.resolve = resolve; });
  }

  function confirmPopup(message, options={}) {
    ensurePopup();
    const popup=document.getElementById('s4u-global-popup');
    popup.querySelector('#s4u-popup-title').textContent=options.title||'Please Confirm';
    popup.querySelector('#s4u-popup-message').textContent=String(message??'');
    popup.querySelector('[data-s4u-popup-ok]').textContent=options.confirmText||'Continue';
    const cancel=popup.querySelector('[data-s4u-popup-cancel]'); cancel.hidden=false; cancel.textContent=options.cancelText||'Cancel';
    popup.classList.add('is-open'); popup.setAttribute('aria-hidden','false');
    setTimeout(() => popup.querySelector('[data-s4u-popup-ok]')?.focus(), 0);
    return new Promise(resolve=>{state.confirmResolve=resolve;});
  }

  window.S4UPopup = { show: showPopup, confirm: confirmPopup, close: closePopup, success: (m,t='Success') => showPopup(m,{title:t}), error: (m,t='Something went wrong') => showPopup(m,{title:t}), info: (m,t='Screenings4u') => showPopup(m,{title:t}) };
  window.alert = message => { showPopup(message); };

  function watchInlineAlerts() {
    document.querySelectorAll('[role="alert"]').forEach(el => {
      let previous = (el.textContent || '').trim();
      const observer = new MutationObserver(() => {
        const current = (el.textContent || '').trim();
        if (current && current !== previous) {
          const lower = current.toLowerCase();
          const title = /success|updated|sent|complete|saved/.test(lower) ? 'Success' : /error|invalid|failed|unable|expired|incorrect/.test(lower) ? 'Something went wrong' : 'Screenings4u';
          showPopup(current, { title });
        }
        previous = current;
      });
      observer.observe(el, { childList:true, characterData:true, subtree:true });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { ensurePopup(); watchInlineAlerts(); });
  else { ensurePopup(); watchInlineAlerts(); }
})();

;
