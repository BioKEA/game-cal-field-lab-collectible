import type { Region, RegionId, GameState } from '@/types/game';
import { BIOMES } from '@/data/biomes';
import { SPECIES } from '@/data/species';

export const REGIONS: Region[] = [
  {
    id: 'marin-county',
    name: 'Marin County',
    tier: 1,
    tagline: 'Where the fog meets the redwoods',
    description:
      'Your home base. A compact stretch of coast, lagoons, and ancient forest just north of the Golden Gate — the best place to learn the basics of fieldwork before heading further afield.',
    emoji: '🌁',
    accent: '#8aaa7a',
    bounds: { south: 37.80, west: -123.05, north: 38.25, east: -122.45 },
  },
  {
    id: 'redwood-coast',
    name: 'Redwood Coast',
    tier: 2,
    tagline: 'Ancient giants and wild shores',
    description:
      'Far Northern California. Old-growth redwood groves taller than cathedrals, black-sand beaches where elk graze at the tide line, and salmon runs choking river mouths every fall.',
    emoji: '🌲',
    accent: '#4a8a4a',
    bounds: { south: 39.50, west: -124.50, north: 42.00, east: -123.40 },
  },
  {
    id: 'sierra-nevada',
    name: 'Sierra Nevada',
    tier: 3,
    tagline: 'The range of light',
    description:
      'A 640-km granite spine running the length of California. Glacier-carved valleys, groves of the largest trees on Earth, alpine tundra above treeline, and the alkaline mystery of Mono Lake in the rain shadow.',
    emoji: '🏔️',
    accent: '#b8a878',
    bounds: { south: 36.30, west: -119.80, north: 38.40, east: -118.40 },
  },
  {
    id: 'mojave-desert',
    name: 'Mojave Desert',
    tier: 4,
    tagline: 'Hotter, drier, stranger',
    description:
      "Southeastern California's high desert. Joshua trees that exist nowhere else, salt pans below sea level, creosote flats that have held the same plants for 11,000 years, and pupfish in springs older than the last ice age.",
    emoji: '🌵',
    accent: '#d4a574',
    bounds: { south: 33.60, west: -117.40, north: 37.00, east: -114.80 },
  },
  {
    id: 'channel-islands',
    name: 'Channel Islands',
    tier: 5,
    tagline: "California's Galápagos",
    description:
      "Eight islands off the Southern California coast, isolated long enough to evolve their own endemic species — island foxes smaller than house cats, scrub jays found nowhere else, and kelp forests that rival the Amazon for biomass.",
    emoji: '🏝️',
    accent: '#60a5fa',
    bounds: { south: 33.85, west: -120.50, north: 34.15, east: -119.30 },
  },
];

export function getRegionById(id: RegionId): Region | undefined {
  return REGIONS.find(r => r.id === id);
}

/** Fuel cost to mount an expedition in a given region (equals tier). */
export function getRegionFuelCost(regionId: RegionId): number {
  const region = REGIONS.find(r => r.id === regionId);
  return region?.tier ?? 1;
}

export function getRegionByTier(tier: number): Region | undefined {
  return REGIONS.find(r => r.tier === tier);
}

/**
 * Returns the fraction (0–1) of a region's species that the player has catalogued.
 */
export function getRegionCatalogPct(regionId: RegionId, state: GameState): number {
  const regionBiomes = BIOMES.filter(b => b.regionId === regionId);
  const regionBiomeIds = new Set(regionBiomes.map(b => b.id));
  const regionSpecies = SPECIES.filter(s => s.biomeIds.some(id => regionBiomeIds.has(id)));
  if (regionSpecies.length === 0) return 0;
  const discovered = new Set(state.discoveredSpecies);
  const found = regionSpecies.filter(s => discovered.has(s.id)).length;
  return found / regionSpecies.length;
}

/**
 * Can the player access biomes from a given tier?
 * Tier 1 is always open. Tier N requires 60% of tier N-1 catalogued.
 */
export function isTierUnlocked(tier: number, state: GameState): boolean {
  if (state.devMode) return true;
  if (tier <= 1) return true;
  const priorRegion = getRegionByTier(tier - 1);
  if (!priorRegion) return false;
  return getRegionCatalogPct(priorRegion.id, state) >= 0.6;
}
