import type { Rarity, GameState } from '@/types/game';

// Damage dealt to biome health per collection, scaled by rarity
export function getHealthDamage(rarity: Rarity): number {
  switch (rarity) {
    case 'legendary': return 15;
    case 'ultra-rare': return 8;
    case 'rare': return 5;
    case 'uncommon': return 3;
    default: return 2;
  }
}

export type HealthStatus = 'thriving' | 'stressed' | 'degraded' | 'critical';

export function getHealthStatus(health: number): HealthStatus {
  if (health >= 70) return 'thriving';
  if (health >= 40) return 'stressed';
  if (health >= 20) return 'degraded';
  return 'critical';
}

export const HEALTH_STATUS_INFO: Record<HealthStatus, {
  label: string;
  color: string;
  description: string;
  multiplier: number;
}> = {
  thriving: {
    label: 'Thriving',
    color: '#4a8a4a',
    description: 'Populations healthy. Full rare spawn rate.',
    multiplier: 1.0,
  },
  stressed: {
    label: 'Stressed',
    color: '#c9a84c',
    description: 'Over-sampling. Rare sightings drop 15%.',
    multiplier: 0.85,
  },
  degraded: {
    label: 'Degraded',
    color: '#d97757',
    description: 'Population pressure severe. Rare spawns cut 40%.',
    multiplier: 0.6,
  },
  critical: {
    label: 'Critical',
    color: '#c94343',
    description: 'Ecosystem collapse. Rare spawns cut 70%.',
    multiplier: 0.3,
  },
};

export function getHealthMultiplier(health: number): number {
  return HEALTH_STATUS_INFO[getHealthStatus(health)].multiplier;
}

export function getBiomeHealth(state: GameState, biomeId: string): number {
  const v = state.biomeHealth?.[biomeId];
  return typeof v === 'number' ? v : 100;
}

// Keystone species: if the biome's signature species has been discovered,
// the whole biome gets a rare+ spawn boost.
export const KEYSTONE_BONUS = 1.15;

export function hasKeystoneBonus(state: GameState, signatureSpeciesId: string): boolean {
  return state.discoveredSpecies.includes(signatureSpeciesId);
}

// Museum visitor rates — credits per hour per exhibited species, by rarity
export function getMuseumRate(rarity: Rarity): number {
  switch (rarity) {
    case 'legendary': return 120;
    case 'ultra-rare': return 50;
    case 'rare': return 20;
    case 'uncommon': return 8;
    default: return 3;
  }
}

// Max hours to accumulate (prevents infinite idle)
export const MUSEUM_ACCUMULATION_CAP_HOURS = 12;

// Compute pending visitor credits based on current exhibits and elapsed time
export function computeVisitorCredits(
  state: GameState,
  speciesLookup: (id: string) => { rarity: Rarity } | undefined,
): { credits: number; hours: number; ratePerHour: number } {
  const now = Date.now();
  const last = new Date(state.lastMuseumCollect).getTime();
  const hours = Math.min(MUSEUM_ACCUMULATION_CAP_HOURS, (now - last) / 3600000);
  let ratePerHour = 0;
  for (const biomeId of Object.keys(state.exhibits || {})) {
    for (const slot of state.exhibits[biomeId] || []) {
      if (!slot) continue;
      const s = speciesLookup(slot);
      if (s) ratePerHour += getMuseumRate(s.rarity);
    }
  }
  return { credits: Math.floor(ratePerHour * hours), hours, ratePerHour };
}
