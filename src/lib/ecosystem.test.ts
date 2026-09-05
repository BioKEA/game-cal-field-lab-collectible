import { describe, it, expect } from 'vitest';
import {
  getHealthDamage,
  getHealthStatus,
  getHealthMultiplier,
  getBiomeHealth,
  computeVisitorCredits,
  MUSEUM_ACCUMULATION_CAP_HOURS,
} from '@/lib/ecosystem';
import type { GameState } from '@/types/game';

describe('health', () => {
  it('bands map to statuses and multipliers', () => {
    expect(getHealthStatus(100)).toBe('thriving');
    expect(getHealthStatus(70)).toBe('thriving');
    expect(getHealthStatus(69)).toBe('stressed');
    expect(getHealthStatus(39)).toBe('degraded');
    expect(getHealthStatus(19)).toBe('critical');
    expect(getHealthMultiplier(19)).toBe(0.3);
  });
  it('damage scales with rarity', () => {
    expect(getHealthDamage('common')).toBe(2);
    expect(getHealthDamage('legendary')).toBe(15);
  });
  it('unknown biome health defaults to 100', () => {
    expect(getBiomeHealth({ biomeHealth: {} } as unknown as GameState, 'nope')).toBe(100);
  });
});

describe('computeVisitorCredits', () => {
  const lookup = (id: string) => (id === 'leg' ? { rarity: 'legendary' as const } : id === 'com' ? { rarity: 'common' as const } : undefined);
  it('sums per-hour rates across halls and caps accumulation', () => {
    const longAgo = new Date(Date.now() - 48 * 3600000).toISOString();
    const state = { lastMuseumCollect: longAgo, exhibits: { a: ['leg', null, 'com'], b: ['ghost', null, null] } } as unknown as GameState;
    const r = computeVisitorCredits(state, lookup);
    expect(r.ratePerHour).toBe(123);
    expect(r.hours).toBe(MUSEUM_ACCUMULATION_CAP_HOURS);
    expect(r.credits).toBe(123 * MUSEUM_ACCUMULATION_CAP_HOURS);
  });
  it('yields nothing with empty halls', () => {
    const state = { lastMuseumCollect: new Date().toISOString(), exhibits: {} } as unknown as GameState;
    expect(computeVisitorCredits(state, lookup).credits).toBe(0);
  });
});
