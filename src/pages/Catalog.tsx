import { useState, useMemo, useCallback } from 'react';
import { SPECIES } from '@/data/species';
import { BIOMES } from '@/data/biomes';
import { RARITY_COLORS, RARITY_LABELS, SAMPLING_METHOD_INFO } from '@/types/game';
import type { GameState, TaxonomicGroup, Rarity, Species } from '@/types/game';
import DNABarcodeViewer from '@/components/DNABarcodeViewer';

interface CatalogProps {
  state: GameState;
  onNavigate: (page: string) => void;
}

const TAXONOMY_GROUPS: { key: TaxonomicGroup; label: string; emoji: string }[] = [
  { key: 'insects', label: 'Insects', emoji: '🦋' },
  { key: 'arachnids', label: 'Arachnids', emoji: '🕷️' },
  { key: 'amphibians', label: 'Amphibians', emoji: '🐸' },
  { key: 'reptiles', label: 'Reptiles', emoji: '🦎' },
  { key: 'fungi', label: 'Fungi', emoji: '🍄' },
  { key: 'marine-invertebrates', label: 'Marine Invertebrates', emoji: '🦀' },
  { key: 'plants', label: 'Plants', emoji: '🌿' },
  { key: 'birds', label: 'Birds', emoji: '🐦' },
  { key: 'mammals', label: 'Mammals', emoji: '🦌' },
  { key: 'microorganisms', label: 'Microorganisms', emoji: '🔬' },
];

const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'ultra-rare', 'legendary'];

type ViewMode = 'taxonomy' | 'all';
type DiscoveryFilter = 'all' | 'discovered' | 'undiscovered';
type SortMode = 'name' | 'rarity' | 'recent';

