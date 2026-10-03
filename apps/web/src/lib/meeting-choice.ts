/** Host-configured ways to meet. Automatic Meet, Zoom, and Teams are not offered. */

export const CONFIGURED_METHODS = ["link", "phone", "slack", "discord"] as const;

export type ConfiguredMethod = (typeof CONFIGURED_METHODS)[number];

export type PublicMeetingChoice = {
  id: ConfiguredMethod;
  label: string;
  detail: string;
};

export type HostMeetingDraft = {
  link: boolean;
  linkUrl: string;
  phone: boolean;
  phoneNumber: string;
  slack: boolean;
  slackUrl: string;
  discord: boolean;
  discordUrl: string;
};

export const AUTOMATIC_MEETING_NOTES = [
  {
    id: "google_meet",
    label: "Google Meet",
    detail:
      "DayPilot does not create a Google Meet link. Paste a link you already have.",
  },
  {
    id: "zoom",
    label: "Zoom",
    detail: "DayPilot does not create Zoom meetings. Paste a join link instead.",
  },
  {
    id: "teams",
    label: "Microsoft Teams",
    detail:
      "DayPilot does not create a Teams meeting. Paste a join link instead.",
  },
] as const;

const PUBLIC_COPY: Record<ConfiguredMethod, { label: string; detail: string }> =
  {
    link: {
      label: "Meeting link",
      detail:
        "The host sends the link after you book. It is not shown on this page.",
    },
    phone: {
      label: "Phone call",
      detail:
        "The host will call you. Their number is not shown on this page.",
    },
    slack: {
      label: "Slack",
      detail:
        "You get a Slack link after you book. You may need to be in that workspace.",
    },
    discord: {
      label: "Discord",
      detail: "You get a Discord invite after you book.",
    },
  };

export function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return url.toString();
}

/** Guest callback number. Empty is allowed. Invalid text is rejected. */
export function normalizeCallbackNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\+?[0-9][0-9\s()-]{6,20}$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return trimmed;
}

export function publicChoice(id: ConfiguredMethod): PublicMeetingChoice {
  return { id, ...PUBLIC_COPY[id] };
}

/** Ready choices for a guest. URLs and the host number are not included. */
export function readyPublicChoices(draft: HostMeetingDraft): PublicMeetingChoice[] {
  const choices: PublicMeetingChoice[] = [];
  if (draft.link && normalizeHttpUrl(draft.linkUrl)) choices.push(publicChoice("link"));
  if (draft.phone && normalizeCallbackNumber(draft.phoneNumber)) {
    choices.push(publicChoice("phone"));
  }
  if (draft.slack && normalizeHttpUrl(draft.slackUrl)) {
    choices.push(publicChoice("slack"));
  }
  if (draft.discord && normalizeHttpUrl(draft.discordUrl)) {
    choices.push(publicChoice("discord"));
  }
  return choices;
}

export function choiceHasPrivateValue(choice: PublicMeetingChoice): boolean {
  const record = choice as PublicMeetingChoice & {
    url?: string;
    phone?: string;
    hostPhone?: string;
  };
  return Boolean(record.url || record.phone || record.hostPhone);
}
