import type { FounderPhase } from './founding-access';

export const SCHEDULE_BUFFER_KEY = 'schedule_buffer';

export const SCHEDULE_BUFFER_INSTRUCTION =
  'Leave about 10 minutes of free time between suggested events when other events are already on that day.';

export type BetaStage =
  | 'internal_testing'
  | 'founder_beta'
  | 'general_availability';

export type BetaFeatureRow = {
  key: string;
  name: string;
  description: string;
  stage: BetaStage;
  platforms: string[];
  minimumAppVersion: string | null;
  enabled: boolean;
  founderAvailableAt: Date | null;
  generalAvailableAt: Date | null;
  planEntitlement: string;
  changesScheduling: boolean;
};

export type BetaDecision = {
  visible: boolean;
  apply: boolean;
  optedOut: boolean;
  access: 'hidden' | 'beta' | 'plan';
  label: 'Beta' | null;
};

function versionAtLeast(current: string | null, minimum: string | null): boolean {
  if (!minimum) return true;
  if (!current) return false;
  const parse = (value: string) =>
    value
      .split(/[^0-9]+/)
      .filter(Boolean)
      .map((part) => Number(part));
  const left = parse(current);
  const right = parse(minimum);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const a = left[i] ?? 0;
    const b = right[i] ?? 0;
    if (a > b) return true;
    if (a < b) return false;
  }
  return true;
}

function planCovers(planId: string, entitlement: string): boolean {
  if (entitlement === 'pro') {
    return planId === 'pro' || planId === 'founding_pro';
  }
  if (entitlement === 'team') return planId === 'team';
  if (entitlement === 'enterprise') return planId === 'enterprise';
  return false;
}

/**
 * Beta access does not change the stored subscription. A founder_beta feature
 * whose planEntitlement is team or enterprise stays a temporary flag.
 * Client-supplied enabled, stage, or founder flags are not arguments here.
 */
export function decideBetaAccess(input: {
  feature: BetaFeatureRow;
  phase: FounderPhase;
  planId: string;
  platform: string;
  appVersion: string | null;
  optedOut: boolean;
  now: Date;
}): BetaDecision {
  const hidden: BetaDecision = {
    visible: false,
    apply: false,
    optedOut: input.optedOut,
    access: 'hidden',
    label: null,
  };
  const feature = input.feature;
  if (!feature.enabled) return hidden;
  if (!feature.platforms.includes(input.platform)) return hidden;
  if (!versionAtLeast(input.appVersion, feature.minimumAppVersion)) {
    return hidden;
  }
  if (feature.stage === 'internal_testing') return hidden;

  if (feature.stage === 'founder_beta') {
    if (input.phase !== 'active' && input.phase !== 'grace') return hidden;
    if (
      feature.founderAvailableAt &&
      feature.founderAvailableAt.getTime() > input.now.getTime()
    ) {
      return hidden;
    }
    const apply = feature.changesScheduling ? !input.optedOut : true;
    return {
      visible: true,
      apply,
      optedOut: input.optedOut,
      access: 'beta',
      label: 'Beta',
    };
  }

  if (
    feature.generalAvailableAt &&
    feature.generalAvailableAt.getTime() > input.now.getTime()
  ) {
    return hidden;
  }
  if (!planCovers(input.planId, feature.planEntitlement)) return hidden;
  const apply = feature.changesScheduling ? !input.optedOut : true;
  return {
    visible: true,
    apply,
    optedOut: input.optedOut,
    access: 'plan',
    label: null,
  };
}
