/* ============================================================
   SCREENINGS4U — TRAINING PORTAL AUTH GUARD
   Protects all Training / LMS pages.
   ============================================================ */

(() => {
  "use strict";

  const TRAINING_LOGIN_PAGE =
    "training-login.html";

  let authPromise = null;

  async function protect() {
    if (authPromise) {
      return authPromise;
    }

    authPromise =
      (async () => {
        try {
          if (
            !window.S4UPortalGuard ||
            typeof window.S4UPortalGuard
              .protectPortal !== "function"
          ) {
            throw new Error(
              "S4UPortalGuard is unavailable. " +
              "Load portal-auth-guard.js before training-auth-guard.js."
            );
          }

          const state =
            await window.S4UPortalGuard
              .protectPortal({
                portal:
                  "training",
                loginPage:
                  TRAINING_LOGIN_PAGE
              });

          if (!state?.user?.id) {
            return null;
          }

          window.S4UTrainingAuthState =
            state;

          window.dispatchEvent(
            new CustomEvent(
              "s4u:training-authenticated",
              {
                detail:
                  state
              }
            )
          );

          return state;

        } catch (error) {
          console.error(
            "[Training Auth Guard]",
            error
          );

          // Allow a later retry. Do not sign out for an operational error.
          authPromise = null;
          return null;
        }
      })();

    return authPromise;
  }

  window.S4UTrainingAuth =
    Object.freeze({
      protect
    });

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      protect();
    }
  );
})();
