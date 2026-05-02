import type { TaxonomicGroup, Rarity, RegionId } from '@/types/game';
import { BIOMES } from '@/data/biomes';

export interface Weather {
  id: string;
  name: string;
  icon: string;
  temp: string; // "14°C", "18°C"
  humidity: string; // "72%"
  description: string;
  flavor: string;
  accent: string;
  // Spawn rate modifiers by taxonomic group (1 = normal, 1.5 = +50%, 0.7 = -30%)
  taxonModifiers: Partial<Record<TaxonomicGroup, number>>;
  // Flat bonus/penalty to rare+ species weight
  rarityBoost: Partial<Record<Rarity, number>>;
}

// ── Shared / Coastal (Marin County defaults) ──────────────────────────

const CLEAR_MORNING: Weather = {
  id: 'clear-morning',
  name: 'Clear Morning',
  icon: '☀️',
  temp: '16°C',
  humidity: '62%',
  description: 'Crisp coastal air with low humidity. Perfect visibility across the headlands.',
  flavor: 'Pollinators and raptors are active in the warming air.',
  accent: '#f4c14e',
  taxonModifiers: { insects: 1.4, birds: 1.3, plants: 1.1, reptiles: 1.2 },
  rarityBoost: {},
};

const COASTAL_FOG: Weather = {
  id: 'coastal-fog',
  name: 'Coastal Fog',
  icon: '🌫️',
  temp: '13°C',
  humidity: '95%',
  description: 'Thick marine layer rolls in from the Pacific, blanketing the shore.',
  flavor: 'Fungi and amphibians flourish in the damp understory.',
  accent: '#a8b8c8',
  taxonModifiers: { fungi: 1.7, amphibians: 1.5, plants: 1.2, insects: 0.7, birds: 0.6 },
  rarityBoost: { rare: 1.2 },
};

const RAINY: Weather = {
  id: 'rainy',
  name: 'Light Rain',
  icon: '🌧️',
  temp: '14°C',
  humidity: '88%',
  description: 'A steady rain soaks the forest floor and brings streams to life.',
  flavor: 'Amphibians and slugs emerge — ideal conditions for herpetology.',
  accent: '#6a8aaa',
  taxonModifiers: { amphibians: 1.8, fungi: 1.4, insects: 0.5, birds: 0.7 },
  rarityBoost: { rare: 1.3, 'ultra-rare': 1.2 },
};

const OVERCAST: Weather = {
  id: 'overcast',
  name: 'Overcast',
  icon: '☁️',
  temp: '15°C',
  humidity: '74%',
  description: 'Gray skies and calm winds. A muted day across the landscape.',
  flavor: 'Steady conditions. Nothing rare stirring, but nothing hiding either.',
  accent: '#8a9aaa',
  taxonModifiers: { mammals: 1.2 },
  rarityBoost: {},
};

const KING_TIDE: Weather = {
  id: 'king-tide',
  name: 'King Tide',
  icon: '🌊',
  temp: '14°C',
  humidity: '80%',
  description: 'Extreme low tides expose tidepools that normally stay submerged.',
  flavor: 'Marine invertebrates and seldom-seen species are accessible today.',
  accent: '#4aa8c8',
  taxonModifiers: { 'marine-invertebrates': 2.0, plants: 1.3 },
  rarityBoost: { rare: 1.5, 'ultra-rare': 1.4, legendary: 1.5 },
};

const WINDY: Weather = {
  id: 'windy',
  name: 'Coastal Wind',
  icon: '🌬️',
  temp: '15°C',
  humidity: '58%',
  description: 'Strong gusts off the ocean sweep the bluffs. Kites of raptors ride thermals.',
  flavor: 'Birds of prey are conspicuous; small insects are grounded.',
  accent: '#b8c8d8',
  taxonModifiers: { birds: 1.6, insects: 0.4, mammals: 0.9 },
  rarityBoost: { rare: 1.2 },
};

const WARM_SUN: Weather = {
  id: 'warm-sun',
  name: 'Warm Sun',
  icon: '🌤️',
  temp: '22°C',
  humidity: '55%',
  description: 'Unseasonably warm. The meadows and dunes buzz with life.',
  flavor: 'Reptiles bask on rocks; pollinators crowd the wildflowers.',
  accent: '#f4a83c',
  taxonModifiers: { reptiles: 1.7, insects: 1.5, plants: 1.2, amphibians: 0.6 },
  rarityBoost: { uncommon: 1.2 },
};

// ── Redwood Coast ─────────────────────────────────────────────────────

