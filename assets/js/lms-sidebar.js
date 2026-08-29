/* ============================================================
   SCREENINGS4U LEARNING CENTER
   DYNAMIC SIDEBAR
   ============================================================ */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", initializeLmsSidebar);

  function initializeLmsSidebar() {
    const sidebarTarget = document.getElementById(
      "lms-sidebar-target"
    );

    if (!sidebarTarget) {
      return;
    }

    sidebarTarget.innerHTML = getSidebarMarkup();

    setActiveNavigation();
  }


  /* ============================================================
     SIDEBAR MARKUP
     ============================================================ */

  function getSidebarMarkup() {
    return `
      <!-- ======================================================
           SIDEBAR
           ====================================================== -->

      <aside
        class="lms-sidebar"
        aria-label="Learning navigation"
      >

        <div class="lms-sidebar-inner">


          <!-- BRAND -->

          <a
            href="lms-dashboard.html"
            class="lms-brand"
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


          <!-- NAVIGATION -->

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

                    <svg viewBox="0 0 24 24">

                      <path
                        d="M3 10.5 12 3l9 7.5"
                      />

                      <path
                        d="M5 9.5V21h14V9.5"
                      />

                      <path
                        d="M9 21v-6h6v6"
                      />

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
    <svg viewBox="0 0 24 24">
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M7 8h10" />
      <path d="M7 12h7" />
      <path d="M7 16h5" />
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

                    <svg viewBox="0 0 24 24">

                      <path
                        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"
                      />

                      <path d="M4 5.5v16" />

                      <path d="M8 7h8" />

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

                    <svg viewBox="0 0 24 24">

                      <path d="M4 19V9" />

                      <path d="M10 19V5" />

                      <path d="M16 19v-7" />

                      <path d="M22 19V3" />

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

                    <svg viewBox="0 0 24 24">

                      <circle
                        cx="12"
                        cy="8"
                        r="5"
                      />

                      <path
                        d="m8.5 12.5-1 8L12 18l4.5 2.5-1-8"
                      />

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

                    <svg viewBox="0 0 24 24">

                      <circle
                        cx="12"
                        cy="8"
                        r="4"
                      />

                      <path
                        d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6"
                      />

                    </svg>

                  </span>


                  <span class="lms-nav-text">
                    My Account
                  </span>

                </a>


              </nav>

            </div>


          </div>


          <!-- SIDEBAR FOOTER -->

          <div class="lms-sidebar-footer">

            <a
              href="index.html"
              class="lms-return-link"
            >

              <span class="lms-nav-icon">

                <svg viewBox="0 0 24 24">

                  <path d="M19 12H5" />

                  <path d="m12 19-7-7 7-7" />

                </svg>

              </span>


              <span class="lms-return-text">
                Back to Screenings4u
              </span>

            </a>

          </div>


        </div>

      </aside>


      <!-- MOBILE OVERLAY -->

      <div
        class="lms-sidebar-overlay"
        data-lms-sidebar-overlay
      ></div>
    `;
  }


  /* ============================================================
     ACTIVE NAVIGATION
     ============================================================ */

  function setActiveNavigation() {
    const currentPage =
      window.location.pathname
        .split("/")
        .pop() || "lms-dashboard.html";

    const navigationLinks =
      document.querySelectorAll(
        ".lms-nav-link[data-lms-page]"
      );

    navigationLinks.forEach(function (link) {
      const page =
        link.getAttribute("data-lms-page");

      link.classList.remove("active");

      if (page === currentPage) {
        link.classList.add("active");
      }
    });
  }

})();