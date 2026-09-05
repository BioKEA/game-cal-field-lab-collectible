import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Rectangle, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BIOMES, getBiomeSpeciesCount } from '@/data/biomes';
import { SPECIES } from '@/data/species';
import { REGIONS, isTierUnlocked, getRegionCatalogPct } from '@/data/regions';
import type { GameState, RegionId } from '@/types/game';

interface CaliforniaHeroProps {
  height?: number | string;
  state: GameState;
  selectedRegion: RegionId;
  onSelectRegion: (regionId: RegionId) => void;
  onSelectBiome?: (biomeId: string) => void;
}

type BiomeStatus = 'active' | 'new' | 'locked';

// California bounding box — fitBounds auto-adapts zoom to container aspect ratio,
// so the map frames California correctly whether the container is 340px or full-screen.
const CALIFORNIA_BOUNDS: L.LatLngBoundsLiteral = [
  [32.35, -124.60], // SW
  [42.10, -114.00], // NE
];

/** Simplified California state outline — ~40 points tracing coast + borders. */
const CALIFORNIA_OUTLINE: L.LatLngTuple[] = [
  // Southern border (east to west)
  [32.53, -114.81], [32.72, -114.72], [32.72, -117.17],
  // Coast northward
  [32.83, -117.28], [33.05, -117.30], [33.35, -117.60],
  [33.47, -117.70], [33.73, -118.10], [33.75, -118.40],
  [33.85, -118.45], [34.03, -118.52], [34.05, -118.80],
  [34.15, -119.25], [34.28, -119.30], [34.45, -119.85],
  [34.45, -120.45], [34.95, -120.65], [35.15, -120.85],
  [35.40, -120.90], [35.60, -121.15], [35.80, -121.30],
  [36.20, -121.80], [36.60, -121.90], [36.85, -121.95],
  [36.98, -122.05], [37.00, -122.20], [37.50, -122.50],
  [37.78, -122.50], [37.85, -122.68], [38.00, -122.85],
  [38.05, -122.72], [38.35, -123.05], [38.75, -123.45],
  [38.95, -123.70], [39.35, -123.80], [39.80, -123.85],
  [40.25, -124.30], [40.45, -124.40], [40.85, -124.25],
  [41.20, -124.20], [41.75, -124.20],
  // Northern border (Oregon line)
  [41.99, -124.20], [41.99, -121.20], [41.99, -120.00],
  // Eastern border southward
  [41.99, -120.00], [39.00, -120.00],
  // Lake Tahoe jog
  [38.99, -120.00], [38.50, -119.90],
  // Nevada line southward
  [37.50, -118.00], [36.00, -117.60],
  [35.80, -117.63], [35.50, -117.63], [35.15, -115.73],
  [35.00, -115.63], [34.95, -114.63], [34.50, -114.63],
  [33.50, -114.52], [32.80, -114.60], [32.53, -114.81],
];

/** Convert a region's bounds {south,west,north,east} to leaflet bounds. */
function regionBounds(regionId: RegionId): L.LatLngBoundsLiteral {
  const r = REGIONS.find(x => x.id === regionId)!;
  const { south, west, north, east } = r.bounds;
  // Pad region bounds so biomes don't sit on the edge
  const latPad = (north - south) * 0.25;
  const lngPad = (east - west) * 0.20;
  return [
    [south - latPad, west - lngPad],
    [north + latPad, east + lngPad],
  ];
}

function getBiomeStatus(biome: typeof BIOMES[number], state: GameState): BiomeStatus {
  const unlocked = state.unlockedBiomes.includes(biome.id) || biome.unlocked;
  if (!unlocked) return 'locked';
  const hasDiscovery = state.discoveredSpecies.some(sid => {
    const sp = SPECIES.find(s => s.id === sid);
    return sp?.biomeIds.includes(biome.id);
  });
  return hasDiscovery ? 'active' : 'new';
}

