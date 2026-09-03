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
     MOBILE DROPDOWN NAVIGATION
     ============================================================ */

  function injectMobileDropdownNavigation() {
    if (document.getElementById("lms-mobile-nav")) return;

    const host =
      document.querySelector(".lms-main") ||
      document.querySelector("main") ||
      document.body;

    if (!host) return;

    const wrapper = document.createElement("div");
    wrapper.id = "lms-mobile-nav";
    wrapper.className = "lms-mobile-nav";
    wrapper.innerHTML = `
      <button type="button" class="lms-mobile-nav-toggle" id="lms-mobile-nav-toggle"
        aria-expanded="false" aria-controls="lms-mobile-nav-menu">
        <span class="lms-mobile-nav-toggle-copy">
          <small>Learning Center</small>
          <strong id="lms-mobile-nav-current">Navigation</strong>
        </span>
        <span class="lms-mobile-nav-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"></path></svg>
        </span>
      </button>

      <div class="lms-mobile-nav-menu" id="lms-mobile-nav-menu" hidden>
        <div class="lms-mobile-nav-section">
          <span>Learning</span>
          <a href="lms-dashboard.html" data-lms-page="lms-dashboard.html">Home</a>
          <a href="lms-my-courses.html" data-lms-page="lms-my-courses.html">My Learning</a>
          <a href="lms-courses.html" data-lms-page="lms-courses.html">Course Library</a>
        </div>

        <div class="lms-mobile-nav-section">
          <span>Track</span>
          <a href="lms-progress.html" data-lms-page="lms-progress.html">Progress</a>
          <a href="lms-certificates.html" data-lms-page="lms-certificates.html">Certificates</a>
        </div>

        <div class="lms-mobile-nav-section">
          <span>Account</span>
          <a href="lms-account.html" data-lms-page="lms-account.html">My Account</a>
          <a href="lms-support.html" data-lms-page="lms-support.html">Support</a>
        </div>

        <div class="lms-mobile-nav-section lms-mobile-nav-return">
          <a href="https://screenings4u.com">Back to Screenings4u</a>
        </div>
      </div>
    `;

    host.prepend(wrapper);
    injectMobileStyles();
    updateMobileCurrentLabel();
  }

  function injectMobileStyles() {
    if (document.getElementById("lms-mobile-nav-styles")) return;

    const style = document.createElement("style");
    style.id = "lms-mobile-nav-styles";
    style.textContent = `
      @media (max-width: ${DESKTOP_BREAKPOINT}px) {
        .lms-sidebar, #lms-sidebar,
        .lms-sidebar-overlay, #lms-sidebar-overlay {
          display: none !important;
        }

        body.sidebar-open { overflow: auto !important; }

        .lms-mobile-nav {
          display: block;
          width: 100%;
          padding: 12px 16px 0;
          position: relative;
          z-index: 70;
        }

        .lms-mobile-nav-toggle {
          width: 100%;
          min-height: 58px;
          border: 1px solid #d8e0ec;
          border-radius: 12px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 14px;
          color: #173d78;
          box-shadow: 0 8px 22px rgba(22,61,120,.08);
          cursor: pointer;
          text-align: left;
        }

        .lms-mobile-nav-toggle-copy { display: grid; gap: 2px; }

        .lms-mobile-nav-toggle-copy small {
          color: #ff6b00;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .09em;
          text-transform: uppercase;
        }

        .lms-mobile-nav-toggle-copy strong {
          color: #173d78;
          font-size: 15px;
          line-height: 1.25;
        }

        .lms-mobile-nav-toggle-icon {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 34px;
          border-radius: 9px;
          background: #f2f6fb;
          transition: transform .18s ease;
        }

        .lms-mobile-nav-toggle-icon svg {
          width: 18px;
          height: 18px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .lms-mobile-nav.open .lms-mobile-nav-toggle-icon {
          transform: rotate(180deg);
        }

        .lms-mobile-nav-menu {
          margin-top: 8px;
          border: 1px solid #d8e0ec;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 16px 35px rgba(16,45,88,.14);
          overflow: hidden;
        }

        .lms-mobile-nav-section {
          padding: 10px;
          border-bottom: 1px solid #edf1f5;
        }

        .lms-mobile-nav-section:last-child { border-bottom: 0; }

        .lms-mobile-nav-section > span {
          display: block;
          padding: 5px 8px 7px;
          color: #748197;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .lms-mobile-nav-section a {
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

        .lms-mobile-nav-section a:hover,
        .lms-mobile-nav-section a.active {
          background: #f2f6fb;
          color: #173d78;
        }

        .lms-main, .lms-content, main {
          margin-left: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        [data-lms-menu-toggle] { display: none !important; }
      }

      @media (min-width: ${DESKTOP_BREAKPOINT + 1}px) {
        .lms-mobile-nav { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function updateMobileCurrentLabel() {
    const current = currentPageName();
    const links = document.querySelectorAll("#lms-mobile-nav-menu [data-lms-page]");
    let label = "Navigation";

    links.forEach(function (link) {
      const page = String(link.dataset.lmsPage || "").split("?")[0];
      if (page === current) {
        link.classList.add("active");
        label = link.textContent.trim();
      } else {
        link.classList.remove("active");
      }
    });

    const node = document.getElementById("lms-mobile-nav-current");
    if (node) node.textContent = label;
  }

  function currentPageName() {
    const path = String(location.pathname || "");
    return path.split("/").pop() || "lms-dashboard.html";
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
    const wrapper = document.getElementById("lms-mobile-nav");
    const toggle = document.getElementById("lms-mobile-nav-toggle");
    const menu = document.getElementById("lms-mobile-nav-menu");

    if (!wrapper || !toggle || !menu) return;

    function closeMenu() {
      wrapper.classList.remove("open");
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }

    function openMenu() {
      wrapper.classList.add("open");
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    }

    toggle.addEventListener("click", function (event) {
      if (window.innerWidth > DESKTOP_BREAKPOINT) return;
      event.preventDefault();
      menu.hidden ? openMenu() : closeMenu();
    });

    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", function (event) {
      if (
        window.innerWidth <= DESKTOP_BREAKPOINT &&
        !wrapper.contains(event.target)
      ) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > DESKTOP_BREAKPOINT) closeMenu();
    });
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
