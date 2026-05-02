import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { GameState, CollectedSpecimen, SamplingMethod, PlayerRank, DailyChallenge, FieldNote, Achievement } from '@/types/game';
import { RANK_THRESHOLDS, DAILY_XP_GOAL } from '@/types/game';
import { SPECIES } from '@/data/species';
import { ACHIEVEMENTS } from '@/data/achievements';
import { MISSIONS } from '@/data/missions';
import { getDailyRequests } from '@/data/requests';
import { SKILLS, canUnlockSkill } from '@/data/skills';
import { BIOMES } from '@/data/biomes';
import { getRegionFuelCost, getRegionById } from '@/data/regions';
import { computeBuffs } from '@/lib/buffs';
import { getHealthDamage, getBiomeHealth, computeVisitorCredits } from '@/lib/ecosystem';
import { playCollect, playLabStage, playAchievement } from '@/lib/sounds';

const LEGACY_STORAGE_KEY = 'biokea-game-state';
const slotKey = (slot: number) => `biokea-game-state-slot-${slot}`;

export const ACTIVE_SLOT_KEY = 'biokea-active-slot';
export const SLOT_COUNT = 3;

function getTodayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYmdNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function createInitialState(name = 'Researcher', avatar = '🧑‍🔬'): GameState {
  return {
    playerName: name,
    avatar,
    createdAt: new Date().toISOString(),
    rank: 'volunteer',
    xp: 0,
    dailyXpEarned: 0,
    dailyXpDate: getTodayYmd(),
    dailyStreak: 0,
    streakDate: '',
    xpHistory: {},
    bioCredits: 50,
    stamina: 100,
    maxStamina: 100,
    expeditionFuel: 5,
    maxExpeditionFuel: 5,
    lastStaminaRegen: new Date().toISOString(),
    discoveredSpecies: [],
    specimens: [],
    currentBiomeId: null,
    currentPointId: null,
    unlockedBiomes: ['stinson-beach', 'muir-woods'],
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
    lastHealthRegen: new Date().toISOString(),
    exhibits: Object.fromEntries(BIOMES.map(b => [b.id, [null, null, null]])),
    lastMuseumCollect: new Date().toISOString(),
    claimedMilestones: [],
    totalPlaytimeSec: 0,
  };
}

const ALL_BIOME_IDS = [
  'stinson-beach', 'muir-woods', 'point-reyes', 'bolinas-lagoon', 'tomales-bay',
  'humboldt-redwoods', 'lost-coast', 'klamath-river',
  'yosemite-valley', 'sierra-high-country', 'giant-sequoia-grove', 'mono-lake',
  'joshua-tree', 'death-valley', 'mojave-preserve',
  'santa-cruz-island', 'anacapa-kelp-forest', 'santa-rosa-island',
];

const ALL_SKILL_IDS = [
  'field-1', 'field-2', 'field-3', 'field-4',
  'lab-1', 'lab-2', 'lab-3', 'lab-4',
  'biology-1', 'biology-2', 'biology-3', 'biology-4',
];

function createDevState(): GameState {
  return {
    ...createInitialState('DEV MODE', '🛠️'),
    devMode: true,
    rank: 'legendary-naturalist',
    xp: 999999,
    bioCredits: 999999,
    stamina: 9999,
    maxStamina: 9999,
    expeditionFuel: 999,
    maxExpeditionFuel: 999,
    researchPoints: 999,
    unlockedBiomes: ALL_BIOME_IDS,
    unlockedSkills: ALL_SKILL_IDS,
    reagents: {
      extractionKits: 9999,
      pcrPrimers: 9999,
      flowCells: 9999,
    },
  };
}

function clampDevResources(s: GameState): GameState {
  if (!s.devMode) return s;
  return {
    ...s,
    bioCredits: Math.max(s.bioCredits, 999999),
    stamina: Math.max(s.stamina, 9999),
    maxStamina: Math.max(s.maxStamina, 9999),
    expeditionFuel: Math.max(s.expeditionFuel, 999),
    maxExpeditionFuel: Math.max(s.maxExpeditionFuel, 999),
    researchPoints: Math.max(s.researchPoints, 999),
    reagents: {
      extractionKits: Math.max(s.reagents.extractionKits, 9999),
      pcrPrimers: Math.max(s.reagents.pcrPrimers, 9999),
      flowCells: Math.max(s.reagents.flowCells, 9999),
    },
  };
}

