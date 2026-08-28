/* ============================================================
   SCREENINGS4U LEARNING CENTER
   SHARED LMS APPLICATION JAVASCRIPT
   ============================================================ */

(function () {
  "use strict";


  /* ==========================================================
     INITIALIZATION
     ========================================================== */

  function initializeLms() {

    initializeNavigation();
    initializeActiveNavigation();
    initializeUserMenu();
    initializeSearchShortcut();
    initializeSignOut();

  }


  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      initializeLms
    );

  } else {

    initializeLms();

  }


  /* ==========================================================
     NAVIGATION
     ========================================================== */

  function initializeNavigation() {

    var menuButton =
      document.querySelector(
        "[data-lms-menu-toggle]"
      );

    var overlay =
      document.querySelector(
        "[data-lms-sidebar-overlay]"
      );


    if (menuButton) {

      menuButton.addEventListener(
        "click",
        function () {

          /*
           * Mobile navigation
           */

          if (window.innerWidth <= 860) {

            document.body.classList.toggle(
              "lms-navigation-open"
            );

            return;

          }


          /*
           * Desktop navigation
           */

          document.body.classList.toggle(
            "lms-nav-collapsed"
          );

        }
      );

    }


    if (overlay) {

      overlay.addEventListener(
        "click",
        closeMobileNavigation
      );

    }


    document.addEventListener(
      "keydown",
      function (event) {

        if (event.key === "Escape") {

          closeMobileNavigation();

        }

      }
    );


    window.addEventListener(
      "resize",
      function () {

        if (window.innerWidth > 860) {

          closeMobileNavigation();

        }

      }
    );

  }


  function closeMobileNavigation() {

    document.body.classList.remove(
      "lms-navigation-open"
    );

  }


  /* ==========================================================
     ACTIVE NAVIGATION
     ========================================================== */

  function initializeActiveNavigation() {

    var currentPage =
      window.location.pathname
        .split("/")
        .pop();


    if (!currentPage) {

      currentPage =
        "lms-dashboard.html";

    }


    var links =
      document.querySelectorAll(
        ".lms-nav-link"
      );


    links.forEach(
      function (link) {

        var href =
          link.getAttribute("href");


        if (!href) {

          return;

        }


        var cleanHref =
          href
            .split("?")[0]
            .split("#")[0];


        if (cleanHref === currentPage) {

          link.classList.add(
            "active"
          );

        } else {

          link.classList.remove(
            "active"
          );

        }


        link.addEventListener(
          "click",
          function () {

            if (window.innerWidth <= 860) {

              closeMobileNavigation();

            }

          }
        );

      }
    );

  }


  /* ==========================================================
     USER MENU
     ========================================================== */

  function initializeUserMenu() {

    var userButton =
      document.querySelector(
        "[data-lms-user-button]"
      );


    var userMenu =
      document.querySelector(
        "[data-lms-user-menu]"
      );


    if (
      !userButton ||
      !userMenu
    ) {

      return;

    }


    userButton.addEventListener(
      "click",
      function (event) {

        event.stopPropagation();


        var isOpen =
          userMenu.classList.toggle(
            "is-open"
          );


        userButton.setAttribute(
          "aria-expanded",
          isOpen
            ? "true"
            : "false"
        );

      }
    );


    document.addEventListener(
      "click",
      function (event) {

        if (
          !userButton.contains(
            event.target
          ) &&
          !userMenu.contains(
            event.target
          )
        ) {

          userMenu.classList.remove(
            "is-open"
          );


          userButton.setAttribute(
            "aria-expanded",
            "false"
          );

        }

      }
    );

  }


  /* ==========================================================
     SEARCH SHORTCUT
     ========================================================== */

  function initializeSearchShortcut() {

    document.addEventListener(
      "keydown",
      function (event) {

        var isModifier =
          event.ctrlKey ||
          event.metaKey;


        if (
          isModifier &&
          event.key.toLowerCase() === "k"
        ) {

          event.preventDefault();


          var searchInput =
            document.querySelector(
              "[data-lms-search]"
            );


          if (searchInput) {

            searchInput.focus();

          }

        }

      }
    );

  }


  /* ==========================================================
     LEARNER PROFILE
     ========================================================== */

  function setLearnerProfile(profile) {

    profile =
      profile || {};


    var name =
      profile.name ||
      "John Doe";


    var email =
      profile.email ||
      "";


    var initials =
      profile.initials ||
      getInitials(name);


    updateElements(
      "[data-lms-learner-name]",
      name
    );


    updateElements(
      "[data-lms-learner-initials]",
      initials
    );


    updateElements(
      "[data-lms-user-menu-name]",
      name
    );


    updateElements(
      "[data-lms-user-menu-email]",
      email
    );

  }


  function updateElements(
    selector,
    value
  ) {

    document
      .querySelectorAll(selector)
      .forEach(
        function (element) {

          element.textContent =
            value;

        }
      );

  }


  function getInitials(name) {

    if (!name) {

      return "JD";

    }


    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(
        function (part) {

          return part
            .charAt(0)
            .toUpperCase();

        }
      )
      .join("");

  }


  /* ==========================================================
     SIGN OUT
     ========================================================== */

  function initializeSignOut() {

    var buttons =
      document.querySelectorAll(
        "[data-lms-sign-out]"
      );


    buttons.forEach(
      function (button) {

        button.addEventListener(
          "click",
          async function () {

            try {

              var client =
                getSupabaseClient();


              if (
                client &&
                client.auth &&
                typeof client.auth.signOut ===
                  "function"
              ) {

                await client.auth.signOut();

              }

            } catch (error) {

              console.error(
                "LMS sign out error:",
                error
              );

            }


            window.location.href =
              "lms.html";

          }
        );

      }
    );

  }


  /* ==========================================================
     SUPABASE
     ========================================================== */

  function getSupabaseClient() {

    if (
      window.supabaseClient &&
      window.supabaseClient.auth
    ) {

      return window.supabaseClient;

    }


    return null;

  }


  /* ==========================================================
     GLOBAL API
     ========================================================== */

  window.LMS =
    window.LMS || {};


  window.LMS.setLearnerProfile =
    setLearnerProfile;


  window.LMS.getInitials =
    getInitials;


  window.LMS.closeNavigation =
    closeMobileNavigation;


})();