// Inner component that drives map animation when selectedRegion changes.
// Also handles initial framing + window resize so Leaflet always matches the container.
function MapAnimator({ selectedRegion, isZoomed }: { selectedRegion: RegionId; isZoomed: boolean }) {
  const map = useMap();
  const prevRegionRef = useRef(selectedRegion);
  const initialRef = useRef(true);

  // Padding leaves room for the top bar + XP bar (≈100 px) and a bit of breathing room
  // at the bottom for the collapsible briefing toggle — keeps California in the visible band.
  const OVERVIEW_PADDING_TL: L.PointTuple = [24, 70];
  const OVERVIEW_PADDING_BR: L.PointTuple = [24, 70];
  const REGION_PADDING_TL: L.PointTuple = [40, 80];
  const REGION_PADDING_BR: L.PointTuple = [40, 80];

  // Initial frame: fit California bounds exactly to the container (no animation).
  useEffect(() => {
    map.whenReady(() => {
      map.invalidateSize();
      if (initialRef.current) {
        map.fitBounds(CALIFORNIA_BOUNDS, {
          paddingTopLeft: OVERVIEW_PADDING_TL,
          paddingBottomRight: OVERVIEW_PADDING_BR,
          animate: false,
        });
      }
    });
  }, [map]);

  // Keep the map sized correctly when the window resizes.
  useEffect(() => {
    const onResize = () => {
      map.invalidateSize();
      if (!isZoomed) {
        map.fitBounds(CALIFORNIA_BOUNDS, {
          paddingTopLeft: OVERVIEW_PADDING_TL,
          paddingBottomRight: OVERVIEW_PADDING_BR,
          animate: false,
        });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [map, isZoomed]);

  // Region / zoom-state transitions.
  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }

    if (isZoomed) {
      map.flyToBounds(regionBounds(selectedRegion), {
        paddingTopLeft: REGION_PADDING_TL,
        paddingBottomRight: REGION_PADDING_BR,
        duration: prevRegionRef.current === selectedRegion ? 0.8 : 1.4,
        easeLinearity: 0.25,
      });
    } else {
      map.flyToBounds(CALIFORNIA_BOUNDS, {
        paddingTopLeft: OVERVIEW_PADDING_TL,
        paddingBottomRight: OVERVIEW_PADDING_BR,
        duration: 1.0,
        easeLinearity: 0.25,
      });
    }

    prevRegionRef.current = selectedRegion;
  }, [selectedRegion, isZoomed, map]);

  return null;
}

function MapClickHandler({ isZoomed, onZoomOut }: { isZoomed: boolean; onZoomOut: () => void }) {
  useMapEvents({
    click: (e) => {
      if (!isZoomed) return;
      const { lat, lng } = e.latlng;
      const insideAnyRegion = REGIONS.some(r => {
        const { south, west, north, east } = r.bounds;
        return lat >= south && lat <= north && lng >= west && lng <= east;
      });
      if (!insideAnyRegion) {
        onZoomOut();
      }
    },
  });
  return null;
}

