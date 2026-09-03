/* ============================================================
   SCREENINGS4U LEARNING CENTER
   DYNAMIC LMS SIDEBAR
   Mimics the Customer Portal sidebar shell behavior while
   preserving Learning Center navigation and LMS class names.
   ============================================================ */

(function () {
  "use strict";

  const DESKTOP_BREAKPOINT = 860;
  document.addEventListener("DOMContentLoaded", initializeLmsSidebar);

  /* ============================================================
     INITIALIZE
     ============================================================ */

  function initializeLmsSidebar() {
    injectLmsSidebar();
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
    const sidebar =
      document.getElementById(
        "lms-sidebar"
      );

    const overlay =
      document.getElementById(
        "lms-sidebar-overlay"
      );

    if (!sidebar || !overlay) {
      return;
    }

    /*
     * The LMS topbar already uses data-lms-menu-toggle.
     * Bind those buttons here so the sidebar owns its own
     * mobile open/close behavior just like customer-portal.js.
     */
    const menuButtons =
      document.querySelectorAll(
        "[data-lms-menu-toggle]"
      );

    menuButtons.forEach(function (button) {
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

          if (
            sidebar.classList.contains(
              "mobile-open"
            )
          ) {
            closeMobileSidebar();
          } else {
            openMobileSidebar();
          }
        }
      );
    });

    overlay.addEventListener(
      "click",
      closeMobileSidebar
    );

    const navigationLinks =
      sidebar.querySelectorAll(
        ".lms-nav-link, .lms-return-link"
      );

    navigationLinks.forEach(function (link) {
      link.addEventListener(
        "click",
        function () {
          if (
            window.innerWidth <=
            DESKTOP_BREAKPOINT
          ) {
            closeMobileSidebar();
          }
        }
      );
    });

    window.addEventListener(
      "resize",
      function () {
        if (
          window.innerWidth >
          DESKTOP_BREAKPOINT
        ) {
          closeMobileSidebar();
        }
      }
    );
  }


  function openMobileSidebar() {
    const sidebar =
      document.getElementById(
        "lms-sidebar"
      );

    const overlay =
      document.getElementById(
        "lms-sidebar-overlay"
      );

    if (!sidebar || !overlay) {
      return;
    }

    sidebar.classList.add(
      "mobile-open"
    );

    overlay.classList.add(
      "active"
    );

    overlay.setAttribute(
      "aria-hidden",
      "false"
    );

    document.body.classList.add(
      "sidebar-open"
    );
  }


  function closeMobileSidebar() {
    const sidebar =
      document.getElementById(
        "lms-sidebar"
      );

    const overlay =
      document.getElementById(
        "lms-sidebar-overlay"
      );

    if (sidebar) {
      sidebar.classList.remove(
        "mobile-open"
      );
    }

    if (overlay) {
      overlay.classList.remove(
        "active"
      );

      overlay.setAttribute(
        "aria-hidden",
        "true"
      );
    }

    document.body.classList.remove(
      "sidebar-open"
    );
  }


})();
