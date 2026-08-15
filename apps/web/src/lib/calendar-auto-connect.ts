import type { Session } from "@supabase/supabase-js";
import * as calendarConnectionsApi from "./calendar-connections-api";

function hasIdentity(session: Session, providers: string[]): boolean {
  return (
    session.user.identities?.some((i) => providers.includes(i.provider)) ??
    false
  );
}

/**
 * Once per user: if they signed in with Google/Microsoft, connect that calendar.
 * Tries Supabase provider_token for Outlook first, then Nest OAuth.
 */
export async function maybeAutoConnectCalendars(session: Session): Promise<void> {
  if (typeof window === "undefined") return;
  const userId = session.user.id;
  let connections: Awaited<
    ReturnType<typeof calendarConnectionsApi.listConnections>
  > = [];
  try {
    connections = await calendarConnectionsApi.listConnections();
  } catch {
    return;
  }

  const google = connections.find((c) => c.provider === "google");
  const outlook = connections.find((c) => c.provider === "outlook");

  const googleKey = `calendar_autoconnect_google_${userId}`;
  if (
    !google &&
    hasIdentity(session, ["google"]) &&
    !localStorage.getItem(googleKey)
  ) {
    localStorage.setItem(googleKey, "1");
    try {
      const result = await calendarConnectionsApi.getConnectUrl("google");
      if (result.redirectUrl) window.location.href = result.redirectUrl;
    } catch {
      /* Sync page still offers Connect */
    }
    return;
  }

  const outlookKey = `calendar_autoconnect_outlook_${userId}`;
  if (
    !outlook &&
    hasIdentity(session, ["azure", "microsoft"]) &&
    !localStorage.getItem(outlookKey)
  ) {
    localStorage.setItem(outlookKey, "1");
    const token = session.provider_token;
    if (token) {
      try {
        await calendarConnectionsApi.importOutlookProviderToken({
          accessToken: token,
          refreshToken: session.provider_refresh_token ?? undefined,
        });
        return;
      } catch {
        /* fall through to Nest OAuth */
      }
    }
    try {
      const result = await calendarConnectionsApi.getConnectUrl("outlook");
      if (result.redirectUrl) window.location.href = result.redirectUrl;
    } catch {
      /* Sync page still offers Connect */
    }
  }
}
