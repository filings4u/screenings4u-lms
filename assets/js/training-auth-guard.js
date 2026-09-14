/**
 * screenings4u — Training Portal Authentication + Onboarding Guard
 *
 * Protected LMS pages require both:
 * 1. A valid training portal session
 * 2. Completion of the current Learning Center onboarding acknowledgment
 *
 * lms-welcome.html is the only authenticated LMS page allowed before
 * onboarding is complete.
 */

(() => {
  "use strict";

  let started = false;

  const CONSENT_VERSION = "2026-08-23";
  const ONBOARDING_PAGE = "lms-welcome.html";
  const ONBOARDING_EXEMPT = new Set([ONBOARDING_PAGE]);

  function currentPage() {
    return (
      window.location.pathname.split("/").pop() || ""
    )
      .split("?")[0]
      .toLowerCase();
  }

  async function requireOnboarding(state) {
    if (ONBOARDING_EXEMPT.has(currentPage())) {
      return true;
    }

    document.documentElement.classList.add(
      "s4u-onboarding-pending"
    );

    const client =
      window.getScreenings4uSupabase?.();

    if (!client) {
      throw new Error(
        "Supabase client is unavailable."
      );
    }

    const session =
      state?.session ||
      (await client.auth.getSession()).data.session;

    if (!session?.access_token) {
      throw new Error(
        "Training session is unavailable."
      );
    }

    /*
     * Check onboarding directly through Supabase.
     *
     * This RPC is authenticated and checks auth.uid()
     * server-side, so users can only check their own
     * onboarding status.
     */
    const { data: complete, error } =
      await client.rpc(
        "has_completed_lms_onboarding",
        {
          p_consent_version: CONSENT_VERSION
        }
      );

    if (error) {
      console.error(
        "[Training auth guard] Onboarding status RPC failed:",
        error
      );

      throw new Error(
        error.message ||
          "Unable to verify onboarding status."
      );
    }

    /*
     * User has not completed the current onboarding.
     */
    if (complete !== true) {
      const target = new URL(
        ONBOARDING_PAGE,
        window.location.href
      );

      target.searchParams.set(
        "returnTo",
        window.location.pathname +
          window.location.search +
          window.location.hash
      );

      window.location.replace(target.href);

      return false;
    }

    document.documentElement.classList.remove(
      "s4u-onboarding-pending"
    );

    return true;
  }

  async function protectTrainingPortal() {
    if (started) {
      return;
    }

    started = true;

    document.documentElement.classList.add(
      "s4u-auth-pending"
    );

    if (!ONBOARDING_EXEMPT.has(currentPage())) {
      document.documentElement.classList.add(
        "s4u-onboarding-pending"
      );
    }

    /*
     * portal-auth-guard.js must be loaded first.
     */
    if (
      !window.S4UPortalGuard ||
      typeof window.S4UPortalGuard.protectPortal !==
        "function"
    ) {
      console.error(
        "[Training auth guard] portal-auth-guard.js must load before training-auth-guard.js."
      );

      document.documentElement.classList.add(
        "s4u-auth-error"
      );

      return;
    }

    try {
      /*
       * First verify that the user is permitted
       * to access the training portal.
       */
      const state =
        await window.S4UPortalGuard.protectPortal({
          portal: "training",
          loginPage: "training-login.html"
        });

      /*
       * protectPortal may already be redirecting
       * the user to login.
       */
      if (!state) {
        return;
      }

      /*
       * Then verify required onboarding.
       */
      const allowed =
        await requireOnboarding(state);

      if (!allowed) {
        return;
      }

      /*
       * Everything passed.
       */
      document.documentElement.classList.remove(
        "s4u-auth-pending",
        "s4u-onboarding-pending",
        "s4u-auth-error"
      );

      document.documentElement.classList.add(
        "s4u-authenticated"
      );

      window.dispatchEvent(
        new CustomEvent(
          "s4u:onboarding-verified",
          {
            detail: {
              complete: true
            }
          }
        )
      );
    } catch (error) {
      console.error(
        "[Training auth guard]",
        error
      );

      document.documentElement.classList.add(
        "s4u-auth-error"
      );

      document.documentElement.classList.remove(
        "s4u-authenticated"
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      protectTrainingPortal,
      {
        once: true
      }
    );
  } else {
    protectTrainingPortal();
  }
})();