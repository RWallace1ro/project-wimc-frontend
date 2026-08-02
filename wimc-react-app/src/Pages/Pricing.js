import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startCheckout } from "../utils/billing";
import { useTier } from "../context/TierContext";
import useCloseStandalonePage from "../utils/useCloseStandalonePage";
import "./Pricing.css";

const PAYMENTS_ENABLED = process.env.REACT_APP_PAYMENTS_ENABLED === "true";

// Stripe Price IDs come from env so test↔live can be swapped without code edits.
const PRICE_IDS = {
  "pro-monthly":    process.env.REACT_APP_PRICE_PRO_MONTHLY,
  "pro-annual":     process.env.REACT_APP_PRICE_PRO_ANNUAL,
  "pro-ai-monthly": process.env.REACT_APP_PRICE_PROAI_MONTHLY,
  "pro-ai-annual":  process.env.REACT_APP_PRICE_PROAI_ANNUAL,
};

/* ── Plan definitions ── */
const MONTHLY_PLANS = [
  {
    id: "free",
    name: "Free",
    tagline: "Get started with the basics — no credit card required.",
    amount: "0",
    period: "/ month",
    note: "",
    badge: null,
    popular: false,
    features: [
      { text: "Closet organization (all 8 sections)", check: true },
      { text: "50 photo uploads", check: true },
      { text: "Basic outfit preview", check: true },
      { text: "Weather-based outfit suggestions", check: true },
      { text: "Shopping List & Wish List", check: true },
      { text: "AI Stylist — 3 requests / day", check: true },
      { text: "Kids' Closet & Pet Closet", check: false },
      { text: "Travel Pack Planner", check: false },
      { text: "Video Bin & Donate Bin", check: false },
      { text: "Try-On Studio", check: false },
      { text: "Receipts tracker & backup", check: false },
      { text: "Unlimited uploads", check: false },
    ],
    btnLabel: "Get Started Free",
    btnStyle: "outline",
    priceId: null,
  },
  {
    id: "pro-monthly",
    name: "Pro",
    tagline: "All the tools you need to master your closet, every month.",
    amount: "4.99",
    period: "/ month",
    note: "",
    badge: null,
    popular: true,
    features: [
      { text: "Everything in Free", check: true },
      { text: "Unlimited uploads", check: true },
      { text: "Kids' Closet (up to 2 profiles)", check: true },
      { text: "🐾 Pet Closet", check: true },
      { text: "Travel Pack Planner", check: true },
      { text: "Video Bin & Donate Bin", check: true },
      { text: "Try-On Studio + AI Style Feedback", check: true },
      { text: "Outfit of the Day planner", check: true },
      { text: "Receipts tracker, backup & restore", check: true },
      { text: "AI features — 10 requests / day", check: true },
      { text: "Full AI suite (50 / day)", check: false },
    ],
    btnLabel: "Upgrade to Pro",
    btnStyle: "primary",
    priceId: "price_pro_monthly", // replace with real Stripe price ID
  },
  {
    id: "pro-ai-monthly",
    name: "Pro + AI",
    tagline: "Full Pro access plus all AI-powered features for the ultimate styling experience.",
    amount: "7.99",
    period: "/ month",
    note: "",
    badge: null,
    popular: false,
    features: [
      { text: "Everything in Pro", check: true },
      { text: "AI features — 50 requests / day", check: true },
      { text: "AI Stylist with outfit builds & closet picks", check: true },
      { text: "AI Packing Assistant & Donation Advisor", check: true },
      { text: "AI Closet Search", check: true },
      { text: "Unlimited kids profiles", check: true },
      { text: "Priority new-feature access", check: true },
    ],
    btnLabel: "Upgrade to Pro + AI",
    btnStyle: "primary",
    priceId: "price_pro_ai_monthly", // replace with real Stripe price ID
  },
];

const ANNUAL_PLANS = [
  {
    id: "pro-annual",
    name: "Pro Annual",
    tagline: "All Pro features billed once a year — save over 33%.",
    amount: "39.99",
    period: "/ year",
    note: "Equivalent to $3.33 / month",
    badge: null,
    popular: false,
    savings: "Save 33%",
    features: [
      { text: "Everything in Pro (monthly)", check: true },
      { text: "Best value for closet pros", check: true },
      { text: "Cancel anytime — no fees", check: true },
    ],
    btnLabel: "Get Pro Annual",
    btnStyle: "primary",
    priceId: "price_pro_annual", // replace with real Stripe price ID
  },
  {
    id: "pro-ai-annual",
    name: "Pro + AI Annual",
    tagline: "Every feature — AI included — billed once a year at the best rate.",
    amount: "79.99",
    period: "/ year",
    note: "Equivalent to $6.67 / month",
    badge: null,
    popular: false,
    savings: "Save 17%",
    features: [
      { text: "Everything in Pro + AI (monthly)", check: true },
      { text: "All AI features included", check: true },
      { text: "Cancel anytime — no fees", check: true },
    ],
    btnLabel: "Get Pro + AI Annual",
    btnStyle: "primary",
    priceId: "price_pro_ai_annual", // replace with real Stripe price ID
  },
];

