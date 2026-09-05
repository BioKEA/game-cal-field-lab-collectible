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

// ── Marin County events ───────────────────────────────────────────────

const MARIN_EVENTS: SeasonalEvent[] = [
  {
    id: 'spring-migration',
    title: 'Spring Migration',
    icon: '🦋',
    description: 'Monarchs and swallowtails are passing through Marin County.',
    flavor: 'Thousands of monarch butterflies are moving along the Pacific coast. The entomology team needs as many pollinator samples as possible before the window closes.',
    featuredBiomeId: 'stinson-beach',
    regionId: 'marin-county',
    accent: '#e89a3c',
    bonusNote: 'Extra XP for pollinator discoveries this week',
    bonus: { kind: 'xp', multiplier: 1.5, scope: { regionId: 'marin-county' }, taxa: ['insects'] },
  },
  {
    id: 'redwood-bloom',
    title: 'Old-Growth Fungal Bloom',
    icon: '🍄',
    description: 'Fog drip has triggered a once-in-a-decade fungal event.',
    flavor: 'Coast redwood duff is erupting with rare bracket fungi and saprophytes. Mycologists are scrambling to document it before the weather shifts.',
    featuredBiomeId: 'muir-woods',
    regionId: 'marin-county',
    accent: '#c9a84c',
    bonusNote: 'Featured biome: Muir Woods',
    bonus: featured('muir-woods'),
  },
  {
    id: 'king-tide-survey',
    title: 'King Tide Survey',
    icon: '🌊',
    description: 'Extreme low tides expose rarely-seen intertidal species.',
    flavor: 'Tidepools normally submerged for years are briefly accessible. A research window opens for deep-zone invertebrates.',
    featuredBiomeId: 'stinson-beach',
    regionId: 'marin-county',
    accent: '#60a5fa',
    bonusNote: 'Rare marine invertebrates more likely',
    bonus: { kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'stinson-beach' }, taxa: ['marine-invertebrates'], rarities: RARE_PLUS },
  },
  {
    id: 'herring-run',
    title: 'Pacific Herring Run',
    icon: '🐟',
    description: 'Spawning herring turn Tomales Bay milky white.',
    flavor: 'An ecological cascade: herring spawn draws seabirds, seals, and sharks in numbers not seen since last spring.',
    featuredBiomeId: 'tomales-bay',
    regionId: 'marin-county',
    accent: '#7dd3c0',
    bonusNote: 'Featured biome: Tomales Bay',
    bonus: featured('tomales-bay'),
  },
  {
    id: 'dawn-chorus',
    title: 'Dawn Chorus Week',
    icon: '🐦',
    description: 'Territorial birdsong peaks across Point Reyes grasslands.',
    flavor: 'Pre-dawn surveys are picking up rare raptor activity and shorebird migrations. The ornithology team is pulling double shifts.',
    featuredBiomeId: 'point-reyes',
    regionId: 'marin-county',
    accent: '#f5b342',
    bonusNote: 'Featured biome: Point Reyes',
    bonus: featured('point-reyes'),
  },
  {
    id: 'amphibian-census',
    title: 'Amphibian Census',
    icon: '🐸',
    description: 'Breeding-season call surveys in Bolinas Lagoon wetlands.',
    flavor: 'Frogs and salamanders are at peak detectability during this narrow breeding window. Every recording counts.',
    featuredBiomeId: 'bolinas-lagoon',
    regionId: 'marin-county',
    accent: '#4a8a4a',
    bonusNote: 'Featured biome: Bolinas Lagoon',
    bonus: featured('bolinas-lagoon'),
  },
];

// ── Redwood Coast events ──────────────────────────────────────────────

