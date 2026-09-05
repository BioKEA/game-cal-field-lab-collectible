import type { Rarity, SamplingMethod, Species } from '@/types/game';
import type { Buffs } from '@/lib/buffs';
import type { Weather } from '@/data/weather';
import type { SeasonalEvent } from '@/data/events';
import { getWeatherModifier } from '@/data/weather';
import { getHealthMultiplier, KEYSTONE_BONUS } from '@/lib/ecosystem';
import { getEventSpawnModifier } from '@/lib/events';

export const BASE_RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  'ultra-rare': 4,
  legendary: 1,
};

export interface SpawnContext {
  biomeId: string;
  weather: Weather;
  health: number;        // biome health 0–100
  keystone: boolean;     // signature species already discovered
  buffs: Buffs;
  event: SeasonalEvent | null;
}

export interface WeightedSpecies {
  species: Species;
  weight: number;
}

const RARE_PLUS = new Set<Rarity>(['rare', 'ultra-rare', 'legendary']);

/** Species in the pool that the chosen method can catch at this time of day. */
export function eligibleSpecies(pool: Species[], method: SamplingMethod, isNight: boolean): Species[] {
  return pool
    .filter(s => s.samplingMethods.includes(method))
    .filter(s => {
      const activeAt = s.activeAt || 'day';
      if (activeAt === 'both') return true;
      return isNight ? activeAt === 'night' : activeAt === 'day';
    });
}

export function computeSpawnWeights(candidates: Species[], ctx: SpawnContext): WeightedSpecies[] {
  const healthMult = getHealthMultiplier(ctx.health);
  return candidates.map(species => {
    let weight = BASE_RARITY_WEIGHTS[species.rarity] * getWeatherModifier(ctx.weather, species.taxonomicGroup, species.rarity);
    // Biology skill bonuses (additive chance expressed as a ×10 weight multiplier)
    if (species.rarity === 'rare') weight *= 1 + ctx.buffs.rareChanceBonus * 10;
    if (species.rarity === 'legendary') weight *= 1 + ctx.buffs.legendaryChanceBonus * 10;
    if (RARE_PLUS.has(species.rarity)) {
      weight *= healthMult;
      if (ctx.keystone) weight *= KEYSTONE_BONUS;
    }
    weight *= getEventSpawnModifier(ctx.event, species, ctx.biomeId);
    return { species, weight };
  });
}

export function pickWeighted(items: WeightedSpecies[], rng: () => number = Math.random): Species | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng() * total;
  for (const { species, weight } of items) {
    roll -= weight;
    if (roll <= 0) return species;
  }
  return items[items.length - 1].species;
}
