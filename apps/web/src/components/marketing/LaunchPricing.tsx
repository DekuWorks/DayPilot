import Link from "next/link";
import {
  ENTERPRISE_COPY,
  FOUNDING_COPY,
  FOUNDING_LIMIT,
  TEAM_COPY,
  plansForWeb,
} from "@daypilot/lib";
import { AppStoreBadge } from "@/components/AppStoreBadge";
import { Button } from "@/components/Button";
import { FoundingSpotLine } from "@/components/marketing/FoundingSpotLine";

function priceSuffix(planId: string) {
  if (planId === "free") return "";
  return "/month";
}

export function LaunchPricing() {
  const plans = plansForWeb();
  const free = plans.find((plan) => plan.planId === "free");
  const founding = plans.find((plan) => plan.planId === "founding_pro");
  const pro = plans.find((plan) => plan.planId === "pro");
  if (!free || !founding || !pro) return null;

  const cards = [
    {
      plan: free,
      kicker: free.name,
      body: free.description,
      extra: null,
    },
    {
      plan: founding,
      kicker: FOUNDING_COPY.kicker,
      body: `${FOUNDING_COPY.body} ${FOUNDING_COPY.hub} ${FOUNDING_COPY.rate}`,
      extra: <FoundingSpotLine />,
    },
    {
      plan: pro,
      kicker: pro.name,
      body: pro.description,
      extra: null,
    },
  ];

  return (
    <section
      className="container-width section-padding py-16 md:py-24"
      aria-labelledby="launch-pricing-heading"
    >
      <div className="mx-auto max-w-3xl text-center space-y-4 mb-12 md:mb-16">
        <h2
          id="launch-pricing-heading"
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)]"
        >
          Founding 25 and Pro
        </h2>
        <p className="text-base md:text-lg text-[var(--text-secondary)] leading-relaxed">
          Free stays free. Founding 25 is {founding.marketingPrice}/month for
          the first {FOUNDING_LIMIT} paid members, while the offer is open. Pro
          is {pro.marketingPrice}/month. Both are bought in the DayPilot iOS
          app, and the plan applies on the website too.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3 md:gap-8">
        {cards.map(({ plan, kicker, body, extra }) => (
          <div
            key={plan.planId}
            className={`flex flex-col rounded-[var(--radius-lg)] bg-[var(--surface-primary)] p-6 md:p-8 ${
              plan.highlighted
                ? "border-2 border-[var(--brand-500)]"
                : "border border-[var(--border-subtle)]"
            }`}
          >
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {kicker}
            </h3>
            <p className="mt-2">
              <span className="text-3xl font-bold text-[var(--text-primary)]">
                {plan.marketingPrice}
              </span>
              {priceSuffix(plan.planId) ? (
                <span className="ml-2 text-sm text-[var(--text-secondary)]">
                  {priceSuffix(plan.planId)}
                </span>
              ) : null}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {body}
            </p>
            <ul className="mt-4 max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="text-sm leading-relaxed text-[var(--text-secondary)]"
                >
                  {feature}
                </li>
              ))}
            </ul>
            {extra ? <div className="mt-3">{extra}</div> : null}
            {plan.planId === "free" ? (
              <Button href="/signup" variant="outline" className="mt-6 w-full">
                {plan.cta}
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mx-auto mt-8 max-w-3xl space-y-4 text-center">
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          {TEAM_COPY.kicker}. {TEAM_COPY.price} {ENTERPRISE_COPY.kicker}.{" "}
          {ENTERPRISE_COPY.price} They are not for sale.{" "}
          <Link
            href="/pricing#team-waitlist"
            className="font-medium text-[var(--brand-500)] hover:underline"
          >
            Join the Team waitlist
          </Link>{" "}
          or the{" "}
          <Link
            href="/pricing#enterprise-waitlist"
            className="font-medium text-[var(--brand-500)] hover:underline"
          >
            Enterprise waitlist
          </Link>
          .
        </p>
        <div className="flex justify-center">
          <AppStoreBadge />
        </div>
        <p>
          <Link
            href="/pricing"
            className="text-sm font-medium text-[var(--brand-500)] hover:underline"
          >
            See pricing
          </Link>
        </p>
      </div>
    </section>
  );
}
