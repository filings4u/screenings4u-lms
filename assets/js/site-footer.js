document.addEventListener("DOMContentLoaded", initS4UFooter);

function initS4UFooter() {
  const target = document.getElementById("siteFooter");
  if (!target) return;

  const MAIN = "https://screenings4u.com";
  const PORTAL = "https://portal.screenings4u.com";
  const TRAINING = "https://training.screenings4u.com";
  const WORKFORCE = "https://workforce.screenings4u.com";
  const DOT = "https://dot.screenings4u.com";
  const cta = `
      <div class="container footer-cta">
        <div class="footer-cta-copy">
          <span class="footer-cta-label">screenings4u Learning Center</span>
          <strong>Professional DOT collector training built for real-world compliance.</strong>
          <p>
            Enroll in individual training, purchase group seats, order mock-collection
            supplies, or extend an existing course directly through the Learning Center.
          </p>
        </div>
        <div class="footer-cta-actions">
          <a class="footer-button footer-button-secondary" href="${TRAINING}/group-training.html">
            Group Training
          </a>
          <a class="footer-button footer-button-primary" href="${TRAINING}/#pricing">
            View Training
          </a>
        </div>
      </div>
    `;

  target.innerHTML =
    cta +
    `
      <div class="container footer-shell">
        <div class="footer-brand-area">
          <a class="footer-brand" href="${TRAINING}/" aria-label="screenings4u Learning Center home">
            <img
              src="images/logo2.png"
              alt="screenings4u"
              class="footer-logo"
              width="1261"
              height="237"
              loading="lazy"
              decoding="async"
            >
          </a>

          <strong class="footer-learning-center-title">Learning Center</strong>

          <p class="footer-about">
            DOT specimen collector training, Train-the-Trainer programs, hair collector
            training, group training, course extensions, and collector training supplies.
          </p>

          <div class="footer-contact">
            <a href="tel:7732457009">
              <span class="footer-contact-icon" aria-hidden="true">☎</span>
              <span>(773) 245-7009</span>
            </a>

            <a href="mailto:support@screenings4u.com">
              <span class="footer-contact-icon" aria-hidden="true">✉</span>
              <span>support@screenings4u.com</span>
            </a>
          </div>

          <span class="footer-availability">Professional training for collectors and employers</span>
        </div>

        <nav class="footer-links-grid" aria-label="Learning Center footer navigation">
          <div class="footer-col">
            <h4>Training</h4>
            <a href="${TRAINING}/#pricing">Training Courses</a>
            <a href="${TRAINING}/group-training.html">Group Training</a>
            <a href="${TRAINING}/collector-training-supplies.html">Training Supplies</a>
            <a href="${TRAINING}/course-extension.html">Course Extensions</a>
          </div>

          <div class="footer-col">
            <h4>Learning Center</h4>
            <a href="${TRAINING}/training-login.html">Student Login</a>
            <a href="${TRAINING}/lms-my-courses.html">My Learning</a>
            <a href="${TRAINING}/lms-progress.html">Progress</a>
            <a href="${TRAINING}/lms-certificates.html">Certificates</a>
          </div>

          <div class="footer-col">
            <h4>Resources</h4>
            <a href="${TRAINING}/#curriculum">Curriculum</a>
            <a href="${TRAINING}/#included">What's Included</a>
            <a href="${TRAINING}/#faq">Training FAQ</a>
            <a href="${MAIN}/dot-services.html">DOT Services</a>
          </div>

          <div class="footer-col">
            <h4>Support</h4>
            <a href="${TRAINING}/lms-support.html">Training Support</a>
            <a href="mailto:support@screenings4u.com">Email Support</a>
            <a href="${MAIN}/contact.html">Contact screenings4u</a>
          </div>

          <div class="footer-col footer-family-col">
            <h4>screenings4u Family</h4>
            <a href="${MAIN}/">screenings4u.com</a>
            <a href="${WORKFORCE}/">workforce.screenings4u.com</a>
            <a href="${TRAINING}/">training.screenings4u.com</a>
            <a href="${DOT}/">dot.screenings4u.com</a>
          </div>
        </nav>
      </div>

      <div class="container footer-bottom">
        <div class="footer-bottom-copy">
          <span class="footer-copyright">
            © <span id="footerYear"></span> screenings4u. All rights reserved.
          </span>
          <span class="footer-subsidiary">
            A Subsidiary of
            <a href="https://www.roselandcompanies.com/" target="_blank" rel="noopener noreferrer">
              Roseland Companies, LLC
            </a>
          </span>
        </div>

        <nav class="footer-legal-links" aria-label="Learning Center legal links">
          <a href="${TRAINING}/terms.html">Terms</a>
          <a href="${TRAINING}/privacy.html">Privacy</a>
          <a href="${TRAINING}/refund-policy.html">Refunds</a>
          <a href="${TRAINING}/cookie-policy.html">Cookies</a>
          <a href="${TRAINING}/accessibility.html">Accessibility</a>
          <a href="${TRAINING}/disclaimer.html">Disclaimer</a>
        </nav>

        <a class="footer-admin-login" href="${PORTAL}/admin-login.html">Admin Login</a>
      </div>
    `;

  const y = document.getElementById("footerYear");
  if (y) y.textContent = new Date().getFullYear();
}

window.refreshUniversalFooter = initS4UFooter;
