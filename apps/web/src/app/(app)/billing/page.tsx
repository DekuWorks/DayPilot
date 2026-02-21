"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/Button";
import * as billingApi from "@/lib/billing-api";
import type { Subscription } from "@/lib/billing-api";

const PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    billingApi.getSubscription().then(
      (data) => {
        if (!cancelled) setSubscription(data);
      },
      () => {
        if (!cancelled) setError("Failed to load subscription");
      }
    ).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  async function handleUpgrade() {
    if (!PRICE_ID) {
      setError("Upgrade is not configured. Set NEXT_PUBLIC_STRIPE_PRICE_ID.");
      return;
    }
    setError("");
    setActionLoading("checkout");
    try {
      const { url } = await billingApi.createCheckoutSession(PRICE_ID);
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
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
      <div className="container-width section-padding py-8 md:py-12">
        <p className="text-[#4f4f4f]">Loading billing…</p>
      </div>
    );
  }

  return (
    <div className="container-width section-padding py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-bold text-[#2B3448] mb-2">Billing & Subscription</h1>
      <p className="text-[#4f4f4f] mb-6">Manage your plan and payment method.</p>

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800">
          Thank you. Your subscription is now active.
        </div>
      )}
      {canceled && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          Checkout was canceled. You can upgrade anytime.
        </div>
      )}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      <div className="glass-effect rounded-2xl p-6 md:p-8 max-w-2xl space-y-6">
        {subscription && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-[#2B3448] mb-1">Current plan</h2>
              <p className="text-[#4f4f4f]">
                <span className="font-medium text-[#2B3448]">{subscription.tier}</span>
                {" · "}
                {subscription.status}
                {subscription.currentPeriodEnd && (
                  <> · Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {subscription.tier === "Free" && PRICE_ID && (
                <Button
                  onClick={handleUpgrade}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "checkout" ? "Redirecting…" : "Upgrade"}
                </Button>
              )}
              {subscription.stripeCustomerId && (
                <Button
                  variant="outline"
                  onClick={handleManage}
                  disabled={!!actionLoading}
                >
                  {actionLoading === "portal" ? "Opening…" : "Manage subscription"}
                </Button>
              )}
            </div>
          </>
        )}
        {!PRICE_ID && (
          <p className="text-sm text-[#4f4f4f]">
            To enable upgrades, set <code className="bg-black/5 px-1 rounded">NEXT_PUBLIC_STRIPE_PRICE_ID</code> to your Stripe Price ID.
          </p>
        )}
      </div>

      <p className="mt-6">
        <Link href="/settings" className="text-[#4FB3B3] font-medium hover:underline">← Settings</Link>
      </p>
    </div>
  );
}
