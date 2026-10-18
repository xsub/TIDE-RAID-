export const DEFAULT_SWELL = 2;
export const MAX_SWELL = 4;
export const TRIAL_SWELL = 1;
export const clampSwell = (value) => Number.isFinite(value) ? Math.max(0, Math.min(MAX_SWELL, value)) : DEFAULT_SWELL;
