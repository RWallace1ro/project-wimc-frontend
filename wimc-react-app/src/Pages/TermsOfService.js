import React from "react";
import { Link } from "react-router-dom";
import useCloseStandalonePage from "../utils/useCloseStandalonePage";
import "./LegalPage.css";

export default function TermsOfService() {
  const closePage = useCloseStandalonePage();
  return (
    <main className="legal-page">
      <div className="legal-hero">
        <button
          className="legal-hero__back"
          onClick={closePage}
          aria-label="Go back"
        >
          ✕
        </button>
        <h1 className="legal-hero__title">Terms of Service</h1>
        <p className="legal-hero__updated">Last updated: August 2026</p>
      </div>

      <div className="legal-page__body">
      <section className="legal-page__section">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account or using What's In My Closet ("the App"), you
          agree to these Terms of Service. If you do not agree, please do not
          use the App.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>2. Your Account</h2>
        <p>
          You are responsible for maintaining the confidentiality of your
          account credentials. You agree to notify us immediately of any
          unauthorized use of your account.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>3. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Upload content that is illegal, harmful, or offensive</li>
          <li>Attempt to gain unauthorized access to other users' data</li>
          <li>Use the App for any commercial purpose without our written consent</li>
          <li>Reverse-engineer or attempt to extract source code from the App</li>
        </ul>
        <p>
          If you encounter content in the App that you believe is illegal,
          harmful, or violates these Terms, please{" "}
          <Link to="/contact" className="legal-page__link">contact us</Link>
          {" "}to report it. We review reports and take appropriate action,
          which may include removing content or suspending accounts.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>4. Content You Upload</h2>
        <p>
          You retain ownership of all photos and content you upload. By
          uploading content, you grant us a limited license to store and display
          that content solely for the purpose of providing the service to you.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>5. AI Features</h2>
        <p>
          The AI styling, packing, and donation suggestions are provided for
          informational purposes only. They are not guaranteed to be accurate
          or suitable for your specific needs.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>6. Disclaimer of Warranties</h2>
        <p>
          The App is provided "as is" without warranties of any kind. We do not
          guarantee that the App will be available at all times or free from
          errors.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for any
          indirect, incidental, or consequential damages arising from your use
          of the App.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>8. Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate
          these Terms. You may delete your account at any time.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>9. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the App
          after changes constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>10. Contact</h2>
        <p>
          For questions about these Terms, please{" "}
          <Link to="/contact" className="legal-page__link">contact us</Link>
          .
        </p>
      </section>
      </div>
    </main>
  );
}
