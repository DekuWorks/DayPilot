import { getApiErrorMessage, getApiUrl, nestFetch } from "./api";

export type HubSummary = {
  phase: "none" | "active" | "grace" | "expired";
  founderNumber: number | null;
  label: string | null;
  canRead: boolean;
  canWrite: boolean;
  betaEligible: boolean;
  unreadReplyCount: number;
};

export type HubMessage = {
  id: string;
  body: string;
  kind: string;
  createdAt: string;
};

export type HubAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
};

export type HubSuggestion = {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  status: string;
  statusLabel: string;
  featureKey: string | null;
  createdAt: string;
  updatedAt: string;
  unread: boolean;
  messages: HubMessage[];
  attachments: HubAttachment[];
  founderUserId?: string;
  founderEmail?: string | null;
  ownerUnread?: boolean;
};

export type BetaFeature = {
  key: string;
  name: string;
  description: string;
  stage: string;
  label: "Beta" | null;
  apply: boolean;
  optedOut: boolean;
  changesScheduling: boolean;
  access: string;
};

export type NoticePrefs = {
  inApp: boolean;
  push: boolean;
  email: boolean;
};

async function parse<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(getApiErrorMessage(err, fallback));
  }
  return res.json() as Promise<T>;
}

export async function getHubSummary(): Promise<HubSummary> {
  const res = await nestFetch(`${getApiUrl()}/founder-hub`);
  return parse(res, "Could not load Founder Hub");
}

export async function listSuggestions(): Promise<HubSuggestion[]> {
  const res = await nestFetch(`${getApiUrl()}/founder-hub/suggestions`);
  return parse(res, "Could not load suggestions");
}

export async function createSuggestion(input: {
  title: string;
  description: string;
  category: string;
  featureKey?: string;
}): Promise<{ suggestion: HubSuggestion }> {
  const res = await nestFetch(`${getApiUrl()}/founder-hub/suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parse(res, "Could not send suggestion");
}

export async function getSuggestion(id: string): Promise<HubSuggestion> {
  const res = await nestFetch(`${getApiUrl()}/founder-hub/suggestions/${id}`);
  return parse(res, "Could not load suggestion");
}

export async function replyToSuggestion(id: string, body: string) {
  const res = await nestFetch(
    `${getApiUrl()}/founder-hub/suggestions/${id}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    },
  );
  return parse(res, "Could not send message");
}

export async function uploadScreenshot(id: string, file: File): Promise<void> {
  const dataBase64 = await fileToBase64(file);
  const res = await nestFetch(
    `${getApiUrl()}/founder-hub/suggestions/${id}/attachments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        dataBase64,
      }),
    },
  );
  await parse(res, "Could not upload screenshot");
}

export function attachmentUrl(id: string): string {
  return `${getApiUrl()}/founder-hub/attachments/${id}`;
}

export async function listBeta(platform = "web"): Promise<BetaFeature[]> {
  const res = await nestFetch(
    `${getApiUrl()}/founder-hub/beta?platform=${platform}`,
  );
  return parse(res, "Could not load early access");
}

export async function setBetaOptOut(key: string, off: boolean) {
  const res = await nestFetch(
    `${getApiUrl()}/founder-hub/beta/${key}/opt-out`,
    {
      method: off ? "POST" : "DELETE",
    },
  );
  return parse<BetaFeature[]>(res, "Could not update early access");
}

export async function getNoticePrefs(): Promise<NoticePrefs> {
  const res = await nestFetch(
    `${getApiUrl()}/founder-hub/notification-preferences`,
  );
  return parse(res, "Could not load notification preferences");
}

export async function saveNoticePrefs(
  prefs: NoticePrefs,
): Promise<NoticePrefs> {
  const res = await nestFetch(
    `${getApiUrl()}/founder-hub/notification-preferences`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    },
  );
  return parse(res, "Could not save notification preferences");
}

export async function listInbox(query: {
  category?: string;
  status?: string;
  q?: string;
  unread?: boolean;
}): Promise<HubSuggestion[]> {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.unread) params.set("unread", "1");
  const res = await nestFetch(
    `${getApiUrl()}/founder-hub/inbox?${params.toString()}`,
  );
  return parse(res, "Could not load founder messages");
}

export async function getInboxThread(id: string): Promise<HubSuggestion> {
  const res = await nestFetch(`${getApiUrl()}/founder-hub/inbox/${id}`);
  return parse(res, "Could not load thread");
}

export async function inboxReply(
  id: string,
  body: string,
): Promise<HubSuggestion> {
  const res = await nestFetch(`${getApiUrl()}/founder-hub/inbox/${id}/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return parse(res, "Could not send reply");
}

export async function inboxNote(
  id: string,
  body: string,
): Promise<HubSuggestion> {
  const res = await nestFetch(`${getApiUrl()}/founder-hub/inbox/${id}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return parse(res, "Could not save note");
}

export async function inboxStatus(
  id: string,
  status: string,
): Promise<HubSuggestion> {
  const res = await nestFetch(`${getApiUrl()}/founder-hub/inbox/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parse(res, "Could not change status");
}

export async function markInboxRead(
  id: string,
  read: boolean,
): Promise<HubSuggestion> {
  const res = await nestFetch(
    `${getApiUrl()}/founder-hub/inbox/${id}/${read ? "read" : "unread"}`,
    { method: "POST" },
  );
  return parse(res, "Could not update read state");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      const comma = value.indexOf(",");
      resolve(comma >= 0 ? value.slice(comma + 1) : value);
    };
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}
