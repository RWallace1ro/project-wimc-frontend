import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
} from "firebase/auth";
import { auth } from "../firebase";
import "./AuthAction.css";

/**
 * Custom Firebase email-action handler.
 * Handles password reset (with a confirm-password field) and email
 * verification in-app, instead of Firebase's default single-field page.
 *
 * Firebase appends ?mode=...&oobCode=... to the action URL configured in
 * Console → Authentication → Templates.
 */
export default function AuthAction() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  // status: loading | reset-form | reset-done | verified | error
  const [status, setStatus] = useState("loading");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Validate the code / apply verification on mount
  useEffect(() => {
    if (!oobCode) { setStatus("error"); return; }
    let cancelled = false;
    (async () => {
      try {
        if (mode === "resetPassword") {
          const e = await verifyPasswordResetCode(auth, oobCode);
          if (!cancelled) { setEmail(e || ""); setStatus("reset-form"); }
        } else if (mode === "verifyEmail") {
          await applyActionCode(auth, oobCode);
          if (!cancelled) setStatus("verified");
        } else {
          if (!cancelled) setStatus("error");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, [mode, oobCode]);

  const handleReset = useCallback(async (e) => {
    e.preventDefault();
    if (busy) return;
    if (pw.length < 8) { setErr("Password must be at least 8 characters."); return; }
    if (pw !== confirmPw) { setErr("Passwords do not match."); return; }
    setErr("");
    setBusy(true);
    try {
      await confirmPasswordReset(auth, oobCode, pw);
      setStatus("reset-done");
    } catch (e2) {
      setErr(
        e2?.code === "auth/expired-action-code" || e2?.code === "auth/invalid-action-code"
          ? "This reset link has expired or already been used. Please request a new one."
          : "Couldn't reset your password. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }, [busy, pw, confirmPw, oobCode]);

  return (
    <div className="authaction">
      <div className="authaction__card">
        {status === "loading" && (
          <p className="authaction__text">Verifying your link…</p>
        )}

        {status === "reset-form" && (
          <>
            <div className="authaction__icon">🔑</div>
            <h2 className="authaction__title">Set a new password</h2>
            <p className="authaction__text">
              for <strong>{email || "your account"}</strong>
            </p>
            <form className="authaction__form" onSubmit={handleReset}>
              <label className="authaction__label">
                <span>New password</span>
                <div className="authaction__pw-field">
                  <input
                    type={showPw ? "text" : "password"}
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); setErr(""); }}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="authaction__input"
                  />
                  <button
                    type="button"
                    className="authaction__pw-toggle"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? "🙈" : "👁️"}
                  </button>
                </div>
              </label>
              <label className="authaction__label">
                <span>Confirm new password</span>
                <div className="authaction__pw-field">
                  <input
                    type={showPw ? "text" : "password"}
                    value={confirmPw}
                    onChange={(e) => { setConfirmPw(e.target.value); setErr(""); }}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    className="authaction__input"
                  />
                  <button
                    type="button"
                    className="authaction__pw-toggle"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? "🙈" : "👁️"}
                  </button>
                </div>
              </label>
              {err && <p className="authaction__err">{err}</p>}
              <button className="authaction__btn authaction__btn--primary" disabled={busy}>
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}

        {status === "reset-done" && (
          <>
            <div className="authaction__icon">✅</div>
            <h2 className="authaction__title">Password updated!</h2>
            <p className="authaction__text">
              You can now log in with your new password.
            </p>
            <button
              className="authaction__btn authaction__btn--primary"
              onClick={() => navigate("/")}
            >
              Go to login
            </button>
          </>
        )}

        {status === "verified" && (
          <>
            <div className="authaction__icon">✅</div>
            <h2 className="authaction__title">Email verified!</h2>
            <p className="authaction__text">
              Your email is confirmed. You can now log in and use the app.
            </p>
            <button
              className="authaction__btn authaction__btn--primary"
              onClick={() => navigate("/")}
            >
              Continue to WIMC
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="authaction__icon">⚠️</div>
            <h2 className="authaction__title">Link expired or invalid</h2>
            <p className="authaction__text">
              This link has expired or already been used. Please request a new
              password reset or verification email from the app.
            </p>
            <button
              className="authaction__btn authaction__btn--primary"
              onClick={() => navigate("/")}
            >
              Back to WIMC
            </button>
          </>
        )}
      </div>
    </div>
  );
}
