/* ============================================================
   SCREENINGS4U LEARNING CENTER
   DYNAMIC LMS SIDEBAR
   Mimics the Customer Portal sidebar shell behavior while
   preserving Learning Center navigation and LMS class names.
   ============================================================ */

(function () {
  "use strict";

  const DESKTOP_BREAKPOINT = 860;

  // This navigation file may be loaded normally or injected by the portal shell.
  // If DOMContentLoaded has already fired, waiting for it again leaves the
  // mobile toggle unbound. Initialize immediately in that case.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLmsSidebar, {
      once: true
    });
  } else {
    initializeLmsSidebar();
  }

  /* ============================================================
     INITIALIZE
     ============================================================ */

  function initializeLmsSidebar() {
    if (document.documentElement.dataset.lmsNavigationInitialized === "true") {
      return;
    }

    document.documentElement.dataset.lmsNavigationInitialized = "true";

    injectLmsSidebar();
    injectMobileDropdownNavigation();
    setActiveNavigation();
    initializeMobileNavigation();
  }


  /* ============================================================
     SIDEBAR
     ============================================================ */

  function injectLmsSidebar() {
    const sidebarTarget = document.getElementById(
      "lms-sidebar-target"
    );

    if (!sidebarTarget) {
      return;
    }

    sidebarTarget.innerHTML = getSidebarMarkup();
  }


  /* ============================================================
     SIDEBAR MARKUP
     ============================================================ */

  function getSidebarMarkup() {
    return `
      <aside
        class="lms-sidebar"
        id="lms-sidebar"
        aria-label="Learning navigation"
      >
        <div class="lms-sidebar-inner">

          <!-- =================================================
               BRAND
               ================================================= -->

          <div class="lms-sidebar-brand">

            <a
              href="lms-dashboard.html"
              class="lms-brand"
              aria-label="Screenings4u Learning Center"
            >
              <img
                src="images/logo2.png"
                alt="screenings4u"
                class="lms-brand-logo"
              />

              <div class="lms-brand-copy">
                <span class="lms-brand-subtitle">
                  Learning Center
                </span>
              </div>
            </a>
          </div>


          <!-- =================================================
               NAVIGATION
               ================================================= -->

          <div class="lms-sidebar-scroll">


            <!-- LEARNING -->

            <div class="lms-nav-group">

              <span class="lms-nav-label">
                Learning
              </span>

              <nav class="lms-nav">

                <!-- HOME -->

                <a
                  href="lms-dashboard.html"
                  class="lms-nav-link"
                  data-lms-page="lms-dashboard.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 10.5 12 3l9 7.5"></path>
                      <path d="M5 9.5V21h14V9.5"></path>
                      <path d="M9 21v-6h6v6"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    Home
                  </span>
                </a>


                <!-- MY LEARNING -->

                <a
                  href="lms-my-courses.html"
                  class="lms-nav-link"
                  data-lms-page="lms-my-courses.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="16"
                        rx="2"
                      ></rect>
                      <path d="M7 8h10"></path>
                      <path d="M7 12h7"></path>
                      <path d="M7 16h5"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    My Learning
                  </span>
                </a>


                <!-- COURSE LIBRARY -->

                <a
                  href="lms-courses.html"
                  class="lms-nav-link"
                  data-lms-page="lms-courses.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"></path>
                      <path d="M4 5.5v16"></path>
                      <path d="M8 7h8"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    Course Library
                  </span>
                </a>

              </nav>

            </div>


            <!-- TRACK -->

            <div class="lms-nav-group">

              <span class="lms-nav-label">
                Track
              </span>

              <nav class="lms-nav">

                <!-- PROGRESS -->

                <a
                  href="lms-progress.html"
                  class="lms-nav-link"
                  data-lms-page="lms-progress.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 19V9"></path>
                      <path d="M10 19V5"></path>
                      <path d="M16 19v-7"></path>
                      <path d="M22 19V3"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    Progress
                  </span>
                </a>


                <!-- CERTIFICATES -->

                <a
                  href="lms-certificates.html"
                  class="lms-nav-link"
                  data-lms-page="lms-certificates.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle
                        cx="12"
                        cy="8"
                        r="5"
                      ></circle>
                      <path d="m8.5 12.5-1 8L12 18l4.5 2.5-1-8"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    Certificates
                  </span>
                </a>

              </nav>

            </div>


            <!-- ACCOUNT -->

            <div class="lms-nav-group">

              <span class="lms-nav-label">
                Account
              </span>

              <nav class="lms-nav">

                <!-- MY ACCOUNT -->

                <a
                  href="lms-account.html"
                  class="lms-nav-link"
                  data-lms-page="lms-account.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle
                        cx="12"
                        cy="8"
                        r="4"
                      ></circle>
                      <path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    My Account
                  </span>
                </a>


                <!-- TRAINING SUPPORT -->

                <a
                  href="lms-support.html"
                  class="lms-nav-link"
                  data-lms-page="lms-support.html"
                >
                  <span class="lms-nav-icon">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="9"></circle>
                      <path d="M9.5 9a2.7 2.7 0 0 1 5.2 1c0 2-2.7 2.3-2.7 4"></path>
                      <path d="M12 18h.01"></path>
                    </svg>
                  </span>

                  <span class="lms-nav-text">
                    Support
                  </span>
                </a>

              </nav>

            </div>

          </div>


          <!-- =================================================
               SIDEBAR FOOTER
               ================================================= -->

          <div class="lms-sidebar-footer">

            <div class="lms-sidebar-footer-links">

              <!-- BACK TO MAIN WEBSITE -->

              <a
                href="https://screenings4u.com"
                class="lms-return-link"
              >
                <span class="lms-nav-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 12H5"></path>
                    <path d="m12 19-7-7 7-7"></path>
                  </svg>
                </span>

                <span class="lms-return-text">
                  Back to Screenings4u
                </span>
              </a>
            </div>

          </div>

        </div>
      </aside>


      <!-- MOBILE OVERLAY -->

      <div
        class="lms-sidebar-overlay"
        id="lms-sidebar-overlay"
        data-lms-sidebar-overlay
        aria-hidden="true"
      ></div>
    `;
  }




  /* ============================================================
     ACTIVE NAVIGATION
     ============================================================ */

  function setActiveNavigation() {
    const current = currentPageName();

    document
      .querySelectorAll("[data-lms-page]")
      .forEach(function (link) {
        const page =
          String(link.dataset.lmsPage || "")
            .split("?")[0]
            .split("#")[0];

        const isActive = page === current;

        link.classList.toggle("active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });

  }

  /* ============================================================
     MOBILE DROPDOWN NAVIGATION
     ============================================================ */

  function injectMobileDropdownNavigation() {
    if (
      document.getElementById(
        "lms-mobile-dropdown"
      )
    ) {
      return;
    }

    if (!document.body) {
      return;
    }

    const backdrop =
      document.createElement("div");

    backdrop.id =
      "lms-mobile-dropdown-backdrop";

    backdrop.className =
      "lms-mobile-dropdown-backdrop";

    backdrop.hidden = true;


    const dropdown =
      document.createElement("div");

    dropdown.id =
      "lms-mobile-dropdown";

    dropdown.className =
      "lms-mobile-dropdown";

    dropdown.hidden = true;

    dropdown.setAttribute(
      "role",
      "navigation"
    );

    dropdown.setAttribute(
      "aria-label",
      "Learning Center navigation"
    );


    document.body.append(
      backdrop,
      dropdown
    );

    injectMobileStyles();
  }


  function rebuildMobileDropdown() {
    const sidebar =
      document.getElementById(
        "lms-sidebar"
      );

    const dropdown =
      document.getElementById(
        "lms-mobile-dropdown"
      );

    if (!sidebar || !dropdown) {
      return;
    }

    dropdown.innerHTML = "";

    const groups =
      sidebar.querySelectorAll(
        ".lms-nav-group"
      );

    groups.forEach(function (group) {
      const links =
        group.querySelectorAll(
          ".lms-nav-link"
        );

      if (!links.length) {
        return;
      }

      const section =
        document.createElement("section");

      section.className =
        "lms-mobile-dropdown-section";

      const sourceLabel =
        group.querySelector(
          ".lms-nav-label"
        );

      if (sourceLabel) {
        const heading =
          document.createElement("div");

        heading.className =
          "lms-mobile-dropdown-label";

        heading.textContent =
          sourceLabel.textContent.trim();

        section.appendChild(heading);
      }

      links.forEach(function (sourceLink) {
        const link =
          document.createElement("a");

        link.href =
          sourceLink.getAttribute("href") || "#";

        link.className =
          "lms-mobile-dropdown-link";

        const text =
          sourceLink.querySelector(
            ".lms-nav-text"
          );

        link.textContent =
          text
            ? text.textContent.trim()
            : sourceLink.textContent
                .replace(/\s+/g, " ")
                .trim();

        if (
          sourceLink.classList.contains(
            "active"
          )
        ) {
          link.classList.add("active");

          link.setAttribute(
            "aria-current",
            "page"
          );
        }

        section.appendChild(link);
      });

      dropdown.appendChild(section);
    });


    const footer =
      sidebar.querySelector(
        ".lms-sidebar-footer"
      );

    const returnLink =
      footer
        ? footer.querySelector(
            ".lms-return-link"
          )
        : null;

    if (returnLink) {
      const section =
        document.createElement("section");

      section.className =
        "lms-mobile-dropdown-section lms-mobile-dropdown-return";

      const link =
        document.createElement("a");

      link.href =
        returnLink.getAttribute("href") || "#";

      link.className =
        "lms-mobile-dropdown-link";

      const text =
        returnLink.querySelector(
          ".lms-return-text"
        );

      link.textContent =
        text
          ? text.textContent.trim()
          : "Back to Screenings4u";

      section.appendChild(link);
      dropdown.appendChild(section);
    }
  }


  function injectMobileStyles() {
    if (
      document.getElementById(
        "lms-mobile-dropdown-styles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "lms-mobile-dropdown-styles";

    style.textContent = `
      @media (max-width: ${DESKTOP_BREAKPOINT}px) {

        /*
         * Mobile uses the dropdown only.
         * The desktop Learning Center sidebar is completely hidden.
         */
        .lms-sidebar,
        #lms-sidebar,
        .lms-sidebar-overlay,
        #lms-sidebar-overlay {
          display: none !important;
        }

        body.sidebar-open {
          overflow: auto !important;
        }

        .lms-main,
        .lms-content,
        main {
          width: 100% !important;
          max-width: 100% !important;
          margin-left: 0 !important;
        }

        .lms-mobile-dropdown-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9998;
          background: rgba(17, 36, 67, .18);
        }

        .lms-mobile-dropdown {
          position: fixed;
          left: 12px;
          right: 12px;
          top: 76px;
          z-index: 9999;

          overflow-y: auto;
          overscroll-behavior: contain;

          background: #ffffff;
          border: 1px solid #d8e0ec;
          border-radius: 12px;
          box-shadow: 0 18px 42px rgba(18, 45, 82, .18);
        }

        .lms-mobile-dropdown[hidden],
        .lms-mobile-dropdown-backdrop[hidden] {
          display: none !important;
        }

        .lms-mobile-dropdown-section {
          padding: 8px;
          border-bottom: 1px solid #edf1f5;
        }

        .lms-mobile-dropdown-section:last-child {
          border-bottom: 0;
        }

        .lms-mobile-dropdown-label {
          padding: 8px 10px 6px;
          color: #748197;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .lms-mobile-dropdown-link {
          display: flex;
          align-items: center;
          min-height: 42px;
          padding: 0 10px;
          border-radius: 8px;
          color: #273348;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
        }

        .lms-mobile-dropdown-link:hover,
        .lms-mobile-dropdown-link.active {
          background: #f2f6fb;
          color: #173d78;
        }

        [data-lms-menu-toggle][aria-expanded="true"] {
          background: #f2f6fb;
        }
      }


      @media (min-width: ${DESKTOP_BREAKPOINT + 1}px) {
        .lms-mobile-dropdown,
        .lms-mobile-dropdown-backdrop {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }


  function positionMobileDropdown(
    button,
    dropdown
  ) {
    const header =
      button.closest(
        ".lms-topbar, .lms-header, header"
      );

    const referenceRect =
      header
        ? header.getBoundingClientRect()
        : button.getBoundingClientRect();

    const top =
      Math.max(
        8,
        Math.round(
          referenceRect.bottom + 8
        )
      );

    dropdown.style.top =
      top + "px";

    dropdown.style.maxHeight =
      "calc(100vh - " +
      (top + 12) +
      "px)";
  }


  /* ============================================================
     DESKTOP SIDEBAR
     ============================================================

     The Learning Center stylesheet already owns the desktop sidebar
     presentation. Do not inject Customer Portal collapse/reopen controls
     here because those controls use different CSS classes.
  */


  /* ============================================================
     MOBILE NAVIGATION
     ============================================================ */

  function initializeMobileNavigation() {
    const button =
      document.querySelector(
        "[data-lms-menu-toggle]"
      );

    const dropdown =
      document.getElementById(
        "lms-mobile-dropdown"
      );

    const backdrop =
      document.getElementById(
        "lms-mobile-dropdown-backdrop"
      );

    if (!button || !dropdown) {
      return;
    }

    button.setAttribute(
      "aria-controls",
      "lms-mobile-dropdown"
    );

    button.setAttribute(
      "aria-expanded",
      "false"
    );


    function closeMenu() {
      dropdown.hidden = true;

      if (backdrop) {
        backdrop.hidden = true;
      }

      button.setAttribute(
        "aria-expanded",
        "false"
      );

      button.setAttribute(
        "aria-label",
        "Open navigation"
      );
    }


    function openMenu() {
      rebuildMobileDropdown();

      positionMobileDropdown(
        button,
        dropdown
      );

      if (backdrop) {
        backdrop.hidden = false;
      }

      dropdown.hidden = false;

      button.setAttribute(
        "aria-expanded",
        "true"
      );

      button.setAttribute(
        "aria-label",
        "Close navigation"
      );
    }


    button.addEventListener(
      "click",
      function (event) {
        if (
          window.innerWidth >
          DESKTOP_BREAKPOINT
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const isOpen =
          button.getAttribute(
            "aria-expanded"
          ) === "true";

        if (isOpen) {
          closeMenu();
        } else {
          openMenu();
        }
      }
    );


    dropdown.addEventListener(
      "click",
      function (event) {
        event.stopPropagation();

        const link =
          event.target.closest("a");

        if (link) {
          closeMenu();
        }
      }
    );


    if (backdrop) {
      backdrop.addEventListener(
        "click",
        closeMenu
      );
    }


    document.addEventListener(
      "click",
      function (event) {
        if (
          window.innerWidth <=
            DESKTOP_BREAKPOINT &&
          !dropdown.contains(event.target) &&
          !button.contains(event.target)
        ) {
          closeMenu();
        }
      }
    );


    document.addEventListener(
      "keydown",
      function (event) {
        if (event.key === "Escape") {
          closeMenu();
        }
      }
    );


    window.addEventListener(
      "resize",
      closeMenu
    );
  }

})();
