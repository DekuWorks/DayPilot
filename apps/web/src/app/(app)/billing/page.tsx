"use client";

/**
 * Billing shows the plan bought in the iOS app. The website does not
 * sell subscriptions.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { PlanCatalog } from "@/components/pricing/PlanCatalog";
import { useAuth } from "@/providers/AuthProvider";
import * as billingApi from "@/lib/billing-api";
import { isPaidSubscription, type Subscription } from "@/lib/billing-api";

const FREE_FALLBACK: Subscription = {
  tier: "Free",
  planId: "free",
  displayName: "Free",
  status: "active",
  currentPeriodEnd: null,
  stripeCustomerId: null,
  configured: false,
  paid: false,
  hasProAccess: false,
  calendarSync: false,
  calendarConnectionLimit: 1,
  bookingLinkLimit: 1,
};

function BillingPageInner() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceNotice, setServiceNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    billingApi
      .getSubscription()
      .then((sub) => {
        if (cancelled) return;
        setSubscription(sub);
        setServiceNotice("");
      })
      .catch(() => {
        if (cancelled) return;
        setSubscription(FREE_FALLBACK);
        setServiceNotice(
          "Billing service is unavailable right now. Showing the Free plan until it reconnects.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl">
        <p className="text-[var(--text-secondary)]">Loading billing…</p>
      </div>
    );
  }

  const paid = isPaidSubscription(subscription);
  const founderLabel =
    subscription?.founderNumber != null
      ? `Founding Member #${String(subscription.founderNumber).padStart(2, "0")}`
      : null;
  const planLabel =
    founderLabel || subscription?.displayName || subscription?.tier || "Free";

  return (
    <div className="max-w-6xl">
      <h1 className="mb-2 text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
        Billing & Subscription
      </h1>
      <p className="mb-6 text-[var(--text-secondary)]">
        Subscriptions are bought in the DayPilot iOS app. The plan applies on
        this website as well.
      </p>

      {serviceNotice ? (
        <div className="mb-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-secondary)]">
          {serviceNotice}
        </div>
      ) : null}

      <div className="glass-effect mb-8 max-w-2xl space-y-4 rounded-2xl p-6 md:p-8">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
            Current plan
          </h2>
          <p className="text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">
              {planLabel}
            </span>
            {" · "}
            {subscription?.status}
            {subscription?.currentPeriodEnd ? (
              <>
                {" "}
                · Through{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </>
            ) : null}
          </p>
        </div>
        {paid ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Multiple calendar connections and unlimited booking links are
            unlocked here and in the app. Manage or cancel the subscription in
            your App Store account settings. Canceling keeps access until the
            end of the paid period.
          </p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            Free includes your calendar, events, 1 external calendar connection,
            and 1 booking link. Founding 25 and Pro add more connections and
            unlimited booking links.
          </p>
        )}
      </div>

      <PlanCatalog emailHint={user?.email} />

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
        <div className="max-w-6xl">
          <p className="text-[var(--text-secondary)]">Loading billing…</p>
        </div>
      }
    >
      <BillingPageInner />
    </Suspense>
  );
}
