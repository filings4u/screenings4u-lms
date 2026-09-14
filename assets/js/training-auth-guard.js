/**
 * screenings4u — Training Portal Authentication + Onboarding Guard
 * Protected LMS pages require both a valid training session and the current
 * Learning Center onboarding acknowledgment. The welcome page is the only
 * protected LMS destination allowed before onboarding is complete.
 */
(() => {
  "use strict";

  let started = false;
  const CONSENT_VERSION = "2026-08-23";
  const ONBOARDING_PAGE = "lms-welcome.html";
  const ONBOARDING_EXEMPT = new Set([ONBOARDING_PAGE]);

  function currentPage() {
    return (window.location.pathname.split("/").pop() || "").split("?")[0].toLowerCase();
  }

  async function requireOnboarding(state) {
    if (ONBOARDING_EXEMPT.has(currentPage())) return true;

    document.documentElement.classList.add("s4u-onboarding-pending");

    const client = window.getScreenings4uSupabase?.();
    if (!client) throw new Error("Supabase client is unavailable.");

    const session = state?.session || (await client.auth.getSession()).data.session;
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

    const complete = Boolean(
      data.consent &&
      data.consent.consent_version === CONSENT_VERSION &&
      data.consent.accepted_terms &&
      data.consent.accepted_refund_policy &&
      data.consent.accepted_disclaimer &&
      data.consent.accepted_mock_requirements
    );

    if (!complete) {
      const target = new URL(ONBOARDING_PAGE, window.location.href);
      target.searchParams.set("returnTo", window.location.pathname + window.location.search + window.location.hash);
      window.location.replace(target.href);
      return false;
    }

    document.documentElement.classList.remove("s4u-onboarding-pending");
    return true;
  }

  async function protectTrainingPortal() {
    if (started) return;
    started = true;

    document.documentElement.classList.add("s4u-auth-pending");
    if (!ONBOARDING_EXEMPT.has(currentPage())) document.documentElement.classList.add("s4u-onboarding-pending");

    if (!window.S4UPortalGuard || typeof window.S4UPortalGuard.protectPortal !== "function") {
      console.error("[Training auth guard] portal-auth-guard.js must load before training-auth-guard.js.");
      return;
    }

    try {
      const state = await window.S4UPortalGuard.protectPortal({
        portal: "training",
        loginPage: "training-login.html"
      });
      if (!state) return;

      const allowed = await requireOnboarding(state);
      if (!allowed) return;

      document.documentElement.classList.remove("s4u-auth-pending", "s4u-onboarding-pending");
      document.documentElement.classList.add("s4u-authenticated");
      window.dispatchEvent(new CustomEvent("s4u:onboarding-verified", { detail: { complete: true } }));
    } catch (error) {
      console.error("[Training auth guard]", error);
      document.documentElement.classList.add("s4u-auth-error");
      document.documentElement.classList.remove("s4u-authenticated");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", protectTrainingPortal, { once: true });
  } else {
    protectTrainingPortal();
  }
})();
