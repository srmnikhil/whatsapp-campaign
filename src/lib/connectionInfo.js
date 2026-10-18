import { QUALITY_LABELS, TIER_LIMITS } from '../config/defaults.js';

const UNLIMITED_LABEL = 'Unlimited';
const NOT_REPORTED_LABEL = 'Not reported';
const numberFormat = new Intl.NumberFormat('en-IN');

export function formatQuality(rating) {
  if (!rating) return NOT_REPORTED_LABEL;
  return QUALITY_LABELS[rating] ?? rating;
}

const QUALITY_TONES = Object.freeze({ GREEN: 'success', YELLOW: 'warning', RED: 'error' });
const DEFAULT_TONE = 'neutral';

export function getQualityTone(rating) {
  return QUALITY_TONES[rating] ?? DEFAULT_TONE;
}

export function formatTier(tier) {
  if (!tier) return NOT_REPORTED_LABEL;
  if (!(tier in TIER_LIMITS)) return tier;

  const limit = TIER_LIMITS[tier];
  return limit === null ? UNLIMITED_LABEL : `${numberFormat.format(limit)} unique users / 24 h`;
}
