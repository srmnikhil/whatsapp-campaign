import { describe, expect, it } from 'vitest';
import { formatQuality, formatTier, getQualityTone } from './connectionInfo.js';

describe('connection info formatting', () => {
  it('labels quality ratings', () => {
    expect(formatQuality('GREEN')).toBe('High');
    expect(formatQuality('RED')).toBe('Low');
    expect(formatQuality('')).toBe('Not reported');
    expect(getQualityTone('YELLOW')).toBe('warning');
    expect(getQualityTone('SOMETHING_NEW')).toBe('neutral');
  });

  it('labels messaging limit tiers', () => {
    expect(formatTier('TIER_2K')).toBe('2,000 unique users / 24 h');
    expect(formatTier('TIER_UNLIMITED')).toBe('Unlimited');
    expect(formatTier('TIER_NEW')).toBe('TIER_NEW');
    expect(formatTier(undefined)).toBe('Not reported');
  });
});
