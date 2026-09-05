import { describe, it, expect } from 'vitest';
import {
  RANK_ORDER,
  calculateRank,
  rankAtLeast,
  getRarityXP,
  getRarityCredits,
  getTodayYmd,
  getYmdNDaysAgo,
  applyXpGain,
} from '@/lib/progression';
import { RANK_THRESHOLDS, DAILY_XP_GOAL } from '@/types/game';
import type { GameState } from '@/types/game';

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    xp: 0,
    rank: 'volunteer',
    dailyXpEarned: 0,
    dailyXpDate: '',
    dailyStreak: 0,
    streakDate: '',
    xpHistory: {},
    ...overrides,
  } as GameState;
}

describe('ranks', () => {
  it('orders ranks by threshold', () => {
    expect(RANK_ORDER[0]).toBe('volunteer');
    expect(RANK_ORDER[RANK_ORDER.length - 1]).toBe('legendary-naturalist');
    for (let i = 1; i < RANK_ORDER.length; i++) {
      expect(RANK_THRESHOLDS[RANK_ORDER[i]]).toBeGreaterThan(RANK_THRESHOLDS[RANK_ORDER[i - 1]]);
    }
  });
  it('calculates rank at exact thresholds and between', () => {
    expect(calculateRank(0)).toBe('volunteer');
    expect(calculateRank(99)).toBe('volunteer');
    expect(calculateRank(100)).toBe('junior-explorer');
    expect(calculateRank(50000)).toBe('legendary-naturalist');
    expect(calculateRank(999999)).toBe('legendary-naturalist');
  });
  it('rankAtLeast compares by order', () => {
    expect(rankAtLeast('chief-scientist', 'junior-explorer')).toBe(true);
    expect(rankAtLeast('volunteer', 'junior-explorer')).toBe(false);
    expect(rankAtLeast('lab-director', 'lab-director')).toBe(true);
  });
});

describe('rarity rewards', () => {
  it('scales XP and credits by rarity', () => {
    expect(getRarityXP('common')).toBe(10);
    expect(getRarityXP('legendary')).toBe(100);
    expect(getRarityCredits('common')).toBe(20);
    expect(getRarityCredits('legendary')).toBe(200);
  });
});

describe('dates', () => {
  it('formats local YYYY-MM-DD and subtracts days', () => {
    const now = new Date(2026, 8, 4, 12); // 4 Sep 2026 local
    expect(getTodayYmd(now)).toBe('2026-09-04');
    expect(getYmdNDaysAgo(1, now)).toBe('2026-09-03');
    expect(getYmdNDaysAgo(4, now)).toBe('2026-08-31');
  });
});

describe('applyXpGain', () => {
  const now = new Date(2026, 8, 4, 12);
  it('adds xp, updates rank, and records today', () => {
    const r = applyXpGain(baseState(), 120, now);
    expect(r.xp).toBe(120);
    expect(r.rank).toBe('junior-explorer');
    expect(r.dailyXpEarned).toBe(120);
    expect(r.dailyXpDate).toBe('2026-09-04');
    expect(r.xpHistory['2026-09-04']).toBe(120);
  });
  it('resets the daily counter on a new day', () => {
    const prev = baseState({ dailyXpEarned: 80, dailyXpDate: '2026-09-03' });
    const r = applyXpGain(prev, 10, now);
    expect(r.dailyXpEarned).toBe(10);
  });
  it('starts a streak the first time the goal is crossed today', () => {
    const prev = baseState({ dailyXpEarned: DAILY_XP_GOAL - 1, dailyXpDate: '2026-09-04' });
    const r = applyXpGain(prev, 1, now);
    expect(r.dailyStreak).toBe(1);
    expect(r.streakDate).toBe('2026-09-04');
  });
  it('extends a streak from yesterday and resets one from earlier', () => {
    const cont = baseState({ dailyStreak: 3, streakDate: '2026-09-03' });
    expect(applyXpGain(cont, DAILY_XP_GOAL, now).dailyStreak).toBe(4);
    const stale = baseState({ dailyStreak: 3, streakDate: '2026-09-01' });
    expect(applyXpGain(stale, DAILY_XP_GOAL, now).dailyStreak).toBe(1);
  });
  it('does not increment the streak twice in one day', () => {
    const prev = baseState({ dailyStreak: 2, streakDate: '2026-09-04', dailyXpEarned: DAILY_XP_GOAL + 5, dailyXpDate: '2026-09-04' });
    expect(applyXpGain(prev, 50, now).dailyStreak).toBe(2);
  });
  it('trims xp history older than 30 days', () => {
    const prev = baseState({ xpHistory: { '2026-07-01': 5, '2026-08-20': 7 } });
    const r = applyXpGain(prev, 1, now);
    expect(r.xpHistory['2026-07-01']).toBeUndefined();
    expect(r.xpHistory['2026-08-20']).toBe(7);
  });
  it('never subtracts from daily counters on negative amounts', () => {
    const r = applyXpGain(baseState({ xp: 50 }), -10, now);
    expect(r.dailyXpEarned).toBe(0);
    expect(r.xp).toBe(40);
  });
});