function migrateLoadedState(parsed: Partial<GameState> & Record<string, unknown>): GameState {
  // Migrate old saves missing new fields
  const p = parsed as Record<string, unknown> & Partial<GameState>;
  if (!p.avatar) p.avatar = '🧑‍🔬';
  if (!p.createdAt) p.createdAt = new Date().toISOString();
  if (!p.fieldNotes) p.fieldNotes = [];
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
  if (!p.lastHealthRegen) p.lastHealthRegen = new Date().toISOString();
  if (!p.exhibits || typeof p.exhibits !== 'object') {
    p.exhibits = Object.fromEntries(BIOMES.map(b => [b.id, [null, null, null]]));
  } else {
    for (const b of BIOMES) {
      if (!Array.isArray(p.exhibits[b.id])) p.exhibits[b.id] = [null, null, null];
      while (p.exhibits[b.id].length < 3) p.exhibits[b.id].push(null);
    }
  }
  if (!p.lastMuseumCollect) p.lastMuseumCollect = new Date().toISOString();
  if (typeof p.dailyXpEarned !== 'number') p.dailyXpEarned = 0;
  if (!p.dailyXpDate) p.dailyXpDate = getTodayYmd();
  if (typeof p.dailyStreak !== 'number') p.dailyStreak = 0;
  if (typeof p.streakDate !== 'string') p.streakDate = '';
  if (!p.xpHistory || typeof p.xpHistory !== 'object') p.xpHistory = {};
  if (!p.claimedMilestones) p.claimedMilestones = [];
  if (typeof p.totalPlaytimeSec !== 'number') p.totalPlaytimeSec = 0;
  return p as GameState;
}

// Apply an XP gain: rolls daily counter, tracks history, advances streak if
// the daily XP goal is crossed for the first time today.
function applyXpGain(
  prev: GameState,
  amount: number,
): Pick<GameState, 'xp' | 'rank' | 'dailyXpEarned' | 'dailyXpDate' | 'dailyStreak' | 'streakDate' | 'xpHistory'> {
  const today = getTodayYmd();
  const gain = Math.max(0, amount);
  const prevDaily = prev.dailyXpDate === today ? prev.dailyXpEarned : 0;
  const newDaily = prevDaily + gain;

  // Rolling 30-day XP history
  const history: Record<string, number> = { ...(prev.xpHistory || {}) };
  history[today] = (history[today] || 0) + gain;
  const cutoff = getYmdNDaysAgo(30);
  for (const k of Object.keys(history)) {
    if (k < cutoff) delete history[k];
  }

  // Streak: increment only on the first crossing of the goal today
  const crossedGoal = prevDaily < DAILY_XP_GOAL && newDaily >= DAILY_XP_GOAL;
  let streak = prev.dailyStreak || 0;
  let streakDate = prev.streakDate || '';
  if (crossedGoal && streakDate !== today) {
    if (streakDate === getYmdNDaysAgo(1)) {
      streak += 1;
    } else {
      streak = 1;
    }
    streakDate = today;
  }

  const newXp = prev.xp + amount;
  return {
    xp: newXp,
    rank: calculateRank(newXp),
    dailyXpEarned: newDaily,
    dailyXpDate: today,
    dailyStreak: streak,
    streakDate,
    xpHistory: history,
  };
}

export function peekSlot(slot: number): GameState | null {
  try {
    const saved = localStorage.getItem(slotKey(slot));
    if (!saved) return null;
    return migrateLoadedState(JSON.parse(saved));
  } catch {
    return null;
  }
}

export function eraseSlot(slot: number): void {
  try {
    localStorage.removeItem(slotKey(slot));
  } catch { /* ignore */ }
}

export function createSlot(slot: number, name: string, avatar: string): GameState {
  const fresh = createInitialState(name, avatar);
  try {
    localStorage.setItem(slotKey(slot), JSON.stringify(fresh));
  } catch { /* ignore */ }
  return fresh;
}

export function createDevSlot(slot: number): GameState {
  const fresh = createDevState();
  try {
    localStorage.setItem(slotKey(slot), JSON.stringify(fresh));
  } catch { /* ignore */ }
  return fresh;
}

// One-time legacy migration: if old single-save exists and slot 1 is empty,
// move it into slot 1 so returning players keep their progress. Also carry
// their completed onboarding flag so they don't see the tutorial twice.
function migrateLegacyIfNeeded(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const slot1 = localStorage.getItem(slotKey(1));
      if (!slot1) {
        localStorage.setItem(slotKey(1), legacy);
        if (!localStorage.getItem(ACTIVE_SLOT_KEY)) {
          localStorage.setItem(ACTIVE_SLOT_KEY, '1');
        }
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    const legacyOnboard = localStorage.getItem('biokea-onboarded');
    if (legacyOnboard === 'true') {
      if (!localStorage.getItem('biokea-onboarded-slot-1')) {
        localStorage.setItem('biokea-onboarded-slot-1', 'true');
      }
      localStorage.removeItem('biokea-onboarded');
    }
  } catch { /* ignore */ }
}

