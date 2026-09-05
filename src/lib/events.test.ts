import { describe, it, expect } from 'vitest';
import {
  eventCoversBiome,
  eventAppliesTo,
  getEventSpawnModifier,
  getEventXpMultiplier,
  getActiveEventForBiome,
} from '@/lib/events';
import { ALL_EVENTS, type SeasonalEvent } from '@/data/events';
import { SPECIES } from '@/data/species';
import { BIOMES } from '@/data/biomes';
import type { Species } from '@/types/game';

const byId = (id: string) => SPECIES.find(s => s.id === id) as Species;
const ev = (id: string) => ALL_EVENTS.find(e => e.id === id) as SeasonalEvent;

function fake(over: Partial<Species>): Species {
  return {
    id: 'fake', commonName: 'Fake', scientificName: 'F f', family: '', order: '', taxonomicGroup: 'insects',
    rarity: 'common', biomeIds: [], samplingMethods: ['vial'], description: '', funFact: '',
    conservationStatus: '', barcodeGene: 'COI', barcodeLength: 658, emoji: '🐛', ...over,
  };
}

describe('event scopes', () => {
  it('biome scope covers only that biome', () => {
    const e = ev('redwood-bloom'); // featured muir-woods
    expect(eventCoversBiome(e, 'muir-woods')).toBe(true);
    expect(eventCoversBiome(e, 'stinson-beach')).toBe(false);
  });
  it('region scope covers every biome in the region', () => {
    const e = ev('tortoise-emergence'); // reptiles across mojave
    expect(eventCoversBiome(e, 'joshua-tree')).toBe(true);
    expect(eventCoversBiome(e, 'death-valley')).toBe(true);
    expect(eventCoversBiome(e, 'muir-woods')).toBe(false);
  });
});

describe('event filters', () => {
  it('featured-biome bonus applies to rare+ only', () => {
    const e = ev('redwood-bloom');
    expect(getEventSpawnModifier(e, fake({ rarity: 'rare' }), 'muir-woods')).toBe(1.25);
    expect(getEventSpawnModifier(e, fake({ rarity: 'legendary' }), 'muir-woods')).toBe(1.25);
    expect(getEventSpawnModifier(e, fake({ rarity: 'common' }), 'muir-woods')).toBe(1);
  });
  it('taxon filter', () => {
    const e = ev('tortoise-emergence');
    expect(eventAppliesTo(e, fake({ taxonomicGroup: 'reptiles' }), 'mojave-preserve')).toBe(true);
    expect(eventAppliesTo(e, fake({ taxonomicGroup: 'plants' }), 'mojave-preserve')).toBe(false);
    expect(eventAppliesTo(e, byId('desert-tortoise'), 'mojave-preserve')).toBe(true);
  });
  it('night-only filter uses the species active time', () => {
    const e = ev('nocturnal-survey');
    expect(getEventSpawnModifier(e, fake({ activeAt: 'night' }), 'joshua-tree')).toBe(2);
    expect(getEventSpawnModifier(e, fake({ activeAt: 'both' }), 'joshua-tree')).toBe(1);
    expect(getEventSpawnModifier(e, fake({}), 'joshua-tree')).toBe(1);
  });
  it('xp bonuses do not touch spawn weights and vice versa', () => {
    const xpEv = ev('lost-coast-bioblitz');
    expect(getEventXpMultiplier(xpEv, fake({}), 'lost-coast')).toBe(2);
    expect(getEventSpawnModifier(xpEv, fake({}), 'lost-coast')).toBe(1);
    expect(getEventXpMultiplier(xpEv, fake({}), 'muir-woods')).toBe(1);
    const spawnEv = ev('redwood-bloom');
    expect(getEventXpMultiplier(spawnEv, fake({ rarity: 'rare' }), 'muir-woods')).toBe(1);
  });
  it('null event is neutral', () => {
    expect(getEventSpawnModifier(null, byId('tule-elk'), 'point-reyes')).toBe(1);
    expect(getEventXpMultiplier(null, byId('tule-elk'), 'point-reyes')).toBe(1);
  });
});

describe('data', () => {
  it('every event has a bonus with a multiplier above 1 and a scope inside its own region', () => {
    for (const e of ALL_EVENTS) {
      expect(e.bonus.multiplier, e.id).toBeGreaterThan(1);
      const scope = e.bonus.scope;
      if ('biomeId' in scope) {
        const biome = BIOMES.find(b => b.id === scope.biomeId);
        expect(biome, `${e.id} unknown biome`).toBeDefined();
        expect(biome!.regionId, e.id).toBe(e.regionId);
      } else if ('regionId' in scope) {
        expect(scope.regionId, e.id).toBe(e.regionId);
      }
    }
  });
  it('getActiveEventForBiome returns an event from the biome region', () => {
    const e = getActiveEventForBiome('death-valley', new Date(2026, 8, 4));
    expect(e?.regionId).toBe('mojave-desert');
    expect(getActiveEventForBiome('nope')).toBeNull();
  });
});
