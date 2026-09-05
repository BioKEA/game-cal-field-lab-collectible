import type { GameState, FieldNote } from '@/types/game';
import { BIOMES } from '@/data/biomes';
import { getTodayYmd } from '@/lib/progression';

export const FIELD_NOTE_CAP = 300;
export const STARTING_BIOME_IDS = ['stinson-beach', 'muir-woods'] as const;

/** Append a note, keeping only the most recent FIELD_NOTE_CAP entries. */
export function appendNote(notes: FieldNote[], note: FieldNote): FieldNote[] {
  const next = [...notes, note];
  return next.length > FIELD_NOTE_CAP ? next.slice(next.length - FIELD_NOTE_CAP) : next;
}

export function createInitialState(name = 'Researcher', avatar = '🧑‍🔬', now: Date = new Date()): GameState {
  const iso = now.toISOString();
  return {
    playerName: name,
    avatar,
    createdAt: iso,
    rank: 'volunteer',
    xp: 0,
    dailyXpEarned: 0,
    dailyXpDate: getTodayYmd(now),
    dailyStreak: 0,
    streakDate: '',
    xpHistory: {},
    bioCredits: 50,
    stamina: 100,
    maxStamina: 100,
    expeditionFuel: 5,
    maxExpeditionFuel: 5,
    lastStaminaRegen: iso,
    discoveredSpecies: [],
    specimens: [],
    currentBiomeId: null,
    currentPointId: null,
    unlockedBiomes: [...STARTING_BIOME_IDS],
    labQueue: [],
    reagents: {
      extractionKits: 10,
      pcrPrimers: 10,
      flowCells: 5,
    },
    stats: {
      totalCollected: 0,
      totalIdentified: 0,
      expeditionsCompleted: 0,
      daysPlayed: 1,
    },
    fieldNotes: [],
    dailyChallenges: [],
    lastChallengeDate: '',
    achievements: [],
    claimedMissions: [],
    claimedRequests: [],
    researchPoints: 0,
    unlockedSkills: [],
    impactFactor: 0,
    publicationCount: 0,
    biomeHealth: Object.fromEntries(BIOMES.map(b => [b.id, 100])),
    lastHealthRegen: iso,
    exhibits: Object.fromEntries(BIOMES.map(b => [b.id, [null, null, null]])),
    lastMuseumCollect: iso,
    claimedMilestones: [],
    totalPlaytimeSec: 0,
  };
}

export function migrateLoadedState(parsed: Partial<GameState> & Record<string, unknown>): GameState {
  const p = parsed;
  const nowIso = new Date().toISOString();
  if (!p.playerName) p.playerName = 'Researcher';
  if (!p.avatar) p.avatar = '🧑‍🔬';
  if (!p.createdAt) p.createdAt = nowIso;
  if (!p.rank) p.rank = 'volunteer';
  if (typeof p.xp !== 'number') p.xp = 0;
  if (typeof p.bioCredits !== 'number') p.bioCredits = 50;
  if (typeof p.stamina !== 'number') p.stamina = 100;
  if (typeof p.maxStamina !== 'number') p.maxStamina = 100;
  if (typeof p.expeditionFuel !== 'number') p.expeditionFuel = 5;
  if (typeof p.maxExpeditionFuel !== 'number') p.maxExpeditionFuel = 5;
  if (!p.lastStaminaRegen) p.lastStaminaRegen = nowIso;
  if (!p.discoveredSpecies) p.discoveredSpecies = [];
  if (!p.specimens) p.specimens = [];
  if (p.currentBiomeId === undefined) p.currentBiomeId = null;
  if (p.currentPointId === undefined) p.currentPointId = null;
  if (!p.unlockedBiomes) p.unlockedBiomes = [...STARTING_BIOME_IDS];
  if (!p.labQueue) p.labQueue = [];
  if (!p.reagents) p.reagents = { extractionKits: 10, pcrPrimers: 10, flowCells: 5 };
  if (!p.stats) p.stats = { totalCollected: 0, totalIdentified: 0, expeditionsCompleted: 0, daysPlayed: 1 };
  if (!p.fieldNotes) p.fieldNotes = [];
  if (p.fieldNotes.length > FIELD_NOTE_CAP) p.fieldNotes = p.fieldNotes.slice(p.fieldNotes.length - FIELD_NOTE_CAP);
  if (!p.dailyChallenges) p.dailyChallenges = [];
  if (!p.lastChallengeDate) p.lastChallengeDate = '';
  if (!p.achievements) p.achievements = [];
  if (!p.claimedMissions) p.claimedMissions = [];
  if (!p.claimedRequests) p.claimedRequests = [];
  if (typeof p.researchPoints !== 'number') p.researchPoints = 0;
  if (!p.unlockedSkills) p.unlockedSkills = [];
  if (typeof p.impactFactor !== 'number') p.impactFactor = 0;
  if (typeof p.publicationCount !== 'number') p.publicationCount = 0;
  if (!p.biomeHealth || typeof p.biomeHealth !== 'object') {
    p.biomeHealth = Object.fromEntries(BIOMES.map(b => [b.id, 100]));
  } else {
    for (const b of BIOMES) {
      if (typeof p.biomeHealth[b.id] !== 'number') p.biomeHealth[b.id] = 100;
    }
  }
  if (!p.lastHealthRegen) p.lastHealthRegen = nowIso;
  if (!p.exhibits || typeof p.exhibits !== 'object') {
    p.exhibits = Object.fromEntries(BIOMES.map(b => [b.id, [null, null, null]]));
  } else {
    for (const b of BIOMES) {
      if (!Array.isArray(p.exhibits[b.id])) p.exhibits[b.id] = [null, null, null];
      while (p.exhibits[b.id].length < 3) p.exhibits[b.id].push(null);
    }
  }
  if (!p.lastMuseumCollect) p.lastMuseumCollect = nowIso;
  if (typeof p.dailyXpEarned !== 'number') p.dailyXpEarned = 0;
  if (!p.dailyXpDate) p.dailyXpDate = getTodayYmd();
  if (typeof p.dailyStreak !== 'number') p.dailyStreak = 0;
  if (typeof p.streakDate !== 'string') p.streakDate = '';
  if (!p.xpHistory || typeof p.xpHistory !== 'object') p.xpHistory = {};
  if (!p.claimedMilestones) p.claimedMilestones = [];
  if (typeof p.totalPlaytimeSec !== 'number') p.totalPlaytimeSec = 0;
  return p as GameState;
}
