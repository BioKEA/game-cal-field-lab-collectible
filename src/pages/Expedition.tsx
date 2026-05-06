import { useState, useCallback, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import FieldMapHero from '@/components/FieldMapHero';
import EnvironmentScene from '@/components/EnvironmentScene';
import { BIOMES, getBiomeById } from '@/data/biomes';
import { SPECIES } from '@/data/species';
import { REGIONS, getRegionFuelCost } from '@/data/regions';
import { SAMPLING_METHOD_INFO, RARITY_COLORS } from '@/types/game';
import type { GameState, CollectionPoint, SamplingMethod, CollectedSpecimen, RegionId } from '@/types/game';
import { getBiomeWeather, getTodayWeather, getWeatherModifier } from '@/data/weather';
import { computeBuffs } from '@/lib/buffs';
import {
  getBiomeHealth,
  getHealthMultiplier,
  getHealthStatus,
  HEALTH_STATUS_INFO,
  hasKeystoneBonus,
  KEYSTONE_BONUS,
} from '@/lib/ecosystem';

interface ExpeditionProps {
  state: GameState;
  onNavigate: (page: string) => void;
  onCollectSpecimen: (
    speciesId: string,
    biomeId: string,
    collectionPointId: string,
    samplingMethod: SamplingMethod,
  ) => CollectedSpecimen;
  onSetLocation: (biomeId: string | null, pointId: string | null) => void;
  onUseFuel: (biomeId?: string) => void;
  /** Optional pre-selected biome + collection point to jump straight into. */
  initialTarget?: { biomeId: string; pointId: string } | null;
  /** Optional biome to auto-select into exploring phase on mount. */
  initialBiomeId?: string | null;
}

function createPinIcon(emoji: string, active: boolean) {
  return L.divIcon({
    html: `<div style="
      width: 40px; height: 40px;
      background: ${active ? '#c9a84c' : '#14231a'};
      border: 2px solid ${active ? '#c9a84c' : '#2a4030'};
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      transition: all 0.3s;
    ">${emoji}</div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const ESRI_SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';
const DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_ATTRIBUTION = '&copy; OpenStreetMap &copy; CARTO';

const ENVIRONMENT_EMOJI: Record<string, string> = {
  shore: '🏖️',
  tidepools: '🪨',
  dunes: '🏜️',
  forest: '🌲',
  stream: '💧',
  meadow: '🌿',
  canopy: '🌳',
  log: '🪵',
  cave: '🦇',
  wetland: '🐸',
};

function MapFlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  map.flyTo(center, zoom, { duration: 1.5 });
  return null;
}

type ExpeditionPhase = 'biome-select' | 'exploring' | 'collecting';

export default function Expedition({
  state,
  onNavigate,
  onCollectSpecimen,
  onSetLocation,
  onUseFuel,
  initialTarget,
  initialBiomeId,
}: ExpeditionProps) {
  const [phase, setPhase] = useState<ExpeditionPhase>('biome-select');
  const [selectedBiomeId, setSelectedBiomeId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<CollectionPoint | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<SamplingMethod | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [lastCollected, setLastCollected] = useState<{ specimen: CollectedSpecimen; speciesName: string; emoji: string; rarity: string } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('marin-county');

  const weather = useMemo(() => selectedBiomeId ? getBiomeWeather(selectedBiomeId) : getTodayWeather(), [selectedBiomeId]);
  const buffs = useMemo(() => computeBuffs(state), [state]);
  const collectCost = buffs.collectStaminaCost;

  const selectedBiome = selectedBiomeId ? getBiomeById(selectedBiomeId) : null;

  const mapCenter: [number, number] = useMemo(() => {
    if (selectedBiome) return [selectedBiome.lat, selectedBiome.lng];
    return [37.897, -122.61];
  }, [selectedBiome]);

  const mapZoom = selectedBiome ? selectedBiome.zoom : 13;

  const handleSelectBiome = useCallback((biomeId: string) => {
    const biome = getBiomeById(biomeId);
    const cost = biome ? getRegionFuelCost(biome.regionId) : 1;
    if (state.expeditionFuel < cost) return;
    setSelectedBiomeId(biomeId);
    setPhase('exploring');
    onSetLocation(biomeId, null);
    onUseFuel(biomeId);
  }, [state.expeditionFuel, onSetLocation, onUseFuel]);

  const handleSelectPoint = useCallback((point: CollectionPoint) => {
    setSelectedPoint(point);
    setSelectedMethod(null);
    setPhase('collecting');
    onSetLocation(selectedBiomeId, point.id);
  }, [selectedBiomeId, onSetLocation]);

  const handleCollect = useCallback(() => {
    if (!selectedPoint || !selectedMethod || !selectedBiomeId) return;
    if (state.stamina < collectCost) return;

    setCollecting(true);

    // Determine which species to find based on method + point + time of day
    const availableSpecies = selectedPoint.speciesPool
      .map(id => SPECIES.find(s => s.id === id)!)
      .filter(s => s.samplingMethods.includes(selectedMethod!))
      .filter(s => {
        const activeAt = s.activeAt || 'day';
        if (activeAt === 'both') return true;
        return isNight ? activeAt === 'night' : activeAt === 'day';
      });

    if (availableSpecies.length === 0) {
      setCollecting(false);
      return;
    }

    // Base rarity weights, boosted by weather modifiers and skill buffs
    const baseWeights: Record<string, number> = {
      common: 60, uncommon: 25, rare: 10, 'ultra-rare': 4, legendary: 1,
    };
    const health = getBiomeHealth(state, selectedBiomeId);
    const healthMult = getHealthMultiplier(health);
    const biome = getBiomeById(selectedBiomeId);
    const keystone = biome ? hasKeystoneBonus(state, biome.signatureSpeciesId) : false;
    const weightedSpecies = availableSpecies.map(s => {
      const weatherMod = getWeatherModifier(weather, s.taxonomicGroup, s.rarity);
      let weight = baseWeights[s.rarity] * weatherMod;
      // Biology skill rare/legendary bonuses (additive on base rate)
      if (s.rarity === 'rare') weight *= (1 + buffs.rareChanceBonus * 10);
      if (s.rarity === 'legendary') weight *= (1 + buffs.legendaryChanceBonus * 10);
      // Ecosystem health affects rare+ spawn rate
      if (s.rarity === 'rare' || s.rarity === 'ultra-rare' || s.rarity === 'legendary') {
        weight *= healthMult;
        if (keystone) weight *= KEYSTONE_BONUS;
      }
      return { species: s, weight };
    });
    const totalWeight = weightedSpecies.reduce((sum, w) => sum + w.weight, 0);
    let roll = Math.random() * totalWeight;
    let chosen = weightedSpecies[0].species;
    for (const { species, weight } of weightedSpecies) {
      roll -= weight;
      if (roll <= 0) {
        chosen = species;
        break;
      }
    }

    setTimeout(() => {
      const specimen = onCollectSpecimen(chosen.id, selectedBiomeId, selectedPoint.id, selectedMethod);
      setLastCollected({
        specimen,
        speciesName: chosen.commonName,
        emoji: chosen.emoji,
        rarity: chosen.rarity,
      });
      setShowResult(true);
      setCollecting(false);
    }, 1500);
  }, [selectedPoint, selectedMethod, selectedBiomeId, state.stamina, onCollectSpecimen, isNight, weather, buffs, collectCost]);

  // When launched with a specific target (from HQ map), jump straight to
  // the collecting phase at that point — but only once, on first mount.
  useEffect(() => {
    if (!initialTarget) return;
    const biome = getBiomeById(initialTarget.biomeId);
    if (!biome) return;
    const point = biome.collectionPoints.find(p => p.id === initialTarget.pointId);
    if (!point) return;
    if (!state.unlockedBiomes.includes(biome.id)) return;
    const travelCost = getRegionFuelCost(biome.regionId);
    if (state.expeditionFuel < travelCost && state.currentBiomeId !== biome.id) return;

    // If we're not already at this biome, spend fuel to travel.
    if (state.currentBiomeId !== biome.id) {
      onUseFuel(biome.id);
    }
    setSelectedBiomeId(biome.id);
    setSelectedPoint(point);
    setSelectedMethod(null);
    setPhase('collecting');
    onSetLocation(biome.id, point.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When launched with just a biome (from HQ pin), pre-select its region
  // so the user lands on the same FieldMapHero as the Explore tab.
  useEffect(() => {
    if (initialTarget || !initialBiomeId) return;
    const biome = getBiomeById(initialBiomeId);
    if (!biome) return;
    setSelectedRegion(biome.regionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBackToBiomes = useCallback(() => {
    setPhase('biome-select');
    setSelectedBiomeId(null);
    setSelectedPoint(null);
    setSelectedMethod(null);
    onSetLocation(null, null);
  }, [onSetLocation]);

  const handleBackToExploring = useCallback(() => {
    setPhase('exploring');
    setSelectedPoint(null);
    setSelectedMethod(null);
    setShowResult(false);
    setLastCollected(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: isNight ? '#050b10' : '#0a1610' }}>
      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: '#2a4030', background: isNight ? '#060e16' : '#0c1a12' }}>
        <button
          onClick={() => phase === 'biome-select' ? onNavigate('hq') : phase === 'collecting' ? handleBackToExploring() : handleBackToBiomes()}
          className="flex items-center gap-2 text-sm sm:text-base transition-colors shrink-0"
          style={{ color: '#c9a84c' }}
        >
          ← {phase === 'biome-select' ? 'HQ' : phase === 'collecting' ? 'Map' : 'Biomes'}
        </button>
        <h2 className="text-sm sm:text-base font-bold truncate mx-2 min-w-0" style={{ color: '#e8e4d8', fontFamily: "'Outfit', sans-serif" }}>
          {phase === 'biome-select' ? 'Choose Expedition' : selectedBiome?.name || 'Field Expedition'}
        </h2>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <div
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs sm:text-sm font-bold"
            style={{ background: '#4a8a4a18', border: '1px solid #4a8a4a40', color: '#4a8a4a' }}
          >
            ⚡ {state.stamina}
          </div>
          <div
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs sm:text-sm font-bold"
            style={{ background: '#c9a84c18', border: '1px solid #c9a84c40', color: '#c9a84c' }}
          >
            ⛽ {state.expeditionFuel}
          </div>
        </div>
      </div>

      {/* Weather + Day/Night strip */}
      <div
        className="px-3 py-2.5 flex items-center gap-3 border-b"
        style={{
          background: isNight
            ? 'linear-gradient(90deg, #0e1a28, #060e16 60%)'
            : `linear-gradient(90deg, ${weather.accent}15, transparent 60%)`,
          borderColor: isNight ? '#1a2535' : '#1a2a20',
        }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-2xl">{isNight ? '🌙' : weather.icon}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: '#e8e4d8' }}>
              {isNight ? 'Night Expedition' : weather.name}
            </div>
            <div className="text-xs truncate" style={{ color: isNight ? '#6a88aa' : weather.accent }}>
              {isNight ? 'Nocturnal species only · use a lantern' : `${weather.temp} · ${weather.humidity}`}
            </div>
          </div>
        </div>
        <div
          className="flex rounded-full p-0.5"
          style={{ background: '#14231a', border: '1px solid #2a4030' }}
        >
          <button
            onClick={() => setIsNight(false)}
            className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: !isNight ? '#c9a84c' : 'transparent',
              color: !isNight ? '#0f1f15' : '#8aaa7a',
            }}
          >
            ☀ DAY
          </button>
          <button
            onClick={() => setIsNight(true)}
            className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: isNight ? '#60a5fa' : 'transparent',
              color: isNight ? '#0a1018' : '#8aaa7a',
            }}
          >
            ☾ NIGHT
          </button>
        </div>
      </div>

      {/* Biome-select: stacked layout (map top, site list bottom) */}
      {phase === 'biome-select' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top — map */}
          <div className="h-[45vh] shrink-0 p-2 overflow-hidden flex flex-col items-center">
            <FieldMapHero
              state={state}
              onNavigate={onNavigate}
              onSelectBiome={handleSelectBiome}
              selectedRegion={selectedRegion}
              onSelectSamplePoint={(biomeId, pointId) => {
                const biome = getBiomeById(biomeId);
                const point = biome?.collectionPoints.find(p => p.id === pointId);
                if (!biome || !point) return;
                const cost = getRegionFuelCost(biome.regionId);
                if (state.expeditionFuel < cost && state.currentBiomeId !== biomeId) return;
                if (state.currentBiomeId !== biomeId) {
                  onUseFuel(biomeId);
                }
                setSelectedBiomeId(biomeId);
                setSelectedPoint(point);
                setSelectedMethod(null);
                setPhase('collecting');
                onSetLocation(biomeId, pointId);
              }}
              compact
            />
          </div>

          {/* Bottom — site list for the active region */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative z-10" style={{ background: '#0a1610', borderTop: '1px solid #1a2e20' }}>
            {/* Biomes for selected region */}
            <div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-1">
              {(() => {
                const region = REGIONS.find(r => r.id === selectedRegion)!;
                const regionBiomes = BIOMES.filter(b => b.regionId === region.id);
                return regionBiomes.map(biome => {
                  const biomeSpecies = SPECIES.filter(s => s.biomeIds.includes(biome.id));
                  const discovered = state.discoveredSpecies.filter(
                    sid => biomeSpecies.some(s => s.id === sid)
                  ).length;
                  const isUnlocked = state.unlockedBiomes.includes(biome.id);
                  const health = getBiomeHealth(state, biome.id);
                  const status = getHealthStatus(health);
                  const statusInfo = HEALTH_STATUS_INFO[status];
                  const keystone = hasKeystoneBonus(state, biome.signatureSpeciesId);
                  const biomeFuelCost = getRegionFuelCost(biome.regionId);
                  const canAffordFuel = state.expeditionFuel >= biomeFuelCost;
                  const rarityCounts = isUnlocked ? (['common', 'uncommon', 'rare', 'ultra-rare', 'legendary'] as const).map(r => ({
                    rarity: r,
                    total: biomeSpecies.filter(s => s.rarity === r).length,
                    found: biomeSpecies.filter(s => s.rarity === r && state.discoveredSpecies.includes(s.id)).length,
                  })).filter(r => r.total > 0) : [];
                  return (
                    <button
                      key={biome.id}
                      onClick={() => isUnlocked && handleSelectBiome(biome.id)}
                      disabled={!isUnlocked || !canAffordFuel}
                      className="w-full rounded-lg px-2.5 py-2 text-left transition-all hover:scale-[1.005] active:scale-[0.995] disabled:hover:scale-100"
                      style={{
                        background: isUnlocked
                          ? 'linear-gradient(135deg, #1a3520, #14231a)'
                          : 'linear-gradient(135deg, #14181a, #10141a)',
                        border: `1px solid ${isUnlocked ? '#2a4030' : '#1a2030'}`,
                        opacity: isUnlocked ? 1 : 0.5,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="text-base leading-none shrink-0">{isUnlocked ? biome.emoji : '🔒'}</div>
                        <span className="text-xs font-semibold shrink-0" style={{ color: '#e8e4d8' }}>
                          {biome.name}
                        </span>
                        <span className="text-[11px] shrink-0" style={{ color: '#8aaa7a' }}>
                          {isUnlocked ? `${discovered}/${biome.totalSpecies}` : ''}
                        </span>
                        <span className="text-[10px] shrink-0" style={{ color: '#5a7a5a' }}>
                          {isUnlocked
                            ? `${biome.collectionPoints.length}pt`
                            : ''}
                          {isUnlocked && biomeFuelCost > 1 && (
                            <span style={{ color: canAffordFuel ? '#c9a84c' : '#aa5050' }}>
                              {' '}⛽{biomeFuelCost}
                            </span>
                          )}
                        </span>
                        {isUnlocked && (
                          <>
                            <div className="h-1.5 rounded-full overflow-hidden shrink-0" style={{ background: '#0a1610', width: 40 }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${health}%`, background: statusInfo.color }}
                              />
                            </div>
                            <span className="text-[10px] font-bold shrink-0" style={{ color: statusInfo.color }}>
                              {Math.round(health)}
                            </span>
                            {keystone && <span className="text-[10px] shrink-0" style={{ color: '#c9a84c' }}>⭐</span>}
                          </>
                        )}
                        {isUnlocked && rarityCounts.length > 0 && rarityCounts.map(rc => (
                          <span
                            key={rc.rarity}
                            className="text-[9px] font-bold shrink-0"
                            style={{
                              color: rc.found === rc.total ? RARITY_COLORS[rc.rarity] : `${RARITY_COLORS[rc.rarity]}70`,
                            }}
                          >
                            {rc.found}/{rc.total}{rc.rarity === 'ultra-rare' ? 'u' : rc.rarity[0].toUpperCase()}
                          </span>
                        ))}
                        <div className="text-xs shrink-0 ml-auto" style={{ color: isUnlocked ? '#c9a84c' : '#5a7a5a' }}>
                          {isUnlocked ? '›' : '🛒'}
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
              {state.expeditionFuel <= 0 && (
                <div
                  className="rounded-lg p-3 text-center mx-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #3a1a1a, #2a1010)',
                    border: '1.5px solid #aa505080',
                    boxShadow: '0 0 16px #aa505020',
                  }}
                >
                  <div className="text-2xl mb-1">⛽</div>
                  <p className="text-sm font-bold" style={{ color: '#ef4444' }}>Out of Fuel!</p>
                  <p className="text-[11px] mt-1" style={{ color: '#aa7070' }}>
                    Fuel refills daily or buy more at the Supply Depot
                  </p>
                  <button
                    onClick={() => onNavigate('shop')}
                    className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95"
                    style={{ background: '#c9a84c', color: '#0f1f15' }}
                  >
                    Visit Supply Depot
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : phase === 'exploring' && selectedBiome ? (
        /* EXPLORING PHASE — Full-height map with overlaid panels */
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <div className="absolute inset-x-0 top-0 bottom-0" style={{ zIndex: 0 }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
              zoomControl={false}
              attributionControl={false}
              style={{ background: '#0a1610', zIndex: 0 }}
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Satellite">
                  <TileLayer url={ESRI_SATELLITE_URL} attribution={ESRI_ATTRIBUTION} />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Streets">
                  <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Dark">
                  <TileLayer url={DARK_URL} attribution={DARK_ATTRIBUTION} />
                </LayersControl.BaseLayer>
              </LayersControl>
              <MapFlyTo center={mapCenter} zoom={mapZoom} />
              {selectedBiome.collectionPoints.map(point => (
                <Marker
                  key={point.id}
                  position={[point.lat, point.lng]}
                  icon={createPinIcon(ENVIRONMENT_EMOJI[point.environment] || '📍', false)}
                  eventHandlers={{ click: () => handleSelectPoint(point) }}
                >
                  <Popup>
                    <div style={{ fontFamily: "'Outfit', sans-serif", minWidth: '140px' }}>
                      <strong>{point.name}</strong>
                    </div>
                  </Popup>
                </Marker>
              ))}
              <Polyline
                positions={selectedBiome.collectionPoints.map(p => [p.lat, p.lng] as [number, number])}
                pathOptions={{ color: '#4a8a4a', weight: 2, dashArray: '6, 8', opacity: 0.5 }}
              />
            </MapContainer>
          </div>

          {/* Overlaid biome header with health + weather */}
          {(() => {
            const exploringHealth = getBiomeHealth(state, selectedBiome.id);
            const exploringStatus = getHealthStatus(exploringHealth);
            const exploringInfo = HEALTH_STATUS_INFO[exploringStatus];
            const exploringKeystone = hasKeystoneBonus(state, selectedBiome.signatureSpeciesId);
            return (
              <div
                className="absolute top-3 left-3 right-3 z-[400] rounded-xl px-3 py-2"
                style={{
                  background: 'rgba(10, 22, 16, 0.88)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(74, 138, 74, 0.25)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedBiome.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: '#e8e4d8' }}>{selectedBiome.name}</div>
                    <div className="text-[10px]" style={{ color: '#5a7a5a' }}>{selectedBiome.region}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{exploringHealth >= 70 ? '🌿' : exploringHealth >= 40 ? '🍂' : '⚠️'}</span>
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(42, 64, 48, 0.5)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${exploringHealth}%`, background: exploringInfo.color }}
                      />
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: exploringInfo.color }}>{Math.round(exploringHealth)}%</span>
                    {exploringKeystone && <span className="text-[9px]" style={{ color: '#c9a84c' }}>★</span>}
                  </div>
                  <div className="h-3 w-px" style={{ background: 'rgba(74, 138, 74, 0.3)' }} />
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{weather.icon}</span>
                    <span className="text-[10px] font-medium" style={{ color: '#8aaa7a' }}>{weather.name}</span>
                    <span className="text-[9px]" style={{ color: '#5a7a5a' }}>{weather.temp}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Overlaid collection points panel */}
          <div
            className="absolute bottom-0 left-0 right-0 z-[400] rounded-t-xl overflow-y-auto"
            style={{
              maxHeight: '50%',
              background: 'rgba(10, 22, 16, 0.90)',
              backdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(74, 138, 74, 0.25)',
            }}
          >
            <div className="px-3 py-2.5 space-y-1.5">
              <div className="text-[10px] font-bold tracking-[0.12em]" style={{ color: '#5a7a5a' }}>
                COLLECTION POINTS
              </div>
              {selectedBiome.collectionPoints.map(point => {
                const speciesHere = point.speciesPool.length;
                const collectedHere = state.specimens.filter(s => s.collectionPointId === point.id).length;
                const pct = speciesHere > 0 ? Math.round((collectedHere / speciesHere) * 100) : 0;
                return (
                  <button
                    key={point.id}
                    onClick={() => handleSelectPoint(point)}
                    className="w-full rounded-lg px-3 py-2 text-left transition-all hover:scale-[1.005] active:scale-[0.995]"
                    style={{
                      background: 'rgba(20, 35, 26, 0.6)',
                      border: '1px solid rgba(42, 64, 48, 0.5)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-lg leading-none">{ENVIRONMENT_EMOJI[point.environment] || '📍'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: '#e8e4d8' }}>{point.name}</span>
                          <span className="text-[10px] font-medium" style={{ color: pct === 100 ? '#c9a84c' : '#5a7a5a' }}>
                            {collectedHere}/{speciesHere}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {point.availableMethods.map(m => (
                            <span key={m} className="text-[9px]" style={{ color: '#8aaa7a' }}>
                              {SAMPLING_METHOD_INFO[m].emoji}
                            </span>
                          ))}
                          <div className="w-16 h-1 rounded-full overflow-hidden ml-auto" style={{ background: 'rgba(42, 64, 48, 0.5)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: pct === 100 ? '#c9a84c' : '#4a8a4a' }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-sm shrink-0" style={{ color: '#5a7a5a' }}>›</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      ) : phase === 'collecting' && selectedPoint ? (() => {
        const collectingHealth = selectedBiomeId ? getBiomeHealth(state, selectedBiomeId) : 100;
        const collectingStatus = getHealthStatus(collectingHealth);
        const collectingInfo = HEALTH_STATUS_INFO[collectingStatus];
        const collectingKeystone = selectedBiome ? hasKeystoneBonus(state, selectedBiome.signatureSpeciesId) : false;
        void collectingStatus;
        return (
          <div className="flex-1 relative">
            <div className="absolute inset-x-0 top-0 bottom-0 overflow-hidden">
              <EnvironmentScene
                environment={selectedPoint.environment}
                isNight={isNight}
                samplingMethod={selectedMethod}
                collecting={collecting}
              />
            </div>

            {/* HUD: Top-left — Point info */}
            <div
              className="absolute top-3 left-3 z-10 rounded-xl px-3 py-2"
              style={{
                background: 'rgba(10, 22, 16, 0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(74, 138, 74, 0.25)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{ENVIRONMENT_EMOJI[selectedPoint.environment] || '📍'}</span>
                <div>
                  <div className="text-sm font-bold" style={{ color: '#e8e4d8' }}>{selectedPoint.name}</div>
                  <div className="text-xs" style={{ color: '#5a7a5a' }}>{selectedBiome?.name}</div>
                </div>
              </div>
            </div>

            {/* HUD: Top-right — Ecosystem health */}
            <div
              className="absolute top-3 right-3 z-10 rounded-xl px-3 py-2"
              style={{
                background: 'rgba(10, 22, 16, 0.8)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${collectingInfo.color}30`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{
                    background: `${collectingInfo.color}25`,
                    color: collectingInfo.color,
                  }}
                >
                  {collectingInfo.label.toUpperCase()}
                </span>
                <span className="text-xs font-bold" style={{ color: collectingInfo.color }}>
                  {Math.round(collectingHealth)}
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#0a1610', width: '80px' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${collectingHealth}%`, background: collectingInfo.color }}
                />
              </div>
              {collectingKeystone && (
                <div className="text-[10px] font-semibold mt-1 flex items-center gap-1" style={{ color: '#c9a84c' }}>
                  ⭐ +15% rare
                </div>
              )}
            </div>

            {/* HUD: Bottom — Methods */}
            <div
              className="absolute bottom-[76px] md:bottom-3 left-3 right-3 z-10 rounded-xl p-3"
              style={{
                background: 'rgba(10, 22, 16, 0.8)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(74, 138, 74, 0.25)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-semibold" style={{ color: '#5a7a5a', letterSpacing: '1px' }}>
                  SAMPLING METHOD
                </div>
                <span className="text-[10px]" style={{ color: '#5a7a5a' }}>
                  {state.stamina} ⚡ remaining
                </span>
              </div>
              <div className="flex gap-2">
                {selectedPoint.availableMethods.map(method => (
                  <button
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all flex-1"
                    style={{
                      background: selectedMethod === method
                        ? 'rgba(201, 168, 76, 0.2)'
                        : 'rgba(20, 35, 26, 0.6)',
                      border: `1.5px solid ${selectedMethod === method ? '#c9a84c' : 'rgba(42, 64, 48, 0.6)'}`,
                    }}
                  >
                    <span className="text-xl">{SAMPLING_METHOD_INFO[method].emoji}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold" style={{ color: selectedMethod === method ? '#c9a84c' : '#e8e4d8' }}>
                        {SAMPLING_METHOD_INFO[method].name}
                      </div>
                      <div className="text-[9px]" style={{ color: '#5a7a5a' }}>
                        {SAMPLING_METHOD_INFO[method].description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Floating collect button — appears center-screen when method is selected */}
            {selectedMethod && !showResult && (
              <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ bottom: '35%' }}>
                <button
                  onClick={handleCollect}
                  disabled={collecting || state.stamina < collectCost}
                  className="rounded-xl px-6 py-3 font-bold text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{
                    background: 'rgba(10, 22, 16, 0.85)',
                    backdropFilter: 'blur(16px)',
                    border: '1.5px solid #4a8a4a',
                    color: '#e8e4d8',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.5), 0 0 20px rgba(74,138,74,0.15)',
                  }}
                >
                  {collecting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#4a8a4a', borderTopColor: 'transparent' }} />
                      <span style={{ color: '#4a8a4a' }}>Sampling...</span>
                    </div>
                  ) : state.stamina < collectCost ? (
                    <span style={{ color: '#c9a84c' }}>Need {collectCost} ⚡</span>
                  ) : (
                    <span>Collect with {SAMPLING_METHOD_INFO[selectedMethod].name} · {collectCost} ⚡</span>
                  )}
                </button>
              </div>
            )}

            {/* Result overlay */}
            {showResult && lastCollected && (
              <div
                className="fixed inset-0 flex items-center justify-center p-6"
                style={{ background: 'rgba(10,22,16,0.92)', zIndex: 9999 }}
                onClick={() => {
                  setShowResult(false);
                  setLastCollected(null);
                }}
              >
                <div
                  className="rounded-2xl p-6 text-center max-w-sm w-full"
                  style={{
                    background: 'linear-gradient(180deg, #14231a, #0f1f15)',
                    border: `2px solid ${RARITY_COLORS[lastCollected.rarity as keyof typeof RARITY_COLORS]}`,
                    boxShadow: `0 0 40px ${RARITY_COLORS[lastCollected.rarity as keyof typeof RARITY_COLORS]}30`,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="text-xs font-semibold mb-3" style={{ color: '#c9a84c', letterSpacing: '2px' }}>
                    DNA COLLECTED
                  </div>
                  {/*
                    The actual species + emoji is intentionally not
                    revealed here — discovery happens at the lab. We
                    show only the broad sample type so the player knows
                    what the field collection will look like under the
                    microscope, not what species ended up in the vial.
                    Soil/net samples surface their broad-organism category
                    (insect, microbe, etc.); other methods just say "DNA".
                  */}
                  <div className="text-5xl mb-4">🧬</div>
                  <div className="text-lg font-bold mb-1" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
                    {(() => {
                      const method = lastCollected.specimen.samplingMethod;
                      if (method === 'scoop') return 'Soil sample · mixed organisms';
                      if (method === 'hand-net' || method === 'car-trap') return 'Net sample · airborne organisms';
                      if (method === 'plankton-net') return 'Plankton sample · microorganisms';
                      return 'DNA sample';
                    })()}
                  </div>
                  <p className="text-xs mt-3" style={{ color: '#8aaa7a' }}>
                    Let's sequence this to see what it is.
                  </p>
                  <p className="text-[11px] mt-2 italic" style={{ color: '#6a8a6a' }}>
                    Added to lab queue · run it through the pipeline to find out
                  </p>
                  <button
                    onClick={() => { setShowResult(false); setLastCollected(null); }}
                    className="mt-4 px-6 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-105"
                    style={{ background: '#1a3520', border: '1px solid #4a8a4a', color: '#c9a84c' }}
                  >
                    Continue Collecting
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })() : null}
    </div>
  );
}
