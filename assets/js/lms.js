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
    initializeUserMenu();
    initializeSearchShortcut();
    initializeSignOut();

    initializeAuthenticatedLearner()
      .then(function () {
        initializeActiveNavigation();
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
    var client = await getSupabaseClient();
    authState.client = client;

    var result = await client.auth.getUser();
    var user = result && result.data ? result.data.user : null;

    if (result.error || !user) {
      window.location.replace("lms.html");
      throw result.error || new Error("No authenticated learner session.");
    }

    authState.user = user;

    var profileResult = await client
      .from("user_profiles")
      .select("id,first_name,last_name,display_name,email,phone,avatar_path,is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (profileResult.error) {
      console.warn("[LMS] Profile could not be loaded:", profileResult.error);
    }

    var profile = profileResult.data || {
      id: user.id,
      email: user.email || ""
    };

    if (profile.is_active === false) {
      await client.auth.signOut();
      window.location.replace("lms.html");
      throw new Error("This account is inactive.");
    }

    authState.profile = profile;

    setLearnerProfile({
      name:
        profile.display_name ||
        [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
        user.email ||
        "Learner",
      email: profile.email || user.email || ""
    });
  }

  function initializeNavigation() {
    var menuButton = document.querySelector("[data-lms-menu-toggle]");
    var overlay = document.querySelector("[data-lms-sidebar-overlay]");

    if (menuButton) {
      menuButton.addEventListener("click", function () {
        if (window.innerWidth <= 860) {
          document.body.classList.toggle("lms-navigation-open");
          return;
        }

        document.body.classList.toggle("lms-nav-collapsed");
      });
    }

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

    var target = document.getElementById("lms-sidebar-target");
    if (target) {
      var observer = new MutationObserver(update);
      observer.observe(target, { childList: true, subtree: true });
    }
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
        try {
          var client = await getSupabaseClient();
          await client.auth.signOut();
        } catch (error) {
          console.error("[LMS] Sign out error:", error);
        }

        window.location.href = "lms.html";
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
  window.LMS.getCurrentUser = function () {
    return authState.user;
  };
  window.LMS.getProfile = function () {
    return authState.profile;
  };
})();
