import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS } from '@/data/achievements';
import type { PlayerRank } from '@/types/game';

const base = {
  totalCollected: 0,
  totalIdentified: 0,
  discoveredSpecies: 0,
  expeditionsCompleted: 0,
  rank: 'volunteer' as PlayerRank,
  unlockedBiomes: 0,
  legendaryFound: false,
  ultraRareFound: false,
};

function check(id: string, stats: Partial<typeof base>) {
  const def = ACHIEVEMENTS.find(a => a.id === id)!;
  return def.check({ ...base, ...stats });
}

describe('rank achievements', () => {
  it('unlock at and above the named rank, including the top ranks', () => {
    expect(check('junior-explorer', { rank: 'volunteer' })).toBe(false);
    expect(check('junior-explorer', { rank: 'junior-explorer' })).toBe(true);
    expect(check('junior-explorer', { rank: 'legendary-naturalist' })).toBe(true);
    expect(check('field-researcher', { rank: 'junior-explorer' })).toBe(false);
    expect(check('field-researcher', { rank: 'chief-scientist' })).toBe(true);
  });
});

describe('biome achievements', () => {
  it('Marin Master describes its real threshold', () => {
    const def = ACHIEVEMENTS.find(a => a.id === 'all-biomes')!;
    expect(def.description).toBe('Unlock 5 biomes');
    expect(check('all-biomes', { unlockedBiomes: 5 })).toBe(true);
    expect(check('all-biomes', { unlockedBiomes: 4 })).toBe(false);
  });
});
