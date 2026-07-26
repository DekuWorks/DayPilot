import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Static export is for production / CI (GitHub Pages). In `next dev`, leave it
// off so dynamic segments like /book/[slug] and /tasks/[id] resolve at runtime.
const useStaticExport =
  process.env.NEXT_OUTPUT_EXPORT === "1" ||
  process.env.npm_lifecycle_event === "build" ||
  process.env.CI === "true";

const nextConfig: NextConfig = {
  ...(useStaticExport ? { output: "export" as const } : {}),
  // Required for GitHub Pages / static hosting — no image optimizer server
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
});
