import { useState, useMemo } from 'react';
import { BIOMES } from '@/data/biomes';
import { SPECIES } from '@/data/species';
import { REGIONS, isTierUnlocked, getRegionCatalogPct } from '@/data/regions';
import { RARITY_COLORS, RARITY_LABELS, SAMPLING_METHOD_INFO } from '@/types/game';
import type { GameState, Biome } from '@/types/game';
import BiomeWorldMap from '@/components/BiomeWorldMap';

type View = 'map' | 'list';

interface BiomesProps {
  state: GameState;
  onNavigate: (page: string) => void;
}

export default function Biomes({ state, onNavigate }: BiomesProps) {
  const [selectedBiomeId, setSelectedBiomeId] = useState<string | null>(null);
  const [view, setView] = useState<View>('map');

  const discoveredSet = useMemo(() => new Set(state.discoveredSpecies), [state.discoveredSpecies]);
  const selectedBiome = selectedBiomeId ? BIOMES.find(b => b.id === selectedBiomeId) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1610' }}>
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: '#2a4030', background: '#0c1a12' }}
      >
        <button onClick={() => onNavigate('hq')} className="text-sm" style={{ color: '#c9a84c' }}>
          ← HQ
        </button>
        <h2
          className="text-sm font-semibold"
          style={{ color: '#e8e4d8', fontFamily: "'Outfit', sans-serif" }}
        >
          Field Sites
        </h2>
        <div className="text-xs" style={{ color: '#8aaa7a' }}>
          {state.unlockedBiomes.length}/{BIOMES.length} sites
        </div>
      </div>

      {/* View toggle */}
      <div
        className="flex gap-1 p-3 border-b"
        style={{ borderColor: '#2a4030', background: '#0a1610' }}
      >
        <button
          onClick={() => setView('map')}
          className="flex-1 rounded-lg p-2 text-xs font-semibold transition-all"
          style={{
            background: view === 'map' ? 'linear-gradient(135deg, #1a3520, #14231a)' : '#0c1a12',
            color: view === 'map' ? '#c9a84c' : '#5a7a5a',
            border: `1px solid ${view === 'map' ? '#c9a84c40' : '#1a2a20'}`,
          }}
        >
          🗺️ Map
        </button>
        <button
          onClick={() => setView('list')}
          className="flex-1 rounded-lg p-2 text-xs font-semibold transition-all"
          style={{
            background: view === 'list' ? 'linear-gradient(135deg, #1a3520, #14231a)' : '#0c1a12',
            color: view === 'list' ? '#c9a84c' : '#5a7a5a',
            border: `1px solid ${view === 'list' ? '#c9a84c40' : '#1a2a20'}`,
          }}
        >
          📋 List
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {view === 'map' && (
          <BiomeWorldMap state={state} onSelectBiome={setSelectedBiomeId} />
        )}
        {view === 'list' && REGIONS.map(region => {
          const regionBiomes = BIOMES.filter(b => b.regionId === region.id);
          const tierOpen = isTierUnlocked(region.tier, state);
          const catPct = getRegionCatalogPct(region.id, state);

          return (
            <div key={region.id} className="space-y-2">
              {/* Region header */}
              <div className="flex items-center justify-between px-1 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{region.emoji}</span>
                  <div>
                    <div className="text-xs font-bold" style={{ color: tierOpen ? region.accent : '#5a7a5a' }}>
                      {region.name}
                      {!tierOpen && <span className="ml-1 text-[10px]">🔒</span>}
                    </div>
                    <div className="text-[10px]" style={{ color: '#5a7a5a' }}>{region.tagline}</div>
                  </div>
                </div>
                <div className="text-[10px] font-mono" style={{ color: tierOpen ? '#8aaa7a' : '#3a4a3a' }}>
                  {Math.round(catPct * 100)}%
                </div>
              </div>

              {regionBiomes.map(biome => {
                const isUnlocked = state.unlockedBiomes.includes(biome.id);
                const biomeSpecies = SPECIES.filter(s => s.biomeIds.includes(biome.id));
                const discoveredInBiome = biomeSpecies.filter(s => discoveredSet.has(s.id)).length;
                const pct = biomeSpecies.length > 0 ? (discoveredInBiome / biomeSpecies.length) * 100 : 0;

                return (
                  <button
                    key={biome.id}
                    onClick={() => setSelectedBiomeId(biome.id)}
                    className="w-full rounded-2xl overflow-hidden text-left transition-all hover:scale-[1.005] active:scale-[0.99]"
                    style={{
                      background: isUnlocked
                        ? 'linear-gradient(135deg, #1a3520, #14231a)'
                        : '#0c1a12',
                      border: `1.5px solid ${isUnlocked ? region.accent + '40' : '#1a2a20'}`,
                      opacity: isUnlocked ? 1 : tierOpen ? 0.6 : 0.35,
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-4xl" style={{ filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>
                          {biome.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold"
                              style={{ color: isUnlocked ? '#e8e4d8' : '#5a7a5a', fontFamily: 'Georgia, serif' }}>
                              {biome.name}
                            </span>
                            {!isUnlocked && <span className="text-xs">🔒</span>}
                          </div>
                          <p className="text-xs mt-2 leading-relaxed line-clamp-2" style={{ color: '#8aaa7a' }}>
                            {biome.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span style={{ color: '#5a7a5a' }}>
                            {biome.collectionPoints.length} collection points
                          </span>
                          <span style={{ color: '#8aaa7a' }}>
                            {discoveredInBiome}/{biomeSpecies.length} species
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background: '#0c1a12' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 100 ? `linear-gradient(90deg, #c9a84c, ${region.accent})` : region.accent,
                            }} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}

        <div className="h-4" />
      </div>

      {/* Detail Modal */}
      {selectedBiome && (
        <BiomeDetailModal
          biome={selectedBiome}
          state={state}
          onClose={() => setSelectedBiomeId(null)}
          onGoExpedition={() => {
            setSelectedBiomeId(null);
            onNavigate('expedition');
          }}
        />
      )}
    </div>
  );
}

function BiomeDetailModal({
  biome,
  state,
  onClose,
  onGoExpedition,
}: {
  biome: Biome;
  state: GameState;
  onClose: () => void;
  onGoExpedition: () => void;
}) {
  const discoveredSet = new Set(state.discoveredSpecies);
  const isUnlocked = state.unlockedBiomes.includes(biome.id);
  const biomeSpecies = SPECIES.filter(s => s.biomeIds.includes(biome.id));
  const signatureSpecies = SPECIES.find(s => s.id === biome.signatureSpeciesId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(10,22,16,0.85)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, #14231a, #0f1f15)',
          border: '1px solid #4a8a4a40',
          borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 px-5 pt-5 pb-3 flex items-start justify-between"
          style={{ background: 'linear-gradient(180deg, #14231a 70%, transparent)' }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="text-5xl">{biome.emoji}</div>
            <div className="min-w-0">
              <div className="text-lg font-bold truncate" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
                {biome.name}
              </div>
              <div className="text-xs" style={{ color: '#8aaa7a' }}>
                {biome.region}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-lg ml-2 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ color: '#5a7a5a', background: '#0c1a12' }}
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">
          {/* Description */}
          <p className="text-xs leading-relaxed" style={{ color: '#a8c4a0' }}>
            {biome.description}
          </p>

          {/* Signature species */}
          {signatureSpecies && (
            <div
              className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: `${RARITY_COLORS[signatureSpecies.rarity]}10`,
                border: `1px solid ${RARITY_COLORS[signatureSpecies.rarity]}30`,
              }}
            >
              <div className="text-3xl">
                {discoveredSet.has(signatureSpecies.id) ? signatureSpecies.emoji : '❓'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-semibold tracking-wider" style={{ color: '#c9a84c' }}>
                  ★ SIGNATURE SPECIES
                </div>
                <div
                  className="text-sm font-semibold truncate"
                  style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}
                >
                  {discoveredSet.has(signatureSpecies.id) ? signatureSpecies.commonName : '???'}
                </div>
                <div className="text-[10px] italic truncate" style={{ color: '#8aaa7a' }}>
                  {discoveredSet.has(signatureSpecies.id) ? signatureSpecies.scientificName : 'Not yet discovered'}
                </div>
              </div>
              <div
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: `${RARITY_COLORS[signatureSpecies.rarity]}20`,
                  color: RARITY_COLORS[signatureSpecies.rarity],
                }}
              >
                {RARITY_LABELS[signatureSpecies.rarity]}
              </div>
            </div>
          )}

          {/* Collection Points */}
          <div>
            <div className="text-[10px] font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
              COLLECTION POINTS ({biome.collectionPoints.length})
            </div>
            <div className="space-y-2">
              {biome.collectionPoints.map(point => (
                <div
                  key={point.id}
                  className="rounded-xl p-3"
                  style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}
                >
                  <div className="text-sm font-semibold mb-1" style={{ color: '#e8e4d8' }}>
                    📍 {point.name}
                  </div>
                  <p className="text-[11px] leading-relaxed mb-2" style={{ color: '#8aaa7a' }}>
                    {point.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {point.availableMethods.map(m => {
                      const info = SAMPLING_METHOD_INFO[m];
                      return (
                        <div
                          key={m}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]"
                          style={{ background: '#14231a', border: '1px solid #2a4030', color: '#8aaa7a' }}
                        >
                          <span>{info.emoji}</span>
                          <span>{info.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Species in this biome */}
          <div>
            <div className="text-[10px] font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
              SPECIES FOUND HERE ({biomeSpecies.length})
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {biomeSpecies.map(species => {
                const disc = discoveredSet.has(species.id);
                return (
                  <div
                    key={species.id}
                    className="aspect-square rounded-lg flex items-center justify-center relative"
                    style={{
                      background: '#0c1a12',
                      border: `1px solid ${disc ? RARITY_COLORS[species.rarity] + '40' : '#1a2a20'}`,
                      opacity: disc ? 1 : 0.4,
                    }}
                  >
                    <span className="text-xl">{disc ? species.emoji : '❓'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action button */}
          {isUnlocked ? (
            <button
              onClick={onGoExpedition}
              className="w-full rounded-xl p-3 text-center font-semibold transition-all hover:scale-[1.01] active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #2a5530, #1a3520)',
                border: '1.5px solid #4a8a4a',
                color: '#e8e4d8',
              }}
            >
              🌿 Start Expedition Here
            </button>
          ) : (
            <div
              className="rounded-xl p-4 text-center"
              style={{ background: '#0c1a12', border: '1px solid #2a4030' }}
            >
              <div className="text-2xl mb-2">🔒</div>
              <div className="text-xs" style={{ color: '#8aaa7a' }}>
                Purchase a research permit from the Shop to unlock this site
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
