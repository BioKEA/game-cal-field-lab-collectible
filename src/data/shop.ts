export interface ShopItem {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: 'reagent' | 'equipment' | 'upgrade';
  price: number;
  effect: {
    type: 'add-reagent' | 'upgrade-stat' | 'unlock-biome' | 'refuel';
    key?: string;
    amount?: number;
  };
  rankRequired?: string;
  /** Tier of the target region — biome can only be purchased when isTierUnlocked(tier) is true */
  tierRequired?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  // Reagents
  {
    id: 'extraction-kit-5',
    name: 'Extraction Kit ×5',
    description: 'DNA extraction reagents for the epMotion 5075 liquid handler',
    emoji: '🧪',
    category: 'reagent',
    price: 25,
    effect: { type: 'add-reagent', key: 'extractionKits', amount: 5 },
  },
  {
    id: 'pcr-primer-5',
    name: 'PCR Primer ×5',
    description: 'Oligonucleotide primers for polymerase chain reaction amplification',
    emoji: '🔄',
    category: 'reagent',
    price: 25,
    effect: { type: 'add-reagent', key: 'pcrPrimers', amount: 5 },
  },
  {
    id: 'flow-cell-1',
    name: 'Flow Cell ×1',
    description: 'MinION/PromethION nanopore flow cell for DNA sequencing',
    emoji: '🧬',
    category: 'reagent',
    price: 40,
    effect: { type: 'add-reagent', key: 'flowCells', amount: 1 },
  },
  {
    id: 'flow-cell-3',
    name: 'Flow Cell ×3',
    description: 'Bulk nanopore flow cells — better value',
    emoji: '🧬',
    category: 'reagent',
    price: 100,
    effect: { type: 'add-reagent', key: 'flowCells', amount: 3 },
  },
  // Equipment Upgrades
  {
    id: 'stamina-boost',
    name: 'Field Endurance Training',
    description: 'Increase max stamina by 25. More samples per expedition.',
    emoji: '⚡',
    category: 'upgrade',
    price: 100,
    effect: { type: 'upgrade-stat', key: 'maxStamina', amount: 25 },
  },
  {
    id: 'fuel-tank',
    name: 'Extended Fuel Tank',
    description: 'Increase max expedition fuel by 2. Travel further.',
    emoji: '⛽',
    category: 'upgrade',
    price: 150,
    effect: { type: 'upgrade-stat', key: 'maxExpeditionFuel', amount: 2 },
  },
  {
    id: 'refuel',
    name: 'Emergency Fuel Canister',
    description: 'Instantly refill all expedition fuel',
    emoji: '🛢️',
    category: 'equipment',
    price: 25,
    effect: { type: 'refuel' },
  },
  // Biome Unlocks
  {
    id: 'unlock-point-reyes',
    name: 'Point Reyes Permit',
    description: 'Access the Point Reyes National Seashore field site',
    emoji: '🦅',
    category: 'equipment',
    price: 200,
    effect: { type: 'unlock-biome', key: 'point-reyes' },
    rankRequired: 'junior-explorer',
  },
  {
    id: 'unlock-bolinas',
    name: 'Bolinas Lagoon Pass',
    description: 'Access the Bolinas Lagoon estuary research station',
    emoji: '🦭',
    category: 'equipment',
    price: 300,
    effect: { type: 'unlock-biome', key: 'bolinas-lagoon' },
    rankRequired: 'field-researcher',
  },
  {
    id: 'unlock-tomales',
    name: 'Tomales Bay Access',
    description: 'Access the Tomales Bay estuary — oyster beds, seal haul-outs, and herring spawn grounds',
    emoji: '🌊',
    category: 'equipment',
    price: 450,
    effect: { type: 'unlock-biome', key: 'tomales-bay' },
    rankRequired: 'lead-scientist',
  },

  // ═══ TIER 2 — REDWOOD COAST ═══
  {
    id: 'unlock-humboldt',
    name: 'Humboldt Redwoods Permit',
    description: 'Access the largest old-growth redwood forest on Earth',
    emoji: '🌲',
    category: 'equipment',
    price: 350,
    effect: { type: 'unlock-biome', key: 'humboldt-redwoods' },
    rankRequired: 'field-researcher',
    tierRequired: 2,
  },
  {
    id: 'unlock-lost-coast',
    name: 'Lost Coast Permit',
    description: "Access California's wildest coastline — black-sand beaches and Roosevelt elk",
    emoji: '🏖️',
    category: 'equipment',
    price: 400,
    effect: { type: 'unlock-biome', key: 'lost-coast' },
    rankRequired: 'field-researcher',
    tierRequired: 2,
  },
  {
    id: 'unlock-klamath',
    name: 'Klamath River Permit',
    description: 'Access the Klamath River salmon run — eagles, otters, and ancient lamprey',
    emoji: '🐟',
    category: 'equipment',
    price: 400,
    effect: { type: 'unlock-biome', key: 'klamath-river' },
    rankRequired: 'field-researcher',
    tierRequired: 2,
  },

  // ═══ TIER 3 — SIERRA NEVADA ═══
  {
    id: 'unlock-yosemite',
    name: 'Yosemite Valley Permit',
    description: 'Access Yosemite Valley — granite walls, black bears, and golden trout',
    emoji: '🏔️',
    category: 'equipment',
    price: 500,
    effect: { type: 'unlock-biome', key: 'yosemite-valley' },
    rankRequired: 'lead-scientist',
    tierRequired: 3,
  },
  {
    id: 'unlock-high-country',
    name: 'Sierra High Country Pass',
    description: 'Access the alpine tundra above treeline — pikas, marmots, and golden trout',
    emoji: '⛰️',
    category: 'equipment',
    price: 550,
    effect: { type: 'unlock-biome', key: 'sierra-high-country' },
    rankRequired: 'lead-scientist',
    tierRequired: 3,
  },
  {
    id: 'unlock-sequoia-grove',
    name: 'Giant Sequoia Grove Permit',
    description: 'Access the Giant Forest — the largest trees on Earth',
    emoji: '🌳',
    category: 'equipment',
    price: 550,
    effect: { type: 'unlock-biome', key: 'giant-sequoia-grove' },
    rankRequired: 'lead-scientist',
    tierRequired: 3,
  },
  {
    id: 'unlock-mono-lake',
    name: 'Mono Lake Research Pass',
    description: 'Access a million-year-old alkaline lake — brine shrimp, tufa towers, and 2 million grebes',
    emoji: '🧪',
    category: 'equipment',
    price: 500,
    effect: { type: 'unlock-biome', key: 'mono-lake' },
    rankRequired: 'lead-scientist',
    tierRequired: 3,
  },

  // ═══ TIER 4 — MOJAVE DESERT ═══
  {
    id: 'unlock-joshua-tree',
    name: 'Joshua Tree Research Permit',
    description: 'Access Joshua Tree National Park — yucca moths, desert tortoises, and chuckwallas',
    emoji: '🌵',
    category: 'equipment',
    price: 650,
    effect: { type: 'unlock-biome', key: 'joshua-tree' },
    rankRequired: 'lead-scientist',
    tierRequired: 4,
  },
  {
    id: 'unlock-death-valley',
    name: 'Death Valley Expedition Pass',
    description: 'Access the hottest place on Earth — pupfish, sidewinders, and relict lizards',
    emoji: '🏜️',
    category: 'equipment',
    price: 700,
    effect: { type: 'unlock-biome', key: 'death-valley' },
    rankRequired: 'lead-scientist',
    tierRequired: 4,
  },
  {
    id: 'unlock-mojave-preserve',
    name: 'Mojave Preserve Permit',
    description: 'Access the Mojave National Preserve — Gila monsters, booming dunes, and kit foxes',
    emoji: '🦎',
    category: 'equipment',
    price: 650,
    effect: { type: 'unlock-biome', key: 'mojave-preserve' },
    rankRequired: 'lead-scientist',
    tierRequired: 4,
  },

  // ═══ TIER 5 — CHANNEL ISLANDS ═══
  {
    id: 'unlock-santa-cruz',
    name: 'Santa Cruz Island Boat Charter',
    description: "Access California's Galápagos — island foxes, scrub jays, and ironwood relicts",
    emoji: '🦊',
    category: 'equipment',
    price: 800,
    effect: { type: 'unlock-biome', key: 'santa-cruz-island' },
    rankRequired: 'lab-director',
    tierRequired: 5,
  },
  {
    id: 'unlock-anacapa',
    name: 'Anacapa Kelp Forest Dive Pass',
    description: 'Access the kelp forest — garibaldi, moray eels, and the largest pelican rookery on the coast',
    emoji: '🐠',
    category: 'equipment',
    price: 850,
    effect: { type: 'unlock-biome', key: 'anacapa-kelp-forest' },
    rankRequired: 'lab-director',
    tierRequired: 5,
  },
  {
    id: 'unlock-santa-rosa',
    name: 'Santa Rosa Island Expedition',
    description: 'Access the rarest pine in North America and the recovered island fox population',
    emoji: '🌾',
    category: 'equipment',
    price: 900,
    effect: { type: 'unlock-biome', key: 'santa-rosa-island' },
    rankRequired: 'lab-director',
    tierRequired: 5,
  },
];
