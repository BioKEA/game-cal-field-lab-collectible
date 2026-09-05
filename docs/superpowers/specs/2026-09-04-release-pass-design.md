# Cal Field Lab — public-release pass (design)

Date: 2026-09-04
Status: approved in conversation; implementation follows the plan in
`docs/superpowers/plans/`.

## Goal

Get the game from "private beta" to something safe to open publicly:
game data that is internally consistent, promised bonuses that actually
apply, the hunt hook that fires for every player, honest docs, no dead
weight in the bundle, and a safety net (tests, lint, CI) so the next
change cannot silently regress any of it.

Out of scope, deliberately: splitting the state hook into a reducer,
route-level code splitting, extracting the colour palette into tokens,
cloud saves, and any new gameplay beyond making seasonal events real.

## Decisions already made

| Question | Answer |
|---|---|
| Session goal | Public release readiness |
| Species/biome mismatches | All accidental; collection-point pools are the source of truth |
| Hunt API + shared leaderboard package | Stable; unify the handle in this repo |
| Package manager | npm is canonical; drop bun |
| Seasonal events | Make the advertised bonuses real |
| Scope | Data + logic fixes, deps + docs cleanup, tests + lint + CI, save-growth cap |

## Section A — data and logic fixes

### A1. Species ↔ biome ↔ collection-point consistency

Pools are truth. Three invariants must hold for every species `s`:

1. `s.biomeIds` equals the set of biomes whose collection points pool `s`.
2. At every point that pools `s`, at least one of `s.samplingMethods` is in
   the point's `availableMethods`; if `s.exclusiveMethod` is set, that
   method is offered there.
3. `s` is pooled at least once.

Current violations (from a script run against the data on 2026-09-04):

- 7 species pooled somewhere their `biomeIds` omit → add the biome id.
- 3 species listed for a biome that never pools them → add each to one
  collection point in that biome whose environment fits and whose
  methods already include one of the species' methods.
- 10 pool entries with no usable method → add the species' method to that
  point's `availableMethods` where ecologically sensible (owls / elk /
  ringtail at a meadow: add `vial`; kelp at a seal haul-out: add
  `plankton-net`; etc.). If adding a method makes no sense, move the
  species to a sibling point in the same biome instead.

The `totalSpecies` field is removed from the `Biome` type and data. A
derived helper `getBiomeSpeciesCount(biomeId)` (species whose `biomeIds`
include the biome) replaces the three display uses (CaliforniaHero, HQ,
Expedition).

### A2. Data guard (test)

`src/data/consistency.test.ts` asserts, against the real data modules:

- species ids unique; biome ids unique; collection-point ids unique
- invariants 1–3 above
- each biome's `signatureSpeciesId` has that biome in its `biomeIds`
- every `unlock-biome` shop effect key names a real biome
- every biome except the two starting ones has an unlock path (shop item)
- the dev-mode `ALL_BIOME_IDS` / `ALL_SKILL_IDS` lists are replaced by
  values derived from `BIOMES` / `SKILLS` (so there is nothing to drift)

### A3. Stale logic

- Rank-promotion toast: order derived from `RANK_THRESHOLDS` keys sorted
  by threshold; every promotion toasts.
- Rank achievements (`junior-explorer`, `field-researcher`): "reached rank
  ≥ X" computed from thresholds, not a hardcoded array.
- `all-biomes` achievement keeps its threshold (5) and its title; the
  description becomes "Unlock 5 biomes".

### A4. Seasonal events become real

`SeasonalEvent` gains a `bonus` field:

```ts
interface EventBonus {
  kind: 'spawn' | 'xp';          // spawn-weight multiplier vs XP multiplier
  multiplier: number;            // 1.25 … 2
  scope: { biomeId: string } | { regionId: RegionId } | { all: true };
  taxa?: TaxonomicGroup[];       // limit to these groups
  rarities?: Rarity[];           // limit to these rarities
  nightOnly?: boolean;           // limit to activeAt === 'night'
}
```

New pure module `src/lib/events.ts`:

- `eventAppliesTo(event, species, biomeId, isNight): boolean`
- `getEventSpawnModifier(event, species, biomeId, isNight): number` — the
  multiplier if `kind === 'spawn'` and it applies, else 1
- `getEventXpMultiplier(event, species, biomeId): number` — likewise for
  `kind === 'xp'`

Every existing `bonusNote` maps to one bonus so the copy on screen is
true. "Featured biome: X" → spawn ×1.25 for rare+ at X. "All species XP
doubled at Lost Coast" → xp ×2 at lost-coast. "Night-active species spawn
rates doubled" → spawn ×2, nightOnly, region. Every event gets exactly one
bonus; the full mapping lives in `events.ts` on each event definition.

Application points:

- Expedition spawn roll: multiply each candidate's weight by
  `getEventSpawnModifier(activeEventForRegion, species, biomeId, isNight)`,
  next to the weather modifier. The active event is the region's current
  one (`getActiveEvent(now, biome.regionId)`).
- `advanceLabStage` at identification: multiply the XP gain by
  `getEventXpMultiplier` using the specimen's biome and the region's
  current event at identification time. (Specimens collected during an
  event and identified after it ends do not get the bonus. Acceptable
  and simple.)
- Expedition weather strip: when the active event applies to the
  selected biome, show its icon + `bonusNote` under the weather line.

### A5. Handle unification and the hunt-report bug

Bug: the BioKEA prompt opens only while `playerName === 'Researcher'`.
Anyone who names their researcher at slot creation never sees it, so
`biokea:player:handle` is never written and `reportSpecimenIdentified`
returns early forever.

