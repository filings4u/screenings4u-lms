(() => {
  "use strict";

  const DASHBOARD_PAGE = "lms-dashboard.html";
  const RESET_PAGE = "reset-password.html";

  const BLOCKED_RETURN_PAGES = new Set([
    "training-login.html",
    "reset-password.html"
  ]);

  const form =
    document.getElementById("trainingLoginForm");

  const emailInput =
    document.getElementById("email");

  const passwordInput =
    document.getElementById("password");

  const loginButton =
    document.getElementById("loginButton");

  const loginStatus =
    document.getElementById("loginStatus");

  const passwordToggle =
    document.getElementById("passwordToggle");

  const forgotPasswordButton =
    document.getElementById("forgotPasswordBtn");

  const currentYear =
    document.getElementById("currentYear");


  if (currentYear) {
    currentYear.textContent =
      new Date().getFullYear();
  }


  function setStatus(message, type = "") {
    if (!loginStatus) {
      return;
    }

    loginStatus.textContent =
      message || "";

    loginStatus.className =
      `login-status${type ? ` ${type}` : ""}`;
  }


  function setLoading(isLoading) {
    if (!loginButton) {
      return;
    }

    loginButton.disabled =
      Boolean(isLoading);

    loginButton.textContent =
      isLoading
        ? "VERIFYING TRAINING ACCESS..."
        : "SIGN IN TO TRAINING PORTAL";
  }


  function getAuth() {
    const auth =
      window.S4UAuth;

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


  /*
   * ==========================================================
   * SAFE RETURN-TO SUPPORT
   * ==========================================================
   *
   * Accepted:
   *
   *   ?returnTo=course-player.html?course=123
   *
   * Rejected:
   *
   *   https://evil.example/
   *   //evil.example/
   *   javascript:...
   *
   * The final destination must remain on the
   * training.screenings4u.com origin.
   */

  function getSafeReturnTo() {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const raw =
      params.get("returnTo");

    if (!raw) {
      return null;
    }

    try {
      const target =
        new URL(
          raw,
          window.location.origin + "/"
        );

      if (
        target.origin !==
        window.location.origin
      ) {
        return null;
      }

      const filename =
        target.pathname
          .split("/")
          .filter(Boolean)
          .pop()
          ?.toLowerCase() || "";

      if (
        BLOCKED_RETURN_PAGES.has(
          filename
        )
      ) {
        return null;
      }

      return (
        target.pathname +
        target.search +
        target.hash
      );

    } catch {
      return null;
    }
  }


  function getDestination() {
    return (
      getSafeReturnTo() ||
      DASHBOARD_PAGE
    );
  }


  function openDestination() {
    window.location.replace(
      getDestination()
    );
  }


  function bindPasswordToggle() {
    if (
      !passwordToggle ||
      !passwordInput
    ) {
      return;
    }

    passwordToggle.addEventListener(
      "click",
      () => {
        const showPassword =
          passwordInput.type ===
          "password";

        passwordInput.type =
          showPassword
            ? "text"
            : "password";

        passwordToggle.setAttribute(
          "aria-label",
          showPassword
            ? "Hide password"
            : "Show password"
        );

        passwordToggle.setAttribute(
          "aria-pressed",
          showPassword
            ? "true"
            : "false"
        );
      }
    );
  }


  function bindForgotPassword() {
    if (
      !forgotPasswordButton ||
      !emailInput
    ) {
      return;
    }

    forgotPasswordButton.addEventListener(
      "click",
      async () => {
        const address =
          emailInput.value.trim();

        if (!address) {
          setStatus(
            "Enter your email address first.",
            "error"
          );

          emailInput.focus();

          return;
        }

        forgotPasswordButton.disabled =
          true;

        setStatus(
          "Sending password reset instructions..."
        );

        try {
          const auth =
            getAuth();

          const client =
            auth.getClient();

          const resetUrl =
            new URL(
              RESET_PAGE,
              window.location.origin + "/"
            );

          const returnTo =
            getSafeReturnTo();

          /*
           * Preserve the originally requested Training page
           * through password recovery as well.
           */

          if (returnTo) {
            resetUrl.searchParams.set(
              "returnTo",
              returnTo
            );
          }

          const { error } =
            await client.auth
              .resetPasswordForEmail(
                address,
                {
                  redirectTo:
                    resetUrl.href
                }
              );

          if (error) {
            throw error;
          }

          setStatus(
            "Password reset instructions have been sent if that account exists.",
            "success"
          );

        } catch (error) {
          console.error(
            "[Training Login] Password reset failed:",
            error
          );

          setStatus(
            "Unable to send password reset instructions right now.",
            "error"
          );

        } finally {
          forgotPasswordButton.disabled =
            false;
        }
      }
    );
  }


  async function redirectExistingTrainingSession() {
    try {
      const auth =
        getAuth();

      const state =
        await auth.initialize({
          force: true
        });

      if (!state?.user?.id) {
        return;
      }

      const allowed =
        await auth.hasRole(
          "training",
          state.user.id
        );

      if (allowed) {
        openDestination();
      }

    } catch (error) {
      /*
       * Do not sign out here.
       *
       * A temporary authorization/network failure
       * must not destroy an otherwise valid session.
       */

      console.warn(
        "[Training Login] Existing training session could not be verified:",
        error
      );
    }
  }


  async function handleSubmit(event) {
    event.preventDefault();

    const address =
      emailInput?.value?.trim() || "";

    const secret =
      passwordInput?.value || "";

    if (
      !address ||
      !secret
    ) {
      setStatus(
        "Enter your email and password.",
        "error"
      );

      return;
    }

    setLoading(true);

    setStatus(
      "Verifying your training access..."
    );

    try {
      const auth =
        getAuth();

      /*
       * signInToPortal("training"):
       *
       * 1. authenticates the user
       * 2. initializes fresh auth state
       * 3. verifies Training access
       * 4. rejects explicitly unauthorized users
       */

      const result =
        await auth.signInToPortal(
          "training",
          address,
          secret
        );

      if (
        !result?.state?.user?.id
      ) {
        throw new Error(
          "We could not verify your training account."
        );
      }

      setStatus(
        "Access verified. Opening the Learning Center...",
        "success"
      );

      /*
       * Return to the originally requested page when
       * present, otherwise open the Training dashboard.
       */

      openDestination();

    } catch (error) {
      console.error(
        "[Training Login] Sign-in failed:",
        error
      );

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
      console.error(
        "[Training Login] #trainingLoginForm was not found."
      );

      return;
    }

    try {
      getAuth();

    } catch (error) {
      console.error(
        "[Training Login] Initialization failed:",
        error
      );

      setStatus(
        error.message,
        "error"
      );

      setLoading(false);

      return;
    }

    bindPasswordToggle();

    bindForgotPassword();

    form.addEventListener(
      "submit",
      handleSubmit
    );

    redirectExistingTrainingSession();
  }


  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initializeTrainingLogin,
      {
        once: true
      }
    );

  } else {
    initializeTrainingLogin();
  }

})();