const REDWOOD_EVENTS: SeasonalEvent[] = [
  {
    id: 'salmon-run',
    title: 'Chinook Salmon Run',
    icon: '🐟',
    description: 'Thousands of Chinook salmon choke the Klamath River mouth.',
    flavor: 'The annual salmon run draws bald eagles, river otters, and black bears to the richest feeding ground on the coast. Sample the entire food web.',
    featuredBiomeId: 'klamath-river',
    regionId: 'redwood-coast',
    accent: '#e07050',
    bonusNote: 'Featured biome: Klamath River',
    bonus: featured('klamath-river'),
  },
  {
    id: 'old-growth-census',
    title: 'Old-Growth Census',
    icon: '🌲',
    description: 'A rare opportunity to survey the tallest trees on Earth.',
    flavor: 'Canopy researchers have rigged access to the Rockefeller Grove crown. Epiphytes, lichens, and arboreal salamanders await 100 metres up.',
    featuredBiomeId: 'humboldt-redwoods',
    regionId: 'redwood-coast',
    accent: '#4a8a4a',
    bonusNote: 'Canopy species bonus at Humboldt Redwoods',
    bonus: { kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'humboldt-redwoods' }, taxa: ['birds', 'plants'] },
  },
  {
    id: 'lost-coast-bioblitz',
    title: 'Lost Coast BioBlitz',
    icon: '🔬',
    description: 'A 48-hour biodiversity survey of California\'s wildest shore.',
    flavor: 'Teams are documenting everything that moves along the black-sand beaches. Roosevelt elk, puffins, intertidal invertebrates — all fair game.',
    featuredBiomeId: 'lost-coast',
    regionId: 'redwood-coast',
    accent: '#8ab8c8',
    bonusNote: 'All species XP doubled at Lost Coast',
    bonus: { kind: 'xp', multiplier: 2, scope: { biomeId: 'lost-coast' } },
  },
  {
    id: 'coho-spawning',
    title: 'Coho Spawning Season',
    icon: '💧',
    description: 'Endangered coho salmon fight upstream to ancient spawning pools.',
    flavor: 'Monitor the spawning run and sample the freshwater ecosystem that sustains it. Every organism in these pools is connected.',
    featuredBiomeId: 'klamath-river',
    regionId: 'redwood-coast',
    accent: '#60a5fa',
    bonusNote: 'Aquatic species bonus this week',
    bonus: { kind: 'spawn', multiplier: 1.5, scope: { regionId: 'redwood-coast' }, taxa: ['amphibians', 'marine-invertebrates', 'microorganisms'] },
  },
];

// ── Sierra Nevada events ──────────────────────────────────────────────

const SIERRA_EVENTS: SeasonalEvent[] = [
  {
    id: 'giant-sequoia-census',
    title: 'Giant Sequoia Census',
    icon: '🌲',
    description: 'Annual survey of the largest living organisms on Earth.',
    flavor: 'The Giant Forest is alive with researchers. Fire ecologists, mycologists, and entomologists converge on the General Sherman grove to document the web of life in a 3,000-year-old ecosystem.',
    featuredBiomeId: 'giant-sequoia-grove',
    regionId: 'sierra-nevada',
    accent: '#c9a84c',
    bonusNote: 'Featured biome: Giant Sequoia Grove',
    bonus: featured('giant-sequoia-grove'),
  },
  {
    id: 'alpine-wildflower-peak',
    title: 'Alpine Wildflower Peak',
    icon: '🌸',
    description: 'Tuolumne Meadows erupts in a short-lived wildflower display.',
    flavor: 'The snow melted three weeks ago. Pollinators have a narrow window. Survey the meadow before the season closes.',
    featuredBiomeId: 'sierra-high-country',
    regionId: 'sierra-nevada',
    accent: '#d89aca',
    bonusNote: 'Plant and insect species bonus at High Country',
    bonus: { kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'sierra-high-country' }, taxa: ['plants', 'insects'] },
  },
  {
    id: 'mono-lake-migration',
    title: 'Mono Lake Migration',
    icon: '🦅',
    description: 'Millions of shorebirds descend on Mono Lake\'s alkaline waters.',
    flavor: 'Wilson\'s phalaropes, eared grebes, and California gulls feed on brine shrimp in one of the continent\'s most important migratory stopovers.',
    featuredBiomeId: 'mono-lake',
    regionId: 'sierra-nevada',
    accent: '#b8a878',
    bonusNote: 'Featured biome: Mono Lake',
    bonus: featured('mono-lake'),
  },
  {
    id: 'yosemite-bear-survey',
    title: 'Black Bear Survey',
    icon: '🐻',
    description: 'Bear activity peaks in Yosemite Valley as autumn approaches.',
    flavor: 'Camera traps and scat analysis reveal how many bears are preparing for hibernation. Track the megafauna while documenting everything they interact with.',
    featuredBiomeId: 'yosemite-valley',
    regionId: 'sierra-nevada',
    accent: '#8a6a4a',
    bonusNote: 'Mammal species bonus at Yosemite Valley',
    bonus: { kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'yosemite-valley' }, taxa: ['mammals'] },
  },
];

