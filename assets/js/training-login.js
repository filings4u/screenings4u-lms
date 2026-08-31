(() => {
  "use strict";

  const DASHBOARD_PAGE = "lms-dashboard.html";
  const RESET_PAGE = "training-reset-password.html";

  const form = document.getElementById("trainingLoginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("loginButton");
  const loginStatus = document.getElementById("loginStatus");
  const passwordToggle = document.getElementById("passwordToggle");
  const forgotPasswordButton = document.getElementById("forgotPasswordBtn");
  const currentYear = document.getElementById("currentYear");

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  function setStatus(message, type = "") {
    if (!loginStatus) return;
    loginStatus.textContent = message || "";
    loginStatus.className = `login-status${type ? ` ${type}` : ""}`;
  }

  function setLoading(isLoading) {
    if (!loginButton) return;
    loginButton.disabled = Boolean(isLoading);
    loginButton.textContent = isLoading
      ? "VERIFYING TRAINING ACCESS..."
      : "SIGN IN TO TRAINING PORTAL";
  }

  function getAuth() {
    const auth = window.S4UAuth;

    if (
      !auth ||
      typeof auth.signInToPortal !== "function" ||
      typeof auth.initialize !== "function" ||
      typeof auth.hasRole !== "function" ||
      typeof auth.getClient !== "function"
    ) {
      throw new Error(
        "The training authentication service is unavailable. Please refresh the page."
      );
    }

    return auth;
  }

  function bindPasswordToggle() {
    if (!passwordToggle || !passwordInput) return;

    passwordToggle.addEventListener("click", () => {
      const showPassword = passwordInput.type === "password";

      passwordInput.type = showPassword ? "text" : "password";
      passwordToggle.setAttribute(
        "aria-label",
        showPassword ? "Hide password" : "Show password"
      );
      passwordToggle.setAttribute(
        "aria-pressed",
        showPassword ? "true" : "false"
      );
    });
  }

  function bindForgotPassword() {
    if (!forgotPasswordButton || !emailInput) return;

    forgotPasswordButton.addEventListener("click", async () => {
      const address = emailInput.value.trim();

      if (!address) {
        setStatus("Enter your email address first.", "error");
        emailInput.focus();
        return;
      }

      forgotPasswordButton.disabled = true;
      setStatus("Sending password reset instructions...");

      try {
        const auth = getAuth();
        const client = auth.getClient();
        const redirectTo = new URL(RESET_PAGE, window.location.href).href;

        const { error } = await client.auth.resetPasswordForEmail(address, {
          redirectTo
        });

        if (error) throw error;

        setStatus(
          "Password reset instructions have been sent if that account exists.",
          "success"
        );
      } catch (error) {
        console.error("[Training Login] Password reset failed:", error);
        setStatus(
          "Unable to send password reset instructions right now.",
          "error"
        );
      } finally {
        forgotPasswordButton.disabled = false;
      }
    });
  }

  async function redirectExistingTrainingSession() {
    try {
      const auth = getAuth();
      const state = await auth.initialize({ force: true });

      if (!state?.user?.id) {
        return;
      }

      const allowed = await auth.hasRole("training", state.user.id);

      if (allowed) {
        window.location.replace(DASHBOARD_PAGE);
      }
    } catch (error) {
      // Do not sign out here. A temporary authorization/network failure on the
      // login page must not destroy an otherwise valid session.
      console.warn(
        "[Training Login] Existing training session could not be verified:",
        error
      );
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const address = emailInput?.value?.trim() || "";
    const secret = passwordInput?.value || "";

    if (!address || !secret) {
      setStatus("Enter your email and password.", "error");
      return;
    }

    setLoading(true);
    setStatus("Verifying your training access...");

    try {
      const auth = getAuth();

      // signInToPortal("training") already performs all of the required work:
      // 1. signs the user in,
      // 2. loads the current auth state,
      // 3. calls can_access_training_portal(),
      // 4. rejects and signs out only when training access is explicitly denied.
      const result = await auth.signInToPortal("training", address, secret);

      if (!result?.state?.user?.id) {
        throw new Error("We could not verify your training account.");
      }

      setStatus(
        "Access verified. Opening the Learning Center...",
        "success"
      );

      window.location.replace(DASHBOARD_PAGE);
    } catch (error) {
      console.error("[Training Login] Sign-in failed:", error);

      // Do NOT sign out again here. signInToPortal() already signs out when
      // access is explicitly denied. A second signOut() in this catch block
      // was causing valid training sessions to be destroyed after login.
      setStatus(
        error?.message ||
          "Unable to sign in. Please check your credentials and try again.",
        "error"
      );

      setLoading(false);
    }
  }

  function initializeTrainingLogin() {
    if (!form) {
      console.error("[Training Login] #trainingLoginForm was not found.");
      return;
    }

    try {
      getAuth();
    } catch (error) {
      console.error("[Training Login] Initialization failed:", error);
      setStatus(error.message, "error");
      setLoading(false);
      return;
    }

    bindPasswordToggle();
    bindForgotPassword();
    form.addEventListener("submit", handleSubmit);

    redirectExistingTrainingSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTrainingLogin, {
      once: true
    });
  } else {
    initializeTrainingLogin();
  }
})();
