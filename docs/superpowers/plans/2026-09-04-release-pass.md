# Public-Release Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Cal Field Lab safe to open publicly: consistent game data, real event bonuses, a hunt hook that fires for every player, honest docs, no dead dependencies, and tests + lint + CI guarding all of it.

**Architecture:** Pure game logic is lifted out of the 1,000-line `useGameState` hook and the `Expedition` page into small modules under `src/lib/` (`progression`, `save`, `spawn`, `events`, `handle`) so it can be unit-tested with Vitest in a plain Node environment. Data invariants are enforced by a test that imports the real data modules. The hook and pages keep their shape; they just call the new modules.

**Tech Stack:** React 18, TypeScript 5.9 (strict), Vite 6, Vitest 3, ESLint 9 flat config, npm, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-04-release-pass-design.md`

## Global Constraints

- npm is the canonical package manager; `bun.lock` and the `packageManager` field are removed; `package-lock.json` is committed.
- Collection-point pools are the source of truth for where a species lives.
- `@supabase/supabase-js` stays (peer dependency of `@biokea/leaderboard`).
- `src/components/BiokeaLeaderboardPrompt.tsx` is shared verbatim across six games: do not edit it.
- Hunt redirect URL everywhere is `https://games.biokea.ai/`.
- The `gameTitle` prop passed to the shared prompt stays `"Biodiversity Discovery Lab"`.
- Every commit message ends with:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01WWbWwdD8xW71vtULysPKhv
  ```
- Work happens on branch `release-pass`.
- Run commands from the repo root. `npx tsc -b` must stay clean after every task.

---

### Task 1: Vitest wiring with a first real test

**Files:**
- Modify: `package.json` (scripts, devDependencies)
- Modify: `vite.config.ts`
- Create: `src/lib/barcode.test.ts`

**Interfaces:**
- Produces: `npm test` runs `vitest run`; Vitest resolves the `@/` alias via `vite.config.ts`.

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest@^3.2.0 jsdom@^26.0.0
```

- [ ] **Step 2: Add scripts to package.json**

Replace the `"scripts"` block with:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -b",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 3: Point vite.config.ts at vitest/config**

Replace the whole file with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

(The stale `/opt/baku-templates` comment and `cacheDir` override are dropped here on purpose.)

- [ ] **Step 4: Write the first test**

Create `src/lib/barcode.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { speciesBarcode, gapIndices, scoreBarcode, barcodeBonusMultiplier } from '@/lib/barcode';

describe('speciesBarcode', () => {
  it('is deterministic for the same species id', () => {
    expect(speciesBarcode('tule-elk')).toEqual(speciesBarcode('tule-elk'));
  });
  it('returns the requested length of A/T/C/G bases', () => {
    const b = speciesBarcode('tule-elk', 12);
    expect(b).toHaveLength(12);
    for (const base of b) expect(['A', 'T', 'C', 'G']).toContain(base);
  });
  it('differs between species', () => {
    expect(speciesBarcode('tule-elk')).not.toEqual(speciesBarcode('island-fox'));
  });
});

describe('gapIndices', () => {
  it('returns the requested number of sorted unique indices within range', () => {
    const gaps = gapIndices('tule-elk', 8, 6);
    expect(gaps).toHaveLength(6);
    expect([...gaps].sort((a, b) => a - b)).toEqual(gaps);
    expect(new Set(gaps).size).toBe(6);
    for (const g of gaps) expect(g).toBeGreaterThanOrEqual(0), expect(g).toBeLessThan(8);
  });
  it('never asks for more gaps than positions', () => {
    expect(gapIndices('x', 4, 10)).toHaveLength(4);
  });
});

describe('scoreBarcode', () => {
  it('counts only gap positions', () => {
    const answer = ['A', 'T', 'C', 'G'] as const;
    const guess = ['A', 'A', 'C', null] as const;
    const r = scoreBarcode([...answer], [...guess], [0, 1, 3]);
    expect(r).toEqual({ correct: 1, total: 3, accuracy: 1 / 3 });
  });
});

describe('barcodeBonusMultiplier', () => {
  it('maps accuracy bands to bonus tiers', () => {
    expect(barcodeBonusMultiplier(1)).toBe(0.5);
    expect(barcodeBonusMultiplier(5 / 6)).toBe(0.3);
    expect(barcodeBonusMultiplier(4 / 6)).toBe(0.15);
    expect(barcodeBonusMultiplier(3 / 6)).toBe(0);
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: 1 file, 8 tests passing.

- [ ] **Step 6: Confirm typecheck still passes**

Run: `npx tsc -b`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/lib/barcode.test.ts
git commit -m "test: wire up Vitest with barcode tests"
```

---

### Task 2: Extract progression logic (`src/lib/progression.ts`)

**Files:**
- Create: `src/lib/progression.ts`
- Create: `src/lib/progression.test.ts`
- Modify: `src/hooks/useGameState.ts` (remove `getTodayYmd`, `getYmdNDaysAgo`, `applyXpGain`, `calculateRank`, `getRarityXP`, `getRarityCredits`; import them)

**Interfaces:**
- Produces:
  - `RANK_ORDER: PlayerRank[]` (ascending by threshold)
  - `calculateRank(xp: number): PlayerRank`
  - `rankAtLeast(rank: PlayerRank, min: PlayerRank): boolean`
  - `getRarityXP(rarity: Rarity): number`, `getRarityCredits(rarity: Rarity): number`
  - `getTodayYmd(now?: Date): string`, `getYmdNDaysAgo(n: number, now?: Date): string`
  - `applyXpGain(prev: GameState, amount: number, now?: Date): XpUpdate`

- [ ] **Step 1: Write the failing test**

Create `src/lib/progression.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- progression`
Expected: FAIL, cannot resolve `@/lib/progression`.

- [ ] **Step 3: Create the module**

Create `src/lib/progression.ts`:

```ts
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
```

- [ ] **Step 4: Run the test**

Run: `npm test -- progression`
Expected: PASS (13 tests).

- [ ] **Step 5: Use the module from the hook**

In `src/hooks/useGameState.ts`:

1. Delete these local definitions: `getTodayYmd`, `getYmdNDaysAgo`, `applyXpGain`, `calculateRank`, `getRarityXP`, `getRarityCredits`.
2. Delete the now-unused import `RANK_THRESHOLDS, DAILY_XP_GOAL` from `@/types/game` (keep the type import line).
3. Add:

```ts
import { applyXpGain, getRarityXP, getRarityCredits, getTodayYmd } from '@/lib/progression';
```

`getTodayYmd` is still used by `createInitialState`/`migrateLoadedState` in this file until Task 3 moves them.

- [ ] **Step 6: Add tests for the two existing pure modules**

Create `src/lib/buffs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeBuffs } from '@/lib/buffs';
import type { GameState } from '@/types/game';

const st = (unlockedSkills: string[], impactFactor = 0) =>
  ({ unlockedSkills, impactFactor } as unknown as GameState);

describe('computeBuffs', () => {
  it('is neutral with no skills and no impact', () => {
    const b = computeBuffs(st([]));
    expect(b.xpMultiplier).toBe(1);
    expect(b.creditMultiplier).toBe(1);
    expect(b.staminaRegenMultiplier).toBe(1);
    expect(b.maxStaminaBonus).toBe(0);
    expect(b.reagentSaveChance).toBe(0);
    expect(b.fuelRefundChance).toBe(0);
    expect(b.collectStaminaCost).toBe(5);
  });
  it('stacks biology XP and impact factor multiplicatively', () => {
    const b = computeBuffs(st(['biology-1', 'biology-2'], 2));
    expect(b.xpMultiplier).toBeCloseTo(1.2 * 1.2);
    expect(b.creditMultiplier).toBeCloseTo(1.2);
  });
  it('lab tier 4 overrides tier 3 reagent save; field skills apply', () => {
    const b = computeBuffs(st(['lab-3', 'lab-4', 'field-1', 'field-2', 'field-3', 'field-4']));
    expect(b.reagentSaveChance).toBe(0.35);
    expect(b.staminaRegenMultiplier).toBe(1.5);
    expect(b.fuelRefundChance).toBe(0.3);
    expect(b.maxStaminaBonus).toBe(25);
    expect(b.collectStaminaCost).toBe(3);
  });
});
```