Fix:

- New `src/lib/handle.ts`:
  - `sanitizeHandle(input)` — the prompt's rule (`[a-zA-Z0-9_-]`, ≤32)
  - `getPlayerHandle(playerName)` — cross-game key if present and valid,
    else `sanitizeHandle(playerName)` or `null`
  - `ensureCrossGameHandle(playerName)` — writes the cross-game key only
    if it is empty
- `golden-sample.ts` uses `getPlayerHandle`; `reportSpecimenIdentified`
  takes the handle explicitly.
- `game/leaderboard.ts` uses `getPlayerHandle`; `submitDailyScore`, the
  `cal-field-lab-handle` key, `loadHandle`/`saveHandle`, and the daily
  submit key are deleted (dead since the daily mode was dropped).
- `createSlot` and `renamePlayer` call `ensureCrossGameHandle`.
- The hunt report moves from `Lab.tsx` into `advanceLabStage`'s
  identification branch, called with the post-update
  `stats.totalIdentified` and the handle from state. `Lab.tsx` no longer
  imports golden-sample.

### A6. Save growth cap

`fieldNotes` is trimmed to the most recent 300 entries wherever a note is
appended (a single `appendNote(notes, note)` helper). `xpHistory` is
already trimmed. Nothing else grows unbounded.

## Section B — cleanup and docs

### B1. Dependencies

Remove (never imported by app code): `recharts`, `react-router-dom`,
`howler`, `@types/howler`, `use-sound`, `zod`, `@hookform/resolvers`,
`react-hook-form`, `cmdk`, `next-themes`, `react-resizable-panels`, every
`@radix-ui/*`, `lucide-react`, `class-variance-authority`,
`tailwind-merge`, `clsx`, `@tanstack/react-query`, `tailwindcss-animate`.

Keep `@supabase/supabase-js` — it is a peer dependency of
`@biokea/leaderboard`.

### B2. Dead files

Delete `src/components/ui/` (30 files, none imported), `src/lib/utils.ts`,
`src/lib/supabase.ts`, `src/lib/queryClient.ts`, `src/hooks/use-mobile.tsx`,
`components.json`. `main.tsx` drops the QueryClientProvider.
`tailwind.config.js` drops the animate plugin; the shadcn colour tokens in
`index.css` stay (three are used).

### B3. Package manager

npm is canonical: remove `packageManager` from `package.json`, delete
`bun.lock`, keep `package-lock.json`. `vite.config.ts` loses the stale
`/opt/baku-templates` comment and `cacheDir` override.

### B4. Docs and identity

- `README.md`: three save slots (not five); "cross-save" described as
  local slot comparison; Supabase env vars described as powering the
  weekly leaderboard only; install/run commands use npm; the missing
  screenshot line is removed; the LICENSE link points at a real file.
- `LICENSE`: MIT, copyright BioKEA.
- `HUNT.md` redirect URL becomes `https://games.biokea.ai/` to match
  `CLAUDE.md` and the latest commit.
- `index.html` `<title>` becomes "Cal Field Lab · BioKEA". The
  `gameTitle` passed to the shared prompt stays "Biodiversity Discovery
  Lab" because the website may list the game under that name; flagged in
  the final report for a human decision.

## Section C — tests, lint, CI

### C1. Pure-logic extraction (for testability, no behaviour change)

- `src/lib/progression.ts`: `calculateRank`, `applyXpGain`, `getRarityXP`,
  `getRarityCredits`, `rankAtLeast`.
- `src/lib/save.ts`: `createInitialState`, `migrateLoadedState`,
  `appendNote`, `FIELD_NOTE_CAP`.
- `src/lib/spawn.ts`: `computeSpawnWeights(candidates, ctx)` and
  `pickWeighted(weights, rng)`, extracted from `Expedition.handleCollect`
  with an injectable `rng` (defaults to `Math.random`).

### C2. Vitest

`vitest` with `environment: 'node'` for everything except tests that need
`localStorage`, which use `// @vitest-environment jsdom` per file. Tests:

- `barcode.test.ts` — determinism, gap count, scoring, bonus tiers
- `buffs.test.ts` — impact factor and skill stacking
- `ecosystem.test.ts` — status bands, museum accrual cap
- `progression.test.ts` — rank thresholds, daily goal + streak rollover,
  30-day history trim
- `save.test.ts` — migration fills every field of a legacy save; note cap
- `spawn.test.ts` — weather / health / keystone / event multipliers
  change weights as specified; night filter; deterministic pick with a
  fixed rng
- `events.test.ts` — each scope / filter combination
- `handle.test.ts` (jsdom) — cross-game key precedence, sanitisation,
  ensure-does-not-overwrite
- `data/consistency.test.ts` — Section A2

### C3. ESLint

ESLint 9 flat config: `@eslint/js` recommended, `typescript-eslint`
recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
`react-hooks/exhaustive-deps` at `warn` (the code base already carries
disable comments for it). Lint must pass with zero errors.

### C4. Scripts and CI

`package.json` scripts: `dev`, `build`, `preview`, `typecheck`
(`tsc -b`), `lint`, `test` (`vitest run`), `check` (typecheck + lint +
test). `.github/workflows/ci.yml`: on push and pull_request, Node 22,
`npm ci`, `npm run check`, `npm run build`.

## Testing the whole

`npm run check && npm run build` green locally and in CI. A manual smoke
in the browser: create a researcher with a custom name, collect at a
point that previously had a method mismatch, run one specimen through the
lab, confirm the hunt milestone POST fires (network tab), confirm the
expedition strip shows an event bonus in a featured biome.
