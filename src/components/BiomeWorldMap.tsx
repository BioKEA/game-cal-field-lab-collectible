import { useMemo, useState } from 'react';
import { BIOMES } from '@/data/biomes';
import { SPECIES } from '@/data/species';
import { REGIONS, isTierUnlocked, getRegionCatalogPct } from '@/data/regions';
import type { GameState, RegionId } from '@/types/game';

interface BiomeWorldMapProps {
  state: GameState;
  onSelectBiome: (biomeId: string) => void;
}

const MAP_WIDTH = 380;
const MAP_HEIGHT = 320;
const PAD = 40; // px padding inside SVG for pins near edges

export default function BiomeWorldMap({ state, onSelectBiome }: BiomeWorldMapProps) {
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('marin-county');
  const discoveredSet = useMemo(() => new Set(state.discoveredSpecies), [state.discoveredSpecies]);

  const region = REGIONS.find(r => r.id === selectedRegion)!;
  const regionBiomes = useMemo(
    () => BIOMES.filter(b => b.regionId === selectedRegion),
    [selectedRegion],
  );

  // Dynamic geographic bounds from the biomes in the selected region
  const bounds = useMemo(() => {
    if (regionBiomes.length === 0) return { latMin: 0, latMax: 1, lngMin: 0, lngMax: 1 };
    const lats = regionBiomes.map(b => b.lat);
    const lngs = regionBiomes.map(b => b.lng);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);
    const padding = Math.max(latRange, lngRange, 0.05) * 0.3;
    return {
      latMin: Math.min(...lats) - padding,
      latMax: Math.max(...lats) + padding,
      lngMin: Math.min(...lngs) - padding,
      lngMax: Math.max(...lngs) + padding,
    };
  }, [regionBiomes]);

  function project(lat: number, lng: number): { x: number; y: number } {
    const xFrac = (lng - bounds.lngMin) / (bounds.lngMax - bounds.lngMin);
    const yFrac = (lat - bounds.latMin) / (bounds.latMax - bounds.latMin);
    return {
      x: PAD + xFrac * (MAP_WIDTH - 2 * PAD),
      y: (MAP_HEIGHT - PAD) - yFrac * (MAP_HEIGHT - 2 * PAD),
    };
  }

  const pins = regionBiomes.map(biome => {
    const { x, y } = project(biome.lat, biome.lng);
    const biomeSpecies = SPECIES.filter(s => s.biomeIds.includes(biome.id));
    const discovered = biomeSpecies.filter(s => discoveredSet.has(s.id)).length;
    const total = biomeSpecies.length;
    const pct = total > 0 ? (discovered / total) * 100 : 0;
    const isUnlocked = state.unlockedBiomes.includes(biome.id);
    return { biome, x, y, pct, isUnlocked, discovered, total };
  });

  const tierOpen = isTierUnlocked(region.tier, state);
  const catalogPct = getRegionCatalogPct(selectedRegion, state);

  return (
    <div className="space-y-3">
      {/* Region selector tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {REGIONS.map(r => {
          const open = isTierUnlocked(r.tier, state);
          const active = r.id === selectedRegion;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRegion(r.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0"
              style={{
                background: active ? 'linear-gradient(135deg, #1a3520, #14231a)' : '#0c1a12',
                border: `1px solid ${active ? (r.accent + '60') : '#1a2a20'}`,
                color: active ? r.accent : open ? '#5a7a5a' : '#3a4a3a',
                opacity: open ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: 13 }}>{r.emoji}</span>
              {r.name}
              {!open && <span className="text-[9px]">🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Map card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0c1a12, #0a1610)',
          border: `1.5px solid ${region.accent}30`,
        }}
      >
        {/* Map header */}
        <div
          className="px-4 py-2 border-b flex items-center justify-between"
          style={{ borderColor: '#1a2e20', background: '#0c1a12' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs">🧭</span>
            <div className="text-[10px] font-semibold tracking-wider" style={{ color: region.accent }}>
              {region.name.toUpperCase()}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px]" style={{ color: '#5a7a5a' }}>
            <span>{Math.round(catalogPct * 100)}% catalogued</span>
            {!tierOpen && <span style={{ color: '#d4a574' }}>🔒 Locked</span>}
          </div>
        </div>

        {/* SVG Map */}
        <div className="p-3">
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="w-full h-auto"
            style={{ maxHeight: 400 }}
          >
            <defs>
              <pattern id="dotgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.6" fill="#1a3520" />
              </pattern>
              <radialGradient id="oceanFade" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#0a1810" stopOpacity="0" />
                <stop offset="100%" stopColor="#0a1810" stopOpacity="0.4" />
              </radialGradient>
              <filter id="pinGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#dotgrid)" />

            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((t, i) => (
              <line key={`lat-${i}`} x1="0" y1={MAP_HEIGHT * t} x2={MAP_WIDTH} y2={MAP_HEIGHT * t}
                stroke="#1a3520" strokeWidth="0.5" strokeDasharray="2 4" />
            ))}
            {[0.25, 0.5, 0.75].map((t, i) => (
              <line key={`lng-${i}`} x1={MAP_WIDTH * t} y1="0" x2={MAP_WIDTH * t} y2={MAP_HEIGHT}
                stroke="#1a3520" strokeWidth="0.5" strokeDasharray="2 4" />
            ))}

            <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#oceanFade)" />

            {/* Expedition paths */}
            {pins.filter(p => p.isUnlocked).map((p, i, arr) => {
              if (i === 0) return null;
              const prev = arr[i - 1];
              return (
                <line key={`path-${p.biome.id}`}
                  x1={prev.x} y1={prev.y} x2={p.x} y2={p.y}
                  stroke={region.accent} strokeWidth="1" strokeDasharray="3 5" opacity="0.4" />
              );
            })}

            {/* Biome pins */}
            {pins.map(pin => {
              const radius = pin.isUnlocked ? 18 : 14;
              const color = pin.isUnlocked ? region.accent : '#2a4030';
              return (
                <g key={pin.biome.id} transform={`translate(${pin.x}, ${pin.y})`}
                  style={{ cursor: 'pointer' }} onClick={() => onSelectBiome(pin.biome.id)}
                  className="biome-pin">
                  {pin.isUnlocked && (
                    <circle r={radius + 6} fill="none" stroke={color} strokeWidth="1"
                      opacity="0.4" className="pin-pulse" />
                  )}
                  <circle r={radius + 2} fill="none" stroke="#0c1a12" strokeWidth="2" />
                  <circle r={radius + 2} fill="none" stroke={color} strokeWidth="2"
                    strokeDasharray={`${(pin.pct / 100) * 2 * Math.PI * (radius + 2)} ${2 * Math.PI * (radius + 2)}`}
                    strokeLinecap="round" transform="rotate(-90)"
                    opacity={pin.isUnlocked ? 1 : 0.3} />
                  <circle r={radius} fill="#14231a" stroke={color} strokeWidth="1.5"
                    filter={pin.isUnlocked ? 'url(#pinGlow)' : undefined} />
                  <text textAnchor="middle" dy="0.35em"
                    fontSize={pin.isUnlocked ? 18 : 14}
                    opacity={pin.isUnlocked ? 1 : 0.4}
                    style={{ filter: pin.isUnlocked ? 'none' : 'grayscale(100%)', pointerEvents: 'none' }}>
                    {pin.biome.emoji}
                  </text>
                  {!pin.isUnlocked && (
                    <text x={radius - 2} y={-radius + 4} textAnchor="middle" fontSize="10"
                      style={{ pointerEvents: 'none' }}>🔒</text>
                  )}
                  <text y={radius + 14} textAnchor="middle" fontSize="9" fontWeight="bold"
                    fill={pin.isUnlocked ? '#e8e4d8' : '#5a7a5a'}
                    style={{ fontFamily: "'Outfit', sans-serif", pointerEvents: 'none',
                      textShadow: '0 0 4px #0a1610' }}>
                    {pin.biome.name}
                  </text>
                </g>
              );
            })}

            {/* Compass rose */}
            <g transform={`translate(${MAP_WIDTH - 35}, 35)`} opacity="0.5">
              <circle r="18" fill="none" stroke="#2a4030" strokeWidth="0.5" />
              <line x1="0" y1="-18" x2="0" y2="18" stroke="#2a4030" strokeWidth="0.5" />
              <line x1="-18" y1="0" x2="18" y2="0" stroke="#2a4030" strokeWidth="0.5" />
              <polygon points="0,-20 -3,-14 3,-14" fill={region.accent} />
              <text x="0" y="-24" textAnchor="middle" fontSize="8" fill={region.accent} fontWeight="bold">N</text>
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 border-t flex items-center justify-between text-[10px]"
          style={{ borderColor: '#1a2e20', background: '#0c1a12', color: '#5a7a5a' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: region.accent, boxShadow: `0 0 4px ${region.accent}80` }} />
              <span>Unlocked</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: '#2a4030' }} />
              <span>Locked</span>
            </div>
          </div>
          <div>Tap a site to explore</div>
        </div>
      </div>

      <style>{`
        @keyframes pinPulse {
          0% { r: 22; opacity: 0.6; }
          100% { r: 32; opacity: 0; }
        }
        .pin-pulse { animation: pinPulse 2.5s ease-out infinite; }
        .biome-pin:hover circle:last-of-type { filter: brightness(1.2); }
      `}</style>
    </div>
  );
}
