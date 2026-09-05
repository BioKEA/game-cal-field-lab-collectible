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
