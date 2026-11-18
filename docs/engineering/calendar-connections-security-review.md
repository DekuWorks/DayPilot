# Calendar connections security review

Scope: `apps/api/src/calendar-connections/` (OAuth, EventKit, CalDAV, token crypto).  
Date: 2026-11-18. Standard: real end-to-end exploitable issues only.

## Finding 1 — OAuth calendar linking CSRF (no session binding)

**Severity:** High  
**Status:** Exploitable

### Evidence

```133:142:apps/api/src/calendar-connections/calendar-connections.service.ts
  /**
   * OAuth CSRF/user binding is the signed JWT in `state` only.
   * Do not Set-Cookie on the API host — Chrome bounce-tracking deletes
   * cookies on the Railway hop (api-*.up.railway.app).
   */
  private signConnectState(userId: string, provider: CalendarProvider): string {
    return this.jwtService.sign(
      { sub: userId, provider, purpose: 'calendar-connect' },
      { expiresIn: '10m' },
    );
  }
```

```381:397:apps/api/src/calendar-connections/calendar-connections.service.ts
  async handleCallback(
    provider: CalendarProvider,
    code: string,
    state: string,
  ) {
    let payload: { sub: string; provider: CalendarProvider; purpose: string };
    try {
      payload = this.jwtService.verify(state);
      if (
        payload.purpose !== 'calendar-connect' ||
        payload.provider !== provider
      )
        throw new Error('Invalid state');
    } catch {
      throw new BadRequestException('Invalid or expired state');
    }
    const userId = payload.sub;
```

```57:78:apps/api/src/calendar-connections/calendar-connections.controller.ts
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: express.Response,
  ) {
    // ...
      const { redirectUrl } = await this.calendarConnections.handleCallback(
        'google',
        code,
        state,
      );
      res.redirect(redirectUrl);
```

Callbacks are unauthenticated. State JWT is not single-use (no `jti` / consume table). Outlook uses the same pattern (`outlook/callback`).

### Attack path

1. Attacker authenticates to DayPilot and calls `GET /calendar-connections/google/connect` (or `outlook/connect`).
2. Response contains a Google/Microsoft authorize URL whose `state` is a JWT with `sub = attackerUserId`.
3. Attacker sends that URL to the victim (email, chat, malicious page).
4. Victim, logged into Google/Microsoft, consents.
5. IdP redirects to Nest callback with `code` + attacker’s `state`.
6. Nest verifies JWT, exchanges `code`, upserts tokens under **attacker** (`userId = payload.sub`).
7. Attacker’s DayPilot account now holds the victim’s calendar OAuth tokens and can sync. Outlook connect requests `Calendars.ReadWrite`.

Same state JWT remains reusable for ~10 minutes for additional victims.

### Impact

Attacker gains read (Google) or read/write (Outlook) access to the victim’s calendar via the attacker’s DayPilot account. Victim need not be logged into DayPilot.

### Fix direction

Bind connect completion to a logged-in DayPilot session (pending-connection + confirm), or store single-use server-side state keyed to the initiating session. Signed `state` alone is not CSRF-safe when the callback is cookieless.

---

## Investigated — not end-to-end exploitable

### 2. OAuth callback open redirect (`FRONTEND_URL` / `state.redirectUrl`)

**Mitigated.** Post-callback redirects are `${FRONTEND_URL}/sync?...` from server config only. State JWT has no `redirectUrl`. No user-controlled open redirect in this module.

Evidence: `calendar-connections.service.ts:399-461`, controller error redirects `controller.ts:63-117`.

### 3. SSRF (CalDAV / Graph / Google)

**No clean E2E chain.**

