import { describe, expect, it } from 'vitest';
import { availableQuota, checkQuota, isTierKnown, tierToLimit } from './quota.js';

describe('quota calculation', () => {
  it('converts known tiers to limits', () => {
    expect(tierToLimit('TIER_250')).toBe(250);
    expect(tierToLimit('TIER_2K')).toBe(2000);
    expect(tierToLimit('TIER_10K')).toBe(10000);
    expect(tierToLimit('TIER_100K')).toBe(100000);
    expect(tierToLimit('TIER_UNLIMITED')).toBe(null);
    expect(tierToLimit(null)).toBe(null);
  });

  it('reads tiers that are not in the table', () => {
    expect(tierToLimit('TIER_1K')).toBe(1000);
    expect(tierToLimit('TIER_50K')).toBe(50000);
    expect(tierToLimit('garbage')).toBe(null);
    expect(isTierKnown('TIER_1K')).toBe(true);
    expect(isTierKnown('TIER_UNLIMITED')).toBe(true);
    expect(isTierKnown('')).toBe(false);
    expect(isTierKnown('garbage')).toBe(false);
  });

  it('calculates available quota with default reserve', () => {
    // 2000 tier - 100 used - 0 reserve = 1900 available
    expect(availableQuota({ tier: 'TIER_2K', usage24h: 100 })).toBe(1900);
    // Explicit reserve of 100
    expect(availableQuota({ tier: 'TIER_2K', usage24h: 100, reserve: 100 })).toBe(1800);
    // When usage >= tier limit, returns 0
    expect(availableQuota({ tier: 'TIER_250', usage24h: 300 })).toBe(0);
    // Unlimited returns null
    expect(availableQuota({ tier: 'TIER_UNLIMITED', usage24h: 500 })).toBe(null);
  });

  it('checks quota allowance properly', () => {
    // 250 - 50 used - 0 reserve = 200 available
    expect(checkQuota({ count: 50, tier: 'TIER_250', usage24h: 50 }).allowed).toBe(true);
    expect(checkQuota({ count: 200, tier: 'TIER_250', usage24h: 50 }).allowed).toBe(true);
    expect(checkQuota({ count: 201, tier: 'TIER_250', usage24h: 50 }).allowed).toBe(false);

    // Unlimited tier is always allowed
    expect(checkQuota({ count: 999999, tier: 'TIER_UNLIMITED', usage24h: 5000 }).allowed).toBe(true);
  });
});