export default function CaliforniaHero({
  height = 340,
  state,
  selectedRegion,
  onSelectRegion,
  onSelectBiome,
}: CaliforniaHeroProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [titleVisible, setTitleVisible] = useState(true);
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());

  const startTransition = useCallback((duration = 1000) => {
    setTitleVisible(false);
    setTransitioning(true);
    setTimeout(() => setTitleVisible(true), duration * 0.35);
    setTimeout(() => setTransitioning(false), duration);
  }, []);

  const biomesWithStatus = useMemo(
    () => BIOMES.map(b => ({ biome: b, status: getBiomeStatus(b, state) })),
    [state],
  );

  const biomeIcons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    let regionIdx = 0;
    for (const { biome, status } of biomesWithStatus) {
      const inSelected = biome.regionId === selectedRegion;
      const isActive = status === 'active';
      const isNew = status === 'new';
      const region = REGIONS.find(r => r.id === biome.regionId);
      const color = isActive
        ? '#f5d97a'
        : isNew
          ? region?.accent ?? '#8aaa7a'
          : '#3a5040';
      const size = inSelected ? (isZoomed ? 14 : 11) : (isZoomed ? 4 : 6);
      const glow = inSelected && status !== 'locked'
        ? `0 0 12px ${color}cc, 0 0 4px ${color}88`
        : `0 0 4px ${color}40`;
      const showLabel = isZoomed && inSelected && status !== 'locked';
      const staggerDelay = inSelected ? regionIdx++ * 0.08 : 0;
      const pinAnim = isZoomed && inSelected
        ? `animation:caHeroPinIn 0.5s ${staggerDelay + 0.3}s cubic-bezier(0.16,1,0.3,1) both${isActive ? `,caHeroPulse 2.4s ${staggerDelay + 0.8}s ease-in-out infinite` : ''};`
        : isActive && inSelected
          ? 'animation:caHeroPulse 2.4s ease-in-out infinite;'
          : '';
      const labelAnim = showLabel
        ? `animation:caHeroLabelIn 0.4s ${staggerDelay + 0.5}s cubic-bezier(0.16,1,0.3,1) both;`
        : '';
      cache.set(biome.id, L.divIcon({
        className: 'ca-hero-pin',
        html: `<div style="
          width:${size}px; height:${size}px; border-radius:50%;
          background:radial-gradient(circle at 30% 30%, ${color}, ${color}90);
          border:1.5px solid rgba(232,228,216,${inSelected ? 0.9 : 0.3});
          box-shadow:${glow};
          transform:translate(-50%,-50%);
          transition:all 0.4s cubic-bezier(0.16,1,0.3,1);
          ${pinAnim}
        "></div>${showLabel ? `<div style="
          position:absolute; left:50%; top:${size + 4}px; transform:translateX(-50%);
          white-space:nowrap; font-size:11px; font-weight:700; color:#e8e4d8;
          text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7);
          pointer-events:none; letter-spacing:0.02em;
          opacity:0; ${labelAnim}
        ">${biome.name}</div>` : ''}`,
        iconSize: [0, 0],
      }));
    }
    return cache;
  }, [biomesWithStatus, selectedRegion, isZoomed]);

  const selectedInfo = useMemo(() => {
    const region = REGIONS.find(r => r.id === selectedRegion)!;
    const tierOpen = isTierUnlocked(region.tier, state);
    const pct = getRegionCatalogPct(selectedRegion, state);
    const regionBiomes = BIOMES.filter(b => b.regionId === selectedRegion);
    const unlocked = regionBiomes.filter(
      b => state.unlockedBiomes.includes(b.id) || b.unlocked,
    ).length;
    return { region, tierOpen, pct, unlocked, total: regionBiomes.length };
  }, [selectedRegion, state]);

  const handleRegionClick = (regionId: RegionId, fromOutside = false) => {
    if (regionId === selectedRegion) {
      if (!isZoomed) {
        startTransition(800);
        setIsZoomed(true);
      } else if (fromOutside) {
        startTransition(1000);
        setIsZoomed(false);
      }
    } else {
      startTransition(1400);
      onSelectRegion(regionId);
      setIsZoomed(true);
    }
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: '#0a1610',
        boxShadow: `inset 0 0 40px rgba(0,0,0,0.4)`,
        height,
        width: '100%',
        transition: 'box-shadow 0.5s ease',
      }}
    >
      {/* Map area */}
      <div className="absolute inset-0">
        <MapContainer
          bounds={CALIFORNIA_BOUNDS}
          boundsOptions={{ paddingTopLeft: [24, 70], paddingBottomRight: [24, 70] }}
          zoomSnap={0}
          zoomDelta={0.5}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%', background: '#0a1610' }}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={18}
          />

          <MapAnimator selectedRegion={selectedRegion} isZoomed={isZoomed} />
          <MapClickHandler isZoomed={isZoomed} onZoomOut={() => { startTransition(1000); setIsZoomed(false); }} />

          {/* California state outline */}
          <Polyline
            positions={CALIFORNIA_OUTLINE}
            pathOptions={{
              color: '#c9a84c',
              weight: 2,
              opacity: 0.6,
              dashArray: '6 3',
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <Polyline
            positions={CALIFORNIA_OUTLINE}
            pathOptions={{
              color: '#c9a84c',
              weight: 6,
              opacity: 0.12,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />

          {/* Region zone overlays */}
          {REGIONS.map(region => {
            const { south, west, north, east } = region.bounds;
            const isSelected = region.id === selectedRegion;
            const tierOpen = isTierUnlocked(region.tier, state);
            return (
              <Rectangle
                key={region.id}
                bounds={[[south, west], [north, east]]}
                pathOptions={{
                  color: isSelected ? region.accent : tierOpen ? region.accent : '#3a5040',
                  weight: isSelected ? 2.5 : 1,
                  fillColor: region.accent,
                  fillOpacity: isSelected ? 0.22 : tierOpen ? 0.06 : 0.02,
                  dashArray: isSelected ? undefined : '4 3',
                }}
                eventHandlers={{
                  click: () => handleRegionClick(region.id),
                }}
              />
            );
          })}

          {/* Biome pins */}
          {biomesWithStatus.map(({ biome, status }) => {
            const isUnlocked = status !== 'locked';
            const discovered = isUnlocked
              ? state.discoveredSpecies.filter(sid => SPECIES.find(s => s.id === sid)?.biomeIds.includes(biome.id)).length
              : 0;
            return (
              <Marker
                key={biome.id}
                position={[biome.lat, biome.lng]}
                icon={biomeIcons.get(biome.id)!}
                ref={(ref) => { if (ref) markerRefs.current.set(biome.id, ref); }}
                eventHandlers={{
                  click: () => {
                    const needsZoom = !isZoomed || biome.regionId !== selectedRegion;
                    if (needsZoom) {
                      const marker = markerRefs.current.get(biome.id);
                      if (marker) marker.closePopup();
                      const changingRegion = biome.regionId !== selectedRegion;
                      startTransition(changingRegion ? 1400 : 800);
                      if (changingRegion) {
                        onSelectRegion(biome.regionId);
                      }
                      setIsZoomed(true);
                      setTimeout(() => {
                        const m = markerRefs.current.get(biome.id);
                        if (m) m.openPopup();
                      }, 1500);
                    }
                  },
                }}
              >
                <Popup
                  closeButton={false}
                  className="biome-popup"
                >
                  <div
                    ref={el => { if (el) L.DomEvent.disableClickPropagation(el); }}
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      minWidth: 168,
                      padding: '5px 3px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 19 }}>{biome.emoji}</span>
                      <strong style={{ fontSize: 14, color: '#1a2e20' }}>{biome.name}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: '#5a7a5a', marginBottom: 7 }}>
                      {isUnlocked
                        ? `${discovered}/${getBiomeSpeciesCount(biome.id)} species · ${biome.collectionPoints.length} sites`
                        : 'Locked — purchase permit'}
                    </div>
                    {isUnlocked && onSelectBiome && (
                      <button
                        ref={el => {
                          if (!el || el.dataset.bound) return;
                          el.dataset.bound = '1';
                          L.DomEvent.disableClickPropagation(el);
                          el.addEventListener('click', (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onSelectBiome(biome.id);
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 0',
                          borderRadius: 7,
                          border: '1px solid #4a8a4a',
                          background: 'linear-gradient(135deg, #1a3520, #14231a)',
                          color: '#c9a84c',
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: 'pointer',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Explore →
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Title overlay — positioned below the HQ top bar (60 px) + XP bar (24 px) */}
        <div
          className="absolute left-0 pointer-events-none z-[500]"
          style={{
            top: 64,
            padding: '6px 22px 14px 16px',
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
          }}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <div
              className="h-px"
              style={{
                width: 20,
                background: selectedInfo.region.accent,
                transition: 'background 0.5s ease',
              }}
            />
            <div
              className="text-[10px] font-bold tracking-[0.22em]"
              style={{
                color: selectedInfo.region.accent,
                textShadow: '0 1px 6px rgba(0,0,0,0.95)',
                transition: 'color 0.5s ease',
              }}
            >
              {isZoomed ? selectedInfo.region.name.toUpperCase() : 'BIOKEA SURVEY'}
            </div>
          </div>
          <div
            className="font-bold italic leading-none"
            style={{
              fontFamily: 'Georgia, serif',
              color: '#e8e4d8',
              textShadow: '0 2px 14px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.7)',
              fontSize: isZoomed ? '18px' : '24px',
              transition: 'font-size 0.5s ease',
            }}
          >
            {isZoomed ? selectedInfo.region.tagline : 'California'}
          </div>
        </div>

        {/* Region tabs — right side, below top bar + XP bar */}
        {/* Desktop: vertical column with labels */}
        <div
          className="absolute z-[500] hidden sm:flex flex-col gap-2 rounded-2xl"
          style={{
            top: 66,
            right: 10,
            padding: '8px 6px',
            background: 'rgba(8,14,10,0.92)',
            border: '1px solid #2a4030',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {REGIONS.map(region => {
            const isSelected = region.id === selectedRegion;
            const tierOpen = isTierUnlocked(region.tier, state);
            return (
              <button
                key={region.id}
                onClick={() => handleRegionClick(region.id)}
                className="flex items-center gap-2 rounded-xl transition-all duration-300"
                style={{
                  padding: '8px 14px',
                  background: isSelected
                    ? `${region.accent}28`
                    : 'transparent',
                  border: `1.5px solid ${isSelected ? `${region.accent}90` : 'transparent'}`,
                  opacity: tierOpen ? 1 : 0.4,
                  boxShadow: isSelected
                    ? `0 0 12px ${region.accent}30, inset 0 0 8px ${region.accent}15`
                    : 'none',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <span style={{ fontSize: 22 }}>{region.emoji}</span>
                <span
                  className="text-[14px] font-bold transition-colors duration-300"
                  style={{ color: isSelected ? region.accent : '#6a8a6a' }}
                >
                  T{region.tier}
                </span>
                {!tierOpen && <span className="text-[13px]">🔒</span>}
              </button>
            );
          })}

          {/* Zoom-out button when zoomed */}
          {isZoomed && (
            <button
              onClick={() => { startTransition(1000); setIsZoomed(false); }}
              className="flex items-center justify-center rounded-xl transition-all duration-300 mt-1"
              style={{
                padding: '8px 14px',
                background: 'rgba(201,168,76,0.1)',
                border: '1.5px solid rgba(201,168,76,0.5)',
              }}
            >
              <span className="text-[14px] font-bold" style={{ color: '#c9a84c' }}>
                OVERVIEW
              </span>
            </button>
          )}
        </div>
        {/* Mobile: compact vertical column, emoji-only, right-aligned */}
        <div
          className="absolute z-[500] flex sm:hidden flex-col gap-1 rounded-xl"
          style={{
            top: 66,
            right: 6,
            padding: '4px',
            background: 'rgba(8,14,10,0.92)',
            border: '1px solid #2a4030',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          {REGIONS.map(region => {
            const isSelected = region.id === selectedRegion;
            const tierOpen = isTierUnlocked(region.tier, state);
            return (
              <button
                key={region.id}
                onClick={() => handleRegionClick(region.id)}
                className="flex items-center justify-center rounded-lg transition-all duration-200"
                style={{
                  width: 36,
                  height: 36,
                  background: isSelected
                    ? `${region.accent}28`
                    : 'transparent',
                  border: `1.5px solid ${isSelected ? `${region.accent}90` : 'transparent'}`,
                  opacity: tierOpen ? 1 : 0.35,
                  boxShadow: isSelected
                    ? `0 0 8px ${region.accent}30`
                    : 'none',
                }}
              >
                <span style={{ fontSize: 16 }}>{region.emoji}</span>
              </button>
            );
          })}
          {isZoomed && (
            <button
              onClick={() => { startTransition(1000); setIsZoomed(false); }}
              className="flex items-center justify-center rounded-lg transition-all duration-200 mt-0.5"
              style={{
                width: 36,
                height: 36,
                background: 'rgba(201,168,76,0.1)',
                border: '1.5px solid rgba(201,168,76,0.5)',
              }}
            >
              <span className="text-[10px] font-bold" style={{ color: '#c9a84c' }}>
                ←
              </span>
            </button>
          )}
        </div>

        {/* Legend — bottom-left inset of the map */}
        <div
          className="absolute z-[500] rounded-2xl bottom-[76px] md:bottom-3"
          style={{
            left: 12,
            padding: '14px 20px 16px 20px',
            background: 'rgba(10,22,16,0.88)',
            border: '1.5px solid rgba(42,64,48,0.5)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <div
            className="text-[14px] font-bold mb-2.5"
            style={{ color: '#c9a84c', letterSpacing: '0.15em' }}
          >
            LEGEND
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <span
                className="inline-block rounded-full shrink-0"
                style={{
                  width: 16,
                  height: 16,
                  background: 'radial-gradient(circle at 30% 30%, #f5d97a, #f5d97a90)',
                  border: '2px solid rgba(232,228,216,0.9)',
                  boxShadow: '0 0 10px #f5d97aaa',
                }}
              />
              <span className="text-[16px]" style={{ color: '#e8e4d8' }}>
                Found
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="inline-block rounded-full shrink-0"
                style={{
                  width: 16,
                  height: 16,
                  background: 'radial-gradient(circle at 30% 30%, #8aaa7a, #8aaa7a90)',
                  border: '2px solid rgba(232,228,216,0.3)',
                }}
              />
              <span className="text-[16px]" style={{ color: '#e8e4d8' }}>
                New
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="inline-block rounded-full shrink-0"
                style={{
                  width: 16,
                  height: 16,
                  background: 'radial-gradient(circle at 30% 30%, #3a5040, #3a504090)',
                  border: '2px solid rgba(232,228,216,0.3)',
                }}
              />
              <span className="text-[16px]" style={{ color: '#6a8a6a' }}>
                Locked
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cinematic vignette flash during transitions */}
      <div
        className="absolute inset-0 z-[450] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
          opacity: transitioning ? 0.8 : 0,
          transition: `opacity ${transitioning ? '0.2s' : '0.6s'} ease`,
        }}
      />

      <style>{`
        @keyframes caHeroPulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%,-50%) scale(1.5); opacity: 0.8; }
        }
        @keyframes caHeroPinIn {
          from {
            transform: translate(-50%,-50%) scale(0);
            opacity: 0;
          }
          to {
            transform: translate(-50%,-50%) scale(1);
            opacity: 1;
          }
        }
        @keyframes caHeroLabelIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        .biome-popup .leaflet-popup-content-wrapper {
          background: #e8e4d8;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          border: 1px solid #c9a84c40;
        }
        .biome-popup .leaflet-popup-tip {
          background: #e8e4d8;
        }
        .biome-popup .leaflet-popup-content {
          margin: 10px 12px;
        }
      `}</style>
    </div>
  );
}
