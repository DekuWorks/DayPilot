"use client";

import { useEffect, useState } from "react";
import { getFoundingOffer } from "@/lib/billing-api";

/** Live founding cap from GET /billing/founding. Does not invent a count. */
export function FoundingSpotLine() {
  const [text, setText] = useState(
    "Checking how many founding spots are left.",
  );

  useEffect(() => {
    let cancelled = false;
    getFoundingOffer()
      .then((offer) => {
        if (cancelled) return;
        if (!offer) {
          setText("Spot count unavailable right now.");
          return;
        }
        setText(
          offer.offerAvailable
            ? `${offer.remainingCount} of ${offer.limit} spots remaining.`
            : `Founding 25 is closed. ${offer.remainingCount} of ${offer.limit} spots remaining.`,
        );
      })
      .catch(() => {
        if (!cancelled) setText("Spot count unavailable right now.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <p className="text-sm font-medium text-[var(--text-primary)]">{text}</p>
  );
}