const OLD_GROWTH_MIST: Weather = {
  id: 'old-growth-mist',
  name: 'Old-Growth Mist',
  icon: '🌿',
  temp: '11°C',
  humidity: '97%',
  description: 'Fog drip condensing on ancient canopy. Every surface glistens.',
  flavor: 'Lichens and salamanders thrive in the perpetual damp. Look under logs.',
  accent: '#6a9a6a',
  taxonModifiers: { fungi: 1.8, amphibians: 1.6, plants: 1.4, insects: 0.8 },
  rarityBoost: { rare: 1.4, 'ultra-rare': 1.2 },
};

const RIVER_FOG: Weather = {
  id: 'river-fog',
  name: 'River Fog',
  icon: '💨',
  temp: '10°C',
  humidity: '93%',
  description: 'Cold fog pools along river canyons, muffling sound and cutting visibility.',
  flavor: 'River otters are active. Salmon are running just beneath the surface.',
  accent: '#8aaab0',
  taxonModifiers: { amphibians: 1.5, mammals: 1.4, fungi: 1.3, birds: 0.7 },
  rarityBoost: { uncommon: 1.3 },
};

const STORM_SURGE: Weather = {
  id: 'storm-surge',
  name: 'Storm Surge',
  icon: '⛈️',
  temp: '12°C',
  humidity: '90%',
  description: 'A Pacific storm drives huge swells onto the black-sand beaches.',
  flavor: 'Debris washes ashore — and with it, deep-ocean organisms seldom seen.',
  accent: '#5a7aaa',
  taxonModifiers: { 'marine-invertebrates': 1.8, mammals: 1.2, insects: 0.3, birds: 0.5 },
  rarityBoost: { rare: 1.5, 'ultra-rare': 1.3, legendary: 1.2 },
};

// ── Sierra Nevada ─────────────────────────────────────────────────────

const ALPINE_SUN: Weather = {
  id: 'alpine-sun',
  name: 'Alpine Sun',
  icon: '🏔️',
  temp: '8°C',
  humidity: '35%',
  description: 'Brilliant sunshine on granite. Thin air and UV-intense light.',
  flavor: 'Pikas dash between boulders. Marmots sun themselves on warm rock.',
  accent: '#c8b878',
  taxonModifiers: { mammals: 1.5, birds: 1.3, reptiles: 1.4, plants: 1.2 },
  rarityBoost: { uncommon: 1.2 },
};

const SNOWFALL: Weather = {
  id: 'snowfall',
  name: 'Mountain Snow',
  icon: '❄️',
  temp: '-2°C',
  humidity: '80%',
  description: 'Snow blankets the high country. The world goes quiet.',
  flavor: 'Most species take shelter — but tracks in fresh snow reveal who\'s here.',
  accent: '#d0e0f0',
  taxonModifiers: { mammals: 1.3, birds: 0.6, insects: 0.2, reptiles: 0.3, amphibians: 0.3 },
  rarityBoost: { rare: 1.4, 'ultra-rare': 1.3 },
};

const THUNDERSTORM: Weather = {
  id: 'thunderstorm',
  name: 'Sierra Thunder',
  icon: '⛈️',
  temp: '6°C',
  humidity: '82%',
  description: 'Anvil clouds build over the peaks. Lightning cracks along the ridgeline.',
  flavor: 'After each squall, amphibians and insects emerge in a frenzy of activity.',
  accent: '#7a6a9a',
  taxonModifiers: { amphibians: 1.7, insects: 1.3, fungi: 1.4, birds: 0.5 },
  rarityBoost: { rare: 1.3, 'ultra-rare': 1.2 },
};

const MOUNTAIN_WIND: Weather = {
  id: 'mountain-wind',
  name: 'Katabatic Wind',
  icon: '🌬️',
  temp: '4°C',
  humidity: '28%',
  description: 'Cold, dry wind pours downslope from the peaks. Brutal for small creatures.',
  flavor: 'Raptors ride the updrafts. Small mammals hunker down in dens.',
  accent: '#a0b0c0',
  taxonModifiers: { birds: 1.7, mammals: 0.7, insects: 0.4, plants: 0.8 },
  rarityBoost: { rare: 1.3 },
};

const MEADOW_BLOOM: Weather = {
  id: 'meadow-bloom',
  name: 'Meadow Bloom',
  icon: '🌸',
  temp: '18°C',
  humidity: '50%',
  description: 'Subalpine meadows erupt in wildflowers after the last snowmelt.',
  flavor: 'Every pollinator in the Sierra is here. Peak insect diversity.',
  accent: '#d89aca',
  taxonModifiers: { insects: 1.8, plants: 1.7, birds: 1.2, mammals: 1.1 },
  rarityBoost: { uncommon: 1.3, rare: 1.2 },
};

// ── Mojave Desert ─────────────────────────────────────────────────────

