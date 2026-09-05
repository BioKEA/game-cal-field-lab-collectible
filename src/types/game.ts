export type Rarity = 'common' | 'uncommon' | 'rare' | 'ultra-rare' | 'legendary';

export type SamplingMethod = 'scoop' | 'hand-net' | 'car-trap' | 'plankton-net' | 'vial';

export type TaxonomicGroup =
  | 'insects'
  | 'arachnids'
  | 'fungi'
  | 'plants'
  | 'amphibians'
  | 'reptiles'
  | 'birds'
  | 'mammals'
  | 'marine-invertebrates'
  | 'microorganisms';

export type LabStage = 'extraction' | 'pcr' | 'qpcr' | 'sequencing';

export type PlayerRank =
  | 'volunteer'
  | 'junior-explorer'
  | 'field-researcher'
  | 'lead-scientist'
  | 'lab-director'
  | 'chief-scientist'
  | 'distinguished-fellow'
  | 'legendary-naturalist';

export type ActiveTime = 'day' | 'night' | 'both';

export interface Species {
  id: string;
  commonName: string;
  scientificName: string;
  family: string;
  order: string;
  taxonomicGroup: TaxonomicGroup;
  rarity: Rarity;
  biomeIds: string[];
  samplingMethods: SamplingMethod[];
  exclusiveMethod?: SamplingMethod;
  description: string;
  funFact: string;
  conservationStatus: string;
  barcodeGene: string;
  barcodeLength: number;
  emoji: string;
  activeAt?: ActiveTime; // undefined = 'day' (default)
}

export interface CollectionPoint {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  availableMethods: SamplingMethod[];
  speciesPool: string[]; // species IDs
  environment: 'shore' | 'tidepools' | 'dunes' | 'forest' | 'stream' | 'meadow' | 'canopy' | 'log' | 'cave' | 'wetland';
}

export type RegionId =
  | 'marin-county'
  | 'redwood-coast'
  | 'sierra-nevada'
  | 'mojave-desert'
  | 'channel-islands';

export interface Region {
  id: RegionId;
  name: string;
  tier: number; // 1 = starting, 5 = endgame
  tagline: string;
  description: string;
  emoji: string;
  accent: string;
  // Rough bounding box for drill-down maps (south/west/north/east)
  bounds: { south: number; west: number; north: number; east: number };
}

export interface Biome {
  id: string;
  name: string;
  region: string; // display name of the region
  regionId: RegionId;
  description: string;
  lat: number;
  lng: number;
  zoom: number;
  collectionPoints: CollectionPoint[];
  signatureSpeciesId: string;
  unlocked: boolean;
  emoji: string;
}

export interface CollectedSpecimen {
  id: string;
  speciesId: string;
  collectedAt: string; // ISO date
  biomeId: string;
  collectionPointId: string;
  samplingMethod: SamplingMethod;
  labStatus: 'collected' | 'extracting' | 'pcr' | 'qpcr' | 'sequencing' | 'identified' | 'failed';
  matchPercent?: number;
  ctValue?: number;
  concentration?: number;
}

export interface FieldNote {
  id: string;
  timestamp: string;
  biomeId: string;
  type: 'collection' | 'discovery' | 'expedition' | 'milestone';
  text: string;
  speciesId?: string;
  emoji?: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: { xp: number; credits: number };
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlockedAt?: string; // ISO date, undefined = locked
}

export interface GameState {
  playerName: string;
  avatar: string;
  createdAt: string;
  rank: PlayerRank;
  xp: number;
  // Daily XP tracking for the daily goal ribbon
  dailyXpEarned: number;
  dailyXpDate: string; // YYYY-MM-DD; reset when day changes
  // Streak of consecutive days that hit the daily XP goal
  dailyStreak: number;
  streakDate: string; // YYYY-MM-DD of the most recent day credited to the streak
  // Rolling per-day XP earned, keyed by YYYY-MM-DD — trimmed to last 30 days
  xpHistory: Record<string, number>;
  bioCredits: number;
  stamina: number;
  maxStamina: number;
  expeditionFuel: number;
  maxExpeditionFuel: number;
  lastStaminaRegen: string;
  discoveredSpecies: string[];
  specimens: CollectedSpecimen[];
  currentBiomeId: string | null;
  currentPointId: string | null;
  unlockedBiomes: string[];
  labQueue: string[]; // specimen IDs
  reagents: {
    extractionKits: number;
    pcrPrimers: number;
    flowCells: number;
  };
  stats: {
    totalCollected: number;
    totalIdentified: number;
    expeditionsCompleted: number;
    daysPlayed: number;
  };
  fieldNotes: FieldNote[];
  dailyChallenges: DailyChallenge[];
  lastChallengeDate: string;
  achievements: Achievement[];
  claimedMissions: string[];
  claimedRequests: string[];
  // Skill tree progression
  researchPoints: number;
  unlockedSkills: string[];
  // Prestige / publication
  impactFactor: number;
  publicationCount: number;
  // Ecosystem health (per biome, 0-100)
  biomeHealth: Record<string, number>;
  lastHealthRegen: string;
  // Museum exhibits (biomeId -> speciesId[], 3 slots per hall)
  exhibits: Record<string, (string | null)[]>;
  lastMuseumCollect: string;
  // Region milestone rewards already claimed
  claimedMilestones: string[];
  // Cumulative play time in seconds (updated every ~30s)
  totalPlaytimeSec: number;
  devMode?: boolean;
}

export const DAILY_XP_GOAL = 100;

export const RANK_THRESHOLDS: Record<PlayerRank, number> = {
  'volunteer': 0,
  'junior-explorer': 100,
  'field-researcher': 500,
  'lead-scientist': 1500,
  'lab-director': 5000,
  'chief-scientist': 10000,
  'distinguished-fellow': 25000,
  'legendary-naturalist': 50000,
};

export const RANK_LABELS: Record<PlayerRank, string> = {
  'volunteer': 'Volunteer',
  'junior-explorer': 'Junior Explorer',
  'field-researcher': 'Field Researcher',
  'lead-scientist': 'Lead Scientist',
  'lab-director': 'Lab Director',
  'chief-scientist': 'Chief Scientist',
  'distinguished-fellow': 'Distinguished Fellow',
  'legendary-naturalist': 'Legendary Naturalist',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  'common': '#8aaa7a',
  'uncommon': '#4a8a4a',
  'rare': '#60a5fa',
  'ultra-rare': '#a855f7',
  'legendary': '#c9a84c',
};

export const RARITY_LABELS: Record<Rarity, string> = {
  'common': 'Common',
  'uncommon': 'Uncommon',
  'rare': 'Rare',
  'ultra-rare': 'Ultra-Rare',
  'legendary': 'Legendary',
};

export const SAMPLING_METHOD_INFO: Record<SamplingMethod, { name: string; emoji: string; description: string }> = {
  'scoop': { name: 'Soil Scoop', emoji: '🪣', description: 'Dig into earth, leaf litter, and rotting wood' },
  'hand-net': { name: 'Hand Net', emoji: '🏸', description: 'Sweep through air and low vegetation' },
  'car-trap': { name: 'Car Trap', emoji: '🚗', description: 'Roof-mounted net for bulk insect capture' },
  'plankton-net': { name: 'Plankton Net', emoji: '🌊', description: 'Drag through water to filter microorganisms' },
  'vial': { name: 'Collection Vial', emoji: '🧪', description: 'Universal container — anything that fits' },
};
