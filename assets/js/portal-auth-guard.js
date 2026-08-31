/* SCREENINGS4U — STRICT PORTAL AUTH GUARD */
(() => {
  "use strict";

  async function protectPortal({
    portal,
    loginPage = null
  } = {}) {
    if (!portal) {
      throw new Error(
        "Portal name is required."
      );
    }

    const destination =
      loginPage ||
      window.S4UAuth?.getLoginForPortal?.(
        portal
      ) ||
      `${portal}-login.html`;

    try {
      const state =
        await window.S4UAuth.requireAuth({
          portal,
          loginPage:
            destination
        });

      if (!state) {
        return null;
      }

      document.documentElement
        .classList
        .remove(
          "s4u-auth-pending"
        );

      document.documentElement
        .classList
        .add(
          "s4u-authenticated"
        );

      window.dispatchEvent(
        new CustomEvent(
          "s4u:authenticated",
          {
            detail:
              state
          }
        )
      );

      return state;

    } catch (error) {
      console.error(
        `[${portal} portal guard]`,
        error
      );

      document.documentElement
        .classList
        .remove("s4u-auth-pending");

      document.documentElement
        .classList
        .add("s4u-auth-error");

      window.dispatchEvent(
        new CustomEvent("s4u:auth-error", {
          detail: { portal, error }
        })
      );

      // IMPORTANT: an RPC/network/config error is not proof that the
      // user is unauthorized. Do not destroy a valid Supabase session.
      return null;
    }
  }

  window.S4UPortalGuard =
    Object.freeze({
      protectPortal
    });
})();