export default function Catalog({ state, onNavigate }: CatalogProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('taxonomy');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all');
  const [filterBiome, setFilterBiome] = useState<string | 'all'>('all');
  const [filterDiscovery, setFilterDiscovery] = useState<DiscoveryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');

  const discoveredSet = useMemo(() => new Set(state.discoveredSpecies), [state.discoveredSpecies]);
  const totalSpecies = SPECIES.length;
  const discoveredCount = discoveredSet.size;
  const completionPct = Math.round((discoveredCount / totalSpecies) * 100);

  const selectedSpecies = selectedSpeciesId ? SPECIES.find(s => s.id === selectedSpeciesId) : null;
  const isDiscovered = selectedSpecies ? discoveredSet.has(selectedSpecies.id) : false;

  const searchLower = searchQuery.toLowerCase().trim();

  // Filter application
  const filterSpecies = (list: Species[]) => {
    return list.filter(s => {
      if (filterRarity !== 'all' && s.rarity !== filterRarity) return false;
      if (filterBiome !== 'all' && !s.biomeIds.includes(filterBiome)) return false;
      const isDisc = discoveredSet.has(s.id);
      if (filterDiscovery === 'discovered' && !isDisc) return false;
      if (filterDiscovery === 'undiscovered' && isDisc) return false;
      if (searchLower && isDisc) {
        if (!s.commonName.toLowerCase().includes(searchLower) && !s.scientificName.toLowerCase().includes(searchLower)) return false;
      } else if (searchLower && !isDisc) {
        return false;
      }
      return true;
    });
  };

  const sortSpecies = useCallback((list: Species[]) => {
    const sorted = [...list];
    switch (sortMode) {
      case 'rarity':
        sorted.sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));
        break;
      case 'recent':
        sorted.sort((a, b) => {
          const aDisc = discoveredSet.has(a.id);
          const bDisc = discoveredSet.has(b.id);
          if (aDisc && !bDisc) return -1;
          if (!aDisc && bDisc) return 1;
          if (!aDisc && !bDisc) return 0;
          const aSpec = state.specimens.filter(s => s.speciesId === a.id);
          const bSpec = state.specimens.filter(s => s.speciesId === b.id);
          const aLatest = aSpec.length > 0 ? Math.max(...aSpec.map(s => new Date(s.collectedAt).getTime())) : 0;
          const bLatest = bSpec.length > 0 ? Math.max(...bSpec.map(s => new Date(s.collectedAt).getTime())) : 0;
          return bLatest - aLatest;
        });
        break;
      default:
        sorted.sort((a, b) => {
          const aDisc = discoveredSet.has(a.id);
          const bDisc = discoveredSet.has(b.id);
          if (aDisc && !bDisc) return -1;
          if (!aDisc && bDisc) return 1;
          const aName = aDisc ? a.commonName : 'zzz';
          const bName = bDisc ? b.commonName : 'zzz';
          return aName.localeCompare(bName);
        });
    }
    return sorted;
  }, [sortMode, discoveredSet, state.specimens]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredAll = useMemo(() => sortSpecies(filterSpecies(SPECIES)), [filterRarity, filterBiome, filterDiscovery, discoveredSet, searchLower, sortMode, state.specimens]);
  const hasActiveFilters = filterRarity !== 'all' || filterBiome !== 'all' || filterDiscovery !== 'all' || searchQuery !== '';

  // Specimens of selected species
  const selectedSpecimens = selectedSpecies
    ? state.specimens.filter(s => s.speciesId === selectedSpecies.id)
    : [];
  const bestMatch = selectedSpecimens
    .filter(s => s.matchPercent !== undefined)
    .sort((a, b) => (b.matchPercent || 0) - (a.matchPercent || 0))[0];
  const firstCollection = selectedSpecimens
    .slice()
    .sort((a, b) => a.collectedAt.localeCompare(b.collectedAt))[0];

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
          Collection Catalog
        </h2>
        <div className="text-xs" style={{ color: '#8aaa7a' }}>
          {discoveredCount}/{totalSpecies}
        </div>
      </div>

      {/* Species Detail Overlay */}
      {selectedSpecies && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(10,22,16,0.85)' }}
          onClick={() => setSelectedSpeciesId(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl max-h-[85vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, #14231a, #0f1f15)',
              border: `1px solid ${isDiscovered ? RARITY_COLORS[selectedSpecies.rarity] + '60' : '#2a4030'}`,
              borderBottom: 'none',
              boxShadow: isDiscovered ? `0 -10px 60px ${RARITY_COLORS[selectedSpecies.rarity]}20` : 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sticky header inside modal */}
            <div
              className="sticky top-0 z-10 px-5 pt-5 pb-3"
              style={{ background: 'linear-gradient(180deg, #14231a 70%, transparent)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="text-5xl"
                    style={{ filter: isDiscovered ? `drop-shadow(0 0 12px ${RARITY_COLORS[selectedSpecies.rarity]}40)` : 'none' }}
                  >
                    {isDiscovered ? selectedSpecies.emoji : '❓'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-bold truncate" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
                      {isDiscovered ? selectedSpecies.commonName : '???'}
                    </div>
                    <div className="text-xs italic truncate" style={{ color: '#8aaa7a' }}>
                      {isDiscovered ? selectedSpecies.scientificName : 'Not yet discovered'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSpeciesId(null)}
                  className="text-lg ml-2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ color: '#5a7a5a', background: '#0c1a12' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="px-5 pb-6">
              {isDiscovered ? (
                <>
                  {/* Rarity badge + taxonomy */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <div
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: `${RARITY_COLORS[selectedSpecies.rarity]}20`,
                        color: RARITY_COLORS[selectedSpecies.rarity],
                        border: `1px solid ${RARITY_COLORS[selectedSpecies.rarity]}40`,
                      }}
                    >
                      {RARITY_LABELS[selectedSpecies.rarity]}
                    </div>
                    <div className="text-xs" style={{ color: '#5a7a5a' }}>
                      {selectedSpecies.order} · {selectedSpecies.family}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs leading-relaxed mb-4" style={{ color: '#a8c4a0' }}>
                    {selectedSpecies.description}
                  </p>

                  {/* Fun fact card */}
                  <div
                    className="rounded-xl p-3 mb-4"
                    style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}
                  >
                    <div className="text-xs font-semibold mb-1 tracking-wider" style={{ color: '#c9a84c' }}>
                      ✦ FIELD NOTE
                    </div>
                    <p className="text-xs italic" style={{ color: '#8aaa7a' }}>{selectedSpecies.funFact}</p>
                  </div>

                  {/* DNA Barcode Viewer */}
                  <div className="mb-4">
                    <DNABarcodeViewer
                      seed={selectedSpecies.id}
                      gene={selectedSpecies.barcodeGene}
                      length={selectedSpecies.barcodeLength}
                      matchPercent={bestMatch?.matchPercent}
                    />
                  </div>

                  {/* Info cards grid */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <InfoCard label="Conservation" value={selectedSpecies.conservationStatus} color={selectedSpecies.conservationStatus === 'Least Concern' ? '#4a8a4a' : '#c9a84c'} />
                    <InfoCard label="Specimens" value={`${selectedSpecimens.length} collected`} color="#60a5fa" />
                  </div>

                  {/* Habitat */}
                  <div
                    className="rounded-xl p-3 mb-4"
                    style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}
                  >
                    <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
                      HABITAT
                    </div>
                    <div className="space-y-1.5">
                      {selectedSpecies.biomeIds.map(bid => {
                        const biome = BIOMES.find(b => b.id === bid);
                        if (!biome) return null;
                        return (
                          <div key={bid} className="flex items-center gap-2">
                            <span className="text-sm">{biome.emoji}</span>
                            <span className="text-xs" style={{ color: '#a8c4a0' }}>{biome.name}</span>
                            <span className="text-[10px] flex-1 truncate" style={{ color: '#5a7a5a' }}>
                              · {biome.region}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sampling methods */}
                  <div
                    className="rounded-xl p-3 mb-4"
                    style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}
                  >
                    <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
                      SAMPLING METHODS
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSpecies.samplingMethods.map(m => {
                        const info = SAMPLING_METHOD_INFO[m];
                        const isExclusive = selectedSpecies.exclusiveMethod === m;
                        return (
                          <div
                            key={m}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
                            style={{
                              background: isExclusive ? '#c9a84c20' : '#14231a',
                              border: `1px solid ${isExclusive ? '#c9a84c40' : '#2a4030'}`,
                              color: isExclusive ? '#c9a84c' : '#8aaa7a',
                            }}
                          >
                            <span>{info.emoji}</span>
                            <span>{info.name}</span>
                            {isExclusive && <span className="text-[8px]">★</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Collection history */}
                  {selectedSpecimens.length > 0 && (
                    <div
                      className="rounded-xl p-3"
                      style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}
                    >
                      <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
                        COLLECTION HISTORY
                      </div>
                      <div className="space-y-1.5 text-xs">
                        {firstCollection && (
                          <HistoryRow
                            label="First find"
                            value={new Date(firstCollection.collectedAt).toLocaleDateString()}
                          />
                        )}
                        {bestMatch && (
                          <HistoryRow
                            label="Best match"
                            value={`${bestMatch.matchPercent?.toFixed(1)}%`}
                            valueColor="#c9a84c"
                          />
                        )}
                        <HistoryRow
                          label="Total samples"
                          value={`${selectedSpecimens.length}`}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4" style={{ opacity: 0.2 }}>🔒</div>
                  <p className="text-sm mb-4" style={{ color: '#8aaa7a' }}>
                    Collect and identify this species to reveal its details.
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div
                      className="px-3 py-1 rounded-full text-xs"
                      style={{
                        background: `${RARITY_COLORS[selectedSpecies.rarity]}15`,
                        color: `${RARITY_COLORS[selectedSpecies.rarity]}80`,
                      }}
                    >
                      {RARITY_LABELS[selectedSpecies.rarity]}
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3 mt-4 text-left"
                    style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}
                  >
                    <div className="text-xs font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
                      SEARCH FOR IT IN
                    </div>
                    <div className="space-y-1.5">
                      {selectedSpecies.biomeIds.map(bid => {
                        const biome = BIOMES.find(b => b.id === bid);
                        if (!biome) return null;
                        const unlocked = state.unlockedBiomes.includes(bid);
                        return (
                          <div key={bid} className="flex items-center gap-2">
                            <span className="text-sm" style={{ opacity: unlocked ? 1 : 0.3 }}>{biome.emoji}</span>
                            <span className="text-xs" style={{ color: unlocked ? '#a8c4a0' : '#5a7a5a' }}>
                              {biome.name} {!unlocked && '🔒'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Completion Banner */}
        <div className="px-3 pt-3 pb-1">
          <div className="rounded-lg p-2.5" style={{ background: '#14231a', border: '1px solid #2a4030' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: '#e8e4d8' }}>
                Species Discovered
              </span>
              <span className="text-xs font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
                {completionPct}%
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full" style={{ background: '#0c1a12' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${completionPct}%`,
                  background: 'linear-gradient(90deg, #4a8a4a, #c9a84c)',
                  minWidth: completionPct > 0 ? '10px' : '0',
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[11px]" style={{ color: '#5a7a5a' }}>{discoveredCount} found</span>
              <span className="text-[11px]" style={{ color: '#5a7a5a' }}>{totalSpecies - discoveredCount} remaining</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 pt-1">
          <div
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
            style={{ background: '#0c1a12', border: '1px solid #2a4030' }}
          >
            <span className="text-xs" style={{ color: '#5a7a5a' }}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search discovered species..."
              className="flex-1 bg-transparent outline-none text-xs"
              style={{ color: '#e8e4d8' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs"
                style={{ color: '#5a7a5a' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* View Toggle + Sort + Filters */}
        <div className="px-3 py-1.5 flex gap-1.5 items-center">
          <button
            onClick={() => setViewMode('taxonomy')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: viewMode === 'taxonomy' ? '#1a3520' : 'transparent',
              border: `1px solid ${viewMode === 'taxonomy' ? '#4a8a4a' : '#2a4030'}`,
              color: viewMode === 'taxonomy' ? '#c9a84c' : '#5a7a5a',
            }}
          >
            Taxonomy
          </button>
          <button
            onClick={() => setViewMode('all')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: viewMode === 'all' ? '#1a3520' : 'transparent',
              border: `1px solid ${viewMode === 'all' ? '#4a8a4a' : '#2a4030'}`,
              color: viewMode === 'all' ? '#c9a84c' : '#5a7a5a',
            }}
          >
            Grid
          </button>
          <div className="flex-1" />
          <div
            className="flex rounded-md overflow-hidden"
            style={{ border: '1px solid #2a4030' }}
          >
            {([['name', 'A-Z'], ['rarity', '◆'], ['recent', '🕐']] as [SortMode, string][]).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className="px-2 py-1 text-[10px] font-bold transition-all"
                style={{
                  background: sortMode === mode ? '#1a3520' : 'transparent',
                  color: sortMode === mode ? '#c9a84c' : '#5a7a5a',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1"
            style={{
              background: showFilters || hasActiveFilters ? '#1a3520' : 'transparent',
              border: `1px solid ${showFilters || hasActiveFilters ? '#c9a84c' : '#2a4030'}`,
              color: showFilters || hasActiveFilters ? '#c9a84c' : '#5a7a5a',
            }}
          >
            ⚲
            {hasActiveFilters && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#c9a84c' }}
              />
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="px-3 pb-1 animate-filter-in">
            <div
              className="rounded-lg p-2.5 space-y-2"
              style={{ background: '#0c1a12', border: '1px solid #2a4030' }}
            >
              {/* Rarity */}
              <div>
                <div className="text-[10px] font-semibold mb-1.5 tracking-wider" style={{ color: '#5a7a5a' }}>
                  RARITY
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <FilterPill active={filterRarity === 'all'} onClick={() => setFilterRarity('all')} color="#8aaa7a">
                    All
                  </FilterPill>
                  {RARITY_ORDER.map(r => (
                    <FilterPill
                      key={r}
                      active={filterRarity === r}
                      onClick={() => setFilterRarity(r)}
                      color={RARITY_COLORS[r]}
                    >
                      {RARITY_LABELS[r]}
                    </FilterPill>
                  ))}
                </div>
              </div>

              {/* Biome */}
              <div>
                <div className="text-[10px] font-semibold mb-1.5 tracking-wider" style={{ color: '#5a7a5a' }}>
                  BIOME
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <FilterPill active={filterBiome === 'all'} onClick={() => setFilterBiome('all')} color="#8aaa7a">
                    All
                  </FilterPill>
                  {BIOMES.map(b => (
                    <FilterPill
                      key={b.id}
                      active={filterBiome === b.id}
                      onClick={() => setFilterBiome(b.id)}
                      color="#4a8a4a"
                    >
                      {b.emoji} {b.name}
                    </FilterPill>
                  ))}
                </div>
              </div>

              {/* Discovery */}
              <div>
                <div className="text-[10px] font-semibold mb-1.5 tracking-wider" style={{ color: '#5a7a5a' }}>
                  STATUS
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <FilterPill active={filterDiscovery === 'all'} onClick={() => setFilterDiscovery('all')} color="#8aaa7a">
                    All
                  </FilterPill>
                  <FilterPill active={filterDiscovery === 'discovered'} onClick={() => setFilterDiscovery('discovered')} color="#4a8a4a">
                    ✓ Discovered
                  </FilterPill>
                  <FilterPill active={filterDiscovery === 'undiscovered'} onClick={() => setFilterDiscovery('undiscovered')} color="#c9a84c">
                    ◯ Undiscovered
                  </FilterPill>
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setFilterRarity('all');
                    setFilterBiome('all');
                    setFilterDiscovery('all');
                    setSearchQuery('');
                  }}
                  className="text-[11px] font-semibold"
                  style={{ color: '#c9a84c' }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}

        <div className="px-3 pt-1">
          {/* Filter count banner */}
          {hasActiveFilters && (
            <div className="text-[11px] mb-2" style={{ color: '#8aaa7a' }}>
              Showing {filteredAll.length} of {totalSpecies} species
            </div>
          )}

          {viewMode === 'taxonomy' ? (
            /* Taxonomy Tree View */
            <div className="space-y-1.5">
              {TAXONOMY_GROUPS.map(group => {
                const groupSpecies = sortSpecies(filterSpecies(SPECIES.filter(s => s.taxonomicGroup === group.key)));
                if (groupSpecies.length === 0 && hasActiveFilters) return null;
                const discoveredInGroup = groupSpecies.filter(s => discoveredSet.has(s.id)).length;
                const isExpanded = expandedGroup === group.key;

                return (
                  <div key={group.key}>
                    <button
                      onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                      className="w-full rounded-lg px-2.5 py-2 text-left transition-all hover:scale-[1.005]"
                      style={{
                        background: isExpanded ? '#1a3520' : '#14231a',
                        border: `1px solid ${isExpanded ? '#4a8a4a' : '#2a4030'}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-lg">{group.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-semibold" style={{ color: '#e8e4d8' }}>
                              {group.label}
                            </span>
                            <span className="text-[11px]" style={{ color: '#5a7a5a' }}>
                              {discoveredInGroup}/{groupSpecies.length}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs" style={{ color: '#5a7a5a' }}>
                          {isExpanded ? '▾' : '▸'}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l-2 pl-2" style={{ borderColor: '#2a4030' }}>
                        {groupSpecies.map(species => {
                          const discovered = discoveredSet.has(species.id);
                          return (
                            <button
                              key={species.id}
                              onClick={() => setSelectedSpeciesId(species.id)}
                              className="w-full rounded-md px-2 py-1.5 text-left flex items-center gap-2 transition-all hover:scale-[1.005]"
                              style={{
                                background: discovered ? '#14231a' : '#0c1a12',
                                border: `1px solid ${discovered ? '#2a4030' : '#1a2a20'}`,
                                opacity: discovered ? 1 : 0.6,
                              }}
                            >
                              <div className="text-base">{discovered ? species.emoji : '❓'}</div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold truncate" style={{ color: discovered ? '#e8e4d8' : '#5a7a5a' }}>
                                  {discovered ? species.commonName : '???'}
                                </div>
                              </div>
                              <div className="text-[10px] italic truncate max-w-[100px]" style={{ color: '#5a7a5a' }}>
                                {discovered ? species.scientificName : '???'}
                              </div>
                              <div
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ background: discovered ? RARITY_COLORS[species.rarity] : '#1a2e20' }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* All Species Grid */
            <>
              {filteredAll.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3" style={{ opacity: 0.3 }}>🔍</div>
                  <p className="text-sm" style={{ color: '#5a7a5a' }}>No species match your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1.5">
                  {filteredAll.map(species => {
                    const discovered = discoveredSet.has(species.id);
                    return (
                      <button
                        key={species.id}
                        onClick={() => setSelectedSpeciesId(species.id)}
                        className="rounded-lg p-2 text-center transition-all hover:scale-[1.02]"
                        style={{
                          background: discovered ? '#14231a' : '#0c1a12',
                          border: `1px solid ${discovered ? RARITY_COLORS[species.rarity] + '40' : '#1a2a20'}`,
                          opacity: discovered ? 1 : 0.5,
                        }}
                      >
                        <div className="text-xl mb-0.5">{discovered ? species.emoji : '❓'}</div>
                        <div className="text-[10px] truncate" style={{ color: discovered ? '#e8e4d8' : '#5a7a5a' }}>
                          {discovered ? species.commonName : '???'}
                        </div>
                        <div
                          className="w-1.5 h-1.5 rounded-full mx-auto mt-0.5"
                          style={{ background: discovered ? RARITY_COLORS[species.rarity] : '#1a2e20' }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes filterIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-filter-in {
          animation: filterIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
      style={{
        background: active ? `${color}20` : '#14231a',
        color: active ? color : '#5a7a5a',
        border: `1px solid ${active ? `${color}60` : '#1a2e20'}`,
      }}
    >
      {children}
    </button>
  );
}

function InfoCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2 text-center" style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}>
      <div className="text-[10px] tracking-wider" style={{ color: '#5a7a5a' }}>{label}</div>
      <div className="text-xs font-semibold mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}

function HistoryRow({ label, value, valueColor = '#e8e4d8' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: '#5a7a5a' }}>{label}</span>
      <span className="font-mono font-semibold" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}