// ── Mojave Desert events ──────────────────────────────────────────────

const MOJAVE_EVENTS: SeasonalEvent[] = [
  {
    id: 'desert-superbloom',
    title: 'Desert Superbloom',
    icon: '🌺',
    description: 'A once-in-a-decade rain has carpeted the desert floor in wildflowers.',
    flavor: 'The Mojave is briefly, impossibly alive. Dormant seeds that waited years have all germinated at once. Every pollinator and herbivore emerges.',
    featuredBiomeId: 'joshua-tree',
    regionId: 'mojave-desert',
    accent: '#e8a0d0',
    bonusNote: 'All rarity rates boosted across Mojave',
    bonus: { kind: 'spawn', multiplier: 1.3, scope: { regionId: 'mojave-desert' }, rarities: RARE_PLUS },
  },
  {
    id: 'pupfish-census',
    title: 'Pupfish Census',
    icon: '🐟',
    description: 'Annual count of the rarest fish on Earth in their desert springs.',
    flavor: 'Devils Hole and the Panamint springs harbor pupfish found nowhere else — relics of the Pleistocene. Every individual matters.',
    featuredBiomeId: 'death-valley',
    regionId: 'mojave-desert',
    accent: '#60a5fa',
    bonusNote: 'Featured biome: Death Valley',
    bonus: featured('death-valley'),
  },
  {
    id: 'tortoise-emergence',
    title: 'Desert Tortoise Emergence',
    icon: '🐢',
    description: 'After months underground, desert tortoises emerge to feed and breed.',
    flavor: 'Track the threatened Mojave desert tortoise and the entire ecosystem that depends on their burrows — from burrowing owls to Gila monsters.',
    featuredBiomeId: 'mojave-preserve',
    regionId: 'mojave-desert',
    accent: '#d4a574',
    bonusNote: 'Reptile species bonus across Mojave',
    bonus: { kind: 'spawn', multiplier: 1.5, scope: { regionId: 'mojave-desert' }, taxa: ['reptiles'] },
  },
  {
    id: 'nocturnal-survey',
    title: 'Nocturnal Survey Week',
    icon: '🌙',
    description: 'UV lights and pitfall traps reveal the desert\'s secret nightlife.',
    flavor: 'Scorpions fluoresce under blacklight. Kit foxes hunt kangaroo rats. The desert is more alive at midnight than noon.',
    featuredBiomeId: 'joshua-tree',
    regionId: 'mojave-desert',
    accent: '#4a5a8a',
    bonusNote: 'Night-active species spawn rates doubled',
    bonus: { kind: 'spawn', multiplier: 2, scope: { regionId: 'mojave-desert' }, nightOnly: true },
  },
];

// ── Channel Islands events ────────────────────────────────────────────

