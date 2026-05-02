import { SPECIES } from './species';
import type { GameState, Rarity } from '@/types/game';

export interface MissionStep {
  id: string;
  description: string;
  check: (state: GameState) => { done: boolean; progress?: number; target?: number };
}

export interface MissionDef {
  id: string;
  title: string;
  briefing: string;
  icon: string;
  reward: { xp: number; credits: number };
  unlock?: (state: GameState) => boolean; // visibility gate
  steps: MissionStep[];
}

const discoveredInBiome = (state: GameState, biomeId: string) =>
  state.discoveredSpecies.filter(sid =>
    SPECIES.find(s => s.id === sid)?.biomeIds.includes(biomeId)
  ).length;

const discoveredOfRarity = (state: GameState, rarity: Rarity) =>
  state.discoveredSpecies.filter(sid =>
    SPECIES.find(s => s.id === sid)?.rarity === rarity
  ).length;

const collectedInBiome = (state: GameState, biomeId: string) =>
  state.specimens.filter(s => s.biomeId === biomeId).length;

export const MISSIONS: MissionDef[] = [
  {
    id: 'first-steps',
    title: 'First Steps',
    icon: '🌱',
    briefing:
      'Welcome to BioKEA, researcher. Your first task is to get familiar with the workflow: collect a specimen in the field, process it through the lab pipeline, and review your first discovery.',
    reward: { xp: 50, credits: 50 },
    steps: [
      {
        id: 'collect-first',
        description: 'Collect your first specimen',
        check: s => ({ done: s.stats.totalCollected >= 1, progress: Math.min(1, s.stats.totalCollected), target: 1 }),
      },
      {
        id: 'identify-first',
        description: 'Identify 1 specimen through the lab',
        check: s => ({ done: s.stats.totalIdentified >= 1, progress: Math.min(1, s.stats.totalIdentified), target: 1 }),
      },
      {
        id: 'discover-first',
        description: 'Catalogue your first species',
        check: s => ({ done: s.discoveredSpecies.length >= 1, progress: Math.min(1, s.discoveredSpecies.length), target: 1 }),
      },
    ],
  },
  {
    id: 'coastal-survey',
    title: 'Coastal Survey',
    icon: '🏖️',
    briefing:
      'The Pacific coast at Stinson Beach supports a dense web of marine invertebrates and shore life. Complete a baseline survey of the tide pools and sandy shore.',
    reward: { xp: 100, credits: 80 },
    unlock: s => s.stats.totalCollected >= 1,
    steps: [
      {
        id: 'collect-stinson',
        description: 'Collect 5 specimens at Stinson Beach',
        check: s => ({
          done: collectedInBiome(s, 'stinson-beach') >= 5,
          progress: Math.min(5, collectedInBiome(s, 'stinson-beach')),
          target: 5,
        }),
      },
      {
        id: 'discover-stinson',
        description: 'Discover 3 species from this biome',
        check: s => ({
          done: discoveredInBiome(s, 'stinson-beach') >= 3,
          progress: Math.min(3, discoveredInBiome(s, 'stinson-beach')),
          target: 3,
        }),
      },
    ],
  },
  {
    id: 'forest-secrets',
    title: 'Secrets of the Redwoods',
    icon: '🌲',
    briefing:
      'Muir Woods is one of the most biodiverse old-growth stands in California. Document the understory, the fungal network, and hunt for the elusive wandering salamander.',
    reward: { xp: 150, credits: 120 },
    unlock: s => s.stats.totalCollected >= 3,
    steps: [
      {
        id: 'collect-muir',
        description: 'Collect 6 specimens in Muir Woods',
        check: s => ({
          done: collectedInBiome(s, 'muir-woods') >= 6,
          progress: Math.min(6, collectedInBiome(s, 'muir-woods')),
          target: 6,
        }),
      },
      {
        id: 'discover-muir',
        description: 'Discover 5 forest species',
        check: s => ({
          done: discoveredInBiome(s, 'muir-woods') >= 5,
          progress: Math.min(5, discoveredInBiome(s, 'muir-woods')),
          target: 5,
        }),
      },
      {
        id: 'signature-salamander',
        description: 'Catalogue the Wandering Salamander',
        check: s => ({
          done: s.discoveredSpecies.includes('wandering-salamander'),
          progress: s.discoveredSpecies.includes('wandering-salamander') ? 1 : 0,
          target: 1,
        }),
      },
    ],
  },
  {
    id: 'rare-finds',
    title: 'Rare Finds',
    icon: '💎',
    briefing:
      'Our database is full of common species. What we need now are the rare ones — the encounters that define a career. Push your luck and document rarities.',
    reward: { xp: 250, credits: 200 },
    unlock: s => s.discoveredSpecies.length >= 5,
    steps: [
      {
        id: 'three-uncommon',
        description: 'Discover 3 uncommon species',
        check: s => {
          const n = discoveredOfRarity(s, 'uncommon');
          return { done: n >= 3, progress: Math.min(3, n), target: 3 };
        },
      },
      {
        id: 'one-rare',
        description: 'Discover 1 rare species',
        check: s => {
          const n = discoveredOfRarity(s, 'rare');
          return { done: n >= 1, progress: Math.min(1, n), target: 1 };
        },
      },
      {
        id: 'one-ultra-rare',
        description: 'Discover 1 ultra-rare species',
        check: s => {
          const n = discoveredOfRarity(s, 'ultra-rare');
          return { done: n >= 1, progress: Math.min(1, n), target: 1 };
        },
      },
    ],
  },
  {
    id: 'marin-completionist',
    title: 'Marin Completionist',
    icon: '🗺️',
    briefing:
      'Five distinct ecosystems, one county. Unlock every research permit and visit every field site to establish BioKEA as the definitive survey of Marin County biodiversity.',
    reward: { xp: 400, credits: 300 },
    unlock: s => s.stats.totalIdentified >= 5,
    steps: [
      {
        id: 'unlock-point-reyes',
        description: 'Unlock Point Reyes',
        check: s => ({
          done: s.unlockedBiomes.includes('point-reyes'),
          progress: s.unlockedBiomes.includes('point-reyes') ? 1 : 0,
          target: 1,
        }),
      },
      {
        id: 'unlock-bolinas',
        description: 'Unlock Bolinas Lagoon',
        check: s => ({
          done: s.unlockedBiomes.includes('bolinas-lagoon'),
          progress: s.unlockedBiomes.includes('bolinas-lagoon') ? 1 : 0,
          target: 1,
        }),
      },
      {
        id: 'unlock-tomales',
        description: 'Unlock Tomales Bay',
        check: s => ({
          done: s.unlockedBiomes.includes('tomales-bay'),
          progress: s.unlockedBiomes.includes('tomales-bay') ? 1 : 0,
          target: 1,
        }),
      },
    ],
  },
  {
    id: 'legendary-hunter',
    title: 'Legendary Hunter',
    icon: '⭐',
    briefing:
      'Only a handful of species in Marin County qualify as legendary. Most researchers spend a career without seeing one. Document a legendary species for the journal.',
    reward: { xp: 500, credits: 500 },
    unlock: s => s.discoveredSpecies.length >= 15,
    steps: [
      {
        id: 'discover-legendary',
        description: 'Discover 1 legendary species',
        check: s => {
          const n = discoveredOfRarity(s, 'legendary');
          return { done: n >= 1, progress: Math.min(1, n), target: 1 };
        },
      },
    ],
  },
];

export interface MissionProgress {
  def: MissionDef;
  steps: { def: MissionStep; done: boolean; progress: number; target: number }[];
  completedSteps: number;
  allStepsDone: boolean;
  claimed: boolean;
}

export function evaluateMissions(state: GameState): MissionProgress[] {
  const claimedSet = new Set(state.claimedMissions || []);
  return MISSIONS
    .filter(m => !m.unlock || m.unlock(state))
    .map(def => {
      const steps = def.steps.map(stepDef => {
        const { done, progress = 0, target = 1 } = stepDef.check(state);
        return { def: stepDef, done, progress, target };
      });
      const completedSteps = steps.filter(s => s.done).length;
      const allStepsDone = completedSteps === steps.length;
      return {
        def,
        steps,
        completedSteps,
        allStepsDone,
        claimed: claimedSet.has(def.id),
      };
    });
}
