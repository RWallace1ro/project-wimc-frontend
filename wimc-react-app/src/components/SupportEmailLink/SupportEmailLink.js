import React, { useState } from "react";

// A mailto: link always opens whichever app the OS/browser has set as its
// DEFAULT mail handler — that's often Outlook on Windows even for users who
// actually use Gmail/other webmail, and the site has no way to detect or
// override that. Pairing the link with a one-click "Copy" lets anyone paste
// the address into whatever mail client or webmail they actually use.
export default function SupportEmailLink({ email, className, linkText }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — mailto link still works as a fallback.
    }
  };

  return (
    <span className="support-email-link">
      <a href={`mailto:${email}`} className={className}>
        {linkText || email}
      </a>{" "}
      <button
        type="button"
        onClick={handleCopy}
        className="support-email-link__copy-btn"
        aria-label={`Copy ${email} to clipboard`}
        title="Copy email address"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </span>
  );
}
