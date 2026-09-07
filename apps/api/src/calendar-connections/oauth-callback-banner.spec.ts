/**
 * Mirrors apps/web/src/lib/calendar-connection-ui.ts oauth-callback helpers.
 * Keep in sync: hide ?error=outlook_callback when Outlook is already healthy.
 */
type Tone = "healthy" | "needsAttention" | "notConnected";

function oauthCallbackProvider(err: string | null | undefined) {
  if (err === "outlook_callback") return "outlook" as const;
  if (err === "google_callback") return "google" as const;
  return null;
}

function shouldShowOauthCallbackError(
  err: string | null | undefined,
  rows: Array<{ id: string; tone: Tone }>,
): boolean {
  if (!err) return false;
  const provider = oauthCallbackProvider(err);
  if (!provider) return true;
  const row = rows.find((r) => r.id === provider);
  return !row || row.tone !== "healthy";
}

describe("stale OAuth callback banner", () => {
  it("hides outlook_callback when Outlook is Connected", () => {
    expect(
      shouldShowOauthCallbackError("outlook_callback", [
        { id: "outlook", tone: "healthy" },
      ]),
    ).toBe(false);
  });

  it("shows outlook_callback when Outlook needs reconnect", () => {
    expect(
      shouldShowOauthCallbackError("outlook_callback", [
        { id: "outlook", tone: "needsAttention" },
      ]),
    ).toBe(true);
  });

  it("shows outlook_callback when Outlook is not connected", () => {
    expect(
      shouldShowOauthCallbackError("outlook_callback", [
        { id: "outlook", tone: "notConnected" },
      ]),
    ).toBe(true);
  });

  it("still shows missing_params", () => {
    expect(
      shouldShowOauthCallbackError("missing_params", [
        { id: "outlook", tone: "healthy" },
      ]),
    ).toBe(true);
  });
});
