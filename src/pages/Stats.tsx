import { SPECIES } from '@/data/species';
import { BIOMES, getBiomeSpeciesCount } from '@/data/biomes';
import { RARITY_COLORS, RARITY_LABELS, type Rarity, type TaxonomicGroup } from '@/types/game';
import type { GameState } from '@/types/game';

interface StatsProps {
  state: GameState;
  onNavigate: (page: string) => void;
}

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'ultra-rare', 'legendary'];

const TAXON_LABELS: Record<TaxonomicGroup, string> = {
  insects: 'Insects',
  arachnids: 'Arachnids',
  fungi: 'Fungi',
  plants: 'Plants',
  amphibians: 'Amphibians',
  reptiles: 'Reptiles',
  birds: 'Birds',
  mammals: 'Mammals',
  'marine-invertebrates': 'Marine Inverts.',
  microorganisms: 'Microorganisms',
};

const TAXON_EMOJI: Record<TaxonomicGroup, string> = {
  insects: '🦋',
  arachnids: '🕷️',
  fungi: '🍄',
  plants: '🌿',
  amphibians: '🐸',
  reptiles: '🦎',
  birds: '🐦',
  mammals: '🦌',
  'marine-invertebrates': '🦀',
  microorganisms: '🔬',
};

export default function Stats({ state, onNavigate }: StatsProps) {
  // Rarity breakdown
  const rarityCounts: Record<Rarity, { discovered: number; total: number }> = {
    common: { discovered: 0, total: 0 },
    uncommon: { discovered: 0, total: 0 },
    rare: { discovered: 0, total: 0 },
    'ultra-rare': { discovered: 0, total: 0 },
    legendary: { discovered: 0, total: 0 },
  };

  for (const sp of SPECIES) {
    rarityCounts[sp.rarity].total++;
    if (state.discoveredSpecies.includes(sp.id)) {
      rarityCounts[sp.rarity].discovered++;
    }
  }

  // Taxonomic group breakdown
  const taxonCounts = new Map<TaxonomicGroup, { discovered: number; total: number }>();
  for (const sp of SPECIES) {
    const curr = taxonCounts.get(sp.taxonomicGroup) || { discovered: 0, total: 0 };
    curr.total++;
    if (state.discoveredSpecies.includes(sp.id)) curr.discovered++;
    taxonCounts.set(sp.taxonomicGroup, curr);
  }
  const taxonEntries = Array.from(taxonCounts.entries())
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total);

  // Biome breakdown
  const biomeStats = BIOMES.map(b => {
    const discovered = state.discoveredSpecies.filter(
      sid => SPECIES.find(s => s.id === sid)?.biomeIds.includes(b.id)
    ).length;
    return { ...b, discovered, totalSpecies: getBiomeSpeciesCount(b.id) };
  });

  // Sampling method breakdown (from specimens collected)
  const methodCounts = new Map<string, number>();
  for (const spec of state.specimens) {
    methodCounts.set(spec.samplingMethod, (methodCounts.get(spec.samplingMethod) || 0) + 1);
  }
  const methodEntries = Array.from(methodCounts.entries()).sort((a, b) => b[1] - a[1]);

  const totalSpecies = SPECIES.length;
  const discoveredPct = Math.round((state.discoveredSpecies.length / totalSpecies) * 100);
  const identificationRate = state.stats.totalCollected > 0
    ? Math.round((state.stats.totalIdentified / state.stats.totalCollected) * 100)
    : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1610' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: '#2a4030', background: '#0c1a12' }}>
        <button
          onClick={() => onNavigate('hq')}
          className="text-sm"
          style={{ color: '#c9a84c' }}
        >
          ← HQ
        </button>
        <h2 className="text-sm font-semibold" style={{ color: '#e8e4d8', fontFamily: "'Outfit', sans-serif" }}>
          Research Statistics
        </h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Overall Progress */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(135deg, #1a3520, #14231a)',
            border: '1px solid #c9a84c40',
          }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: '#5a7a5a', letterSpacing: '1px' }}>
            BIODIVERSITY INDEX
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
              {discoveredPct}%
            </span>
            <span className="text-sm" style={{ color: '#8aaa7a' }}>
              of known species catalogued
            </span>
          </div>
          <div className="w-full h-2 rounded-full mb-3" style={{ background: '#0c1a12' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${discoveredPct}%`,
                background: 'linear-gradient(90deg, #c9a84c, #4a8a4a)',
              }}
            />
          </div>
          <div className="text-xs" style={{ color: '#8aaa7a' }}>
            {state.discoveredSpecies.length} of {totalSpecies} species identified
          </div>
        </div>

        {/* Key Numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Specimens Collected" value={state.stats.totalCollected} color="#e8e4d8" />
          <StatCard label="Lab Identifications" value={state.stats.totalIdentified} color="#4a8a4a" />
          <StatCard label="ID Success Rate" value={`${identificationRate}%`} color="#60a5fa" />
          <StatCard label="Expeditions" value={state.stats.expeditionsCompleted} color="#c9a84c" />
        </div>

        {/* Rarity Breakdown */}
        <div className="rounded-xl p-4" style={{ background: '#14231a', border: '1px solid #2a4030' }}>
          <div className="text-xs font-semibold mb-3" style={{ color: '#5a7a5a', letterSpacing: '1px' }}>
            DISCOVERY BY RARITY
          </div>
          <div className="space-y-3">
            {RARITY_ORDER.map(rarity => {
              const { discovered, total } = rarityCounts[rarity];
              if (total === 0) return null;
              const pct = total > 0 ? (discovered / total) * 100 : 0;
              return (
                <div key={rarity}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: RARITY_COLORS[rarity] }}>
                      {RARITY_LABELS[rarity]}
                    </span>
                    <span className="text-xs font-mono" style={{ color: '#8aaa7a' }}>
                      {discovered}/{total}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: '#0c1a12' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: RARITY_COLORS[rarity],
                        boxShadow: pct > 0 ? `0 0 8px ${RARITY_COLORS[rarity]}80` : 'none',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Taxonomic Groups */}
        <div className="rounded-xl p-4" style={{ background: '#14231a', border: '1px solid #2a4030' }}>
          <div className="text-xs font-semibold mb-3" style={{ color: '#5a7a5a', letterSpacing: '1px' }}>
            TAXONOMIC DIVERSITY
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {taxonEntries.map(([group, { discovered, total }]) => {
              const pct = total > 0 ? (discovered / total) * 100 : 0;
              return (
                <div
                  key={group}
                  className="rounded-lg p-2.5"
                  style={{
                    background: '#0c1a12',
                    border: `1px solid ${discovered > 0 ? '#4a8a4a40' : '#1a2a20'}`,
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-base">{TAXON_EMOJI[group]}</span>
                    <span className="text-xs font-semibold flex-1 truncate" style={{ color: '#e8e4d8' }}>
                      {TAXON_LABELS[group]}
                    </span>
                    <span className="text-xs font-mono" style={{ color: '#5a7a5a' }}>
                      {discovered}/{total}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full" style={{ background: '#1a2a20' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: '#4a8a4a' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Biome Completion */}
        <div className="rounded-xl p-4" style={{ background: '#14231a', border: '1px solid #2a4030' }}>
          <div className="text-xs font-semibold mb-3" style={{ color: '#5a7a5a', letterSpacing: '1px' }}>
            BIOME COMPLETION
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
            {biomeStats.map(biome => {
              const pct = biome.totalSpecies > 0 ? (biome.discovered / biome.totalSpecies) * 100 : 0;
              const isUnlocked = state.unlockedBiomes.includes(biome.id);
              return (
                <div key={biome.id} className="flex items-center gap-3">
                  <div className="text-xl" style={{ opacity: isUnlocked ? 1 : 0.3 }}>
                    {biome.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold truncate" style={{ color: isUnlocked ? '#e8e4d8' : '#5a7a5a' }}>
                        {biome.name} {!isUnlocked && '🔒'}
                      </span>
                      <span className="text-xs font-mono" style={{ color: '#8aaa7a' }}>
                        {biome.discovered}/{biome.totalSpecies}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: '#0c1a12' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: pct >= 100 ? 'linear-gradient(90deg, #c9a84c, #4a8a4a)' : '#4a8a4a',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sampling Methods */}
        {methodEntries.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: '#14231a', border: '1px solid #2a4030' }}>
            <div className="text-xs font-semibold mb-3" style={{ color: '#5a7a5a', letterSpacing: '1px' }}>
              SAMPLING METHOD USE
            </div>
            <div className="space-y-2">
              {methodEntries.map(([method, count]) => {
                const maxCount = methodEntries[0][1];
                const pct = (count / maxCount) * 100;
                const label = method.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
                return (
                  <div key={method}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: '#e8e4d8' }}>{label}</span>
                      <span className="font-mono" style={{ color: '#8aaa7a' }}>{count}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: '#0c1a12' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: '#60a5fa' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Field Activity */}
        <div className="rounded-xl p-4" style={{ background: '#14231a', border: '1px solid #2a4030' }}>
          <div className="text-xs font-semibold mb-3" style={{ color: '#5a7a5a', letterSpacing: '1px' }}>
            RESEARCH LOG
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <LogRow label="Field notes" value={state.fieldNotes.length} />
            <LogRow label="Achievements" value={`${state.achievements.length}/14`} />
            <LogRow label="Biomes unlocked" value={`${state.unlockedBiomes.length}/${BIOMES.length}`} />
            <LogRow label="Credits earned" value={`💰 ${state.bioCredits}`} />
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#14231a', border: '1px solid #2a4030' }}>
      <div className="text-xs" style={{ color: '#5a7a5a' }}>{label}</div>
      <div
        className="text-2xl font-bold mt-1"
        style={{ color, fontFamily: 'Georgia, serif' }}
      >
        {value}
      </div>
    </div>
  );
}

function LogRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: '#8aaa7a' }}>{label}</span>
      <span className="font-semibold" style={{ color: '#e8e4d8' }}>{value}</span>
    </div>
  );
}