Create `src/lib/ecosystem.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  getHealthDamage,
  getHealthStatus,
  getHealthMultiplier,
  getBiomeHealth,
  computeVisitorCredits,
  MUSEUM_ACCUMULATION_CAP_HOURS,
} from '@/lib/ecosystem';
import type { GameState } from '@/types/game';

describe('health', () => {
  it('bands map to statuses and multipliers', () => {
    expect(getHealthStatus(100)).toBe('thriving');
    expect(getHealthStatus(70)).toBe('thriving');
    expect(getHealthStatus(69)).toBe('stressed');
    expect(getHealthStatus(39)).toBe('degraded');
    expect(getHealthStatus(19)).toBe('critical');
    expect(getHealthMultiplier(19)).toBe(0.3);
  });
  it('damage scales with rarity', () => {
    expect(getHealthDamage('common')).toBe(2);
    expect(getHealthDamage('legendary')).toBe(15);
  });
  it('unknown biome health defaults to 100', () => {
    expect(getBiomeHealth({ biomeHealth: {} } as unknown as GameState, 'nope')).toBe(100);
  });
});

describe('computeVisitorCredits', () => {
  const lookup = (id: string) => (id === 'leg' ? { rarity: 'legendary' as const } : id === 'com' ? { rarity: 'common' as const } : undefined);
  it('sums per-hour rates across halls and caps accumulation', () => {
    const longAgo = new Date(Date.now() - 48 * 3600000).toISOString();
    const state = { lastMuseumCollect: longAgo, exhibits: { a: ['leg', null, 'com'], b: ['ghost', null, null] } } as unknown as GameState;
    const r = computeVisitorCredits(state, lookup);
    expect(r.ratePerHour).toBe(123);
    expect(r.hours).toBe(MUSEUM_ACCUMULATION_CAP_HOURS);
    expect(r.credits).toBe(123 * MUSEUM_ACCUMULATION_CAP_HOURS);
  });
  it('yields nothing with empty halls', () => {
    const state = { lastMuseumCollect: new Date().toISOString(), exhibits: {} } as unknown as GameState;
    expect(computeVisitorCredits(state, lookup).credits).toBe(0);
  });
});
```

- [ ] **Step 7: Typecheck and test**