/* ── Feature row ── */
function Feature({ text, check }) {
  return (
    <li className="pricing-card__feature">
      <span
        className={`pricing-card__feature-icon ${
          check
            ? "pricing-card__feature-icon--check"
            : "pricing-card__feature-icon--x"
        }`}
      >
        {check ? "✓" : "✕"}
      </span>
      <span style={check ? {} : { color: "#94a3b8" }}>{text}</span>
    </li>
  );
}

/* ── Single pricing card ── */
function PlanCard({ plan, currentPlanId, isLoggedIn, onRequireLogin }) {
  const isCurrent = isLoggedIn && currentPlanId === plan.id;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  let btnLabel = plan.btnLabel;
  let btnStyle = plan.btnStyle;
  let btnDisabled = false;

  if (isCurrent) {
    btnLabel = "Current Plan";
    btnStyle = "current";
    btnDisabled = true;
  } else if (!PAYMENTS_ENABLED) {
    btnLabel = plan.id === "free" ? plan.btnLabel : "Coming Soon";
    btnDisabled = plan.id !== "free";
  }
  if (busy) btnLabel = "Redirecting…";

  async function handleClick() {
    if (!PAYMENTS_ENABLED || plan.id === "free" || busy) return;
    if (!isLoggedIn) { onRequireLogin?.(); return; }
    const priceId = PRICE_IDS[plan.id];
    if (!priceId) { setErr("This plan isn't available yet."); return; }
    setErr("");
    setBusy(true);
    try {
      await startCheckout(priceId); // redirects to Stripe on success
    } catch (e) {
      setErr(e.message || "Could not start checkout.");
      setBusy(false);
    }
  }

  return (
    <div className={`pricing-card${plan.popular ? " pricing-card--popular" : ""}`}>
      {plan.popular && (
        <span className="pricing-card__badge">Most Popular</span>
      )}

      <h3 className="pricing-card__name">{plan.name}</h3>
      <p className="pricing-card__tagline">{plan.tagline}</p>

      <div className="pricing-card__price">
        <span className="pricing-card__currency">$</span>
        <span className="pricing-card__amount">{plan.amount}</span>
        <span className="pricing-card__period">{plan.period}</span>
      </div>

      {plan.note ? (
        <p className="pricing-card__note">{plan.note}</p>
      ) : (
        <p className="pricing-card__note">&nbsp;</p>
      )}

      {plan.savings && (
        <span className="pricing-card__savings">{plan.savings}</span>
      )}

      <hr className="pricing-card__divider" />

      <ul className="pricing-card__features">
        {plan.features.map((f) => (
          <Feature key={f.text} text={f.text} check={f.check} />
        ))}
      </ul>

      <button
        className={`pricing-card__btn pricing-card__btn--${btnStyle}`}
        disabled={btnDisabled || busy}
        onClick={handleClick}
        aria-label={btnLabel}
      >
        {btnLabel}
      </button>
      {err && <p className="pricing-card__error">{err}</p>}
    </div>
  );
}

/* ── Page ── */
export default function Pricing({ isLoggedIn }) {
  const navigate = useNavigate();
  const closePage = useCloseStandalonePage();
  const { tier, priceId } = useTier();

  // Determine the user's current plan card from their live subscription.
  // Prefer an exact price→plan match (knows monthly vs annual); fall back to
  // the tier's monthly card if the price isn't recognized.
  const planIdByPrice = Object.fromEntries(
    Object.entries(PRICE_IDS).map(([planId, pid]) => [pid, planId])
  );
  let currentPlanId = null;
  if (isLoggedIn) {
    // Tier is the source of truth. A stale stripePriceId can linger after a
    // downgrade/cancel, so only consult it to refine WHICH paid card is current.
    if (tier === "free") {
      currentPlanId = "free";
    } else if (priceId && planIdByPrice[priceId]) {
      currentPlanId = planIdByPrice[priceId];
    } else if (tier === "pro") {
      currentPlanId = "pro-monthly";
    } else if (tier === "pro_ai") {
      currentPlanId = "pro-ai-monthly";
    }
  }

  return (
    <main className="pricing-page">
      {/* Hero */}
      <div className="pricing-hero">
        <button
          className="pricing-hero__back"
          onClick={closePage}
          aria-label="Go back"
        >
          ✕
        </button>
        <h1 className="pricing-hero__title">Simple, Transparent Pricing</h1>
        <p className="pricing-hero__subtitle">
          Start free. Upgrade when you're ready. Cancel anytime.
        </p>
      </div>

      {/* Coming-soon notice */}
      {!PAYMENTS_ENABLED && (
        <div className="pricing-banner">
          Paid plans are coming soon — upgrade options will be enabled at launch.
        </div>
      )}

      <div className="pricing-body">
        {/* Monthly plans */}
        <div className="pricing-group">
          <p className="pricing-group__label">Monthly Plans</p>
          <div className="pricing-grid">
            {MONTHLY_PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlanId={currentPlanId}
                isLoggedIn={isLoggedIn}
                onRequireLogin={() => navigate("/")}
              />
            ))}
          </div>
        </div>

        {/* Annual plans */}
        <div className="pricing-group">
          <p className="pricing-group__label">Annual Plans — Best Value</p>
          <div className="pricing-grid">
            {ANNUAL_PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                currentPlanId={currentPlanId}
                isLoggedIn={isLoggedIn}
                onRequireLogin={() => navigate("/")}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
