export type OutboundProvider = 'google' | 'outlook' | 'apple';

export type OutboundLink = { id: string };

export type OutboundLinks = Partial<Record<OutboundProvider, OutboundLink>>;

const PROVIDERS: OutboundProvider[] = ['google', 'outlook', 'apple'];

export function readOutbound(metadata: unknown): OutboundLinks {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  const raw = (metadata as { outbound?: unknown }).outbound;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const links: OutboundLinks = {};
  for (const provider of PROVIDERS) {
    const row = (raw as Record<string, unknown>)[provider];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const id = (row as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) links[provider] = { id };
  }
  return links;
}

export function withOutbound(
  metadata: unknown,
  links: OutboundLinks,
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  base.outbound = { ...readOutbound(metadata), ...links };
  return base;
}
