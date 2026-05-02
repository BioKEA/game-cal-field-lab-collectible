export interface Researcher {
  id: string;
  name: string;
  title: string;
  avatar: string;
  specialty: string;
  bio: string;
  accent: string;
}

export const RESEARCHERS: Researcher[] = [
  {
    id: 'chen',
    name: 'Dr. Mei Chen',
    title: 'Marine Biologist',
    avatar: '🥼',
    specialty: 'Intertidal invertebrates',
    bio: 'Twenty years cataloguing sea stars and urchins along the Pacific coast. Runs the Stinson tidepool monitoring program.',
    accent: '#60a5fa',
  },
  {
    id: 'rivera',
    name: 'Prof. Julia Rivera',
    title: 'Mycologist',
    avatar: '🧑‍🔬',
    specialty: 'Fungi & lichens',
    bio: 'Documenting coast redwood-associated fungi at Muir Woods. Author of the Marin County Mycology Atlas.',
    accent: '#c9a84c',
  },
  {
    id: 'yamamoto',
    name: 'Dr. Kenji Yamamoto',
    title: 'Entomologist',
    avatar: '👨‍🔬',
    specialty: 'Pollinators',
    bio: 'Leads the overwintering monarch butterfly census. Obsessed with coastal dune beetles.',
    accent: '#e89a3c',
  },
  {
    id: 'okafor',
    name: 'Dr. Amara Okafor',
    title: 'Ornithologist',
    avatar: '👩‍🔬',
    specialty: 'Raptors & shorebirds',
    bio: 'Runs the Point Reyes bird banding station. Has seen every raptor species in Marin County at least twice.',
    accent: '#f5b342',
  },
  {
    id: 'patel',
    name: 'Dr. Priya Patel',
    title: 'Herpetologist',
    avatar: '🧑‍🔬',
    specialty: 'Amphibians & reptiles',
    bio: 'DNA-barcodes salamanders faster than anyone else in the state. Secretly hopes to find a new species.',
    accent: '#4a8a4a',
  },
  {
    id: 'lindqvist',
    name: 'Dr. Astrid Lindqvist',
    title: 'Botanist',
    avatar: '🧑‍🌾',
    specialty: 'Native flora',
    bio: 'Tracks endemic plants in the coastal scrub. Carries a hand lens on a lanyard at all times.',
    accent: '#4a8a4a',
  },
  {
    id: 'torres',
    name: 'Marcus Torres',
    title: 'Field Technician',
    avatar: '👷',
    specialty: 'Marine mammals',
    bio: 'Harbor seal population surveys and kayak-based wildlife photography. Started as a volunteer.',
    accent: '#7dd3c0',
  },
  {
    id: 'hassan',
    name: 'Dr. Layla Hassan',
    title: 'Limnologist',
    avatar: '👩‍🔬',
    specialty: 'Freshwater ecosystems',
    bio: 'Studies stream invertebrates in Muir Woods. Holds the team record for most specimens processed in a day.',
    accent: '#60a5fa',
  },
];

export function getResearcherById(id: string): Researcher | undefined {
  return RESEARCHERS.find(r => r.id === id);
}

// Deterministic PRNG for weekly leaderboard
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  title: string;
  avatar: string;
  specialty: string;
  accent: string;
  weeklyXp: number;
  isPlayer: boolean;
  trend: 'up' | 'down' | 'flat';
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getWeeklyLeaderboard(
  playerXp: number,
  playerName: string = 'You',
  now: Date = new Date(),
): LeaderboardEntry[] {
  const weekNum = Math.floor(now.getTime() / WEEK_MS);
  const rnd = mulberry32(weekNum * 7919);
  const prevRnd = mulberry32((weekNum - 1) * 7919);

  const entries: LeaderboardEntry[] = RESEARCHERS.map(r => {
    const curr = Math.floor(500 + rnd() * 3800);
    const prev = Math.floor(500 + prevRnd() * 3800);
    const trend: LeaderboardEntry['trend'] =
      curr > prev + 100 ? 'up' : curr < prev - 100 ? 'down' : 'flat';
    return {
      id: r.id,
      name: r.name,
      title: r.title,
      avatar: r.avatar,
      specialty: r.specialty,
      accent: r.accent,
      weeklyXp: curr,
      isPlayer: false,
      trend,
    };
  });

  entries.push({
    id: 'player',
    name: playerName,
    title: 'You',
    avatar: '🧬',
    specialty: 'Field research',
    accent: '#c9a84c',
    weeklyXp: playerXp,
    isPlayer: true,
    trend: 'up',
  });

  return entries.sort((a, b) => b.weeklyXp - a.weeklyXp);
}

export function getWeekTimeRemaining(now: Date = new Date()): { days: number; hours: number } {
  const weekNum = Math.floor(now.getTime() / WEEK_MS);
  const end = (weekNum + 1) * WEEK_MS;
  const diff = end - now.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  return { days: Math.max(0, days), hours: Math.max(0, hours) };
}
