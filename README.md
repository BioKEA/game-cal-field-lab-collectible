# Cal Field Lab

A pocket field-biology sim across California — collect specimens, barcode them in the lab, fill the catalog. A BioKEA game.

> **Status:** private beta. Public release pending.

![Cal Field Lab gameplay](docs/screenshot.png)
<!-- TODO: drop a real screenshot or gif at docs/screenshot.png before going public -->

## The science angle

Every region in the game is real California — Marin County, the Redwood Coast, the Sierra Nevada, the Mojave, the Channel Islands — and every species in the catalog is keyed to a real biome, sampling method, and DNA barcode marker (COI, rbcL, ITS, 16S). The loop mirrors actual fieldwork: pick a site, deploy the right method, bring samples back to the lab, run extraction → PCR → sequencing → BLAST. Cal Field Lab is part of [BioKEA](https://biokea.ai)'s effort to make biodiversity science — field sampling, barcoding, ecosystem health — feel like something you can hold in your hand.

## Play

- **Expedition** — pick a region and biome, drop into a Leaflet satellite map, choose collection points and sampling methods (hand-net, vial, car-trap, and more), watch weather and ecosystem health shift the odds.
- **Lab** — push specimens through extraction, PCR, sequencing, and identification stages; reveal each discovery card.
- **Catalog / Museum** — fill out species pages, place exhibits, collect visitor income.
- **Missions, Daily Challenges, Requests** — directed objectives with rewards.
- **Skill Tree, Team, Shop** — long-run progression: researchers, gear, perks.
- **Five save slots** — independent researchers with onboarding and cross-save support.

### Controls

- Touch / click everywhere — the UI is mobile-first with a bottom tab bar (HQ, Expedition, Lab, Catalog, More).
- Map: pan and zoom the Leaflet view, tap pins to select collection points.
- No keyboard shortcuts required.

## Tech

- React 18 + TypeScript + Vite
- React-Leaflet + Esri / OSM / Carto basemaps for the field map
- Tailwind + shadcn/radix for UI, sonner for toasts
- Howler + use-sound for audio
- Supabase for optional cross-save / leaderboard (env vars below; silently no-ops without them)
- Bun as package manager and runtime

## Local dev

```bash
bun install
bun run dev      # http://localhost:5173
bun run build    # production build into dist/
```

Optional Supabase cross-save:

```bash
cp .env.example .env   # then fill in:
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_PUBLISHABLE_KEY=...
```

The app reads these via `import.meta.env`; no keys are committed.

## License

MIT — see [LICENSE](LICENSE).

---

Made by [BioKEA](https://biokea.ai).
