import { describe, it, expect } from 'vitest';
import { BIOMES, getBiomeSpeciesCount } from '@/data/biomes';
import { SPECIES } from '@/data/species';
import { SHOP_ITEMS } from '@/data/shop';
import { STARTING_BIOME_IDS } from '@/lib/save';
import type { CollectionPoint, Species } from '@/types/game';

const speciesById = new Map(SPECIES.map(s => [s.id, s]));
const allPoints: { biomeId: string; point: CollectionPoint }[] = BIOMES.flatMap(b =>
  b.collectionPoints.map(point => ({ biomeId: b.id, point })),
);

function biomesPooling(speciesId: string): string[] {
  const ids = new Set<string>();
  for (const { biomeId, point } of allPoints) {
    if (point.speciesPool.includes(speciesId)) ids.add(biomeId);
  }
  return [...ids].sort();
}

function dupes(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.filter(id => (seen.has(id) ? true : (seen.add(id), false)));
}

describe('ids are unique', () => {
  it('species', () => expect(dupes(SPECIES.map(s => s.id))).toEqual([]));
  it('biomes', () => expect(dupes(BIOMES.map(b => b.id))).toEqual([]));
  it('collection points', () => expect(dupes(allPoints.map(p => p.point.id))).toEqual([]));
});

describe('every pool entry is a real species', () => {
  for (const { point } of allPoints) {
    it(point.id, () => {
      for (const id of point.speciesPool) expect(speciesById.has(id), `unknown species ${id}`).toBe(true);
    });
  }
});

describe('species.biomeIds matches where the species is pooled', () => {
  for (const s of SPECIES) {
    it(s.id, () => {
      expect([...s.biomeIds].sort()).toEqual(biomesPooling(s.id));
      expect(s.biomeIds.length, 'species must be pooled somewhere').toBeGreaterThan(0);
    });
  }
});

describe('every pooled species is collectable at that point', () => {
  for (const { point } of allPoints) {
    it(point.id, () => {
      expect(point.availableMethods.length).toBeGreaterThan(0);
      for (const id of point.speciesPool) {
        const s = speciesById.get(id) as Species;
        const usable = s.samplingMethods.filter(m => point.availableMethods.includes(m));
        expect(usable.length, `${id} needs [${s.samplingMethods}] but ${point.id} offers [${point.availableMethods}]`).toBeGreaterThan(0);
        if (s.exclusiveMethod) {
          expect(point.availableMethods, `${id} exclusive ${s.exclusiveMethod} not offered at ${point.id}`).toContain(s.exclusiveMethod);
        }
      }
    });
  }
});

describe('biomes', () => {
  for (const b of BIOMES) {
    it(`${b.id} has points and its signature species lives there`, () => {
      expect(b.collectionPoints.length).toBeGreaterThan(0);
      const sig = speciesById.get(b.signatureSpeciesId);
      expect(sig, `unknown signature species ${b.signatureSpeciesId}`).toBeDefined();
      expect(sig!.biomeIds).toContain(b.id);
    });
    it(`${b.id} species count is derived from biomeIds`, () => {
      expect(getBiomeSpeciesCount(b.id)).toBe(SPECIES.filter(s => s.biomeIds.includes(b.id)).length);
    });
  }
});

describe('shop unlocks', () => {
  const unlockKeys = SHOP_ITEMS.filter(i => i.effect.type === 'unlock-biome').map(i => i.effect.key as string);
  it('reference real biomes', () => {
    for (const key of unlockKeys) expect(BIOMES.some(b => b.id === key), `unknown biome ${key}`).toBe(true);
  });
  it('cover every non-starting biome exactly once', () => {
    const expected = BIOMES.map(b => b.id).filter(id => !(STARTING_BIOME_IDS as readonly string[]).includes(id)).sort();
    expect([...unlockKeys].sort()).toEqual(expected);
  });
});