const SCORCHING_HEAT: Weather = {
  id: 'scorching-heat',
  name: 'Scorching Heat',
  icon: '🔥',
  temp: '44°C',
  humidity: '8%',
  description: 'Extreme heat radiates off the desert floor. Shade is survival.',
  flavor: 'Only the hardiest species are active. Reptiles rule the midday heat.',
  accent: '#e06030',
  taxonModifiers: { reptiles: 1.8, insects: 0.5, mammals: 0.4, birds: 0.6, amphibians: 0.1 },
  rarityBoost: { rare: 1.3, 'ultra-rare': 1.2 },
};

const DUST_STORM: Weather = {
  id: 'dust-storm',
  name: 'Dust Storm',
  icon: '🌪️',
  temp: '38°C',
  humidity: '12%',
  description: 'Wind whips sand across the playa. Visibility drops to metres.',
  flavor: 'Burrowing species shelter underground — but you might find fresh burrows.',
  accent: '#c8a060',
  taxonModifiers: { reptiles: 0.8, insects: 0.3, mammals: 0.5, birds: 0.3 },
  rarityBoost: { 'ultra-rare': 1.5, legendary: 1.3 },
};

const DESERT_BLOOM: Weather = {
  id: 'desert-bloom',
  name: 'Desert Superbloom',
  icon: '🌺',
  temp: '28°C',
  humidity: '45%',
  description: 'A rare rain has triggered a superbloom. The desert explodes with color.',
  flavor: 'Once-in-a-decade event. Everything emerges — plants, insects, reptiles, mammals.',
  accent: '#e8a0d0',
  taxonModifiers: { plants: 2.0, insects: 1.8, reptiles: 1.4, mammals: 1.3, birds: 1.3 },
  rarityBoost: { rare: 1.5, 'ultra-rare': 1.4, legendary: 1.5 },
};

const DESERT_CLEAR: Weather = {
  id: 'desert-clear',
  name: 'Desert Clear',
  icon: '☀️',
  temp: '34°C',
  humidity: '15%',
  description: 'Blazing sun on bone-dry rock. The classic Mojave day.',
  flavor: 'Lizards and roadrunners work the scrub. Check beneath Joshua trees.',
  accent: '#e8c060',
  taxonModifiers: { reptiles: 1.5, birds: 1.2, insects: 1.1, mammals: 0.8 },
  rarityBoost: {},
};

const COOL_DESERT_NIGHT: Weather = {
  id: 'cool-desert-night',
  name: 'Desert Twilight',
  icon: '🌙',
  temp: '18°C',
  humidity: '30%',
  description: 'The desert cools rapidly after sundown. Stars fill the sky.',
  flavor: 'Nocturnal mammals and arachnids emerge from their daytime retreats.',
  accent: '#4a5a8a',
  taxonModifiers: { mammals: 1.7, arachnids: 1.8, reptiles: 1.2, insects: 1.3, birds: 0.3 },
  rarityBoost: { rare: 1.3, 'ultra-rare': 1.2 },
};

const MONSOON: Weather = {
  id: 'monsoon',
  name: 'Desert Monsoon',
  icon: '⛈️',
  temp: '30°C',
  humidity: '70%',
  description: 'Towering thunderheads dump rain on the desert. Flash floods scour the washes.',
  flavor: 'Spadefoot toads emerge from underground. Fairy shrimp hatch in ephemeral pools.',
  accent: '#6a8ab0',
  taxonModifiers: { amphibians: 2.0, insects: 1.5, plants: 1.4, reptiles: 1.2 },
  rarityBoost: { rare: 1.4, 'ultra-rare': 1.3, legendary: 1.2 },
};

// ── Channel Islands ───────────────────────────────────────────────────

const MARINE_LAYER: Weather = {
  id: 'marine-layer',
  name: 'Marine Layer',
  icon: '🌫️',
  temp: '16°C',
  humidity: '90%',
  description: 'Low clouds hug the islands. Visibility to the mainland: zero.',
  flavor: 'Island foxes hunt boldly in the fog. Endemic plants glisten with moisture.',
  accent: '#8ab0c8',
  taxonModifiers: { mammals: 1.5, plants: 1.4, fungi: 1.3, birds: 0.8 },
  rarityBoost: { rare: 1.3, 'ultra-rare': 1.2 },
};

const SANTA_ANA: Weather = {
  id: 'santa-ana',
  name: 'Santa Ana Winds',
  icon: '🌬️',
  temp: '30°C',
  humidity: '10%',
  description: 'Hot, dry winds scream down from the mainland. Fire weather.',
  flavor: 'Vagrant birds blown offshore appear on the islands. Rare sightings possible.',
  accent: '#e08040',
  taxonModifiers: { birds: 1.8, reptiles: 1.3, insects: 0.6, mammals: 0.8 },
  rarityBoost: { rare: 1.4, 'ultra-rare': 1.5, legendary: 1.3 },
};