- CalDAV discovery starts at fixed `https://caldav.icloud.com/` roots (`icloud-caldav.ts:12-15`).
- `caldavRequest` follows redirects and **re-sends Basic Auth to any Location** (`icloud-caldav.ts:138-188`) with no `*.icloud.com` allowlist; absolute `href`s from XML are accepted (`resolveUrl` at `105-110`). That is a credential-exfil gap **if** discovery/redirect leaves Apple’s hosts — not attacker-reachable without MITM or a separate ability to poison `calendarId`.
- Stored CalDAV URLs used at sync (`calendar-connections.service.ts:741-768`) are written only from discovery (`248-256`, `749-751`).
- Graph `nextLink` is followed via SDK (`graph-client.ts:112-115`); responses come from `graph.microsoft.com` (`baseUrl` at `service.ts:849-856`). No attacker-controlled nextLink without breaking TLS to Graph.
- Google `calendarId` is an API resource id, not an arbitrary server fetch URL.

### 4. Token crypto (AES-GCM)

**Implementation OK; residual config risk.**

- AES-256-GCM, 12-byte random IV per seal (`token-crypto.ts:5-6`, `48-55`). No IV reuse.
- Prisma middleware seals/opens on `CalendarConnection` (`prisma.service.ts:15-22`).
- `list` / DTOs strip tokens (`toConnectionDto` at `service.ts:87-113`).
- If `CALENDAR_TOKEN_ENCRYPTION_KEY` is unset, tokens stay plaintext (`token-crypto.ts:39-46`; prod warn in `env.schema.ts:30-34`). Not an authz bypass; DB compromise impact depends on ops.

### 5. EventKit sync IDOR / `deviceId`

**Mitigated.** All upserts/deletes scoped by JWT `userId`. `deviceId` only partitions within that user (`eventkit-sync.service.ts:117-123`, `286-312`, `364-369`). Cannot write into another user’s calendar.

### 6. Outlook `from-token` without mailbox ownership binding

**By design for Supabase Azure `provider_token`; no E2E without a stolen Graph token.**

- `POST outlook/from-token` is JWT-gated (`controller.ts:120-131`).
- Stores any Graph token that can call `/me` (or falls back to JWT mailbox parse) on **the caller’s** user (`service.ts:468-547`).
- No `aud` / app-id check tying the token to DayPilot’s Microsoft app — still requires possession of a working token.
- Cross-site CSRF to attach an attacker token to a victim session is blocked in practice: body is JSON-only (`main.ts:25-31`, no `urlencoded`), CORS allowlist in production (`cors-origin.ts`), despite `SameSite=None` cookies (`auth-cookies.ts:14`).

### 7. Path / header injection

**Mitigated in this module.** Provider param allowlisted (`controller.ts:210-213`). Connection `id` lookups always include `userId`. Redirect targets are config + fixed path segments, not raw user input.

### 8. Apple app-specific password handling

**Mitigated for logging/API exposure; at-rest same as other tokens.**

- Never logged (`connectAppleCalDav` logs user id / counts only — `service.ts:215-227`).
- Stored in `accessToken`, sealed when encryption key is set.
- Not returned from `toConnectionDto`.
- CalDAV path is dormant in product UX but API remains.

### Extra near-miss (Low) — Outlook refresh error body

`refreshOutlookTokens` returns the raw Microsoft token error body to the client (`service.ts:1003-1005`), unlike `exchangeOutlookAuthCode` which uses `summarizeMicrosoftOAuthError`. Information disclosure only; not calendar takeover.

---

## Summary

| # | Issue | Severity | Verdict |
|---|--------|----------|---------|
| 1 | OAuth connect CSRF via cookieless reusable `state` JWT | High | **Exploitable** |
| 2 | Open redirect | — | Mitigated |
| 3 | SSRF CalDAV/Graph/Google | — | No E2E (CalDAV redirect auth gap is defense-in-depth) |
| 4 | Token crypto | — | Crypto OK; plaintext if key unset |
| 5 | EventKit IDOR | — | Mitigated |
| 6 | Outlook from-token ownership | — | Needs stolen Graph token |
| 7 | Path/header injection | — | Mitigated |
| 8 | Apple ASP logging/exposure | — | Mitigated |
