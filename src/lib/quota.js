import { TIER_LIMITS, TRANSACTIONAL_RESERVE } from '../config/defaults.js';

/**
 * Converts a messaging limit tier string to the numeric cap (null = Unlimited).
 * @param {string | null} tier  e.g. 'TIER_250', 'TIER_2K', 'TIER_UNLIMITED'
 * @returns {number | null}
 */
export function tierToLimit(tier) {
  if (!tier) return null;
  return TIER_LIMITS[tier] ?? null;
}

/**
 * How many messages we can still send in this 24 h window.
 *
 * formula: tier − usage24h − transactionalReserve
 *
 * Returns null when the tier is Unlimited (we don't block).
 * Returns 0 when the result would be negative (can't go below 0).
 *
 * @param {{ tier: string | null, usage24h: number, reserve?: number }} options
 * @returns {number | null}
 */
export function availableQuota({ tier, usage24h, reserve = TRANSACTIONAL_RESERVE }) {
  const cap = tierToLimit(tier);
  if (cap === null) return null; // Unlimited
  return Math.max(0, cap - usage24h - reserve);
}

/**
 * Checks whether sending `count` messages would exceed the daily quota.
 * Returns null when the tier is Unlimited (never blocks).
 *
 * @param {{ count: number, tier: string | null, usage24h: number, reserve?: number }} options
 * @returns {{ allowed: boolean, available: number | null, tier: string | null }}
 */
export function checkQuota({ count, tier, usage24h, reserve = TRANSACTIONAL_RESERVE }) {
  const available = availableQuota({ tier, usage24h, reserve });
  const allowed = available === null || count <= available;
  return { allowed, available, tier };
}
