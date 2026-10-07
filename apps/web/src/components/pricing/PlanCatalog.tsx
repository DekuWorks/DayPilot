"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ENTERPRISE_COPY,
  FOUNDING_COPY,
  PRO_ENTITLEMENT_NOTE,
  TEAM_COPY,
  plansForWeb,
  type PricingPlan,
} from "@daypilot/lib";
import { Button } from "@/components/Button";
import {
  getFoundingOffer,
  joinPlanWaitlist,
  type FoundingOffer,
} from "@/lib/billing-api";

const APP_STORE_URL = "https://apps.apple.com/app/id6798407960";

const PRO_SUBSCRIBE =
  "Subscriptions are bought only in the DayPilot iOS app. Open DayPilot Daily, choose Pro, and confirm with Apple. A purchase there unlocks Pro on the website too.";

function priceSuffix(plan: PricingPlan) {
  if (plan.planId === "free") return "";
  if (plan.planId === "enterprise") return "";
  if (plan.planId === "team") return "/month planned";
  return "/month";
}

function PlanCard({
  plan,
  founding,
  foundingStatus,
  emailHint,
}: {
  plan: PricingPlan;
  founding: FoundingOffer | null;
  foundingStatus: "loading" | "ready" | "unavailable";
  emailHint?: string;
}) {
  const comingSoon = plan.availability === "coming_soon";
  const isFounding = plan.planId === "founding_pro";
  const isPro = plan.planId === "pro";
  return (
    <div
      id={
        plan.planId === "team"
          ? "team-waitlist"
          : plan.planId === "enterprise"
            ? "enterprise-waitlist"
            : undefined
      }
      className={`glass-effect flex flex-col rounded-2xl p-6 md:p-8 ${
        plan.highlighted
          ? "relative border-2 border-[var(--brand-500)] shadow-xl"
          : "border border-[var(--border-subtle)]"
      }`}
    >
      {plan.badge ? (
        <div className="mb-3">
          <span className="inline-flex rounded-full bg-gradient-to-r from-[var(--brand-400)] to-[var(--brand-500)] px-3 py-1 text-xs font-semibold text-white">
            {plan.badge}
          </span>
        </div>
      ) : null}
      <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)] md:text-2xl">
        {isFounding ? FOUNDING_COPY.kicker : plan.name}
      </h3>
      <div className="mb-2">
        <span className="text-3xl font-bold text-[var(--text-primary)] md:text-4xl">
          {plan.marketingPrice}
        </span>
        {priceSuffix(plan) ? (
          <span className="ml-2 text-base text-[var(--text-secondary)]">
            {priceSuffix(plan)}
          </span>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        {isFounding
          ? FOUNDING_COPY.headline
          : plan.planId === "team"
            ? TEAM_COPY.kicker
            : plan.planId === "enterprise"
              ? ENTERPRISE_COPY.kicker
              : plan.description}
      </p>
      {isFounding ? (
        <div className="mb-4 space-y-2 text-sm text-[var(--text-secondary)]">
          <p>{FOUNDING_COPY.body}</p>
          <p>{FOUNDING_COPY.rate}</p>
          <p className="font-medium text-[var(--text-primary)]">
            {foundingStatus === "loading"
              ? "Checking how many founding spots are left."
              : foundingStatus === "unavailable" || !founding
                ? "Spot count unavailable right now."
                : founding.offerAvailable
                  ? `${founding.remainingCount} of ${founding.limit} spots remaining`
                  : `Founding 25 is closed. ${founding.remainingCount} of ${founding.limit} spots remaining.`}
          </p>
        </div>
      ) : null}
      {plan.planId === "team" ? (
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          {TEAM_COPY.body} {TEAM_COPY.price}
        </p>
      ) : null}
      {plan.planId === "enterprise" ? (
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          {ENTERPRISE_COPY.body} {ENTERPRISE_COPY.price}
        </p>
      ) : null}
      <ul className="mb-6 space-y-2 xl:max-h-80 xl:overflow-y-auto xl:pr-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start">
            <span className="mr-2 mt-0.5 font-bold text-[var(--brand-500)]">
              ✓
            </span>
            <span className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {feature}
            </span>
          </li>
        ))}
      </ul>
      {isPro || isFounding ? (
        <p className="mb-4 text-xs leading-relaxed text-[var(--text-secondary)]">
          {PRO_ENTITLEMENT_NOTE}
        </p>
      ) : null}
      <div className="mt-auto space-y-3">
        {comingSoon ? (
          <>
            <Button type="button" disabled variant="outline" className="w-full">
              Coming soon
            </Button>
            <WaitlistForm
              plan={plan.planId === "enterprise" ? "enterprise" : "team"}
              cta={plan.cta}
              emailHint={emailHint}
            />
            {plan.planId === "enterprise" ? (
              <a
                href="mailto:hello@daypilot.co?subject=DayPilot%20Enterprise"
                className="block text-center text-sm font-medium text-[var(--brand-500)] hover:underline"
              >
                Contact DayPilot
              </a>
            ) : null}
          </>
        ) : plan.planId === "free" ? (
          <Button href="/signup" variant="outline" className="w-full">
            {plan.cta}
          </Button>
        ) : isFounding &&
          foundingStatus === "ready" &&
          founding?.offerAvailable === false ? null : (
          <>
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {isFounding
                ? "Subscriptions are bought only in the DayPilot iOS app. Open DayPilot Daily, choose Founding 25, and confirm with Apple. A purchase there unlocks Pro on the website too."
                : PRO_SUBSCRIBE}
            </p>
            <a
              href={APP_STORE_URL}
              className={`inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] px-5 py-2.5 text-center text-[var(--text-button)] font-semibold ${
                plan.highlighted
                  ? "bg-[var(--brand-500)] text-[var(--text-inverse)]"
                  : "border border-[var(--brand-500)] text-[var(--brand-500)]"
              }`}
            >
              {plan.cta}
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function WaitlistForm({
  plan,
  cta,
  emailHint,
}: {
  plan: "team" | "enterprise";
  cta: string;
  emailHint?: string;
}) {
  const [email, setEmail] = useState(emailHint ?? "");
  const [companyName, setCompanyName] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (emailHint) setEmail((current) => current || emailHint);
  }, [emailHint]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await joinPlanWaitlist({
        email,
        requestedPlan: plan,
        companyName,
        teamSize,
        marketingConsent,
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not join the waitlist",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm text-[var(--text-primary)]">
        You&apos;re on the {plan === "team" ? "Team" : "Enterprise"} waitlist.
      </p>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-2">
      <input
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        autoComplete="email"
        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
      />
      <input
        value={companyName}
        onChange={(event) => setCompanyName(event.target.value)}
        placeholder="Company name (optional)"
        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
      />
      <input
        value={teamSize}
        onChange={(event) => setTeamSize(event.target.value)}
        placeholder="Team size (optional)"
        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
      />
      <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(event) => setMarketingConsent(event.target.checked)}
          className="mt-0.5"
        />
        Email me product news. Leave this unchecked and we only keep this
        waitlist request.
      </label>
      {error ? <p className="text-xs text-[var(--error)]">{error}</p> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Joining…" : cta}
      </Button>
    </form>
  );
}

export function PlanCatalog({ emailHint }: { emailHint?: string }) {
  const [founding, setFounding] = useState<FoundingOffer | null>(null);
  const [foundingStatus, setFoundingStatus] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");

  useEffect(() => {
    let cancelled = false;
    getFoundingOffer()
      .then((offer) => {
        if (cancelled) return;
        if (!offer) {
          setFoundingStatus("unavailable");
          return;
        }
        setFounding(offer);
        setFoundingStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setFoundingStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const plans = plansForWeb();

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5 md:gap-8">
      {plans.map((plan) => (
        <PlanCard
          key={plan.planId}
          plan={plan}
          founding={founding}
          foundingStatus={foundingStatus}
          emailHint={emailHint}
        />
      ))}
    </div>
  );
}