Run: `npx tsc -b && npm test`
Expected: clean; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/progression.ts src/lib/progression.test.ts src/lib/buffs.test.ts src/lib/ecosystem.test.ts src/hooks/useGameState.ts
git commit -m "refactor: extract progression logic; add buffs and ecosystem tests"
```

---

### Task 3: Extract save logic and cap field notes (`src/lib/save.ts`)

**Files:**
- Create: `src/lib/save.ts`
- Create: `src/lib/save.test.ts`
- Modify: `src/hooks/useGameState.ts`

**Interfaces:**
- Produces:
  - `FIELD_NOTE_CAP = 300`
  - `appendNote(notes: FieldNote[], note: FieldNote): FieldNote[]`
  - `createInitialState(name?: string, avatar?: string, now?: Date): GameState`
  - `migrateLoadedState(parsed: Partial<GameState> & Record<string, unknown>): GameState`
  - `STARTING_BIOME_IDS: readonly string[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/save.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { FIELD_NOTE_CAP, appendNote, createInitialState, migrateLoadedState, STARTING_BIOME_IDS } from '@/lib/save';
import { BIOMES } from '@/data/biomes';
import type { FieldNote, GameState } from '@/types/game';

function note(i: number): FieldNote {
  return { id: `n${i}`, timestamp: '2026-09-04T00:00:00Z', biomeId: 'muir-woods', type: 'collection', text: `note ${i}` };
}

describe('appendNote', () => {
  it('appends below the cap', () => {
    expect(appendNote([note(1)], note(2)).map(n => n.id)).toEqual(['n1', 'n2']);
  });
  it('drops the oldest once the cap is reached', () => {
    const full = Array.from({ length: FIELD_NOTE_CAP }, (_, i) => note(i));
    const next = appendNote(full, note(999));
    expect(next).toHaveLength(FIELD_NOTE_CAP);
    expect(next[0].id).toBe('n1');
    expect(next[next.length - 1].id).toBe('n999');
  });
});

describe('createInitialState', () => {
  it('starts with the two Marin biomes, full health, and empty exhibits for every biome', () => {
    const s = createInitialState('Maren', '🦉');
    expect(s.playerName).toBe('Maren');
    expect(s.avatar).toBe('🦉');
    expect(s.unlockedBiomes).toEqual([...STARTING_BIOME_IDS]);
    for (const b of BIOMES) {
      expect(s.biomeHealth[b.id]).toBe(100);
      expect(s.exhibits[b.id]).toEqual([null, null, null]);
    }
    expect(s.devMode).toBeUndefined();
  });
});

describe('migrateLoadedState', () => {
  it('fills every field missing from a minimal legacy save', () => {
    const legacy = { playerName: 'Old', xp: 250, rank: 'junior-explorer', specimens: [], discoveredSpecies: [] };
    const s = migrateLoadedState(legacy as Partial<GameState> & Record<string, unknown>);
    const fresh = createInitialState();
    for (const key of Object.keys(fresh) as (keyof GameState)[]) {
      expect(s[key], `missing ${key}`).toBeDefined();
    }
    expect(s.playerName).toBe('Old');
    expect(s.xp).toBe(250);
    expect(s.exhibits[BIOMES[0].id]).toEqual([null, null, null]);
  });
  it('pads short exhibit halls and adds missing biomes', () => {
    const s = migrateLoadedState({ exhibits: { 'muir-woods': ['tule-elk'] } } as Partial<GameState> & Record<string, unknown>);
    expect(s.exhibits['muir-woods']).toEqual(['tule-elk', null, null]);
    expect(s.exhibits['santa-rosa-island']).toEqual([null, null, null]);
  });
  it('trims an oversized field-note log to the cap', () => {
    const notes = Array.from({ length: FIELD_NOTE_CAP + 50 }, (_, i) => note(i));
    const s = migrateLoadedState({ fieldNotes: notes } as Partial<GameState> & Record<string, unknown>);
    expect(s.fieldNotes).toHaveLength(FIELD_NOTE_CAP);
    expect(s.fieldNotes[0].id).toBe('n50');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- save`
Expected: FAIL, cannot resolve `@/lib/save`.

- [ ] **Step 3: Create the module**

Create `src/lib/save.ts` by moving `createInitialState` and `migrateLoadedState` out of the hook, plus the new helpers:

```ts
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
```

- [ ] **Step 4: Run the test**

Run: `npm test -- save`
Expected: PASS (6 tests).

- [ ] **Step 5: Use the module from the hook**

In `src/hooks/useGameState.ts`:

1. Delete the local `createInitialState` and `migrateLoadedState` functions.
2. Delete the `ALL_BIOME_IDS` and `ALL_SKILL_IDS` constants.
3. Replace the imports so the top of the file reads:

```ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { GameState, CollectedSpecimen, SamplingMethod, PlayerRank, DailyChallenge, FieldNote, Achievement } from '@/types/game';
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
import { applyXpGain, getRarityXP, getRarityCredits } from '@/lib/progression';
import { createInitialState, migrateLoadedState, appendNote } from '@/lib/save';
```

4. In `createDevState`, replace `unlockedBiomes: ALL_BIOME_IDS` with `unlockedBiomes: BIOMES.map(b => b.id)` and `unlockedSkills: ALL_SKILL_IDS` with `unlockedSkills: SKILLS.map(s => s.id)`.
5. Replace each of the four places a note is appended:
   - `collectSpecimen`: `fieldNotes: [...prev.fieldNotes, note],` → `fieldNotes: appendNote(prev.fieldNotes, note),`
   - `advanceLabStage`: replace
     ```ts
     const newNotes = [...prev.fieldNotes];
     if (nextStatus === 'identified' && species) {
       newNotes.push({
     ```
     with
     ```ts
     let newNotes = prev.fieldNotes;
     if (nextStatus === 'identified' && species) {
       newNotes = appendNote(newNotes, {
     ```
     (the object literal and closing `});` stay the same).
   - `useExpeditionFuel`: same pattern — `let newNotes = prev.fieldNotes;` and `newNotes = appendNote(newNotes, { ... });`
   - `publishResearch`: `fieldNotes: [ ...prev.fieldNotes, { ... } ],` → `fieldNotes: appendNote(prev.fieldNotes, { ... }),`

- [ ] **Step 6: Typecheck and test**

Run: `npx tsc -b && npm test`
Expected: clean; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/save.ts src/lib/save.test.ts src/hooks/useGameState.ts
git commit -m "refactor: extract save logic; cap field notes at 300"
```

---

### Task 4: Data consistency guard and the data fixes

**Files:**
- Create: `src/data/consistency.test.ts`
- Modify: `src/data/biomes.ts` (point edits, remove `totalSpecies`, add `getBiomeSpeciesCount`)
- Modify: `src/data/species.ts` (six `biomeIds` additions)
- Modify: `src/types/game.ts` (remove `totalSpecies` from `Biome`)
- Modify: `src/components/CaliforniaHero.tsx`, `src/pages/HQ.tsx`, `src/pages/Expedition.tsx` (three display sites)

**Interfaces:**
- Produces: `getBiomeSpeciesCount(biomeId: string): number` in `src/data/biomes.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/data/consistency.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BIOMES, getBiomeSpeciesCount } from '@/data/biomes';
import { SPECIES } from '@/data/species';
import { SHOP_ITEMS } from '@/data/shop';
import { STARTING_BIOME_IDS } from '@/lib/save';
import type { CollectionPoint, Species } from '@/types/game';

const speciesById = new Map(SPECIES.map(s => [s.id, s]));
const allPoints: { biomeId: string; point: CollectionPoint }[] = BIOMES.flatMap(b =>
  b.collectionPoints.map(point => ({ biomeId: b.id, point })),
);

function biomesPooling(speciesId: string): string[] {
  const ids = new Set<string>();
  for (const { biomeId, point } of allPoints) {
    if (point.speciesPool.includes(speciesId)) ids.add(biomeId);
  }
  return [...ids].sort();
}

function dupes(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.filter(id => (seen.has(id) ? true : (seen.add(id), false)));
}

describe('ids are unique', () => {
  it('species', () => expect(dupes(SPECIES.map(s => s.id))).toEqual([]));
  it('biomes', () => expect(dupes(BIOMES.map(b => b.id))).toEqual([]));
  it('collection points', () => expect(dupes(allPoints.map(p => p.point.id))).toEqual([]));
});

describe('every pool entry is a real species', () => {
  for (const { point } of allPoints) {
    it(point.id, () => {
      for (const id of point.speciesPool) expect(speciesById.has(id), `unknown species ${id}`).toBe(true);
    });
  }
});

describe('species.biomeIds matches where the species is pooled', () => {
  for (const s of SPECIES) {
    it(s.id, () => {
      expect([...s.biomeIds].sort()).toEqual(biomesPooling(s.id));
      expect(s.biomeIds.length, 'species must be pooled somewhere').toBeGreaterThan(0);
    });
  }
});

describe('every pooled species is collectable at that point', () => {
  for (const { point } of allPoints) {
    it(point.id, () => {
      expect(point.availableMethods.length).toBeGreaterThan(0);
      for (const id of point.speciesPool) {
        const s = speciesById.get(id) as Species;
        const usable = s.samplingMethods.filter(m => point.availableMethods.includes(m));
        expect(usable.length, `${id} needs [${s.samplingMethods}] but ${point.id} offers [${point.availableMethods}]`).toBeGreaterThan(0);
        if (s.exclusiveMethod) {
          expect(point.availableMethods, `${id} exclusive ${s.exclusiveMethod} not offered at ${point.id}`).toContain(s.exclusiveMethod);
        }
      }
    });
  }
});

describe('biomes', () => {
  for (const b of BIOMES) {
    it(`${b.id} has points and its signature species lives there`, () => {
      expect(b.collectionPoints.length).toBeGreaterThan(0);
      const sig = speciesById.get(b.signatureSpeciesId);
      expect(sig, `unknown signature species ${b.signatureSpeciesId}`).toBeDefined();
      expect(sig!.biomeIds).toContain(b.id);
    });
    it(`${b.id} species count is derived from biomeIds`, () => {
      expect(getBiomeSpeciesCount(b.id)).toBe(SPECIES.filter(s => s.biomeIds.includes(b.id)).length);
    });
  }
});

describe('shop unlocks', () => {
  const unlockKeys = SHOP_ITEMS.filter(i => i.effect.type === 'unlock-biome').map(i => i.effect.key as string);
  it('reference real biomes', () => {
    for (const key of unlockKeys) expect(BIOMES.some(b => b.id === key), `unknown biome ${key}`).toBe(true);
  });
  it('cover every non-starting biome exactly once', () => {
    const expected = BIOMES.map(b => b.id).filter(id => !(STARTING_BIOME_IDS as readonly string[]).includes(id)).sort();
    expect([...unlockKeys].sort()).toEqual(expected);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- consistency`
Expected: FAIL. `getBiomeSpeciesCount` does not exist; after adding it, expect failures in exactly these tests: 10 `biomeIds` mismatches, 10 collectability failures (reyes-meadow ×4, tomales-seal-haul, sinkyone-bluffs, piute-spring ×2, torrey-pines-grove, stinson-beach point), and the `point-reyes` signature-species test (tule elk is currently uncollectable at its only point).

- [ ] **Step 3: Add the helper and remove `totalSpecies`**

In `src/types/game.ts`, delete the line `totalSpecies: number;` from `interface Biome`.

In `src/data/biomes.ts`:

1. Add `import { SPECIES } from '@/data/species';` at the top (check `species.ts` imports only types from `@/types/game`, which it does, so there is no cycle).
2. Delete every `totalSpecies: <n>,` line (18 of them):
   ```bash
   sed -i '' '/^    totalSpecies: [0-9]*,$/d' src/data/biomes.ts
   ```
3. Append after `getBiomeById`:

```ts
/** Number of species whose biomeIds include this biome. */
export function getBiomeSpeciesCount(biomeId: string): number {
  return SPECIES.filter(s => s.biomeIds.includes(biomeId)).length;
}
```

- [ ] **Step 4: Fix the collection points**

In `src/data/biomes.ts`, make these edits (search by point `id:`):

| Point | Change |
|---|---|
| `stinson-beach` (the shore point inside the Stinson Beach biome) | `speciesPool: ['pacific-mole-crab', 'california-poppy', 'surf-diatom']` → `speciesPool: ['pacific-mole-crab', 'california-poppy']` |
| `muir-creek` | remove `'surf-diatom'` from `speciesPool` (a marine diatom in a redwood creek; it stays at Stinson tidepools) |
| `reyes-meadow` | `availableMethods: ['hand-net', 'scoop', 'car-trap']` → `['hand-net', 'scoop', 'car-trap', 'vial']`; append `'little-brown-bat'` to `speciesPool` |
| `tomales-seal-haul` | `availableMethods: ['vial', 'hand-net']` → `['vial', 'hand-net', 'plankton-net']` |
| `sinkyone-bluffs` | `availableMethods: ['hand-net', 'vial']` → `['hand-net', 'vial', 'scoop']` |
| `piute-spring` | `availableMethods: ['vial', 'plankton-net']` → `['vial', 'plankton-net', 'hand-net']` |
| `torrey-pines-grove` | `availableMethods: ['vial', 'scoop']` → `['vial', 'scoop', 'hand-net']` |
| `mojave-preserve` (the dunes point inside the Mojave Preserve biome) | append `'great-basin-kangaroo-rat', 'creosote-bush'` to `speciesPool` |

- [ ] **Step 5: Fix the species listings**

In `src/data/species.ts`, add a biome id to `biomeIds` for six species:

| Species id | `biomeIds` becomes |
|---|---|
| `pacific-banana-slug` | `['muir-woods', 'humboldt-redwoods']` |
| `california-newt` | `['muir-woods', 'humboldt-redwoods']` |
| `ochre-sea-star` | `['stinson-beach', 'lost-coast']` |
| `california-poppy` | `['stinson-beach', 'muir-woods', 'point-reyes']` |
| `giant-green-anemone` | `['point-reyes', 'lost-coast']` |
| `brown-pelican` | `['tomales-bay', 'anacapa-kelp-forest']` |

(`surf-diatom`, `little-brown-bat`, `great-basin-kangaroo-rat`, and `creosote-bush` are fixed by the pool edits above and need no listing change.)

- [ ] **Step 6: Update the three display sites**

`src/components/CaliforniaHero.tsx` (around line 404): `${discovered}/${biome.totalSpecies} species` → `${discovered}/${getBiomeSpeciesCount(biome.id)} species`. Add `getBiomeSpeciesCount` to the existing import from `@/data/biomes` (add the import if the file has none).

`src/pages/HQ.tsx` (around lines 590 and 605): replace both `biome.totalSpecies` with a local `const total = getBiomeSpeciesCount(biome.id);` declared right after the `discovered` computation, then `const biomePct = total > 0 ? discovered / total : 0;` and `{discovered}/{total}`. Add `getBiomeSpeciesCount` to the import from `@/data/biomes`.

`src/pages/Expedition.tsx` (around line 404): `${discovered}/${biome.totalSpecies}` → `${discovered}/${biomeSpecies.length}` (`biomeSpecies` is already computed two lines above from `biomeIds`).

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npx tsc -b && npm test`
Expected: typecheck clean (any leftover `totalSpecies` reference shows up here); consistency test fully green.

- [ ] **Step 8: Commit**

```bash
git add src/data src/types/game.ts src/components/CaliforniaHero.tsx src/pages/HQ.tsx src/pages/Expedition.tsx
git commit -m "fix(data): make species, biomes, and collection points consistent; guard with a test"
```

---

### Task 5: Stale rank logic and achievement copy

**Files:**
- Modify: `src/hooks/useGameState.ts` (rank-up toast)
- Modify: `src/data/achievements.ts`
- Create: `src/data/achievements.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/data/achievements.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS } from '@/data/achievements';

const base = {
  totalCollected: 0,
  totalIdentified: 0,
  discoveredSpecies: 0,
  expeditionsCompleted: 0,
  rank: 'volunteer' as const,
  unlockedBiomes: 0,
  legendaryFound: false,
  ultraRareFound: false,
};

function check(id: string, stats: Partial<typeof base>) {
  const def = ACHIEVEMENTS.find(a => a.id === id)!;
  return def.check({ ...base, ...stats });
}

describe('rank achievements', () => {
  it('unlock at and above the named rank, including the top ranks', () => {
    expect(check('junior-explorer', { rank: 'volunteer' })).toBe(false);
    expect(check('junior-explorer', { rank: 'junior-explorer' })).toBe(true);
    expect(check('junior-explorer', { rank: 'legendary-naturalist' })).toBe(true);
    expect(check('field-researcher', { rank: 'junior-explorer' })).toBe(false);
    expect(check('field-researcher', { rank: 'chief-scientist' })).toBe(true);
  });
});

describe('biome achievements', () => {
  it('Marin Master describes its real threshold', () => {
    const def = ACHIEVEMENTS.find(a => a.id === 'all-biomes')!;
    expect(def.description).toBe('Unlock 5 biomes');
    expect(check('all-biomes', { unlockedBiomes: 5 })).toBe(true);
    expect(check('all-biomes', { unlockedBiomes: 4 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- achievements`
Expected: FAIL on the `legendary-naturalist` / `chief-scientist` assertions and the description.

- [ ] **Step 3: Fix achievements.ts**

Replace the top of `src/data/achievements.ts` (the interface) with:

```ts
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
```

Then change the two rank checks and the biome description:

```ts
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
```

```ts
  {
    id: 'all-biomes',
    title: 'Marin Master',
    description: 'Unlock 5 biomes',
    emoji: '🌍',
    check: (s) => s.unlockedBiomes >= 5,
  },
```

- [ ] **Step 4: Fix the rank-up toast in the hook**

In `src/hooks/useGameState.ts`, add `RANK_ORDER` (from progression) and `RANK_LABELS` (from types) to the imports:

```ts
import { applyXpGain, getRarityXP, getRarityCredits, RANK_ORDER } from '@/lib/progression';
import { RANK_LABELS } from '@/types/game';
```

and replace the rank toast effect body with:

```ts
  useEffect(() => {
    if (state.rank !== prevRank.current) {
      if (RANK_ORDER.indexOf(state.rank) > RANK_ORDER.indexOf(prevRank.current)) {
        playAchievement();
        toast('⭐ Rank Promotion', {
          description: `Promoted to ${RANK_LABELS[state.rank]}`,
          duration: 5000,
        });
      }
      prevRank.current = state.rank;
    }
  }, [state.rank]);
```

Remove the now-unused `PlayerRank` type import only if TypeScript reports it unused (it is still used by `checkAchievements`'s stats type via `state.rank`; leave it unless `tsc` complains).

- [ ] **Step 5: Typecheck and test**

Run: `npx tsc -b && npm test`
Expected: clean; all green.

- [ ] **Step 6: Commit**

```bash
git add src/data/achievements.ts src/data/achievements.test.ts src/hooks/useGameState.ts
git commit -m "fix: rank toasts and rank achievements cover every rank; honest Marin Master copy"
```

---

### Task 6: Seasonal event bonuses (`src/lib/events.ts`)

**Files:**
- Modify: `src/data/events.ts` (add `EventBonus` type, `bonus` on every event)
- Create: `src/lib/events.ts`
- Create: `src/lib/events.test.ts`

**Interfaces:**
- Produces:
  - `EventBonus` type and `SeasonalEvent.bonus: EventBonus` (in `src/data/events.ts`)
  - `eventCoversBiome(event: SeasonalEvent, biomeId: string): boolean`
  - `eventAppliesTo(event: SeasonalEvent, species: Species, biomeId: string): boolean`
  - `getEventSpawnModifier(event: SeasonalEvent | null, species: Species, biomeId: string): number`
  - `getEventXpMultiplier(event: SeasonalEvent | null, species: Species, biomeId: string): number`
  - `getActiveEventForBiome(biomeId: string, now?: Date): SeasonalEvent | null`

- [ ] **Step 1: Write the failing test**

Create `src/lib/events.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  eventCoversBiome,
  eventAppliesTo,
  getEventSpawnModifier,
  getEventXpMultiplier,
  getActiveEventForBiome,
} from '@/lib/events';
import { ALL_EVENTS, type SeasonalEvent } from '@/data/events';
import { SPECIES } from '@/data/species';
import { BIOMES } from '@/data/biomes';
import type { Species } from '@/types/game';

const byId = (id: string) => SPECIES.find(s => s.id === id) as Species;
const ev = (id: string) => ALL_EVENTS.find(e => e.id === id) as SeasonalEvent;

describe('event scopes', () => {
  it('biome scope covers only that biome', () => {
    const e = ev('redwood-bloom'); // featured muir-woods
    expect(eventCoversBiome(e, 'muir-woods')).toBe(true);
    expect(eventCoversBiome(e, 'stinson-beach')).toBe(false);
  });
  it('region scope covers every biome in the region', () => {
    const e = ev('tortoise-emergence'); // reptiles across mojave
    expect(eventCoversBiome(e, 'joshua-tree')).toBe(true);
    expect(eventCoversBiome(e, 'death-valley')).toBe(true);
    expect(eventCoversBiome(e, 'muir-woods')).toBe(false);
  });
});

function fake(over: Partial<Species>): Species {
  return {
    id: 'fake', commonName: 'Fake', scientificName: 'F f', family: '', order: '', taxonomicGroup: 'insects',
    rarity: 'common', biomeIds: [], samplingMethods: ['vial'], description: '', funFact: '',
    conservationStatus: '', barcodeGene: 'COI', barcodeLength: 658, emoji: '🐛', ...over,
  };
}

describe('event filters', () => {
  it('featured-biome bonus applies to rare+ only', () => {
    const e = ev('redwood-bloom');
    expect(getEventSpawnModifier(e, fake({ rarity: 'rare' }), 'muir-woods')).toBe(1.25);
    expect(getEventSpawnModifier(e, fake({ rarity: 'legendary' }), 'muir-woods')).toBe(1.25);
    expect(getEventSpawnModifier(e, fake({ rarity: 'common' }), 'muir-woods')).toBe(1);
  });
  it('taxon filter', () => {
    const e = ev('tortoise-emergence');
    expect(eventAppliesTo(e, fake({ taxonomicGroup: 'reptiles' }), 'mojave-preserve')).toBe(true);
    expect(eventAppliesTo(e, fake({ taxonomicGroup: 'plants' }), 'mojave-preserve')).toBe(false);
    expect(eventAppliesTo(e, byId('desert-tortoise'), 'mojave-preserve')).toBe(true);
  });
  it('night-only filter uses the species active time', () => {
    const e = ev('nocturnal-survey');
    expect(getEventSpawnModifier(e, fake({ activeAt: 'night' }), 'joshua-tree')).toBe(2);
    expect(getEventSpawnModifier(e, fake({ activeAt: 'both' }), 'joshua-tree')).toBe(1);
    expect(getEventSpawnModifier(e, fake({}), 'joshua-tree')).toBe(1);
  });
  it('xp bonuses do not touch spawn weights and vice versa', () => {
    const xpEv = ev('lost-coast-bioblitz');
    expect(getEventXpMultiplier(xpEv, fake({}), 'lost-coast')).toBe(2);
    expect(getEventSpawnModifier(xpEv, fake({}), 'lost-coast')).toBe(1);
    expect(getEventXpMultiplier(xpEv, fake({}), 'muir-woods')).toBe(1);
    const spawnEv = ev('redwood-bloom');
    expect(getEventXpMultiplier(spawnEv, fake({ rarity: 'rare' }), 'muir-woods')).toBe(1);
  });
  it('null event is neutral', () => {
    expect(getEventSpawnModifier(null, byId('tule-elk'), 'point-reyes')).toBe(1);
    expect(getEventXpMultiplier(null, byId('tule-elk'), 'point-reyes')).toBe(1);
  });
});

describe('data', () => {
  it('every event has a bonus with a multiplier above 1 and a scope inside its own region', () => {
    for (const e of ALL_EVENTS) {
      expect(e.bonus.multiplier, e.id).toBeGreaterThan(1);
      if ('biomeId' in e.bonus.scope) {
        const biome = BIOMES.find(b => b.id === e.bonus.scope.biomeId);
        expect(biome, `${e.id} unknown biome`).toBeDefined();
        expect(biome!.regionId, e.id).toBe(e.regionId);
      } else if ('regionId' in e.bonus.scope) {
        expect(e.bonus.scope.regionId, e.id).toBe(e.regionId);
      }
    }
  });
  it('getActiveEventForBiome returns an event from the biome region', () => {
    const e = getActiveEventForBiome('death-valley', new Date(2026, 8, 4));
    expect(e?.regionId).toBe('mojave-desert');
    expect(getActiveEventForBiome('nope')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- events`
Expected: FAIL, cannot resolve `@/lib/events` (and `ALL_EVENTS` is not exported yet).

- [ ] **Step 3: Add the bonus type and data**

In `src/data/events.ts`:

1. Change the first import and interface to:

```ts
import type { RegionId, Rarity, TaxonomicGroup } from '@/types/game';

export type EventScope = { biomeId: string } | { regionId: RegionId } | { all: true };

export interface EventBonus {
  kind: 'spawn' | 'xp';
  multiplier: number;
  scope: EventScope;
  taxa?: TaxonomicGroup[];
  rarities?: Rarity[];
  nightOnly?: boolean;
}

export interface SeasonalEvent {
  id: string;
  title: string;
  icon: string;
  description: string;
  flavor: string;
  featuredBiomeId: string;
  regionId: RegionId;
  accent: string;
  bonusNote: string;
  bonus: EventBonus;
}

const RARE_PLUS: Rarity[] = ['rare', 'ultra-rare', 'legendary'];

/** "Featured biome" events: rare+ spawn weight ×1.25 in that biome. */
function featured(biomeId: string): EventBonus {
  return { kind: 'spawn', multiplier: 1.25, scope: { biomeId }, rarities: RARE_PLUS };
}
```

2. Add a `bonus:` line to each of the 22 events, after `bonusNote`:

| Event id | `bonus` |
|---|---|
| `spring-migration` | `{ kind: 'xp', multiplier: 1.5, scope: { regionId: 'marin-county' }, taxa: ['insects'] }` |
| `redwood-bloom` | `featured('muir-woods')` |
| `king-tide-survey` | `{ kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'stinson-beach' }, taxa: ['marine-invertebrates'], rarities: RARE_PLUS }` |
| `herring-run` | `featured('tomales-bay')` |
| `dawn-chorus` | `featured('point-reyes')` |
| `amphibian-census` | `featured('bolinas-lagoon')` |
| `salmon-run` | `featured('klamath-river')` |
| `old-growth-census` | `{ kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'humboldt-redwoods' }, taxa: ['birds', 'plants'] }` |
| `lost-coast-bioblitz` | `{ kind: 'xp', multiplier: 2, scope: { biomeId: 'lost-coast' } }` |
| `coho-spawning` | `{ kind: 'spawn', multiplier: 1.5, scope: { regionId: 'redwood-coast' }, taxa: ['amphibians', 'marine-invertebrates', 'microorganisms'] }` |
| `giant-sequoia-census` | `featured('giant-sequoia-grove')` |
| `alpine-wildflower-peak` | `{ kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'sierra-high-country' }, taxa: ['plants', 'insects'] }` |
| `mono-lake-migration` | `featured('mono-lake')` |
| `yosemite-bear-survey` | `{ kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'yosemite-valley' }, taxa: ['mammals'] }` |
| `desert-superbloom` | `{ kind: 'spawn', multiplier: 1.3, scope: { regionId: 'mojave-desert' }, rarities: RARE_PLUS }` |
| `pupfish-census` | `featured('death-valley')` |
| `tortoise-emergence` | `{ kind: 'spawn', multiplier: 1.5, scope: { regionId: 'mojave-desert' }, taxa: ['reptiles'] }` |
| `nocturnal-survey` | `{ kind: 'spawn', multiplier: 2, scope: { regionId: 'mojave-desert' }, nightOnly: true }` |
| `whale-migration` | `{ kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'anacapa-kelp-forest' }, taxa: ['marine-invertebrates', 'mammals'] }` |
| `island-fox-survey` | `featured('santa-cruz-island')` |
| `kelp-forest-dive` | `{ kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'anacapa-kelp-forest' }, taxa: ['marine-invertebrates'] }` |
| `torrey-pine-count` | `featured('santa-rosa-island')` |

3. Make sure `ALL_EVENTS` is exported: change `const ALL_EVENTS` to `export const ALL_EVENTS` (it is the flattened array used by `getActiveEvent` when no region is given).

- [ ] **Step 4: Create the module**

Create `src/lib/events.ts`:

```ts
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
```

- [ ] **Step 5: Typecheck and test**

Run: `npx tsc -b && npm test -- events`
Expected: clean; 8 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/data/events.ts src/lib/events.ts src/lib/events.test.ts
git commit -m "feat(events): structured bonuses for every seasonal event"
```

---

### Task 7: Spawn module, event application, and expedition strip

**Files:**
- Create: `src/lib/spawn.ts`
- Create: `src/lib/spawn.test.ts`
- Modify: `src/pages/Expedition.tsx` (`handleCollect`, weather strip)
- Modify: `src/hooks/useGameState.ts` (`advanceLabStage` XP)

**Interfaces:**
- Consumes: `getEventSpawnModifier`, `getEventXpMultiplier`, `getActiveEventForBiome`, `eventCoversBiome` from Task 6; `computeBuffs`/`Buffs` from `@/lib/buffs`; `getWeatherModifier` and `Weather` from `@/data/weather`; `getHealthMultiplier`, `KEYSTONE_BONUS` from `@/lib/ecosystem`.
- Produces:
  - `BASE_RARITY_WEIGHTS: Record<Rarity, number>`
  - `eligibleSpecies(pool: Species[], method: SamplingMethod, isNight: boolean): Species[]`
  - `computeSpawnWeights(candidates: Species[], ctx: SpawnContext): WeightedSpecies[]`
  - `pickWeighted(items: WeightedSpecies[], rng?: () => number): Species | null`

- [ ] **Step 1: Write the failing test**

Create `src/lib/spawn.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BASE_RARITY_WEIGHTS, eligibleSpecies, computeSpawnWeights, pickWeighted, type SpawnContext } from '@/lib/spawn';
import { KEYSTONE_BONUS } from '@/lib/ecosystem';
import { computeBuffs } from '@/lib/buffs';
import { WEATHER_TYPES } from '@/data/weather';
import { ALL_EVENTS } from '@/data/events';
import type { GameState, Species } from '@/types/game';

function sp(over: Partial<Species>): Species {
  return {
    id: 'x', commonName: 'X', scientificName: 'X x', family: '', order: '', taxonomicGroup: 'insects',
    rarity: 'common', biomeIds: ['muir-woods'], samplingMethods: ['vial'], description: '', funFact: '',
    conservationStatus: '', barcodeGene: 'COI', barcodeLength: 658, emoji: '🐛', ...over,
  };
}

const neutralWeather = { ...WEATHER_TYPES[0], taxonModifiers: {}, rarityBoost: {} };
const noBuffs = computeBuffs({ unlockedSkills: [], impactFactor: 0 } as unknown as GameState);

function ctx(over: Partial<SpawnContext> = {}): SpawnContext {
  return { biomeId: 'muir-woods', weather: neutralWeather, health: 100, keystone: false, buffs: noBuffs, event: null, ...over };
}

describe('eligibleSpecies', () => {
  const pool = [
    sp({ id: 'day-vial', samplingMethods: ['vial'] }),
    sp({ id: 'night-vial', samplingMethods: ['vial'], activeAt: 'night' }),
    sp({ id: 'both-net', samplingMethods: ['hand-net'], activeAt: 'both' }),
  ];
  it('filters by method and time of day', () => {
    expect(eligibleSpecies(pool, 'vial', false).map(s => s.id)).toEqual(['day-vial']);
    expect(eligibleSpecies(pool, 'vial', true).map(s => s.id)).toEqual(['night-vial']);
    expect(eligibleSpecies(pool, 'hand-net', true).map(s => s.id)).toEqual(['both-net']);
  });
});

describe('computeSpawnWeights', () => {
  it('uses base rarity weights when nothing modifies them', () => {
    const w = computeSpawnWeights([sp({ rarity: 'common' }), sp({ id: 'r', rarity: 'rare' })], ctx());
    expect(w[0].weight).toBe(BASE_RARITY_WEIGHTS.common);
    expect(w[1].weight).toBe(BASE_RARITY_WEIGHTS.rare);
  });
  it('degraded health cuts rare+ but not common', () => {
    const w = computeSpawnWeights([sp({ rarity: 'common' }), sp({ id: 'r', rarity: 'rare' })], ctx({ health: 30 }));
    expect(w[0].weight).toBe(BASE_RARITY_WEIGHTS.common);
    expect(w[1].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.rare * 0.6);
  });
  it('keystone boosts rare+ only', () => {
    const w = computeSpawnWeights([sp({ rarity: 'common' }), sp({ id: 'l', rarity: 'legendary' })], ctx({ keystone: true }));
    expect(w[0].weight).toBe(BASE_RARITY_WEIGHTS.common);
    expect(w[1].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.legendary * KEYSTONE_BONUS);
  });
  it('weather taxon and rarity modifiers multiply', () => {
    const weather = { ...neutralWeather, taxonModifiers: { insects: 2 }, rarityBoost: { common: 1.5 } };
    const w = computeSpawnWeights([sp({ rarity: 'common' })], ctx({ weather }));
    expect(w[0].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.common * 3);
  });
  it('biology skills raise rare and legendary weights', () => {
    const buffs = computeBuffs({ unlockedSkills: ['biology-1', 'biology-2', 'biology-3', 'biology-4'], impactFactor: 0 } as unknown as GameState);
    const w = computeSpawnWeights([sp({ id: 'r', rarity: 'rare' }), sp({ id: 'l', rarity: 'legendary' })], ctx({ buffs }));
    expect(w[0].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.rare * 1.3);
    expect(w[1].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.legendary * 1.6);
  });
  it('an active spawn event multiplies matching species', () => {
    const event = ALL_EVENTS.find(e => e.id === 'yosemite-bear-survey')!; // mammals ×1.5 at yosemite-valley
    const w = computeSpawnWeights(
      [sp({ id: 'm', taxonomicGroup: 'mammals', biomeIds: ['yosemite-valley'] }), sp({ id: 'p', taxonomicGroup: 'plants', biomeIds: ['yosemite-valley'] })],
      ctx({ biomeId: 'yosemite-valley', event }),
    );
    expect(w[0].weight).toBeCloseTo(BASE_RARITY_WEIGHTS.common * 1.5);
    expect(w[1].weight).toBe(BASE_RARITY_WEIGHTS.common);
  });
});

describe('pickWeighted', () => {
  const items = [
    { species: sp({ id: 'a' }), weight: 10 },
    { species: sp({ id: 'b' }), weight: 30 },
  ];
  it('is deterministic given an rng', () => {
    expect(pickWeighted(items, () => 0.1)?.id).toBe('a');   // 0.1*40 = 4 → a
    expect(pickWeighted(items, () => 0.5)?.id).toBe('b');   // 20 → b
    expect(pickWeighted(items, () => 0.999)?.id).toBe('b');
  });
  it('returns null for an empty list', () => {
    expect(pickWeighted([], () => 0.5)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- spawn`
Expected: FAIL, cannot resolve `@/lib/spawn`.

- [ ] **Step 3: Create the module**

Create `src/lib/spawn.ts`:

```ts
import type { Rarity, SamplingMethod, Species } from '@/types/game';
import type { Buffs } from '@/lib/buffs';
import type { Weather } from '@/data/weather';
import type { SeasonalEvent } from '@/data/events';
import { getWeatherModifier } from '@/data/weather';
import { getHealthMultiplier, KEYSTONE_BONUS } from '@/lib/ecosystem';
import { getEventSpawnModifier } from '@/lib/events';

export const BASE_RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 60,
  uncommon: 25,
  rare: 10,
  'ultra-rare': 4,
  legendary: 1,
};

export interface SpawnContext {
  biomeId: string;
  weather: Weather;
  health: number;        // biome health 0–100
  keystone: boolean;     // signature species already discovered
  buffs: Buffs;
  event: SeasonalEvent | null;
}

export interface WeightedSpecies {
  species: Species;
  weight: number;
}

const RARE_PLUS = new Set<Rarity>(['rare', 'ultra-rare', 'legendary']);

/** Species in the pool that the chosen method can catch at this time of day. */
export function eligibleSpecies(pool: Species[], method: SamplingMethod, isNight: boolean): Species[] {
  return pool
    .filter(s => s.samplingMethods.includes(method))
    .filter(s => {
      const activeAt = s.activeAt || 'day';
      if (activeAt === 'both') return true;
      return isNight ? activeAt === 'night' : activeAt === 'day';
    });
}

export function computeSpawnWeights(candidates: Species[], ctx: SpawnContext): WeightedSpecies[] {
  const healthMult = getHealthMultiplier(ctx.health);
  return candidates.map(species => {
    let weight = BASE_RARITY_WEIGHTS[species.rarity] * getWeatherModifier(ctx.weather, species.taxonomicGroup, species.rarity);
    // Biology skill bonuses (additive on base rate, expressed as ×10 of the additive chance)
    if (species.rarity === 'rare') weight *= 1 + ctx.buffs.rareChanceBonus * 10;
    if (species.rarity === 'legendary') weight *= 1 + ctx.buffs.legendaryChanceBonus * 10;
    if (RARE_PLUS.has(species.rarity)) {
      weight *= healthMult;
      if (ctx.keystone) weight *= KEYSTONE_BONUS;
    }
    weight *= getEventSpawnModifier(ctx.event, species, ctx.biomeId);
    return { species, weight };
  });
}

export function pickWeighted(items: WeightedSpecies[], rng: () => number = Math.random): Species | null {
  if (items.length === 0) return null;
  const total = items.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng() * total;
  for (const { species, weight } of items) {
    roll -= weight;
    if (roll <= 0) return species;
  }
  return items[items.length - 1].species;
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- spawn`
Expected: PASS (9 tests).

- [ ] **Step 5: Use it from Expedition**

In `src/pages/Expedition.tsx`:

1. Add imports:

```ts
import { eligibleSpecies, computeSpawnWeights, pickWeighted } from '@/lib/spawn';
import { getActiveEventForBiome, eventCoversBiome } from '@/lib/events';
```

and remove the now-unused `getWeatherModifier` from the `@/data/weather` import and `getHealthMultiplier`, `KEYSTONE_BONUS` from the `@/lib/ecosystem` import (keep `getBiomeHealth`, `getHealthStatus`, `HEALTH_STATUS_INFO`, `hasKeystoneBonus`).

2. After the `weather` memo, add:

```ts
  const activeEvent = useMemo(() => (selectedBiomeId ? getActiveEventForBiome(selectedBiomeId) : null), [selectedBiomeId]);
  const eventBonusApplies = !!(activeEvent && selectedBiomeId && eventCoversBiome(activeEvent, selectedBiomeId));
```

3. Replace the body of `handleCollect` from the comment `// Determine which species to find` through the `for (const { species, weight } of weightedSpecies) { ... }` loop with:

```ts
    const pool = selectedPoint.speciesPool
      .map(id => SPECIES.find(s => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s);
    const availableSpecies = eligibleSpecies(pool, selectedMethod, isNight);

    if (availableSpecies.length === 0) {
      setCollecting(false);
      return;
    }

    const biome = getBiomeById(selectedBiomeId);
    const chosen = pickWeighted(
      computeSpawnWeights(availableSpecies, {
        biomeId: selectedBiomeId,
        weather,
        health: getBiomeHealth(state, selectedBiomeId),
        keystone: biome ? hasKeystoneBonus(state, biome.signatureSpeciesId) : false,
        buffs,
        event: activeEvent,
      }),
    );
    if (!chosen) {
      setCollecting(false);
      return;
    }
```

and add `activeEvent` to the `useCallback` dependency array.

4. In the weather strip, directly under the `<div className="text-xs truncate" ...>` line that shows `temp · humidity`, add:

```tsx
            {eventBonusApplies && activeEvent && !isNight && (
              <div className="text-[11px] truncate" style={{ color: activeEvent.accent }}>
                {activeEvent.icon} {activeEvent.bonusNote}
              </div>
            )}
```

(For `nocturnal-survey` the note reads correctly at night too; drop the `!isNight` guard for that event by changing the condition to `(!isNight || activeEvent.bonus.nightOnly)`.)

- [ ] **Step 6: Apply the XP multiplier at identification**

In `src/hooks/useGameState.ts`:

1. Import: `import { getActiveEventForBiome, getEventXpMultiplier } from '@/lib/events';`
2. In `advanceLabStage`, replace

```ts
      const xpGain = Math.round(baseXp * buffs.xpMultiplier * barcodeMult);
```

with

```ts
      const activeEvent = getActiveEventForBiome(specimen.biomeId);
      const eventXpMult = nextStatus === 'identified' && species
        ? getEventXpMultiplier(activeEvent, species, specimen.biomeId)
        : 1;
      const xpGain = Math.round(baseXp * buffs.xpMultiplier * barcodeMult * eventXpMult);
```

- [ ] **Step 7: Typecheck, test, build**

Run: `npx tsc -b && npm test && npx vite build`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/spawn.ts src/lib/spawn.test.ts src/pages/Expedition.tsx src/hooks/useGameState.ts
git commit -m "feat(events): apply event bonuses to spawns and identification XP; show bonus on expedition strip"
```

---

### Task 8: One player handle; hunt report fires for everyone

**Files:**
- Create: `src/lib/handle.ts`
- Create: `src/lib/handle.test.ts`
- Modify: `src/lib/golden-sample.ts`
- Modify: `src/lib/game/leaderboard.ts`
- Modify: `src/hooks/useGameState.ts` (`createSlot`, `renamePlayer`, hunt effect)
- Modify: `src/pages/Lab.tsx` (remove hunt calls)

**Interfaces:**
- Produces:
  - `CROSS_GAME_HANDLE_KEY = 'biokea:player:handle'`
  - `sanitizeHandle(input: string): string`
  - `readCrossGameHandle(): string | null`
  - `getPlayerHandle(playerName: string): string | null`
  - `ensureCrossGameHandle(playerName: string): void`
  - `reportSpecimenIdentified(handle: string, totalIdentified: number): Promise<void>` (changed signature)

- [ ] **Step 1: Write the failing test**

Create `src/lib/handle.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CROSS_GAME_HANDLE_KEY,
  sanitizeHandle,
  readCrossGameHandle,
  getPlayerHandle,
  ensureCrossGameHandle,
} from '@/lib/handle';

beforeEach(() => localStorage.clear());

describe('sanitizeHandle', () => {
  it('keeps letters, digits, underscore, dash; strips the rest; caps at 32', () => {
    expect(sanitizeHandle('Dr. Maren Vos!')).toBe('DrMarenVos');
    expect(sanitizeHandle('a_b-c')).toBe('a_b-c');
    expect(sanitizeHandle('x'.repeat(40))).toHaveLength(32);
    expect(sanitizeHandle('   ')).toBe('');
  });
});

describe('getPlayerHandle', () => {
  it('prefers the cross-game handle', () => {
    localStorage.setItem(CROSS_GAME_HANDLE_KEY, 'ArcadeName');
    expect(getPlayerHandle('Maren')).toBe('ArcadeName');
  });
  it('falls back to the sanitized save name', () => {
    expect(getPlayerHandle('Dr. Maren')).toBe('DrMaren');
  });
  it('ignores an invalid stored handle', () => {
    localStorage.setItem(CROSS_GAME_HANDLE_KEY, '!!!');
    expect(getPlayerHandle('Maren')).toBe('Maren');
  });
  it('returns null when nothing usable exists', () => {
    expect(getPlayerHandle('   ')).toBeNull();
  });
});

describe('ensureCrossGameHandle', () => {
  it('writes the sanitized name when the key is empty', () => {
    ensureCrossGameHandle('Dr. Maren');
    expect(readCrossGameHandle()).toBe('DrMaren');
  });
  it('never overwrites an existing handle', () => {
    localStorage.setItem(CROSS_GAME_HANDLE_KEY, 'ArcadeName');
    ensureCrossGameHandle('Maren');
    expect(readCrossGameHandle()).toBe('ArcadeName');
  });
  it('does not store the default researcher name', () => {
    ensureCrossGameHandle('Researcher');
    expect(readCrossGameHandle()).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- handle`
Expected: FAIL, cannot resolve `@/lib/handle`.

- [ ] **Step 3: Create the module**

Create `src/lib/handle.ts`:

```ts
// Single source of truth for "who is this player" across the weekly
// leaderboard and the Golden Sample hunt. The cross-game key is written
// by the shared BiokeaLeaderboardPrompt and by any other BioKEA game;
// we only fill it when it is empty so a handle chosen elsewhere wins.

export const CROSS_GAME_HANDLE_KEY = 'biokea:player:handle';
const DEFAULT_NAME = 'Researcher';
const HANDLE_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;

export function sanitizeHandle(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
}

export function readCrossGameHandle(): string | null {
  try {
    const v = localStorage.getItem(CROSS_GAME_HANDLE_KEY);
    return v && HANDLE_REGEX.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function getPlayerHandle(playerName: string): string | null {
  const stored = readCrossGameHandle();
  if (stored) return stored;
  const fallback = sanitizeHandle(playerName);
  return fallback || null;
}

export function ensureCrossGameHandle(playerName: string): void {
  if (readCrossGameHandle()) return;
  const clean = sanitizeHandle(playerName);
  if (!clean || clean === DEFAULT_NAME) return;
  try {
    localStorage.setItem(CROSS_GAME_HANDLE_KEY, clean);
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 4: Run the test**

Run: `npm test -- handle`
Expected: PASS (9 tests).

- [ ] **Step 5: Rewrite golden-sample.ts to take the handle explicitly**

Replace `src/lib/golden-sample.ts` with:

```ts
// src/lib/golden-sample.ts
//
// Biodiversity Discovery Lab's slice of the Golden Sample 26 hunt.
// Slot 3 unlocks once 5 specimens have reached the "identified" lab
// stage. Long-form games like this don't post to the shared `scores`
// table, so we report a milestone counter directly to the central
// hunt API. The handle comes from src/lib/handle.ts.
//
// I won't tell. That would be cheating.

const API_BASE = '/api/golden-sample';
const TICKETS_KEY = 'biokea:golden-tickets:v1';
const CLIENT_ID_KEY = 'biokea-leaderboard-client-id';

const GAME_ID = 'cal-field-lab-collectible';
const SLOT = 3;

function alreadyHeld(): boolean {
  try {
    const map = JSON.parse(localStorage.getItem(TICKETS_KEY) ?? '{}');
    return !!map[String(SLOT)];
  } catch {
    return false;
  }
}

function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (id && /^[0-9a-f-]{36}$/i.test(id)) return id;
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    return '00000000-0000-4000-8000-000000000000';
  }
}

interface ClaimResponse {
  ok: boolean;
  slot?: number;
  word?: string;
  token?: string;
  issued_at?: string;
  first_earn?: boolean;
}

interface GoldenFoundDetail {
  game: string;
  slot: number;
  word: string;
  token?: string;
  issued_at?: string;
  alreadyHeld: boolean;
}

// Fire-and-forget. Server stores `max(stored, count)` so duplicate or
// out-of-order POSTs are safe.
export async function reportMilestone(handle: string, count: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/milestone`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle, game: GAME_ID, count }),
    });
  } catch {
    // network — non-fatal, retried on the next milestone tick
  }
}

export async function tryClaimGoldenSample(handle: string): Promise<void> {
  if (alreadyHeld()) return;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/claim/${GAME_ID}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ handle, client_id: getClientId() }),
    });
  } catch {
    return;
  }
  if (!res.ok) return;
  let body: ClaimResponse;
  try {
    body = (await res.json()) as ClaimResponse;
  } catch {
    return;
  }
  if (!body.ok || !body.word || !body.slot) return;

  const detail: GoldenFoundDetail = {
    game: GAME_ID,
    slot: body.slot,
    word: body.word,
    token: body.token,
    issued_at: body.issued_at,
    alreadyHeld: !body.first_earn,
  };
  window.dispatchEvent(new CustomEvent<GoldenFoundDetail>('biokea:golden-found', { detail }));
}

// Report the new high-water mark, then attempt a claim. Called from the
// game-state hook whenever stats.totalIdentified rises.
export async function reportSpecimenIdentified(handle: string, totalIdentified: number): Promise<void> {
  await reportMilestone(handle, totalIdentified);
  await tryClaimGoldenSample(handle);
}
```

- [ ] **Step 6: Trim leaderboard.ts to the weekly path**

In `src/lib/game/leaderboard.ts`:

1. Add `import { getPlayerHandle } from '@/lib/handle'`.
2. Delete: `HANDLE_KEY`, `DAILY_SUBMIT_KEY`, `todayKey`, `loadHandle`, `saveHandle`, `sanitizeHandle`, and the whole `submitDailyScore` function (with its comment).
3. In `submitWeeklyScore`, replace `const handle = sanitizeHandle(args.state.playerName) || 'anon'` with `const handle = getPlayerHandle(args.state.playerName) ?? 'anon'`.

- [ ] **Step 7: Wire the hook**

In `src/hooks/useGameState.ts`:

1. Imports:

```ts
import { ensureCrossGameHandle, getPlayerHandle } from '@/lib/handle';
import { reportSpecimenIdentified } from '@/lib/golden-sample';
```

2. In `createSlot`, after `const fresh = createInitialState(name, avatar);` add `ensureCrossGameHandle(name);`.
3. In `renamePlayer`, after `if (!trimmed) return;` add `ensureCrossGameHandle(trimmed);`.
4. Inside `useGameState`, next to the other refs, add:

```ts
  const prevIdentified = useRef(state.stats.totalIdentified);

  // Golden Sample 26: report every new identification to the hunt API.
  // Runs as an effect so it fires exactly once per real state change.
  useEffect(() => {
    const total = state.stats.totalIdentified;
    if (total > prevIdentified.current) {
      const handle = getPlayerHandle(state.playerName);
      if (handle) void reportSpecimenIdentified(handle, total);
    }
    prevIdentified.current = total;
  }, [state.stats.totalIdentified, state.playerName]);
```

- [ ] **Step 8: Remove the hunt calls from Lab.tsx**

In `src/pages/Lab.tsx`:

1. Delete `import { reportSpecimenIdentified } from '@/lib/golden-sample';`
2. In `handleBarcodeComplete`, delete the four comment lines starting `// Golden Sample 26:` and the line `void reportSpecimenIdentified(identifiedSpecimens.length + 1);`. Change its dependency array to `[barcodeSpecimenId, onAdvanceLab, onDiscovery]`.
3. In `handleBarcodeSkip`, delete `void reportSpecimenIdentified(identifiedSpecimens.length + 1);` and change its dependency array to `[barcodeSpecimenId, onAdvanceLab, onDiscovery]`.

- [ ] **Step 9: Typecheck, test, build**

Run: `npx tsc -b && npm test && npx vite build`
Expected: clean. `tsc` will flag any leftover reference to a deleted export.

- [ ] **Step 10: Commit**

```bash
git add src/lib/handle.ts src/lib/handle.test.ts src/lib/golden-sample.ts src/lib/game/leaderboard.ts src/hooks/useGameState.ts src/pages/Lab.tsx
git commit -m "fix(hunt): one player handle; report identifications from game state so every player counts"
```

---

### Task 9: Dependency and dead-code cleanup; npm canonical

**Files:**
- Modify: `package.json`
- Delete: `bun.lock`, `components.json`, `src/components/ui/` (entire directory), `src/lib/utils.ts`, `src/lib/supabase.ts`, `src/lib/queryClient.ts`, `src/hooks/use-mobile.tsx`
- Modify: `src/main.tsx`, `tailwind.config.js`

- [ ] **Step 1: Delete dead files**

```bash
git rm -q bun.lock components.json src/lib/utils.ts src/lib/supabase.ts src/lib/queryClient.ts src/hooks/use-mobile.tsx
git rm -rq src/components/ui
```

- [ ] **Step 2: Simplify main.tsx**

Replace `src/main.tsx` with:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 3: Drop the animate plugin from tailwind.config.js**

Remove the line `import tailwindcssAnimate from 'tailwindcss-animate'` and change `plugins: [tailwindcssAnimate],` to `plugins: [],`.

- [ ] **Step 4: Rewrite package.json dependencies**

Replace the `packageManager`, `dependencies`, and `devDependencies` sections so the file reads:

```json
{
  "name": "cal-field-lab-collectible",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@biokea/leaderboard": "github:BioKEA/games-leaderboard-js#main",
    "@supabase/supabase-js": "^2.99.1",
    "leaflet": "^1.9.4",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-leaflet": "4.2.1",
    "sonner": "^2.0.7"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.21",
    "@types/node": "22.10.5",
    "@types/react": "18.3.18",
    "@types/react-dom": "18.3.5",
    "@vitejs/plugin-react": "5.1.4",
    "autoprefixer": "10.4.21",
    "jsdom": "^26.0.0",
    "postcss": "8.5.8",
    "tailwindcss": "3.4.17",
    "typescript": "5.9.3",
    "vite": "6.4.1",
    "vitest": "^3.2.0"
  }
}
```

(Keep the exact versions of `jsdom` and `vitest` that Task 1 installed if they differ.)

- [ ] **Step 5: Reinstall from scratch**

```bash
rm -rf node_modules
npm install --no-audit --no-fund
```

Expected: install succeeds; `package-lock.json` shrinks.

- [ ] **Step 6: Typecheck, test, build**

Run: `npx tsc -b && npm test && npx vite build`
Expected: clean. The build's JS chunk should be noticeably smaller than the 1,036 kB baseline.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove unused dependencies and dead UI scaffolding; npm is canonical"
```

---

### Task 10: Docs, license, identity

**Files:**
- Modify: `README.md`, `HUNT.md`, `index.html`
- Create: `LICENSE`

- [ ] **Step 1: Write LICENSE**

Create `LICENSE`:

```
MIT License

Copyright (c) 2026 BioKEA

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Rewrite README.md**

Replace the whole file with:

```markdown
# Cal Field Lab

A pocket field-biology sim across California — collect specimens, barcode them in the lab, fill the catalog. A BioKEA game.

## The science angle

Every region in the game is real California — Marin County, the Redwood Coast, the Sierra Nevada, the Mojave, the Channel Islands — and every species in the catalog is keyed to a real biome, sampling method, and DNA barcode marker (COI, rbcL, ITS, 18S). The loop mirrors actual fieldwork: pick a site, deploy the right method, bring samples back to the lab, run extraction → PCR → sequencing → BLAST. Cal Field Lab is part of [BioKEA](https://biokea.ai)'s effort to make biodiversity science — field sampling, barcoding, ecosystem health — feel like something you can hold in your hand.

## Play

- **Expedition** — pick a region and biome, drop into a Leaflet satellite map, choose collection points and sampling methods (hand net, vial, car trap, and more), watch weather, seasonal events, and ecosystem health shift the odds.
- **Lab** — push specimens through extraction, PCR, qPCR, and sequencing; solve the barcode mini-game; reveal each discovery card.
- **Catalog / Museum** — fill out species pages, place exhibits, collect visitor income.
- **Missions, Daily Challenges, Requests** — directed objectives with rewards.
- **Skill Tree, Team, Shop** — long-run progression: researchers, gear, perks.
- **Three save slots** — independent researchers, each with their own onboarding, compared on a local leaderboard.

### Controls

- Touch / click everywhere — the UI is mobile-first with a bottom tab bar (HQ, Expedition, Lab, Catalog, More).
- Map: pan and zoom the Leaflet view, tap pins to select collection points.
- No keyboard shortcuts required.

## Tech

- React 18 + TypeScript + Vite
- React-Leaflet + Esri / OSM / Carto basemaps for the field map
- Tailwind for layout, sonner for toasts, procedural Web Audio sound effects
- `@biokea/leaderboard` (Supabase) for the optional weekly cross-game leaderboard; silently no-ops without env vars
- Vitest for unit tests, ESLint for lint, GitHub Actions for CI

Saves live in `localStorage`, one entry per slot. There is no cloud save.

## Local dev

```bash
npm install
npm run dev        # http://localhost:3000
npm run check      # typecheck + lint + tests
npm run build      # production build into dist/
```

Optional weekly leaderboard:

```bash
cp .env.example .env   # then fill in:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_PUBLISHABLE_KEY=...
```

The app reads these via `import.meta.env`; no keys are committed.

## Golden Sample 26

This game is one of six in the BioKEA Golden Sample 26 hunt. See `HUNT.md`. The unlock condition is visible in the source by design; the hunt word is not in this repo.

## License

MIT — see [LICENSE](LICENSE).

---

Made by [BioKEA](https://biokea.ai).
```

- [ ] **Step 3: Fix the HUNT.md redirect and env example copy**

In `HUNT.md`, change `https://biokea.ai/mission/games/.` to `https://games.biokea.ai/.`

In `.env.example`, change the first line to `# Optional: weekly cross-game leaderboard (via @biokea/leaderboard).` and the second to `# Without these, the game runs fine locally — leaderboard calls silently no-op.`

- [ ] **Step 4: Tab title**

In `index.html`, change `<title>BioKEA - Biodiversity Discovery Lab</title>` to `<title>Cal Field Lab · BioKEA</title>`.

- [ ] **Step 5: Verify the README commands are real**

`npm run check` does not exist yet (Task 11 adds it). Proceed; Task 11 closes the gap before the branch is finished.

- [ ] **Step 6: Commit**

```bash
git add LICENSE README.md HUNT.md .env.example index.html
git commit -m "docs: accurate README, MIT license file, unified hunt URL and tab title"
```

---

### Task 11: ESLint, `check` script, and CI

**Files:**
- Create: `eslint.config.js`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (scripts, devDependencies)
- Modify: any source files ESLint flags

- [ ] **Step 1: Install ESLint**

```bash
npm install --save-dev eslint@^9.30.0 @eslint/js@^9.30.0 typescript-eslint@^8.35.0 eslint-plugin-react-hooks@^5.2.0 eslint-plugin-react-refresh@^0.4.20 globals@^16.0.0
```

- [ ] **Step 2: Write the flat config**

Create `eslint.config.js`:

```js
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.vite'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
)
```

- [ ] **Step 3: Add scripts**

In `package.json` `"scripts"`, add:

```json
"lint": "eslint .",
"check": "npm run typecheck && npm run lint && npm run test"
```

- [ ] **Step 4: Run lint and fix errors**

Run: `npm run lint`

Fix every **error** in source (warnings are acceptable). Rules for fixing:
- Unused variables or imports: delete them.
- `no-unused-vars` on a deliberately unused parameter: prefix it with `_`.
- `react-hooks/rules-of-hooks` violations: restructure so hooks are called unconditionally at the top of the component.
- Never add an `eslint-disable` for an error; add one only for a warning that is a deliberate one-time effect (the code base already does this for `exhaustive-deps`).

Re-run until `npm run lint` exits 0.

- [ ] **Step 5: Create the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run check
      - run: npm run build
```

- [ ] **Step 6: Full local verification**

Run: `npm run check && npm run build`
Expected: typecheck clean, lint 0 errors, all tests pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add eslint.config.js .github/workflows/ci.yml package.json package-lock.json
git add -u
git commit -m "ci: ESLint flat config, npm run check, GitHub Actions workflow"
```

---

### Task 12: Manual smoke test in the browser

**Files:** none modified.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background). Open `http://localhost:3000`.

- [ ] **Step 2: New researcher with a custom name**

Create a slot named `Smoke Tester`. Confirm in DevTools → Application → Local Storage that `biokea:player:handle` is `SmokeTester`.

- [ ] **Step 3: Collect at a previously broken point**

Expedition → Marin County → Point Reyes (buy the permit in the Supply Depot if needed; the DEV MODE slot has it unlocked). Choose Tomales Point Grassland. Confirm Collection Vial is now offered. Collect until a Tule Elk appears (it is the biome's signature species and was previously uncollectable).

- [ ] **Step 4: Run one specimen through the lab**

Lab → Run full pipeline → complete or skip the barcode game. In DevTools → Network, confirm a `POST /api/golden-sample/milestone` with body `{ handle: "SmokeTester", game: "cal-field-lab-collectible", count: 1 }` (it will 404 locally; the request firing is the point).

- [ ] **Step 5: Event bonus strip**

HQ briefing shows this week's event for the selected region. Open Expedition in that region's featured biome and confirm the event icon and bonus note appear under the weather line.

- [ ] **Step 6: Report**

Note any failure with the step number. Do not commit anything from this task.
