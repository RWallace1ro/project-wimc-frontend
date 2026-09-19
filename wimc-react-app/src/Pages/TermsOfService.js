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
        <p className="legal-hero__updated">Last updated: September 2026</p>
      </div>

      <div className="legal-page__body">
      <section className="legal-page__section">
        <h2>1. Acceptance of Terms</h2>
        <p>
          What's In My Closet ("WIMC" or "the App") is operated by GingerFaith
          LLC ("we" or "us"). By creating an account or using the App, you
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
        <h2>6. Subscriptions, Billing and Refunds</h2>
        <p>
          <strong>Plans.</strong> WIMC has a Free plan and two paid plans, Pro
          and Pro + AI, each available monthly or annually. What each plan
          includes, and its current price, is shown on the Pricing page on our
          website and on the Pricing screen in the iPhone app.
        </p>
        <p>
          <strong>Billing.</strong> Paid plans renew automatically at the end of
          each billing period (monthly or annual), at the price then in effect,
          until you cancel. If you subscribe on our website, you are billed by
          Stripe. If you subscribe in the iPhone app, you are billed by Apple
          through your Apple Account, and Apple's terms apply to that purchase.
          Prices may include or exclude applicable taxes, as shown at checkout.
        </p>
        <p>
          <strong>One plan, one place.</strong> Your plan is tied to your WIMC
          account and works on both the website and the iPhone app. Please
          subscribe in only one place — subscribing in both results in two
          separate charges.
        </p>
        <p>
          <strong>Cancelling.</strong> You can cancel at any time. You keep your
          paid features until the end of the period you have already paid for,
          and you will not be charged again. To cancel a website subscription,
          go to Settings → Subscription → Manage Subscription. To cancel an App
          Store subscription, open your iPhone's Settings, tap your name, then
          tap Subscriptions; Apple requires you to cancel at least 24 hours
          before your renewal date to avoid the next charge. If you delete your
          WIMC account, we automatically cancel a website subscription when the
          deletion takes effect (with no refund for the unused part of the
          period). We cannot cancel App Store subscriptions for you, so please
          cancel those in iPhone Settings before you delete your account.
        </p>
        <p>
          <strong>Refunds.</strong> Payments are generally non-refundable, and
          we do not provide refunds for the unused part of a billing period,
          except where the law requires it. If a technical issue prevents you
          from using WIMC, please{" "}
          <Link to="/contact" className="legal-page__link">contact us</Link>
          {" "}within 7 days of the charge and we will review your case.
          Refunds for App Store purchases are handled by Apple; you can request
          one at reportaproblem.apple.com.
        </p>
        <p>
          <strong>Your rights where you live.</strong> If you live in the
          European Union or the United Kingdom, you may have a legal right to
          cancel a website purchase within 14 days of buying it and receive a
          refund (where the law allows, less a proportionate amount for any use
          of the paid features during that time). To use this right, email
          wimcsupport@gingerfaith.com within 14 days of the charge. Nothing in
          these Terms limits any rights you have under mandatory
          consumer-protection laws where you live.
        </p>
        <p>
          <strong>Price changes.</strong> We may change plan prices. A change
          applies from your next renewal after we have given you notice (for
          example, by email or in the app), and you can cancel before then if
          you do not agree to it.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>7. Disclaimer of Warranties</h2>
        <p>
          The App is provided "as is" without warranties of any kind. We do not
          guarantee that the App will be available at all times or free from
          errors.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, we are not liable for any
          indirect, incidental, or consequential damages arising from your use
          of the App.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>9. Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate
          these Terms. You may delete your account at any time.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>10. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the App
          after changes constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>11. Contact</h2>
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