// Run migration eagerly at module load
migrateLegacyIfNeeded();

function loadState(slot: number): GameState {
  try {
    const saved = localStorage.getItem(slotKey(slot));
    if (saved) {
      const parsed = JSON.parse(saved);
      return migrateLoadedState(parsed);
    }
  } catch {
    // ignore
  }
  return createInitialState();
}

const CHALLENGE_TEMPLATES = [
  { title: 'Sample Collector', description: 'Collect {n} specimens from any biome', target: 3, reward: { xp: 30, credits: 20 } },
  { title: 'Lab Rat', description: 'Advance {n} specimens through a lab stage', target: 3, reward: { xp: 25, credits: 15 } },
  { title: 'Species Hunter', description: 'Identify {n} new species', target: 1, reward: { xp: 50, credits: 40 } },
  { title: 'Field Marathon', description: 'Collect {n} specimens in a single session', target: 5, reward: { xp: 40, credits: 30 } },
  { title: 'Rare Find', description: 'Discover a rare or better species', target: 1, reward: { xp: 60, credits: 50 } },
  { title: 'Full Pipeline', description: 'Process {n} specimens from collection to ID', target: 2, reward: { xp: 75, credits: 60 } },
];

function generateDailyChallenges(): DailyChallenge[] {
  const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((t, i) => ({
    id: `daily-${Date.now()}-${i}`,
    title: t.title,
    description: t.description.replace('{n}', String(t.target)),
    target: t.target,
    progress: 0,
    reward: t.reward,
    completed: false,
  }));
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function checkAchievements(state: GameState): Achievement[] {
  const unlockedIds = new Set(state.achievements.map(a => a.id));
  const discoveredRarities = state.discoveredSpecies.map(
    sid => SPECIES.find(s => s.id === sid)?.rarity
  );
  const stats = {
    totalCollected: state.stats.totalCollected,
    totalIdentified: state.stats.totalIdentified,
    discoveredSpecies: state.discoveredSpecies.length,
    expeditionsCompleted: state.stats.expeditionsCompleted,
    rank: state.rank,
    unlockedBiomes: state.unlockedBiomes.length,
    legendaryFound: discoveredRarities.includes('legendary'),
    ultraRareFound: discoveredRarities.includes('ultra-rare'),
  };

  const newAchievements: Achievement[] = [];
  for (const def of ACHIEVEMENTS) {
    if (!unlockedIds.has(def.id) && def.check(stats)) {
      newAchievements.push({
        id: def.id,
        title: def.title,
        description: def.description,
        emoji: def.emoji,
        unlockedAt: new Date().toISOString(),
      });
    }
  }
  return newAchievements;
}

function calculateRank(xp: number): PlayerRank {
  const ranks: PlayerRank[] = ['legendary-naturalist', 'distinguished-fellow', 'chief-scientist', 'lab-director', 'lead-scientist', 'field-researcher', 'junior-explorer', 'volunteer'];
  for (const rank of ranks) {
    if (xp >= (RANK_THRESHOLDS as Record<string, number>)[rank]) {
      return rank;
    }
  }
  return 'volunteer';
}

function getRarityXP(rarity: string): number {
  switch (rarity) {
    case 'legendary': return 100;
    case 'ultra-rare': return 50;
    case 'rare': return 25;
    case 'uncommon': return 15;
    default: return 10;
  }
}

function getRarityCredits(rarity: string): number {
  switch (rarity) {
    case 'legendary': return 200;
    case 'ultra-rare': return 100;
    case 'rare': return 50;
    case 'uncommon': return 40;
    default: return 20;
  }
}

export function useGameState(slot: number) {
  const [state, setState] = useState<GameState>(() => loadState(slot));
  const prevAchievementCount = useRef(state.achievements.length);
  const prevRank = useRef(state.rank);

  // Persist to localStorage on every change (scoped to this slot)
  useEffect(() => {
    localStorage.setItem(slotKey(slot), JSON.stringify(state));
  }, [state, slot]);

  // Dev mode: keep resources maxed after any state change
  useEffect(() => {
    if (!state.devMode) return;
    const clamped = clampDevResources(state);
    if (
      clamped.bioCredits !== state.bioCredits ||
      clamped.stamina !== state.stamina ||
      clamped.expeditionFuel !== state.expeditionFuel ||
      clamped.reagents.extractionKits !== state.reagents.extractionKits
    ) {
      setState(clamped);
    }
  }, [state]);

  // Check achievements after state changes
  useEffect(() => {
    const newAchievements = checkAchievements(state);
    if (newAchievements.length > 0) {
      setState(prev => ({
        ...prev,
        achievements: [...prev.achievements, ...newAchievements],
      }));
    }
  }, [state.stats, state.discoveredSpecies, state.rank, state.unlockedBiomes]);

  // Play sound and show toast when a new achievement unlocks
  useEffect(() => {
    if (state.achievements.length > prevAchievementCount.current) {
      playAchievement();
      const newAch = state.achievements[state.achievements.length - 1];
      if (newAch) {
        toast(`${newAch.emoji} Achievement Unlocked`, {
          description: newAch.title,
          duration: 4000,
        });
      }
      prevAchievementCount.current = state.achievements.length;
    }
  }, [state.achievements.length, state.achievements]);

  // Toast on rank up
  useEffect(() => {
    if (state.rank !== prevRank.current) {
      const order: PlayerRank[] = ['volunteer', 'junior-explorer', 'field-researcher', 'lead-scientist', 'lab-director'];
      if (order.indexOf(state.rank) > order.indexOf(prevRank.current)) {
        playAchievement();
        toast('⭐ Rank Promotion', {
          description: `Promoted to ${state.rank.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}`,
          duration: 5000,
        });
      }
      prevRank.current = state.rank;
    }
  }, [state.rank]);

  // Regenerate stamina over time
  useEffect(() => {
    const interval = setInterval(() => {
      setState(prev => {
        const buffs = computeBuffs(prev);
        const effectiveMax = prev.maxStamina + buffs.maxStaminaBonus;
        const now = new Date();

        // Stamina regen
        let nextStamina = prev.stamina;
        let nextLastStamina = prev.lastStaminaRegen;
        if (prev.stamina < effectiveMax) {
          const last = new Date(prev.lastStaminaRegen);
          const minutesElapsed = (now.getTime() - last.getTime()) / 60000;
          if (minutesElapsed >= 1) {
            const regenAmount = Math.floor(minutesElapsed * buffs.staminaRegenMultiplier);
            if (regenAmount >= 1) {
              nextStamina = Math.min(effectiveMax, prev.stamina + regenAmount);
              nextLastStamina = now.toISOString();
            }
          }
        }

        // Ecosystem regen: 1 health per minute per biome
        let nextBiomeHealth = prev.biomeHealth;
        let nextLastHealth = prev.lastHealthRegen;
        const lastH = new Date(prev.lastHealthRegen);
        const hMinutes = Math.floor((now.getTime() - lastH.getTime()) / 60000);
        if (hMinutes >= 1) {
          let changed = false;
          const updated: Record<string, number> = { ...prev.biomeHealth };
          for (const b of BIOMES) {
            const cur = typeof updated[b.id] === 'number' ? updated[b.id] : 100;
            if (cur < 100) {
              updated[b.id] = Math.min(100, cur + hMinutes);
              changed = true;
            }
          }
          if (changed) {
            nextBiomeHealth = updated;
            nextLastHealth = now.toISOString();
          } else {
            nextLastHealth = now.toISOString();
          }
        }

        const nextPlaytime = prev.totalPlaytimeSec + 30;

        return {
          ...prev,
          stamina: nextStamina,
          lastStaminaRegen: nextLastStamina,
          biomeHealth: nextBiomeHealth,
          lastHealthRegen: nextLastHealth,
          totalPlaytimeSec: nextPlaytime,
        };
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const collectSpecimen = useCallback((
    speciesId: string,
    biomeId: string,
    collectionPointId: string,
    samplingMethod: SamplingMethod,
  ): CollectedSpecimen => {
    const specimen: CollectedSpecimen = {
      id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      speciesId,
      collectedAt: new Date().toISOString(),
      biomeId,
      collectionPointId,
      samplingMethod,
      labStatus: 'collected',
    };

    const species = SPECIES.find(s => s.id === speciesId);
    const note: FieldNote = {
      id: `note-${Date.now()}`,
      timestamp: new Date().toISOString(),
      biomeId,
      type: 'collection',
      text: `Collected a sample using ${samplingMethod}${species ? `. Appears to be ${species.commonName}.` : '.'}`,
      speciesId,
      emoji: species?.emoji || '📦',
    };

    setState(prev => {
      const buffs = computeBuffs(prev);
      const species = SPECIES.find(s => s.id === speciesId);
      const damage = species ? getHealthDamage(species.rarity) : 2;
      const curHealth = getBiomeHealth(prev, biomeId);
      const newHealth = Math.max(0, curHealth - damage);
      return {
      ...prev,
      specimens: [...prev.specimens, specimen],
      labQueue: [...prev.labQueue, specimen.id],
      stamina: Math.max(0, prev.stamina - buffs.collectStaminaCost),
      fieldNotes: [...prev.fieldNotes, note],
      biomeHealth: { ...prev.biomeHealth, [biomeId]: newHealth },
      stats: {
        ...prev.stats,
        totalCollected: prev.stats.totalCollected + 1,
      },
      dailyChallenges: prev.dailyChallenges.map(c => {
        if (c.completed) return c;
        if (c.title === 'Sample Collector' || c.title === 'Field Marathon') {
          const newProgress = c.progress + 1;
          return { ...c, progress: newProgress, completed: newProgress >= c.target };
        }
        return c;
      }),
      };
    });

    playCollect();
    return specimen;
  }, []);

  const advanceLabStage = useCallback((specimenId: string, barcodeBonus: number = 0) => {
    playLabStage();
    setState(prev => {
      const specimen = prev.specimens.find(s => s.id === specimenId);
      if (!specimen) return prev;

      const stageOrder: CollectedSpecimen['labStatus'][] = ['collected', 'extracting', 'pcr', 'qpcr', 'sequencing', 'identified'];
      const currentIndex = stageOrder.indexOf(specimen.labStatus);
      const nextStatus = stageOrder[currentIndex + 1];

      if (!nextStatus) return prev;

      const buffs = computeBuffs(prev);

      // Check reagents
      let newReagents = { ...prev.reagents };
      if (nextStatus === 'extracting' && newReagents.extractionKits <= 0) return prev;
      if (nextStatus === 'pcr' && newReagents.pcrPrimers <= 0) return prev;
      if (nextStatus === 'sequencing' && newReagents.flowCells <= 0) return prev;

      // Apply reagent save chance from lab skills
      const reagentSaved = buffs.reagentSaveChance > 0 && Math.random() < buffs.reagentSaveChance;
      if (nextStatus === 'extracting' && !reagentSaved) newReagents.extractionKits--;
      if (nextStatus === 'pcr' && !reagentSaved) newReagents.pcrPrimers--;
      if (nextStatus === 'sequencing' && !reagentSaved) newReagents.flowCells--;

      // When identified, add to discovered species
      const species = SPECIES.find(s => s.id === specimen.speciesId);
      const isNewDiscovery = nextStatus === 'identified' && !prev.discoveredSpecies.includes(specimen.speciesId);

      const baseXp = nextStatus === 'identified' && species ? getRarityXP(species.rarity) : 5;
      const baseCredits = nextStatus === 'identified' && species && isNewDiscovery ? getRarityCredits(species.rarity) : 0;
      // Barcode bonus applies only at identification stage
      const barcodeMult = nextStatus === 'identified' ? 1 + barcodeBonus : 1;
      // Higher-tier regions yield more credits (1x, 1.5x, 2x, 2.5x, 3x)
      const biome = BIOMES.find(b => b.id === specimen.biomeId);
      const regionTier = biome ? (getRegionById(biome.regionId)?.tier ?? 1) : 1;
      const tierCreditMult = 1 + (regionTier - 1) * 0.5;
      const xpGain = Math.round(baseXp * buffs.xpMultiplier * barcodeMult);
      const creditGain = Math.round(baseCredits * buffs.creditMultiplier * barcodeMult * tierCreditMult);

      // Research points: 1 per new discovery, 2 for rare+, 3 for ultra-rare+, 5 for legendary
      let researchGain = 0;
      if (isNewDiscovery && species) {
        if (species.rarity === 'legendary') researchGain = 5;
        else if (species.rarity === 'ultra-rare') researchGain = 3;
        else if (species.rarity === 'rare') researchGain = 2;
        else researchGain = 1;
      }

      const xpUpdate = applyXpGain(prev, xpGain);

      // Generate field note for discoveries
      const newNotes = [...prev.fieldNotes];
      if (nextStatus === 'identified' && species) {
        newNotes.push({
          id: `note-${Date.now()}-disc`,
          timestamp: new Date().toISOString(),
          biomeId: specimen.biomeId,
          type: isNewDiscovery ? 'discovery' : 'collection',
          text: isNewDiscovery
            ? `NEW SPECIES: ${species.commonName} (${species.scientificName}) confirmed! ${species.funFact}`
            : `Re-identified ${species.commonName}. Match confidence high.`,
          speciesId: specimen.speciesId,
          emoji: species.emoji,
        });
      }

      // Update daily challenges
      const updatedChallenges = prev.dailyChallenges.map(c => {
        if (c.completed) return c;
        if (c.title === 'Lab Rat') {
          const p = c.progress + 1;
          return { ...c, progress: p, completed: p >= c.target };
        }
        if (c.title === 'Species Hunter' && isNewDiscovery && nextStatus === 'identified') {
          const p = c.progress + 1;
          return { ...c, progress: p, completed: p >= c.target };
        }
        if (c.title === 'Full Pipeline' && nextStatus === 'identified') {
          const p = c.progress + 1;
          return { ...c, progress: p, completed: p >= c.target };
        }
        if (c.title === 'Rare Find' && isNewDiscovery && species && ['rare', 'ultra-rare', 'legendary'].includes(species.rarity)) {
          return { ...c, progress: 1, completed: true };
        }
        return c;
      });

      return {
        ...prev,
        specimens: prev.specimens.map(s =>
          s.id === specimenId
            ? {
                ...s,
                labStatus: nextStatus,
                matchPercent: nextStatus === 'identified' ? 95 + Math.random() * 4.9 : s.matchPercent,
                ctValue: nextStatus === 'qpcr' ? 18 + Math.random() * 12 : s.ctValue,
                concentration: nextStatus === 'extracting' ? 20 + Math.random() * 60 : s.concentration,
              }
            : s
        ),
        reagents: newReagents,
        discoveredSpecies: isNewDiscovery
          ? [...prev.discoveredSpecies, specimen.speciesId]
          : prev.discoveredSpecies,
        ...xpUpdate,
        bioCredits: prev.bioCredits + creditGain,
        researchPoints: prev.researchPoints + researchGain,
        labQueue: nextStatus === 'identified'
          ? prev.labQueue.filter(id => id !== specimenId)
          : prev.labQueue,
        stats: {
          ...prev.stats,
          totalIdentified: nextStatus === 'identified'
            ? prev.stats.totalIdentified + 1
            : prev.stats.totalIdentified,
        },
        fieldNotes: newNotes,
        dailyChallenges: updatedChallenges,
      };
    });
  }, []);

  const setCurrentLocation = useCallback((biomeId: string | null, pointId: string | null) => {
    setState(prev => ({
      ...prev,
      currentBiomeId: biomeId,
      currentPointId: pointId,
    }));
  }, []);

  const useExpeditionFuel = useCallback((biomeId?: string) => {
    setState(prev => {
      const buffs = computeBuffs(prev);
      const fuelRefunded = buffs.fuelRefundChance > 0 && Math.random() < buffs.fuelRefundChance;
      // Fuel cost scales with region tier (1-5)
      const biome = biomeId ? BIOMES.find(b => b.id === biomeId) : undefined;
      const fuelCost = biome ? getRegionFuelCost(biome.regionId) : 1;
      const newNotes = [...prev.fieldNotes];
      if (biomeId) {
        newNotes.push({
          id: `note-${Date.now()}-exp`,
          timestamp: new Date().toISOString(),
          biomeId,
          type: 'expedition',
          text: fuelRefunded
            ? 'Departed for field expedition. Careful route planning saved fuel — free trip!'
            : fuelCost > 1
              ? `Departed for distant field expedition. ${fuelCost} fuel consumed for the long journey.`
              : 'Departed for field expedition. Fuel consumed, equipment packed.',
          emoji: '🗺️',
        });
      }
      return {
        ...prev,
        expeditionFuel: fuelRefunded ? prev.expeditionFuel : Math.max(0, prev.expeditionFuel - fuelCost),
        fieldNotes: newNotes,
        stats: {
          ...prev.stats,
          expeditionsCompleted: prev.stats.expeditionsCompleted + 1,
        },
      };
    });
  }, []);

  const purchaseItem = useCallback((_itemId: string, price: number, effect: { type: string; key?: string; amount?: number }) => {
    setState(prev => {
      if (prev.bioCredits < price) return prev;
      let next = { ...prev, bioCredits: prev.bioCredits - price };

      switch (effect.type) {
        case 'add-reagent':
          if (effect.key && effect.amount) {
            next.reagents = {
              ...next.reagents,
              [effect.key]: (next.reagents as Record<string, number>)[effect.key] + effect.amount,
            };
          }
          break;
        case 'upgrade-stat':
          if (effect.key === 'maxStamina' && effect.amount) {
            next.maxStamina = next.maxStamina + effect.amount;
            next.stamina = next.stamina + effect.amount;
          } else if (effect.key === 'maxExpeditionFuel' && effect.amount) {
            next.maxExpeditionFuel = next.maxExpeditionFuel + effect.amount;
            next.expeditionFuel = next.expeditionFuel + effect.amount;
          }
          break;
        case 'unlock-biome':
          if (effect.key && !next.unlockedBiomes.includes(effect.key)) {
            next.unlockedBiomes = [...next.unlockedBiomes, effect.key];
          }
          break;
        case 'refuel':
          next.expeditionFuel = next.maxExpeditionFuel;
          break;
      }

      return next;
    });
  }, []);

  const renamePlayer = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 32);
    if (!trimmed) return;
    setState(prev => (prev.playerName === trimmed ? prev : { ...prev, playerName: trimmed }));
  }, []);

  const setAvatar = useCallback((avatar: string) => {
    if (!avatar) return;
    setState(prev => (prev.avatar === avatar ? prev : { ...prev, avatar }));
  }, []);

  const resetGame = useCallback(() => {
    // Preserve the researcher's name and avatar across a hard reset
    setState(prev => {
      const initial = createInitialState(prev.playerName, prev.avatar);
      localStorage.setItem(slotKey(slot), JSON.stringify(initial));
      return initial;
    });
  }, [slot]);

  // Refresh daily challenges and refill fuel if it's a new day
  const refreshChallenges = useCallback(() => {
    setState(prev => {
      const today = getTodayString();
      if (prev.lastChallengeDate === today) return prev;
      const effectiveMaxFuel = prev.maxExpeditionFuel;
      return {
        ...prev,
        dailyChallenges: generateDailyChallenges(),
        lastChallengeDate: today,
        expeditionFuel: Math.max(prev.expeditionFuel, effectiveMaxFuel),
      };
    });
  }, []);

  const claimMission = useCallback((missionId: string) => {
    setState(prev => {
      if (prev.claimedMissions.includes(missionId)) return prev;
      const mission = MISSIONS.find(m => m.id === missionId);
      if (!mission) return prev;
      // Verify all steps are done
      const allDone = mission.steps.every(step => step.check(prev).done);
      if (!allDone) return prev;
      const xpUpdate = applyXpGain(prev, mission.reward.xp);
      toast(`${mission.icon} Mission Complete`, {
        description: `${mission.title} · +${mission.reward.xp} XP · +${mission.reward.credits} credits`,
        duration: 5000,
      });
      playAchievement();
      return {
        ...prev,
        ...xpUpdate,
        bioCredits: prev.bioCredits + mission.reward.credits,
        claimedMissions: [...prev.claimedMissions, missionId],
      };
    });
  }, []);

  const claimRequest = useCallback((requestId: string) => {
    setState(prev => {
      if (prev.claimedRequests.includes(requestId)) return prev;
      const requests = getDailyRequests();
      const req = requests.find(r => r.id === requestId);
      if (!req) return prev;
      const progress = req.check(prev);
      if (!progress.done) return prev;
      const xpUpdate = applyXpGain(prev, req.reward.xp);
      toast(`📩 Request Delivered`, {
        description: `${req.title} · +${req.reward.xp} XP · +${req.reward.credits} credits`,
        duration: 4500,
      });
      playAchievement();
      return {
        ...prev,
        ...xpUpdate,
        bioCredits: prev.bioCredits + req.reward.credits,
        claimedRequests: [...prev.claimedRequests, requestId],
      };
    });
  }, []);

  const unlockSkill = useCallback((skillId: string) => {
    setState(prev => {
      const skill = SKILLS.find(s => s.id === skillId);
      if (!skill) return prev;
      if (!canUnlockSkill(skill, prev.unlockedSkills, prev.researchPoints)) return prev;
      playAchievement();
      toast(`${skill.icon} Skill Unlocked`, {
        description: `${skill.title} — ${skill.effect}`,
        duration: 4500,
      });
      return {
        ...prev,
        researchPoints: prev.researchPoints - skill.cost,
        unlockedSkills: [...prev.unlockedSkills, skillId],
      };
    });
  }, []);

  const publishResearch = useCallback(() => {
    setState(prev => {
      // Require rank of lead-scientist and at least 25 discoveries
      if (prev.discoveredSpecies.length < 25) return prev;
      const newImpact = prev.impactFactor + 1;
      const newPubCount = prev.publicationCount + 1;
      playAchievement();
      toast('📜 Research Published', {
        description: `Impact Factor increased to ${newImpact}. Permanent +10% XP and credits.`,
        duration: 6000,
      });
      // Reset most progress but preserve skills, achievements, field notes, impact, pub count, exhibits
      return {
        ...createInitialState(prev.playerName, prev.avatar),
        createdAt: prev.createdAt,
        unlockedSkills: prev.unlockedSkills,
        researchPoints: prev.researchPoints,
        achievements: prev.achievements,
        exhibits: prev.exhibits,
        lastMuseumCollect: prev.lastMuseumCollect,
        fieldNotes: [
          ...prev.fieldNotes,
          {
            id: `note-${Date.now()}-pub`,
            timestamp: new Date().toISOString(),
            biomeId: 'muir-woods',
            type: 'milestone',
            text: `Published research paper #${newPubCount}. Impact Factor now ${newImpact}. A new chapter begins — old discoveries catalogued, field reset.`,
            emoji: '📜',
          },
        ],
        impactFactor: newImpact,
        publicationCount: newPubCount,
        // Keep challenge date so we don't re-roll mid-day
        lastChallengeDate: prev.lastChallengeDate,
        dailyChallenges: prev.dailyChallenges.map(c => ({ ...c, progress: 0, completed: false })),
      };
    });
  }, []);

  const placeExhibit = useCallback((biomeId: string, slotIndex: number, speciesId: string | null) => {
    setState(prev => {
      const currentHall = prev.exhibits[biomeId] || [null, null, null];
      // Before changing exhibits, collect any pending visitor credits so the user
      // doesn't lose accumulated income from existing exhibits.
      const { credits } = computeVisitorCredits(prev, id => SPECIES.find(s => s.id === id));
      const newHall = [...currentHall];
      newHall[slotIndex] = speciesId;
      // Ensure we don't duplicate a species across slots in the same hall
      if (speciesId) {
        for (let i = 0; i < newHall.length; i++) {
          if (i !== slotIndex && newHall[i] === speciesId) newHall[i] = null;
        }
      }
      return {
        ...prev,
        exhibits: { ...prev.exhibits, [biomeId]: newHall },
        bioCredits: prev.bioCredits + credits,
        lastMuseumCollect: new Date().toISOString(),
      };
    });
  }, []);

  const collectVisitors = useCallback(() => {
    setState(prev => {
      const { credits } = computeVisitorCredits(prev, id => SPECIES.find(s => s.id === id));
      if (credits <= 0) return prev;
      toast('🏛️ Visitors Collected', {
        description: `+${credits} credits from museum exhibits`,
        duration: 3500,
      });
      return {
        ...prev,
        bioCredits: prev.bioCredits + credits,
        lastMuseumCollect: new Date().toISOString(),
      };
    });
  }, []);

  const claimChallengeReward = useCallback((challengeId: string) => {
    setState(prev => {
      const challenge = prev.dailyChallenges.find(c => c.id === challengeId);
      if (!challenge || !challenge.completed) return prev;
      // Check if already claimed (progress set to -1)
      if (challenge.progress === -1) return prev;
      const xpUpdate = applyXpGain(prev, challenge.reward.xp);
      return {
        ...prev,
        ...xpUpdate,
        bioCredits: prev.bioCredits + challenge.reward.credits,
        dailyChallenges: prev.dailyChallenges.map(c =>
          c.id === challengeId ? { ...c, progress: -1 } : c
        ),
      };
    });
  }, []);

  const claimMilestone = useCallback((milestoneId: string, reward: { xp: number; credits: number; researchPoints: number; maxFuel?: number }) => {
    setState(prev => {
      if (prev.claimedMilestones.includes(milestoneId)) return prev;
      const xpUpdate = applyXpGain(prev, reward.xp);
      playAchievement();
      const fuelBonus = reward.maxFuel ?? 0;
      return {
        ...prev,
        ...xpUpdate,
        bioCredits: prev.bioCredits + reward.credits,
        researchPoints: prev.researchPoints + reward.researchPoints,
        maxExpeditionFuel: prev.maxExpeditionFuel + fuelBonus,
        expeditionFuel: prev.expeditionFuel + fuelBonus,
        claimedMilestones: [...prev.claimedMilestones, milestoneId],
      };
    });
  }, []);

  // Auto-refresh challenges on mount
  useEffect(() => {
    refreshChallenges();
  }, [refreshChallenges]);

  return {
    state,
    collectSpecimen,
    advanceLabStage,
    setCurrentLocation,
    useExpeditionFuel,
    purchaseItem,
    renamePlayer,
    setAvatar,
    resetGame,
    refreshChallenges,
    claimChallengeReward,
    claimMission,
    claimRequest,
    claimMilestone,
    unlockSkill,
    publishResearch,
    placeExhibit,
    collectVisitors,
  };
}