const CHANNEL_ISLANDS_EVENTS: SeasonalEvent[] = [
  {
    id: 'whale-migration',
    title: 'Gray Whale Migration',
    icon: '🐋',
    description: 'Gray whales pass through the Santa Barbara Channel on their annual journey.',
    flavor: 'The longest mammal migration on Earth passes right through your survey area. Kelp forests teem with activity as nutrient upwelling follows the whales.',
    featuredBiomeId: 'anacapa-kelp-forest',
    regionId: 'channel-islands',
    accent: '#60a5fa',
    bonusNote: 'Marine species bonus at Anacapa',
    bonus: { kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'anacapa-kelp-forest' }, taxa: ['marine-invertebrates', 'mammals'] },
  },
  {
    id: 'island-fox-survey',
    title: 'Island Fox Survey',
    icon: '🦊',
    description: 'Annual tracking of the world\'s smallest fox on Santa Cruz Island.',
    flavor: 'Back from the brink of extinction, the island fox is a conservation triumph. Camera traps and GPS collars reveal how the island food web has recovered.',
    featuredBiomeId: 'santa-cruz-island',
    regionId: 'channel-islands',
    accent: '#e89a3c',
    bonusNote: 'Featured biome: Santa Cruz Island',
    bonus: featured('santa-cruz-island'),
  },
  {
    id: 'kelp-forest-dive',
    title: 'Kelp Forest Dive Week',
    icon: '🤿',
    description: 'Conditions are perfect for deep kelp forest surveys.',
    flavor: 'Crystal-clear water and calm seas open a window into the underwater cathedral. Giant kelp canopy to holdfast — survey every layer.',
    featuredBiomeId: 'anacapa-kelp-forest',
    regionId: 'channel-islands',
    accent: '#3a9a7a',
    bonusNote: 'Marine invertebrate discovery rates boosted',
    bonus: { kind: 'spawn', multiplier: 1.5, scope: { biomeId: 'anacapa-kelp-forest' }, taxa: ['marine-invertebrates'] },
  },
  {
    id: 'torrey-pine-count',
    title: 'Torrey Pine Census',
    icon: '🌴',
    description: 'Santa Rosa Island hosts the rarest pine in North America.',
    flavor: 'Fewer than 3,000 Torrey pines survive on Earth, and this grove is one of just two populations. Document everything growing in their shade.',
    featuredBiomeId: 'santa-rosa-island',
    regionId: 'channel-islands',
    accent: '#4a8a4a',
    bonusNote: 'Featured biome: Santa Rosa Island',
    bonus: featured('santa-rosa-island'),
  },
];

// ── Region → events mapping ───────────────────────────────────────────

const REGION_EVENTS: Record<RegionId, SeasonalEvent[]> = {
  'marin-county': MARIN_EVENTS,
  'redwood-coast': REDWOOD_EVENTS,
  'sierra-nevada': SIERRA_EVENTS,
  'mojave-desert': MOJAVE_EVENTS,
  'channel-islands': CHANNEL_ISLANDS_EVENTS,
};

// All events in a flat list (for backward compat / global rotation)
export const ALL_EVENTS: SeasonalEvent[] = [
  ...MARIN_EVENTS,
  ...REDWOOD_EVENTS,
  ...SIERRA_EVENTS,
  ...MOJAVE_EVENTS,
  ...CHANNEL_ISLANDS_EVENTS,
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get the active event for a region. Each region rotates through its own event pool.
 * If no regionId is given, rotates through all events globally.
 */
export function getActiveEvent(now: Date = new Date(), regionId?: RegionId): SeasonalEvent {
  const weekNum = Math.floor(now.getTime() / WEEK_MS);
  const pool = regionId ? REGION_EVENTS[regionId] : ALL_EVENTS;
  return pool[weekNum % pool.length];
}

export function getEventTimeRemaining(now: Date = new Date()): { days: number; hours: number } {
  const weekNum = Math.floor(now.getTime() / WEEK_MS);
  const end = (weekNum + 1) * WEEK_MS;
  const diff = end - now.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return { days: Math.max(0, days), hours: Math.max(0, hours) };
}

/** Get all events for a specific region. */
export function getRegionEvents(regionId: RegionId): SeasonalEvent[] {
  return REGION_EVENTS[regionId];
}
