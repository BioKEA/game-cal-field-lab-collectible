import { useState, useMemo, useEffect } from 'react';
import type { GameState } from '@/types/game';
import { RARITY_COLORS, RARITY_LABELS } from '@/types/game';
import { BIOMES } from '@/data/biomes';
import { SPECIES } from '@/data/species';
import {
  computeVisitorCredits,
  getMuseumRate,
  MUSEUM_ACCUMULATION_CAP_HOURS,
} from '@/lib/ecosystem';

interface MuseumProps {
  state: GameState;
  onNavigate: (page: string) => void;
  onPlaceExhibit: (biomeId: string, slotIndex: number, speciesId: string | null) => void;
  onCollectVisitors: () => void;
}

export default function Museum({ state, onNavigate, onPlaceExhibit, onCollectVisitors }: MuseumProps) {
  const [picker, setPicker] = useState<{ biomeId: string; slot: number } | null>(null);
  const [tick, setTick] = useState(0);

  // Refresh the live visitor counter once a minute
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const visitor = useMemo(
    () => computeVisitorCredits(state, id => SPECIES.find(s => s.id === id)),
    // tick is intentionally a dep so the counter updates over time
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, tick]
  );

  const totalExhibits = useMemo(() => {
    let n = 0;
    for (const hall of Object.values(state.exhibits || {})) {
      for (const slot of hall) if (slot) n++;
    }
    return n;
  }, [state.exhibits]);

  const speciesById = (id: string) => SPECIES.find(s => s.id === id);

  // Pick eligible species: discovered AND lives in this biome AND not already shown elsewhere in this hall
  const eligibleForSlot = (biomeId: string, slot: number) => {
    const hall = state.exhibits[biomeId] || [null, null, null];
    const taken = new Set(hall.filter((s, i) => s && i !== slot));
    return state.discoveredSpecies
      .map(id => SPECIES.find(s => s.id === id)!)
      .filter(s => s && s.biomeIds.includes(biomeId) && !taken.has(s.id))
      .sort((a, b) => {
        const order = ['legendary', 'ultra-rare', 'rare', 'uncommon', 'common'];
        return order.indexOf(a.rarity) - order.indexOf(b.rarity);
      });
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #1a1410, #0f0a08)' }}>
      {/* Header */}
      <div
        className="px-5 pt-6 pb-5 border-b"
        style={{ borderColor: '#2a1f15', background: '#0f0a08' }}
      >
        <button
          onClick={() => onNavigate('hq')}
          className="flex items-center gap-2 text-sm mb-3 transition-colors"
          style={{ color: '#c9a84c' }}
        >
          ← HQ
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold italic"
              style={{ fontFamily: 'Georgia, serif', color: '#c9a84c' }}
            >
              Natural History Museum
            </h1>
            <p className="text-xs mt-1" style={{ color: '#a89878' }}>
              Curate exhibits · earn idle visitor credits
            </p>
          </div>
          <div className="text-3xl">🏛️</div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Visitor income card */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, #2a1f15, #14231a 80%)',
            border: '1.5px solid #c9a84c50',
            boxShadow: '0 0 24px #c9a84c15',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="text-[10px] tracking-widest font-bold mb-1" style={{ color: '#c9a84c' }}>
                VISITOR DONATIONS
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
                {visitor.credits.toLocaleString()} <span className="text-sm" style={{ color: '#a89878' }}>credits</span>
              </div>
              <div className="text-[10px]" style={{ color: '#a89878' }}>
                {visitor.ratePerHour.toLocaleString()} cr/hr · {visitor.hours.toFixed(1)}h accumulated
                {visitor.hours >= MUSEUM_ACCUMULATION_CAP_HOURS && (
                  <span className="ml-1" style={{ color: '#c9a84c' }}>· capped</span>
                )}
              </div>
            </div>
            <button
              onClick={onCollectVisitors}
              disabled={visitor.credits <= 0}
              className="px-4 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.04] active:scale-[0.97] disabled:opacity-40 disabled:hover:scale-100 shrink-0"
              style={{
                background: visitor.credits > 0
                  ? 'linear-gradient(135deg, #c9a84c, #a8862a)'
                  : '#1a1410',
                color: visitor.credits > 0 ? '#0f0a08' : '#5a4a35',
                border: visitor.credits > 0 ? 'none' : '1px solid #2a1f15',
              }}
            >
              Collect
            </button>
          </div>
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-[10px]" style={{ borderColor: '#2a1f15', color: '#a89878' }}>
            <span>{totalExhibits} / {BIOMES.length * 3} exhibits filled</span>
            <span>Cap: {MUSEUM_ACCUMULATION_CAP_HOURS}h idle</span>
          </div>
        </div>

        {totalExhibits === 0 && (
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: '#14231a',
              border: '1px dashed #2a4030',
            }}
          >
            <div className="text-3xl mb-2">🪧</div>
            <p className="text-xs leading-relaxed" style={{ color: '#a89878' }}>
              Place discovered species in exhibit halls below to start earning visitor credits.
              Rarer specimens draw more visitors.
            </p>
          </div>
        )}

        {/* Halls — one per biome */}
        {BIOMES.map(biome => {
          const hall = state.exhibits[biome.id] || [null, null, null];
          const hallRate = hall.reduce((sum, sid) => {
            if (!sid) return sum;
            const sp = speciesById(sid);
            return sp ? sum + getMuseumRate(sp.rarity) : sum;
          }, 0);
          return (
            <div
              key={biome.id}
              className="rounded-2xl p-4"
              style={{
                background: 'linear-gradient(180deg, #1a1410, #0f0a08 80%)',
                border: '1px solid #2a1f15',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-2xl">{biome.emoji}</div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
                      {biome.name} Hall
                    </div>
                    <div className="text-[10px]" style={{ color: '#a89878' }}>
                      {biome.region}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] tracking-widest font-bold" style={{ color: '#5a4a35' }}>
                    HALL RATE
                  </div>
                  <div className="text-sm font-bold" style={{ color: hallRate > 0 ? '#c9a84c' : '#5a4a35', fontFamily: 'Georgia, serif' }}>
                    {hallRate} cr/hr
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {hall.map((slotSpeciesId, slotIdx) => {
                  const sp = slotSpeciesId ? speciesById(slotSpeciesId) : null;
                  const rate = sp ? getMuseumRate(sp.rarity) : 0;
                  const rarityColor = sp ? RARITY_COLORS[sp.rarity] : '#2a1f15';
                  return (
                    <button
                      key={slotIdx}
                      onClick={() => setPicker({ biomeId: biome.id, slot: slotIdx })}
                      className="rounded-xl p-3 text-center transition-all hover:scale-[1.03] active:scale-[0.97]"
                      style={{
                        background: sp
                          ? `linear-gradient(180deg, ${rarityColor}20, #14231a 80%)`
                          : '#0a0806',
                        border: `1.5px ${sp ? 'solid' : 'dashed'} ${sp ? `${rarityColor}70` : '#2a1f15'}`,
                        minHeight: '110px',
                      }}
                    >
                      {sp ? (
                        <>
                          <div className="text-3xl mb-1" style={{ filter: `drop-shadow(0 0 8px ${rarityColor}50)` }}>
                            {sp.emoji}
                          </div>
                          <div className="text-[10px] font-bold leading-tight mb-1" style={{ color: '#e8e4d8' }}>
                            {sp.commonName}
                          </div>
                          <div className="text-[9px] font-bold" style={{ color: rarityColor }}>
                            +{rate}/hr
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl opacity-30 mb-1">＋</div>
                          <div className="text-[10px]" style={{ color: '#5a4a35' }}>
                            Empty pedestal
                          </div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="h-8" />
      </div>

      {/* Picker modal */}
      {picker && (() => {
        const eligible = eligibleForSlot(picker.biomeId, picker.slot);
        const biome = BIOMES.find(b => b.id === picker.biomeId);
        const currentSpeciesId = state.exhibits[picker.biomeId]?.[picker.slot] ?? null;
        return (
          <div
            className="fixed inset-0 z-[9999] flex items-end justify-center"
            style={{ background: 'rgba(10, 8, 6, 0.92)' }}
            onClick={() => setPicker(null)}
          >
            <div
              className="w-full max-w-md rounded-t-2xl max-h-[80vh] overflow-y-auto"
              style={{
                background: 'linear-gradient(180deg, #1a1410, #0f0a08)',
                border: '1px solid #c9a84c50',
                borderBottom: 'none',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div
                className="sticky top-0 px-5 py-4 border-b flex items-center justify-between"
                style={{ background: '#1a1410', borderColor: '#2a1f15' }}
              >
                <div>
                  <div className="text-[10px] tracking-widest font-bold" style={{ color: '#c9a84c' }}>
                    {biome?.emoji} {biome?.name?.toUpperCase()} HALL · SLOT {picker.slot + 1}
                  </div>
                  <div className="text-base font-bold" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
                    Choose an exhibit
                  </div>
                </div>
                <button
                  onClick={() => setPicker(null)}
                  className="text-lg w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#0f0a08', color: '#a89878' }}
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-2">
                {currentSpeciesId && (
                  <button
                    onClick={() => {
                      onPlaceExhibit(picker.biomeId, picker.slot, null);
                      setPicker(null);
                    }}
                    className="w-full rounded-xl p-3 text-left transition-all"
                    style={{
                      background: '#2a1410',
                      border: '1px solid #c94343',
                      color: '#c94343',
                    }}
                  >
                    <div className="text-xs font-bold">🗑️ Remove current exhibit</div>
                  </button>
                )}
                {eligible.length === 0 ? (
                  <div className="text-center py-8 text-xs" style={{ color: '#a89878' }}>
                    No discovered species from this biome yet.
                    <br />
                    Identify specimens to unlock exhibits.
                  </div>
                ) : (
                  eligible.map(sp => {
                    const rate = getMuseumRate(sp.rarity);
                    const color = RARITY_COLORS[sp.rarity];
                    return (
                      <button
                        key={sp.id}
                        onClick={() => {
                          onPlaceExhibit(picker.biomeId, picker.slot, sp.id);
                          setPicker(null);
                        }}
                        className="w-full rounded-xl p-3 flex items-center gap-3 transition-all hover:scale-[1.01]"
                        style={{
                          background: `linear-gradient(135deg, ${color}15, #14231a 80%)`,
                          border: `1px solid ${color}50`,
                        }}
                      >
                        <div className="text-3xl" style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}>
                          {sp.emoji}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="text-sm font-bold" style={{ color: '#e8e4d8' }}>
                            {sp.commonName}
                          </div>
                          <div className="text-[10px] italic" style={{ color: '#a89878' }}>
                            {sp.scientificName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold mb-1"
                            style={{
                              background: `${color}20`,
                              color,
                              border: `1px solid ${color}50`,
                            }}
                          >
                            {RARITY_LABELS[sp.rarity]}
                          </div>
                          <div className="text-[10px] font-bold" style={{ color: '#c9a84c' }}>
                            +{rate} cr/hr
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
