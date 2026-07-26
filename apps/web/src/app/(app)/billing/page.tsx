"use client";

/**
 * In-app billing: load subscription + Stripe plans from Nest, then redirect
 * through Checkout or the Customer Portal. Falls back to Free when the API
 * is down; can still offer a single plan via NEXT_PUBLIC_STRIPE_PRICE_ID.
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import * as billingApi from "@/lib/billing-api";
import type { BillingPlan, Subscription } from "@/lib/billing-api";

/** Fallback when API plans are empty but a single public price id is set. */
const ENV_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

const FREE_FALLBACK: Subscription = {
  tier: "Free",
  status: "active",
  currentPeriodEnd: null,
  stripeCustomerId: null,
  configured: false,
};

function BillingPageInner() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [serviceNotice, setServiceNotice] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      billingApi.getSubscription().catch(() => null),
      billingApi.getPlans().catch(() => ({ configured: false, plans: [] as BillingPlan[] })),
    ])
      .then(([sub, planRes]) => {
        if (cancelled) return;
        if (sub) {
          setSubscription(sub);
          setStripeConfigured(Boolean(sub.configured ?? planRes.configured));
          setServiceNotice("");
        } else {
          setSubscription(FREE_FALLBACK);
          setStripeConfigured(planRes.configured);
          setServiceNotice(
            "Billing service is unavailable right now. Showing the Free plan until it reconnects."
          );
        }
        let nextPlans = planRes.plans ?? [];
        if (nextPlans.length === 0 && ENV_PRICE_ID) {
          nextPlans = [
            {
              tier: "Personal",
              priceId: ENV_PRICE_ID,
              label: "Personal",
              interval: "month",
            },
          ];
        }
        setPlans(nextPlans);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";
  const canCheckout =
    !serviceNotice && (stripeConfigured || plans.length > 0) && plans.length > 0;

  async function handleUpgrade(priceId: string, label: string) {
    setError("");
    setActionLoading(priceId);
    try {
      const { url } = await billingApi.createCheckoutSession(priceId);
      if (url) window.location.href = url;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : `Checkout failed for ${label}`
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManage() {
    setError("");
    setActionLoading("portal");
    try {
      const { url } = await billingApi.createPortalSession();
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <p className="text-[var(--text-secondary)]">Loading billing…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-2">
        Billing & Subscription
      </h1>
      <p className="text-[var(--text-secondary)] mb-6">
        Manage your plan and payment method.
      </p>

      {success && (
        <div className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--brand-500)_35%,transparent)] bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] p-4 text-[var(--text-primary)]">
          Thank you. Your subscription is now active.
        </div>
      )}
      {canceled && (
        <div className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 text-[var(--text-secondary)]">
          Checkout was canceled. You can upgrade anytime.
        </div>
      )}
      {serviceNotice && (
        <div className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-secondary)]">
          {serviceNotice}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--error)_35%,transparent)] bg-[color-mix(in_srgb,var(--error)_12%,transparent)] p-4 text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="glass-effect max-w-2xl space-y-6 rounded-2xl p-6 md:p-8">
        {subscription && (
          <>
            <div>
              <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
                Current plan
              </h2>
              <p className="text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">
                  {subscription.tier}
                </span>
                {" · "}
                {subscription.status}
                {subscription.currentPeriodEnd && (
                  <>
                    {" "}
                    · Renews{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {subscription.tier === "Free" &&
                canCheckout &&
                plans.map((plan) => (
                  <Button
                    key={plan.priceId}
                    onClick={() => handleUpgrade(plan.priceId, plan.label)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === plan.priceId
                      ? "Redirecting…"
                      : `Upgrade to ${plan.label}`}
                  </Button>
                ))}
              {subscription.tier === "Free" && !canCheckout && (
                <Button disabled>
                  Upgrade coming soon
                </Button>
              )}
              {subscription.stripeCustomerId && (
                <Button
                  variant="outline"
                  onClick={handleManage}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "portal"
                    ? "Opening…"
                    : "Manage subscription"}
                </Button>
              )}
            </div>
          </>
        )}
        {!canCheckout && !serviceNotice && (
          <p className="text-sm text-[var(--text-secondary)]">
            Paid upgrades are not enabled in this environment yet. Set Stripe
            price IDs on the API (`STRIPE_PRICE_*`) and optionally
            `NEXT_PUBLIC_STRIPE_PRICE_ID` for a single-plan fallback.
          </p>
        )}
      </div>

      <p className="mt-6">
        <Link
          href="/settings"
          className="font-medium text-[var(--brand-500)] hover:underline"
        >
          ← Settings
        </Link>
      </p>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl">
          <p className="text-[var(--text-secondary)]">Loading billing…</p>
        </div>
      }
    >
      <BillingPageInner />
    </Suspense>
  );
}
