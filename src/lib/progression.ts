import type { GameState, PlayerRank, Rarity } from '@/types/game';
import { RANK_THRESHOLDS, DAILY_XP_GOAL } from '@/types/game';

/** Ranks in ascending order of XP threshold. */
export const RANK_ORDER: PlayerRank[] = (Object.keys(RANK_THRESHOLDS) as PlayerRank[])
  .sort((a, b) => RANK_THRESHOLDS[a] - RANK_THRESHOLDS[b]);

export function calculateRank(xp: number): PlayerRank {
  let result: PlayerRank = RANK_ORDER[0];
  for (const rank of RANK_ORDER) {
    if (xp >= RANK_THRESHOLDS[rank]) result = rank;
  }
  return result;
}

export function rankAtLeast(rank: PlayerRank, min: PlayerRank): boolean {
  return RANK_ORDER.indexOf(rank) >= RANK_ORDER.indexOf(min);
}

export function getRarityXP(rarity: Rarity): number {
  switch (rarity) {
    case 'legendary': return 100;
    case 'ultra-rare': return 50;
    case 'rare': return 25;
    case 'uncommon': return 15;
    default: return 10;
  }
}

export function getRarityCredits(rarity: Rarity): number {
  switch (rarity) {
    case 'legendary': return 200;
    case 'ultra-rare': return 100;
    case 'rare': return 50;
    case 'uncommon': return 40;
    default: return 20;
  }
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getTodayYmd(now: Date = new Date()): string {
  return ymd(now);
}

export function getYmdNDaysAgo(n: number, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return ymd(d);
}

export type XpUpdate = Pick<
  GameState,
  'xp' | 'rank' | 'dailyXpEarned' | 'dailyXpDate' | 'dailyStreak' | 'streakDate' | 'xpHistory'
>;

// Apply an XP gain: rolls the daily counter, tracks 30-day history, and
// advances the streak the first time the daily goal is crossed today.
export function applyXpGain(prev: GameState, amount: number, now: Date = new Date()): XpUpdate {
  const today = getTodayYmd(now);
  const gain = Math.max(0, amount);
  const prevDaily = prev.dailyXpDate === today ? prev.dailyXpEarned : 0;
  const newDaily = prevDaily + gain;

  const history: Record<string, number> = { ...(prev.xpHistory || {}) };
  history[today] = (history[today] || 0) + gain;
  const cutoff = getYmdNDaysAgo(30, now);
  for (const k of Object.keys(history)) {
    if (k < cutoff) delete history[k];
  }

  const crossedGoal = prevDaily < DAILY_XP_GOAL && newDaily >= DAILY_XP_GOAL;
  let streak = prev.dailyStreak || 0;
  let streakDate = prev.streakDate || '';
  if (crossedGoal && streakDate !== today) {
    streak = streakDate === getYmdNDaysAgo(1, now) ? streak + 1 : 1;
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
