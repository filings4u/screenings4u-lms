/* ============================================================
   SCREENINGS4U — TRAINING SESSION SECURITY
   Handles inactivity timeout and secure Training Portal logout.
   ============================================================ */

(() => {
  "use strict";

  const TRAINING_LOGIN_PAGE = "training-login.html";

  // 10 minutes inactivity.
  const SESSION_LIMIT = 600000;

  // Show warning 60 seconds before logout.
  const WARNING_TIME = 60000;

  const activityEvents = [
    "mousedown",
    "keydown",
    "touchstart",
    "pointerdown",
    "scroll"
  ];

  let logoutTimer = null;
  let warningTimer = null;
  let countdownTimer = null;

  let warningVisible = false;
  let signingOut = false;
  let lastReset = 0;

  /* ============================================================
     PORTAL
     ============================================================ */

  function getPortal() {
    return String(
      document.body?.dataset?.s4uPortal || ""
    )
      .trim()
      .toLowerCase();
  }

  function isTrainingPortal() {
    return getPortal() === "training";
  }

  /* ============================================================
     LOGIN DESTINATION
     ============================================================ */

  function getLoginPage() {
    if (
      window.S4UAuth &&
      typeof window.S4UAuth.getLoginForPortal === "function"
    ) {
      const loginPage =
        window.S4UAuth.getLoginForPortal("training");

      if (loginPage) {
        return loginPage;
      }
    }

    return TRAINING_LOGIN_PAGE;
  }

  /* ============================================================
     TIMER HELPERS
     ============================================================ */

  function clearTimers() {
    if (logoutTimer) {
      clearTimeout(logoutTimer);
      logoutTimer = null;
    }

    if (warningTimer) {
      clearTimeout(warningTimer);
      warningTimer = null;
    }

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  /* ============================================================
     WARNING MODAL
     ============================================================ */

  function removeWarning() {
    const existing =
      document.getElementById("s4u-session-warning");

    if (existing) {
      existing.remove();
    }

    warningVisible = false;
  }

  function showWarning() {
    if (
      warningVisible ||
      signingOut ||
      !isTrainingPortal()
    ) {
      return;
    }

    warningVisible = true;

    let secondsRemaining = 60;

    const overlay = document.createElement("div");

    overlay.id = "s4u-session-warning";
    overlay.className = "s4u-session-overlay";

    overlay.innerHTML = `
      <div
        class="s4u-session-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="s4u-session-warning-title"
      >
        <h2 id="s4u-session-warning-title">
          Are You Still There?
        </h2>

        <p>
          For your security, you will be signed out due to inactivity.
        </p>

        <p>
          Signing out in
          <strong data-count>${secondsRemaining}</strong>
          seconds.
        </p>

        <div class="s4u-session-actions">
          <button
            type="button"
            data-stay
          >
            Stay Logged In
          </button>

          <button
            type="button"
            data-out
          >
            Sign Out Now
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const stayButton =
      overlay.querySelector("[data-stay]");

    const signOutButton =
      overlay.querySelector("[data-out]");

    if (stayButton) {
      stayButton.addEventListener(
        "click",
        resetSessionTimer
      );
    }

    if (signOutButton) {
      signOutButton.addEventListener(
        "click",
        signOut
      );
    }

    countdownTimer = window.setInterval(() => {
      secondsRemaining -= 1;

      const counter =
        overlay.querySelector("[data-count]");

      if (counter) {
        counter.textContent = String(
          Math.max(0, secondsRemaining)
        );
      }

      if (secondsRemaining <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;

        signOut();
      }
    }, 1000);
  }

  /* ============================================================
     SIGN OUT
     ============================================================ */

  async function signOut() {
    if (signingOut) {
      return;
    }

    signingOut = true;

    clearTimers();
    removeWarning();

    const destination = getLoginPage();

    try {
      if (
        window.S4UAuth &&
        typeof window.S4UAuth.signOut === "function"
      ) {
        await window.S4UAuth.signOut({
          redirectTo: destination
        });

        return;
      }

      /*
       * Fallback only when the shared auth layer
       * is unavailable.
       */
      const client =
        typeof window.getScreenings4uSupabase === "function"
          ? window.getScreenings4uSupabase()
          : window.screenings4uSupabase ||
            window.supabaseClient ||
            null;

      if (client?.auth) {
        await client.auth.signOut();
      }

      window.location.replace(destination);
    } catch (error) {
      console.error(
        "[Training Session Security] Sign out failed:",
        error
      );

      /*
       * Do NOT call sessionStorage.clear().
       *
       * Supabase uses sessionStorage for the Training
       * authentication session. Clearing the entire storage
       * can delete unrelated application state as well.
       */

      try {
        const client =
          typeof window.getScreenings4uSupabase === "function"
            ? window.getScreenings4uSupabase()
            : window.screenings4uSupabase ||
              window.supabaseClient ||
              null;

        if (client?.auth) {
          await client.auth.signOut();
        }
      } catch (secondaryError) {
        console.error(
          "[Training Session Security] Supabase fallback sign out failed:",
          secondaryError
        );
      }

      window.location.replace(destination);
    }
  }

  /* ============================================================
     RESET SESSION TIMER
     ============================================================ */

  function resetSessionTimer() {
    if (
      signingOut ||
      !isTrainingPortal()
    ) {
      return;
    }

    const now = Date.now();

    /*
     * Prevent rapid mouse/scroll events from constantly
     * recreating timers.
     */
    if (now - lastReset < 1000) {
      return;
    }

    lastReset = now;

    clearTimers();
    removeWarning();

    const warningDelay =
      Math.max(
        1000,
        SESSION_LIMIT - WARNING_TIME
      );

    warningTimer = window.setTimeout(
      showWarning,
      warningDelay
    );

    logoutTimer = window.setTimeout(
      signOut,
      SESSION_LIMIT
    );

    try {
      sessionStorage.setItem(
        "s4u-training-last-activity",
        String(now)
      );
    } catch (error) {
      console.warn(
        "[Training Session Security] Unable to save activity timestamp:",
        error
      );
    }
  }

  /* ============================================================
     HISTORY PROTECTION
     ============================================================ */

  function protectHistory() {
    if (
      document.body?.dataset?.s4uProtectHistory ===
      "false"
    ) {
      return;
    }

    const currentUrl = window.location.href;

    try {
      window.history.replaceState(
        {
          s4uProtected: true
        },
        "",
        currentUrl
      );

      window.history.pushState(
        {
          s4uProtected: true
        },
        "",
        currentUrl
      );

      window.addEventListener(
        "popstate",
        () => {
          window.history.pushState(
            {
              s4uProtected: true
            },
            "",
            currentUrl
          );
        }
      );
    } catch (error) {
      console.warn(
        "[Training Session Security] History protection failed:",
        error
      );
    }
  }

  /* ============================================================
     START
     ============================================================ */

  function start() {
    if (!isTrainingPortal()) {
      return;
    }

    activityEvents.forEach((eventName) => {
      document.addEventListener(
        eventName,
        resetSessionTimer,
        {
          passive: true
        }
      );
    });

    protectHistory();
    resetSessionTimer();
  }

  /* ============================================================
     INITIALIZE
     ============================================================ */

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start,
      {
        once: true
      }
    );
  } else {
    start();
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */

  window.S4USessionSecurity =
    Object.freeze({
      start,
      reset: resetSessionTimer,
      signOut
    });
})();