import { createHash } from 'node:crypto';

export const SUGGESTION_CATEGORIES = [
  'feature_idea',
  'improvement',
  'bug',
  'integration',
  'other',
] as const;

export const SUGGESTION_STATUSES = [
  'submitted',
  'under_review',
  'planned',
  'building',
  'shipped',
  'closed',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  feature_idea: 'Feature Idea',
  improvement: 'Improvement',
  bug: 'Bug',
  integration: 'Integration',
  other: 'Other',
};

export const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  planned: 'Planned',
  building: 'Building',
  shipped: 'Shipped',
  closed: 'Closed',
};

export const SUBMISSIONS_PER_HOUR = 5;
export const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
export const MAX_ATTACHMENTS = 3;

export type SuggestionInput = {
  title: string;
  description: string;
  category: (typeof SUGGESTION_CATEGORIES)[number];
  featureKey: string | null;
};

/** Drops founder number, badge, entitlement, and feature-flag fields. */
export function pickSuggestionInput(body: Record<string, unknown>): SuggestionInput {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description =
    typeof body.description === 'string' ? body.description.trim() : '';
  const category = body.category;
  const featureKey =
    typeof body.featureKey === 'string' && body.featureKey.trim()
      ? body.featureKey.trim().slice(0, 80)
      : null;
  if (!title || title.length > 120) {
    throw new Error('Title must be 1–120 characters.');
  }
  if (!description || description.length > 4000) {
    throw new Error('Description must be 1–4000 characters.');
  }
  if (
    typeof category !== 'string' ||
    !SUGGESTION_CATEGORIES.includes(
      category as (typeof SUGGESTION_CATEGORIES)[number],
    )
  ) {
    throw new Error('Choose a category.');
  }
  return {
    title,
    description,
    category: category as SuggestionInput['category'],
    featureKey,
  };
}

export function suggestionHash(title: string, description: string): string {
  const norm = (value: string) =>
    value.trim().toLowerCase().replace(/\s+/g, ' ');
  return createHash('sha256')
    .update(`${norm(title)}\n${norm(description)}`)
    .digest('hex');
}

export function founderMessageAlert(title: string): { title: string; body: string } {
  const clean = title.trim().slice(0, 120) || 'Suggestion';
  return {
    title: 'Founder message',
    body: `A founding member sent a message: ${clean}`,
  };
}

const MIME_BY_KIND = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
} as const;

export function detectImage(
  bytes: Buffer,
  declaredMime: string,
): { mimeType: string } | null {
  const mime = declaredMime.trim().toLowerCase();
  if (bytes.length < 12 || bytes.length > MAX_ATTACHMENT_BYTES) return null;
  const png =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const gif =
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38;
  const webp =
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP';
  const detected = png
    ? MIME_BY_KIND.png
    : jpeg
      ? MIME_BY_KIND.jpeg
      : gif
        ? MIME_BY_KIND.gif
        : webp
          ? MIME_BY_KIND.webp
          : null;
  if (!detected || detected !== mime) return null;
  return { mimeType: detected };
}

export function safeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'screenshot';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80);
  return cleaned || 'screenshot';
}