const KELP_SURGE: Weather = {
  id: 'kelp-surge',
  name: 'Kelp Forest Surge',
  icon: '🌊',
  temp: '15°C',
  humidity: '85%',
  description: 'Cool upwelling floods the kelp forests with nutrient-rich water.',
  flavor: 'Marine diversity peaks. Giant kelp canopies teem with life from every phylum.',
  accent: '#3a9a7a',
  taxonModifiers: { 'marine-invertebrates': 2.0, plants: 1.3, microorganisms: 1.4 },
  rarityBoost: { rare: 1.5, 'ultra-rare': 1.4, legendary: 1.5 },
};

const PACIFIC_CALM: Weather = {
  id: 'pacific-calm',
  name: 'Pacific Calm',
  icon: '🌅',
  temp: '20°C',
  humidity: '65%',
  description: 'Glassy seas and golden light. The islands at their most inviting.',
  flavor: 'Perfect survey conditions. Every taxon is active and accessible.',
  accent: '#f0c060',
  taxonModifiers: { birds: 1.3, mammals: 1.2, 'marine-invertebrates': 1.3, insects: 1.2, plants: 1.1 },
  rarityBoost: { uncommon: 1.2 },
};

// ── All weather types (flat list for backward compat) ─────────────────

export const WEATHER_TYPES: Weather[] = [
  // Shared / Marin
  CLEAR_MORNING, COASTAL_FOG, RAINY, OVERCAST, KING_TIDE, WINDY, WARM_SUN,
  // Redwood Coast
  OLD_GROWTH_MIST, RIVER_FOG, STORM_SURGE,
  // Sierra Nevada
  ALPINE_SUN, SNOWFALL, THUNDERSTORM, MOUNTAIN_WIND, MEADOW_BLOOM,
  // Mojave Desert
  SCORCHING_HEAT, DUST_STORM, DESERT_BLOOM, DESERT_CLEAR, COOL_DESERT_NIGHT, MONSOON,
  // Channel Islands
  MARINE_LAYER, SANTA_ANA, KELP_SURGE, PACIFIC_CALM,
];

// ── Region → weather pool mapping ─────────────────────────────────────

const REGION_WEATHER: Record<RegionId, Weather[]> = {
  'marin-county': [CLEAR_MORNING, COASTAL_FOG, RAINY, OVERCAST, KING_TIDE, WINDY, WARM_SUN],
  'redwood-coast': [OLD_GROWTH_MIST, COASTAL_FOG, RAINY, RIVER_FOG, STORM_SURGE, OVERCAST, WARM_SUN],
  'sierra-nevada': [ALPINE_SUN, SNOWFALL, THUNDERSTORM, MOUNTAIN_WIND, MEADOW_BLOOM, OVERCAST, CLEAR_MORNING],
  'mojave-desert': [SCORCHING_HEAT, DUST_STORM, DESERT_BLOOM, DESERT_CLEAR, COOL_DESERT_NIGHT, MONSOON, WARM_SUN],
  'channel-islands': [MARINE_LAYER, SANTA_ANA, KELP_SURGE, PACIFIC_CALM, OVERCAST, CLEAR_MORNING, WINDY],
};

// ── Hash utility ──────────────────────────────────────────────────────

// FNV-1a hash for deterministic daily selection
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ── Public API ────────────────────────────────────────────────────────

/** Global "today's weather" — defaults to Marin pool. Pass a regionId for region-specific. */
export function getTodayWeather(date: Date = new Date(), regionId?: RegionId): Weather {
  const pool = regionId ? REGION_WEATHER[regionId] : REGION_WEATHER['marin-county'];
  const key = `${regionId ?? 'global'}-${date.toISOString().slice(0, 10)}`;
  const idx = hashString(key) % pool.length;
  return pool[idx];
}

/**
 * Per-biome weather, deterministic by biomeId+date.
 * Automatically picks from the biome's region pool so desert biomes never get "Coastal Fog".
 */
export function getBiomeWeather(biomeId: string, date: Date = new Date()): Weather {
  const biome = BIOMES.find(b => b.id === biomeId);
  const regionId = biome?.regionId ?? 'marin-county';
  const pool = REGION_WEATHER[regionId];
  const key = `${biomeId}-${date.toISOString().slice(0, 10)}`;
  const idx = hashString(key) % pool.length;
  return pool[idx];
}

export function getWeatherById(id: string): Weather | undefined {
  return WEATHER_TYPES.find(w => w.id === id);
}

/** Returns the weather pool for a given region. */
export function getRegionWeatherPool(regionId: RegionId): Weather[] {
  return REGION_WEATHER[regionId];
}

// Returns the modifier for a given species under current weather
export function getWeatherModifier(weather: Weather, taxon: TaxonomicGroup, rarity: Rarity): number {
  const taxonMod = weather.taxonModifiers[taxon] ?? 1;
  const rarityMod = weather.rarityBoost[rarity] ?? 1;
  return taxonMod * rarityMod;
}
