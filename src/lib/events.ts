import type { Species } from '@/types/game';
import { getBiomeById } from '@/data/biomes';
import { getActiveEvent, type SeasonalEvent } from '@/data/events';

/** Does the event's scope include this biome (ignoring species filters)? */
export function eventCoversBiome(event: SeasonalEvent, biomeId: string): boolean {
  const scope = event.bonus.scope;
  if ('all' in scope) return true;
  if ('biomeId' in scope) return scope.biomeId === biomeId;
  const biome = getBiomeById(biomeId);
  return !!biome && biome.regionId === scope.regionId;
}

/** Does the event's bonus apply to this species collected in this biome? */
export function eventAppliesTo(event: SeasonalEvent, species: Species, biomeId: string): boolean {
  if (!eventCoversBiome(event, biomeId)) return false;
  const b = event.bonus;
  if (b.taxa && !b.taxa.includes(species.taxonomicGroup)) return false;
  if (b.rarities && !b.rarities.includes(species.rarity)) return false;
  if (b.nightOnly && species.activeAt !== 'night') return false;
  return true;
}

export function getEventSpawnModifier(event: SeasonalEvent | null, species: Species, biomeId: string): number {
  if (!event || event.bonus.kind !== 'spawn') return 1;
  return eventAppliesTo(event, species, biomeId) ? event.bonus.multiplier : 1;
}

export function getEventXpMultiplier(event: SeasonalEvent | null, species: Species, biomeId: string): number {
  if (!event || event.bonus.kind !== 'xp') return 1;
  return eventAppliesTo(event, species, biomeId) ? event.bonus.multiplier : 1;
}

/** The event currently running in the biome's region, or null for an unknown biome. */
export function getActiveEventForBiome(biomeId: string, now: Date = new Date()): SeasonalEvent | null {
  const biome = getBiomeById(biomeId);
  return biome ? getActiveEvent(now, biome.regionId) : null;
}
