import type { PlayerRank } from '@/types/game';
import { rankAtLeast } from '@/lib/progression';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  check: (stats: {
    totalCollected: number;
    totalIdentified: number;
    discoveredSpecies: number;
    expeditionsCompleted: number;
    rank: PlayerRank;
    unlockedBiomes: number;
    legendaryFound: boolean;
    ultraRareFound: boolean;
  }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-sample',
    title: 'First Sample',
    description: 'Collect your first specimen',
    emoji: '🧪',
    check: (s) => s.totalCollected >= 1,
  },
  {
    id: 'first-id',
    title: 'First Discovery',
    description: 'Identify your first species',
    emoji: '🔬',
    check: (s) => s.totalIdentified >= 1,
  },
  {
    id: 'ten-collected',
    title: 'Dedicated Collector',
    description: 'Collect 10 specimens',
    emoji: '📦',
    check: (s) => s.totalCollected >= 10,
  },
  {
    id: 'five-species',
    title: 'Budding Taxonomist',
    description: 'Discover 5 different species',
    emoji: '📖',
    check: (s) => s.discoveredSpecies >= 5,
  },
  {
    id: 'ten-species',
    title: 'Species Expert',
    description: 'Discover 10 different species',
    emoji: '🏅',
    check: (s) => s.discoveredSpecies >= 10,
  },
  {
    id: 'twenty-species',
    title: 'Master Biologist',
    description: 'Discover 20 different species',
    emoji: '🎓',
    check: (s) => s.discoveredSpecies >= 20,
  },
  {
    id: 'ultra-rare-find',
    title: 'Extraordinary Find',
    description: 'Discover an ultra-rare species',
    emoji: '💎',
    check: (s) => s.ultraRareFound,
  },
  {
    id: 'legendary-find',
    title: 'Living Legend',
    description: 'Discover a legendary species',
    emoji: '👑',
    check: (s) => s.legendaryFound,
  },
  {
    id: 'junior-explorer',
    title: 'Promoted!',
    description: 'Reach Junior Explorer rank',
    emoji: '🎖️',
    check: (s) => rankAtLeast(s.rank, 'junior-explorer'),
  },
  {
    id: 'field-researcher',
    title: 'Field Veteran',
    description: 'Reach Field Researcher rank',
    emoji: '🏆',
    check: (s) => rankAtLeast(s.rank, 'field-researcher'),
  },
  {
    id: 'three-biomes',
    title: 'Trailblazer',
    description: 'Unlock 3 biomes',
    emoji: '🗺️',
    check: (s) => s.unlockedBiomes >= 3,
  },
  {
    id: 'all-biomes',
    title: 'Marin Master',
    description: 'Unlock 5 biomes',
    emoji: '🌍',
    check: (s) => s.unlockedBiomes >= 5,
  },
  {
    id: 'fifty-collected',
    title: 'Specimen Hoarder',
    description: 'Collect 50 specimens',
    emoji: '🧬',
    check: (s) => s.totalCollected >= 50,
  },
  {
    id: 'ten-expeditions',
    title: 'Seasoned Explorer',
    description: 'Complete 10 expeditions',
    emoji: '⛺',
    check: (s) => s.expeditionsCompleted >= 10,
  },
];
