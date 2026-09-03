/**
 * screenings4u — Training Portal Authentication Guard
 *
 * Load this file only on protected Training Portal pages.
 * Do not load it on training-login.html, set-password.html,
 * reset-password.html, or other public authentication pages.
 *
 * Access is decided by core-auth.js through the Supabase
 * can_access_training_portal database function.
 */

(() => {
  "use strict";

  let started = false;

  async function protectTrainingPortal() {
    if (started) {
      return;
    }

    started = true;
    document.documentElement.classList.add(
      "s4u-auth-pending"
    );

    if (
      !window.S4UPortalGuard ||
      typeof window.S4UPortalGuard.protectPortal !== "function"
    ) {
      // Fail closed. The pending class remains, so portal content stays hidden.
      console.error(
        "[Training auth guard] S4UPortalGuard.protectPortal is unavailable. " +
        "Load portal-auth-guard.js before training-auth-guard.js."
      );

      window.dispatchEvent(
        new CustomEvent("s4u:auth-error", {
          detail: {
            portal: "training",
            reason: "portal_guard_unavailable"
          }
        })
      );

      return;
    }

    await window.S4UPortalGuard.protectPortal({
      portal: "training",
      loginPage: "training-login.html"
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      protectTrainingPortal,
      { once: true }
    );
  } else {
    protectTrainingPortal();
  }
})();
