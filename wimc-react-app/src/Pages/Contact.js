import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LegalPage.css";
import "./Contact.css";

const CONTACT_FORM_URL = process.env.REACT_APP_CONTACT_FORM_URL;

export default function Contact() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", company: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus("error");
      setErrorMsg("Please fill in your name, email, and message.");
      return;
    }
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch(CONTACT_FORM_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send. Please try again.");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to send. Please try again or email us directly.");
    }
  };

  return (
    <main className="legal-page">
      <div className="legal-hero">
        <button className="legal-hero__back" onClick={() => navigate(-1)} aria-label="Go back">
          ✕
        </button>
        <h1 className="legal-hero__title">Contact Us</h1>
        <p className="legal-hero__updated">We usually reply within 1–2 business days.</p>
      </div>

      <div className="legal-page__body">
        {status === "sent" ? (
          <div className="contact-page__success">
            <p>✅ Your message has been sent. We'll get back to you soon.</p>
          </div>
        ) : (
          <form className="contact-page__form" onSubmit={handleSubmit}>
            <p className="contact-page__intro">
              Have a question, found a bug, or need help with your account? Send us a message below
              and it'll go straight to our support inbox — no email app required.
            </p>

            <label className="contact-page__field">
              <span>Name</span>
              <input type="text" value={form.name} onChange={update("name")} required />
            </label>

            <label className="contact-page__field">
              <span>Your email</span>
              <input type="email" value={form.email} onChange={update("email")} required />
            </label>

            <label className="contact-page__field">
              <span>Subject (optional)</span>
              <input type="text" value={form.subject} onChange={update("subject")} />
            </label>

            <label className="contact-page__field">
              <span>Message</span>
              <textarea rows={6} maxLength={5000} value={form.message} onChange={update("message")} required />
            </label>

            {/* Honeypot — hidden from real users via CSS, bots that fill every
                field trip it and get silently dropped server-side. */}
            <label className="contact-page__honeypot" aria-hidden="true">
              <span>Company</span>
              <input type="text" tabIndex={-1} autoComplete="off" value={form.company} onChange={update("company")} />
            </label>

            {status === "error" && <p className="contact-page__error">{errorMsg}</p>}

            <button type="submit" className="contact-page__submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send Message"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
