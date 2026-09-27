/**
 * screenings4u Learning Center — Welcome & Policies
 * Page-only onboarding form behavior. Shared auth/navigation stay in their own files.
 */
(() => {
  "use strict";

  const CONSENT_VERSION = "2026-08-23";
  const $ = (id) => document.getElementById(id);
  let session = null;

  async function call(body) {
    if (!session?.access_token) throw new Error("Your training session is unavailable. Please sign in again.");

    const response = await fetch(
      `${window.SCREENINGS4U_SUPABASE_URL}/functions/v1/lms-learner-documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: window.SCREENINGS4U_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(body),
        cache: "no-store"
      }
    );

    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!response.ok) {
      const err = data?.error;
      const message = typeof err === "string"
        ? err
        : (err?.message || data?.message || `Learning Center request failed (${response.status}).`);
      throw new Error(message);
    }
    return data;
  }

  function returnDestination() {
    const requested = new URLSearchParams(location.search).get("returnTo");
    if (!requested) return "lms-dashboard.html";

    try {
      const url = new URL(requested, location.origin);
      if (url.origin !== location.origin) return "lms-dashboard.html";
      if ((url.pathname.split("/").pop() || "").toLowerCase() === "lms-welcome.html") return "lms-dashboard.html";
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return "lms-dashboard.html";
    }
  }

  function consentIsComplete(data) {
    const consent = data?.consent || {};
    return Boolean(
      data?.hasDocument === true &&
      consent.consent_version === CONSENT_VERSION &&
      consent.accepted_terms === true &&
      consent.accepted_refund_policy === true &&
      consent.accepted_disclaimer === true &&
      consent.accepted_mock_requirements === true
    );
  }

  function setStatus(message, isError = false) {
    const node = $("consentStatus");
    if (!node) return;
    node.hidden = false;
    node.textContent = message;
    node.classList.toggle("error", isError);
  }

  function setButtonLoading(button, loading, label = "Submit Onboarding") {
    if (!button) return;
    button.disabled = loading;
    button.innerHTML = loading
      ? '<span class="s4u-inline-spinner" aria-hidden="true"></span><span>Submitting…</span>'
      : label;
  }

  function fillFromConsent(consent) {
    if (!consent) return;
    if ($("firstName")) $("firstName").value = consent.first_name || "";
    if ($("lastName")) $("lastName").value = consent.last_name || "";
    if ($("email")) $("email").value = consent.email || session?.user?.email || "";
    if ($("phone")) $("phone").value = consent.phone || "";
  }

  function markCompleted(consent) {
    fillFromConsent(consent);
    ["terms", "refund", "disclaimer", "mock"].forEach((id) => {
      const input = $(id);
      if (input) {
        input.checked = true;
        input.disabled = true;
      }
    });
    ["firstName", "lastName", "email", "phone"].forEach((id) => {
      const input = $(id);
      if (input) input.readOnly = true;
    });
    if ($("acceptBtn")) {
      $("acceptBtn").textContent = "Onboarding Completed";
      $("acceptBtn").disabled = true;
    }
    setStatus("Onboarding is complete. Your signed acknowledgment is available in Documents.");
  }

  async function initialize() {
    const authState = await window.S4UTrainingReady;
    if (!authState?.session) return;
    session = authState.session;

    const reason = new URLSearchParams(location.search).get("reason");
    if (reason === "verification") {
      setStatus("We could not verify a completed onboarding record, so course access remains locked until this form is completed.");
    }

    try {
      const state = await call({ action: "status" });
      if (consentIsComplete(state)) {
        // Completed learners should bypass Welcome entirely.
        location.replace(returnDestination());
        return;
      }
      if (state.consent && !state.hasDocument) {
        setStatus("Your acknowledgments were saved, but the signed document still needs to be finalized. Submit the form once more to finish onboarding.");
      }
    } catch (error) {
      console.warn("[Welcome] status check failed", error);
    }

    try {
      const db = window.getScreenings4uSupabase?.();
      if (db) {
        const { data: profile } = await db
          .from("user_profiles")
          .select("first_name,last_name,email,phone")
          .eq("id", session.user.id)
          .maybeSingle();

        if ($("firstName") && !$("firstName").value) $("firstName").value = profile?.first_name || "";
        if ($("lastName") && !$("lastName").value) $("lastName").value = profile?.last_name || "";
        if ($("email") && !$("email").value) $("email").value = profile?.email || session.user.email || "";
        if ($("phone") && !$("phone").value) $("phone").value = profile?.phone || "";
      }
    } catch (error) {
      console.warn("[Welcome] profile load failed", error);
    }

    const button = $("acceptBtn");
    if (!button) return;

    button.addEventListener("click", async () => {
      const values = {
        firstName: $("firstName")?.value.trim() || "",
        lastName: $("lastName")?.value.trim() || "",
        email: $("email")?.value.trim() || "",
        phone: $("phone")?.value.trim() || "",
        acceptedTerms: $("terms")?.checked === true,
        acceptedRefund: $("refund")?.checked === true,
        acceptedDisclaimer: $("disclaimer")?.checked === true,
        acceptedMock: $("mock")?.checked === true
      };

      if (!values.firstName || !values.lastName || !values.email) {
        setStatus("First name, last name, and email are required.", true);
        $("firstName")?.focus();
        return;
      }

      if (!values.acceptedTerms || !values.acceptedRefund || !values.acceptedDisclaimer || !values.acceptedMock) {
        setStatus("Please review and accept all four Learning Center acknowledgments before submitting.", true);
        return;
      }

      try {
        setStatus("Saving your onboarding acknowledgment…");
        setButtonLoading(button, true);

        // The Edge Function creates the signed PDF, document record, and notifications.
        const result = await call({ action: "consent", ...values });
        markCompleted(result.consent);

        setStatus("Onboarding complete. Your signed acknowledgment has been saved to Documents. Opening your Learning Center…");
        setTimeout(() => location.replace(returnDestination()), 450);
      } catch (error) {
        console.error("[Welcome] onboarding submit failed", error);
        setStatus(error?.message || "We could not complete onboarding. Please review the form and try again.", true);
        setButtonLoading(button, false);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
