import { describe, it, expect } from 'vitest';
import { BASE_RARITY_WEIGHTS, eligibleSpecies, computeSpawnWeights, pickWeighted, type SpawnContext } from '@/lib/spawn';
import { KEYSTONE_BONUS } from '@/lib/ecosystem';
import { computeBuffs } from '@/lib/buffs';
import { WEATHER_TYPES } from '@/data/weather';
import { ALL_EVENTS } from '@/data/events';
import type { GameState, Species } from '@/types/game';

function sp(over: Partial<Species>): Species {
  return {
    id: 'x', commonName: 'X', scientificName: 'X x', family: '', order: '', taxonomicGroup: 'insects',
    rarity: 'common', biomeIds: ['muir-woods'], samplingMethods: ['vial'], description: '', funFact: '',
    conservationStatus: '', barcodeGene: 'COI', barcodeLength: 658, emoji: '🐛', ...over,
  };
}

const neutralWeather = { ...WEATHER_TYPES[0], taxonModifiers: {}, rarityBoost: {} };
const noBuffs = computeBuffs({ unlockedSkills: [], impactFactor: 0 } as unknown as GameState);

function ctx(over: Partial<SpawnContext> = {}): SpawnContext {
  return { biomeId: 'muir-woods', weather: neutralWeather, health: 100, keystone: false, buffs: noBuffs, event: null, ...over };
}

describe('eligibleSpecies', () => {
  const pool = [
    sp({ id: 'day-vial', samplingMethods: ['vial'] }),
    sp({ id: 'night-vial', samplingMethods: ['vial'], activeAt: 'night' }),
    sp({ id: 'both-net', samplingMethods: ['hand-net'], activeAt: 'both' }),
  ];
  it('filters by method and time of day', () => {
    expect(eligibleSpecies(pool, 'vial', false).map(s => s.id)).toEqual(['day-vial']);
    expect(eligibleSpecies(pool, 'vial', true).map(s => s.id)).toEqual(['night-vial']);
    expect(eligibleSpecies(pool, 'hand-net', true).map(s => s.id)).toEqual(['both-net']);
  });
});

describe('computeSpawnWeights', () => {
  it('uses base rarity weights when nothing modifies them', () => {
    const w = computeSpawnWeights([sp({ rarity: 'common' }), sp({ id: 'r', rarity: 'rare' })], ctx());
    expect(w[0].weight).toBe(BASE_RARITY_WEIGHTS.common);
    expect(w[1].weight).toBe(BASE_RARITY_WEIGHTS.rare);
  });
  it('degraded health cuts rare+ but not common', () => {
    const w = computeSpawnWeights([sp({ rarity: 'common' }), sp({ id: 'r', rarity: 'rare' })], ctx({ health: 30 }));
    expect(w[0].weight).toBe(BASE_RARITY_WEIGHTS.common);
    expect(w[1].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.rare * 0.6);
  });
  it('keystone boosts rare+ only', () => {
    const w = computeSpawnWeights([sp({ rarity: 'common' }), sp({ id: 'l', rarity: 'legendary' })], ctx({ keystone: true }));
    expect(w[0].weight).toBe(BASE_RARITY_WEIGHTS.common);
    expect(w[1].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.legendary * KEYSTONE_BONUS);
  });
  it('weather taxon and rarity modifiers multiply', () => {
    const weather = { ...neutralWeather, taxonModifiers: { insects: 2 }, rarityBoost: { common: 1.5 } };
    const w = computeSpawnWeights([sp({ rarity: 'common' })], ctx({ weather }));
    expect(w[0].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.common * 3);
  });
  it('biology skills raise rare and legendary weights', () => {
    const buffs = computeBuffs({ unlockedSkills: ['biology-1', 'biology-2', 'biology-3', 'biology-4'], impactFactor: 0 } as unknown as GameState);
    const w = computeSpawnWeights([sp({ id: 'r', rarity: 'rare' }), sp({ id: 'l', rarity: 'legendary' })], ctx({ buffs }));
    expect(w[0].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.rare * 1.3);
    expect(w[1].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.legendary * 1.6);
  });
  it('an active spawn event multiplies matching species', () => {
    const event = ALL_EVENTS.find(e => e.id === 'yosemite-bear-survey')!; // mammals ×1.5 at yosemite-valley
    const w = computeSpawnWeights(
      [sp({ id: 'm', taxonomicGroup: 'mammals', biomeIds: ['yosemite-valley'] }), sp({ id: 'p', taxonomicGroup: 'plants', biomeIds: ['yosemite-valley'] })],
      ctx({ biomeId: 'yosemite-valley', event }),
    );
    expect(w[0].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.common * 1.5);
    expect(w[1].weight).toBe(BASE_RARITY_WEIGHTS.common);
  });
});

describe('pickWeighted', () => {
  const items = [
    { species: sp({ id: 'a' }), weight: 10 },
    { species: sp({ id: 'b' }), weight: 30 },
  ];
  it('is deterministic given an rng', () => {
    expect(pickWeighted(items, () => 0.1)?.id).toBe('a');
    expect(pickWeighted(items, () => 0.5)?.id).toBe('b');
    expect(pickWeighted(items, () => 0.999)?.id).toBe('b');
  });
  it('returns null for an empty list', () => {
    expect(pickWeighted([], () => 0.5)).toBeNull();
  });
});
