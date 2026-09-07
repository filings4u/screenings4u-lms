document.addEventListener("DOMContentLoaded", initS4UFooter);

function initS4UFooter() {
  const target = document.getElementById("siteFooter");
  if (!target) return;

  const MAIN = "https://screenings4u.com";
  const PORTAL = "https://portal.screenings4u.com";
  const TRAINING = "https://training.screenings4u.com";

  const hasPageCTA = !!document.querySelector(
    "main .cta, main [class*='final-cta'], main [class*='closing-cta']"
  );

  const cta = hasPageCTA
    ? ""
    : `
      <div class="container footer-cta">
        <div class="footer-cta-copy">
          <span class="footer-cta-label">Nationwide Testing Support</span>
          <strong>Need help choosing the right service?</strong>
          <p>
            Our team can help with individual testing, employer programs,
            DOT compliance, and training.
          </p>
        </div>
        <div class="footer-cta-actions">
          <a class="footer-button footer-button-secondary" href="${MAIN}/contact.html">
            Contact Our Team
          </a>
          <a class="footer-button footer-button-primary" href="${MAIN}/services.html">
            Order a Test
          </a>
        </div>
      </div>
    `;

  target.innerHTML =
    cta +
    `
      <div class="container footer-shell">
        <div class="footer-brand-area">
          <a class="footer-brand" href="${MAIN}/" aria-label="screenings4u home">
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

          <p class="footer-about">
            Nationwide drug and alcohol testing, DOT compliance,
            workplace screening, and professional training through
            one trusted partner.
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

          <span class="footer-availability">
            Serving customers nationwide
          </span>
        </div>

        <nav class="footer-links-grid" aria-label="Footer navigation">
          <div class="footer-col">
            <h4>Company</h4>
            <a href="${MAIN}/about-us.html">About Us</a>
            <a href="${MAIN}/contact.html">Contact Us</a>
            <a href="${MAIN}/faqs.html">FAQs</a>
            <a href="${MAIN}/blog.html">Blog</a>
            <a href="${MAIN}/industries-served.html">Industries Served</a>
          </div>

          <div class="footer-col">
            <h4>Testing Services</h4>
            <a href="${MAIN}/services.html">All Services</a>
            <a href="${MAIN}/dot-urine-drug-tests.html">DOT Drug Testing</a>
            <a href="${MAIN}/dot-breathalyzer-services.html">DOT Alcohol Testing</a>
            <a href="${MAIN}/dot-physical-exam-services.html">DOT Physicals</a>
            <a href="${MAIN}/workplace-drug-and-alcohol-testing.html">
              Workplace Testing
            </a>
          </div>

          <div class="footer-col">
            <h4>For Business</h4>
            <a href="${MAIN}/business-services.html">Business Services</a>
            <a href="${MAIN}/mobile-drug-and-alcohol-testing.html">Mobile Testing</a>
            <a href="${MAIN}/consulting-services.html">Consulting</a>
            <a href="${MAIN}/background-checks.html">Background Checks</a>
            <a href="${MAIN}/new-entrant-audit.html">New Entrant Audit</a>
          </div>

          <div class="footer-col">
            <h4>Account &amp; Training</h4>
            <a href="${PORTAL}/customer-login.html">Customer Login</a>
            <a href="${PORTAL}/employer-login.html">Employer Login</a>
            <a href="${TRAINING}/">Access Training</a>
            <a href="${MAIN}/dot-specimen-collector-training.html">Training Courses</a>
            <a href="${MAIN}/contact.html">Support</a>
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
            <a
              href="https://www.roselandcompanies.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Roseland Companies, LLC
            </a>
          </span>
        </div>

        <nav class="footer-legal-links" aria-label="Legal links">
          <a href="${MAIN}/terms.html">Terms of Use</a>
          <a href="${MAIN}/privacy.html">Privacy Policy</a>
          <a href="${MAIN}/refund-policy.html">Refund Policy</a>
          <a href="${MAIN}/cookie-policy.html">Cookie Policy</a>
          <a href="${MAIN}/accessibility.html">Accessibility</a>
          <a href="${MAIN}/disclaimer.html">Disclaimer</a>
        </nav>

     
      </div>
    `;

  const y = document.getElementById("footerYear");
  if (y) y.textContent = new Date().getFullYear();
}

window.refreshUniversalFooter = initS4UFooter;
