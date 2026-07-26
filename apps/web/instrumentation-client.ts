import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    // Keep first-paint light — errors matter more than traces on GH Pages.
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.2,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
