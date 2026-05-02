import { SPECIES } from '@/data/species';
import { RESEARCHERS } from '@/data/researchers';
import type { GameState, Species, TaxonomicGroup, Rarity } from '@/types/game';

export interface RequestProgress {
  progress: number;
  target: number;
  done: boolean;
}

export interface ResearchRequest {
  id: string;
  researcherId: string;
  title: string;
  description: string;
  flavor: string;
  reward: { xp: number; credits: number };
  check: (state: GameState) => RequestProgress;
}

function countDiscovered(state: GameState, pred: (s: Species) => boolean): number {
  return state.discoveredSpecies
    .map(id => SPECIES.find(sp => sp.id === id))
    .filter((s): s is Species => !!s && pred(s)).length;
}

interface TemplateContext {
  dateKey: string;
}

type RequestTemplate = (ctx: TemplateContext) => ResearchRequest;

const TEMPLATES: RequestTemplate[] = [
  // Chen — tidepool specialist
  ({ dateKey }) => ({
    id: `${dateKey}-chen-tidepool`,
    researcherId: 'chen',
    title: 'Intertidal Census',
    description: 'Catalogue 2 marine invertebrates for the tidepool database.',
    flavor: '"The intertidal report is due Friday and I\'m still short on data. Anything from the rocky zone helps." — Dr. Chen',
    reward: { xp: 80, credits: 60 },
    check: (state) => {
      const c = countDiscovered(state, s => s.taxonomicGroup === 'marine-invertebrates');
      return { progress: Math.min(c, 2), target: 2, done: c >= 2 };
    },
  }),
  // Rivera — mycology
  ({ dateKey }) => ({
    id: `${dateKey}-rivera-fungi`,
    researcherId: 'rivera',
    title: 'Redwood Mycology',
    description: 'Catalogue a fungal species from the Muir Woods area.',
    flavor: '"The fungal bloom won\'t last. I need sequences on anything with a cap or bracket." — Prof. Rivera',
    reward: { xp: 60, credits: 45 },
    check: (state) => {
      const c = countDiscovered(state, s => s.taxonomicGroup === 'fungi');
      return { progress: Math.min(c, 1), target: 1, done: c >= 1 };
    },
  }),
  // Yamamoto — pollinators
  ({ dateKey }) => ({
    id: `${dateKey}-yamamoto-pollinators`,
    researcherId: 'yamamoto',
    title: 'Pollinator Survey',
    description: 'Discover 3 insect species for the pollinator census.',
    flavor: '"Bees, butterflies, beetles — bring me anything with six legs that visits flowers." — Dr. Yamamoto',
    reward: { xp: 90, credits: 70 },
    check: (state) => {
      const c = countDiscovered(state, s => s.taxonomicGroup === 'insects');
      return { progress: Math.min(c, 3), target: 3, done: c >= 3 };
    },
  }),
  // Okafor — birds
  ({ dateKey }) => ({
    id: `${dateKey}-okafor-birds`,
    researcherId: 'okafor',
    title: 'Avian Records',
    description: 'Catalogue 2 bird species for the regional checklist.',
    flavor: '"Any bird counts — even a common heron. The banding station needs volume." — Dr. Okafor',
    reward: { xp: 80, credits: 60 },
    check: (state) => {
      const c = countDiscovered(state, s => s.taxonomicGroup === 'birds');
      return { progress: Math.min(c, 2), target: 2, done: c >= 2 };
    },
  }),
  // Patel — herpetology
  ({ dateKey }) => ({
    id: `${dateKey}-patel-herps`,
    researcherId: 'patel',
    title: 'Amphibian DNA Barcode',
    description: 'Barcode 1 amphibian or reptile species.',
    flavor: '"One sequence is enough to start. Salamanders preferred but frogs fine." — Dr. Patel',
    reward: { xp: 70, credits: 55 },
    check: (state) => {
      const groups: TaxonomicGroup[] = ['amphibians', 'reptiles'];
      const c = countDiscovered(state, s => groups.includes(s.taxonomicGroup));
      return { progress: Math.min(c, 1), target: 1, done: c >= 1 };
    },
  }),
  // Lindqvist — botany
  ({ dateKey }) => ({
    id: `${dateKey}-lindqvist-plants`,
    researcherId: 'lindqvist',
    title: 'Native Flora Sampling',
    description: 'Discover 2 plant species for the herbarium.',
    flavor: '"Coastal natives, preferably — but I\'ll take what you can find." — Dr. Lindqvist',
    reward: { xp: 70, credits: 50 },
    check: (state) => {
      const c = countDiscovered(state, s => s.taxonomicGroup === 'plants');
      return { progress: Math.min(c, 2), target: 2, done: c >= 2 };
    },
  }),
  // Torres — marine mammals
  ({ dateKey }) => ({
    id: `${dateKey}-torres-mammals`,
    researcherId: 'torres',
    title: 'Mammal Observation',
    description: 'Catalogue 1 mammal species from any biome.',
    flavor: '"Could be a harbor seal or a tule elk — anything with fur is a win today." — Marcus',
    reward: { xp: 90, credits: 70 },
    check: (state) => {
      const c = countDiscovered(state, s => s.taxonomicGroup === 'mammals');
      return { progress: Math.min(c, 1), target: 1, done: c >= 1 };
    },
  }),
  // Hassan — freshwater
  ({ dateKey }) => ({
    id: `${dateKey}-hassan-stream`,
    researcherId: 'hassan',
    title: 'Stream Life Census',
    description: 'Discover a freshwater species from Muir Woods.',
    flavor: '"Redwood Creek invertebrates are my holy grail. Anything aquatic from the forest." — Dr. Hassan',
    reward: { xp: 75, credits: 55 },
    check: (state) => {
      const c = countDiscovered(state, s => s.biomeIds.includes('muir-woods'));
      return { progress: Math.min(c, 1), target: 1, done: c >= 1 };
    },
  }),
  // Chen — rare pull
  ({ dateKey }) => ({
    id: `${dateKey}-chen-rare`,
    researcherId: 'chen',
    title: 'Rare Species Priority',
    description: 'Discover 1 rare, ultra-rare, or legendary species.',
    flavor: '"Grant committee wants something flashy for the annual review. Rare or better." — Dr. Chen',
    reward: { xp: 130, credits: 100 },
    check: (state) => {
      const rarities: Rarity[] = ['rare', 'ultra-rare', 'legendary'];
      const c = countDiscovered(state, s => rarities.includes(s.rarity));
      return { progress: Math.min(c, 1), target: 1, done: c >= 1 };
    },
  }),
  // Yamamoto — total count
  ({ dateKey }) => ({
    id: `${dateKey}-yamamoto-volume`,
    researcherId: 'yamamoto',
    title: 'Species Volume',
    description: 'Reach 10 total species in your catalog.',
    flavor: '"Just build me a baseline checklist. Ten species from any group." — Dr. Yamamoto',
    reward: { xp: 100, credits: 80 },
    check: (state) => {
      const c = state.discoveredSpecies.length;
      return { progress: Math.min(c, 10), target: 10, done: c >= 10 };
    },
  }),
];

function getDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getDailyRequests(now: Date = new Date()): ResearchRequest[] {
  const dateKey = getDateKey(now);
  const seed = hashString(dateKey);
  const rnd = mulberry32(seed);

  const pool = [...TEMPLATES];
  const selected: ResearchRequest[] = [];
  const usedResearchers = new Set<string>();

  while (selected.length < 3 && pool.length > 0) {
    const idx = Math.floor(rnd() * pool.length);
    const template = pool.splice(idx, 1)[0];
    const req = template({ dateKey });
    // prefer one request per researcher
    if (usedResearchers.has(req.researcherId) && selected.length < pool.length) continue;
    usedResearchers.add(req.researcherId);
    selected.push(req);
  }

  return selected;
}

export function getDateKeyFromDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export { RESEARCHERS };
