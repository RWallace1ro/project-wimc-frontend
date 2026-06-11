import React from "react";
import { useNavigate } from "react-router-dom";
import "./LegalPage.css";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <main className="legal-page">
      <div className="legal-hero">
        <button
          className="legal-hero__back"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ✕
        </button>
        <h1 className="legal-hero__title">Privacy Policy</h1>
        <p className="legal-hero__updated">Last updated: May 2026</p>
      </div>

      <div className="legal-page__body">
      <section className="legal-page__section">
        <h2>1. Information We Collect</h2>
        <p>
          When you create an account, we collect your name, email address, and
          optionally a profile photo. When you use the app, we store photos and
          videos of your clothing items via Cloudinary, a third-party media
          service.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>2. How We Use Your Information</h2>
        <p>
          We use your information solely to provide the What's in My Closet
          service — organizing your wardrobe, building outfits, and delivering
          AI styling suggestions. We do not sell your data to third parties.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>3. Data Storage</h2>
        <p>
          Your account and profile data are stored securely using Google
          Firebase. Media files (photos and videos) are stored on Cloudinary.
          Both services maintain their own security and privacy standards.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>4. Cookies and Local Storage</h2>
        <p>
          We use your browser's local storage — a technology similar to cookies
          that stores data on your device rather than on our servers — to
          preserve your in-app data between sessions. No advertising or
          behavioural-tracking cookies are used.
        </p>
        <p>The following data is saved locally on your device:</p>
        <ul className="legal-page__list">
          <li>
            <strong>Wish List</strong> — clothing items you have saved to your
            wish list (<code>wishlist</code>).
          </li>
          <li>
            <strong>Donate Bin</strong> — items you have marked for donation
            (<code>donateBin</code>).
          </li>
          <li>
            <strong>Shopping List</strong> — items on your personal shopping
            list (<code>shoppingList</code>).
          </li>
          <li>
            <strong>Receipts</strong> — purchase receipt records you have
            logged in the app (<code>receipts</code>).
          </li>
          <li>
            <strong>Appearance / Background</strong> — your chosen app
            background or theme preference (<code>wimc-backgrounds</code>).
          </li>
          <li>
            <strong>Saved Outfits</strong> — outfit combinations you have
            built and saved (<code>outfits</code>).
          </li>
          <li>
            <strong>Tour Status</strong> — whether you have completed the
            in-app onboarding tour (<code>wimc-tour-seen</code>).
          </li>
        </ul>
        <p>
          This data remains on your device and is not transmitted to our
          servers. You can clear it at any time by using your browser's "Clear
          Site Data" option, or by deleting your account through the app (which
          removes all locally stored data automatically).
        </p>
      </section>

      <section className="legal-page__section">
        <h2>5. Your Rights</h2>
        <p>
          You may request deletion of your account and all associated data at
          any time through the <strong>Settings → Delete Account</strong> option
          inside the app. Deleting your account permanently removes your profile
          from Firebase, erases all locally stored data listed above, and cannot
          be undone. You may also export your closet data using the JSON export
          feature within the app before deletion.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>6. Children's Privacy</h2>
        <p>
          This app is not directed to children under 13. We do not knowingly
          collect personal information from children under 13.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>7. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of significant changes by updating the date at the top of this
          page.
        </p>
      </section>

      <section className="legal-page__section">
        <h2>8. Contact</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us
          through the app's About page.
        </p>
      </section>
      </div>
    </main>
  );
}
