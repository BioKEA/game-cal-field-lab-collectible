import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { RANK_LABELS, RANK_THRESHOLDS, DAILY_XP_GOAL, type PlayerRank } from '@/types/game';
import { SPECIES } from '@/data/species';
import { BIOMES, getBiomeSpeciesCount } from '@/data/biomes';
import type { GameState, RegionId } from '@/types/game';
import DailyChallenges from '@/components/DailyChallenges';
import CaliforniaHero from '@/components/CaliforniaHero';
import { REGIONS, isTierUnlocked, getRegionCatalogPct, getRegionFuelCost } from '@/data/regions';
import { getMilestonesForRegion } from '@/data/milestones';
import { isSoundEnabled, setSoundEnabled, playAmbient, stopAmbient } from '@/lib/sounds';
import { getActiveEvent, getEventTimeRemaining } from '@/data/events';
import { getTodayWeather } from '@/data/weather';
import { computeBuffs } from '@/lib/buffs';
import CrossSaveLeaderboard from '@/components/CrossSaveLeaderboard';

const PUBLISH_THRESHOLD = 25;

interface HQProps {
  state: GameState;
  onNavigate: (page: string) => void;
  onClaimChallenge: (id: string) => void;
  onClaimMilestone: (milestoneId: string, reward: { xp: number; credits: number; researchPoints: number; maxFuel?: number }) => void;
  onPublishResearch: () => void;
  onRenamePlayer?: (name: string) => void;
  onSetAvatar?: (avatar: string) => void;
}

const AVATAR_OPTIONS = [
  '🧑‍🔬', '👩‍🔬', '👨‍🔬', '🧑‍🌾', '👩‍🌾', '🧑‍🏫',
  '🦉', '🐛', '🌿', '🍄', '🦋', '🐢',
];

function getNextRank(rank: PlayerRank): PlayerRank | null {
  const order: PlayerRank[] = ['volunteer', 'junior-explorer', 'field-researcher', 'lead-scientist', 'lab-director', 'chief-scientist', 'distinguished-fellow', 'legendary-naturalist'];
  const idx = order.indexOf(rank);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

export default function HQ({ state, onNavigate, onClaimChallenge, onClaimMilestone, onPublishResearch, onRenamePlayer, onSetAvatar }: HQProps) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('marin-county');
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(state.playerName);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [showRegionDetail, setShowRegionDetail] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const celebratedDateRef = useRef<string>('');

  // Play region ambient sound
  useEffect(() => {
    if (soundOn) {
      playAmbient(selectedRegion);
    }
    return () => { stopAmbient(); };
  }, [selectedRegion, soundOn]);

  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  const commitRename = () => {
    const next = draftName.trim();
    if (next && next !== state.playerName) {
      onRenamePlayer?.(next);
    }
    setIsEditingName(false);
  };

  const cancelRename = () => {
    setDraftName(state.playerName);
    setIsEditingName(false);
  };

  const weather = useMemo(() => getTodayWeather(new Date(), selectedRegion), [selectedRegion]);
  const buffs = useMemo(() => computeBuffs(state), [state]);
  const canPublish = state.discoveredSpecies.length >= PUBLISH_THRESHOLD;

  const todayYmd = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const dailyXp = state.dailyXpDate === todayYmd ? state.dailyXpEarned : 0;
  const dailyGoalHit = dailyXp >= DAILY_XP_GOAL;

  const yesterdayYmd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const streakActive = state.streakDate === todayYmd || state.streakDate === yesterdayYmd;
  const displayStreak = streakActive ? state.dailyStreak : 0;

  // Daily goal celebration
  useEffect(() => {
    if (state.streakDate === todayYmd && celebratedDateRef.current !== todayYmd) {
      celebratedDateRef.current = todayYmd;
      const msg = state.dailyStreak > 1
        ? `${state.dailyStreak}-day streak — keep it going, researcher.`
        : `Back at it tomorrow, researcher.`;
      toast('✦ Daily Goal Complete!', { description: msg, duration: 5500 });
    }
  }, [state.streakDate, state.dailyStreak, todayYmd]);

  const nextRank = getNextRank(state.rank);
  const nextThreshold = nextRank ? RANK_THRESHOLDS[nextRank] : state.xp;
  const currentThreshold = RANK_THRESHOLDS[state.rank];
  const xpProgress = nextRank
    ? ((state.xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    : 100;

  const pendingLab = state.specimens.filter(s => s.labStatus !== 'identified' && s.labStatus !== 'failed').length;
  const lowFuel = state.expeditionFuel <= 1;

  const fuelResetLabel = useMemo(() => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ms = midnight.getTime() - now.getTime();
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `Fuel ${state.expeditionFuel}/${state.maxExpeditionFuel} · Refills to max in ${h}h ${m}m`;
  }, [state.expeditionFuel, state.maxExpeditionFuel]);

  const activeEvent = useMemo(() => getActiveEvent(new Date(), selectedRegion), [selectedRegion]);
  const eventTime = useMemo(() => getEventTimeRemaining(), []);

  const regionInfo = useMemo(() => {
    const region = REGIONS.find(r => r.id === selectedRegion)!;
    const tierOpen = isTierUnlocked(region.tier, state);
    const pct = getRegionCatalogPct(selectedRegion, state);
    const regionBiomes = BIOMES.filter(b => b.regionId === selectedRegion);
    const unlocked = regionBiomes.filter(b => state.unlockedBiomes.includes(b.id) || b.unlocked).length;
    return { region, tierOpen, pct, unlocked, total: regionBiomes.length, biomes: regionBiomes };
  }, [selectedRegion, state]);

  const handleRegionTap = useCallback((regionId: RegionId) => {
    setSelectedRegion(regionId);
    setShowRegionDetail(true);
  }, []);

  const accent = regionInfo.region.accent;

  return (
    <div className="relative" style={{ height: '100vh', background: '#8b6914' }}>
      {/* Cork bulletin board background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 1px 1px at 20% 30%, rgba(160,120,60,0.5) 0%, transparent 100%),
            radial-gradient(ellipse 2px 1px at 60% 15%, rgba(120,85,40,0.4) 0%, transparent 100%),
            radial-gradient(ellipse 1px 2px at 80% 70%, rgba(140,105,55,0.35) 0%, transparent 100%),
            radial-gradient(ellipse 1px 1px at 40% 85%, rgba(170,130,70,0.3) 0%, transparent 100%),
            radial-gradient(ellipse 2px 2px at 10% 55%, rgba(110,80,35,0.4) 0%, transparent 100%),
            linear-gradient(135deg, #a37a3b 0%, #b8956a 25%, #a07838 50%, #c4a36e 75%, #9a7035 100%)
          `,
        }}
      />
      {/* Cork grain texture overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(80,55,20,0.08) 3px, rgba(80,55,20,0.08) 4px),
            repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(80,55,20,0.06) 5px, rgba(80,55,20,0.06) 6px)
          `,
        }}
      />

      {/* Map "paper" — inset from cork edges */}
      <div
        className="absolute z-[1]"
        style={{
          top: 10, left: 10, right: 10, bottom: 10,
          boxShadow: '2px 3px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        <CaliforniaHero
          height="100%"
          state={state}
          selectedRegion={selectedRegion}
          onSelectRegion={handleRegionTap}
          onSelectBiome={(biomeId) => onNavigate(`expedition:${biomeId}`)}
        />
      </div>

      {/* Pushpins at corners */}
      <div className="absolute z-[2] pointer-events-none" style={{ top: 10, left: 10, right: 10, bottom: 10 }}>
        {/* Top-left — red pin */}
        <div className="absolute" style={{ top: 6, left: 8 }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #ff6b6b, #cc3333)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
            border: '1px solid rgba(0,0,0,0.2)',
          }} />
          <div style={{
            width: 3, height: 3, borderRadius: '50%',
            background: '#888',
            margin: '0 auto',
            marginTop: -2,
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }} />
        </div>
        {/* Top-right — green pin */}
        <div className="absolute" style={{ top: 6, right: 8 }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #6bcf6b, #33aa33)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
            border: '1px solid rgba(0,0,0,0.2)',
          }} />
          <div style={{
            width: 3, height: 3, borderRadius: '50%',
            background: '#888',
            margin: '0 auto',
            marginTop: -2,
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }} />
        </div>
        {/* Bottom-left — yellow pin */}
        <div className="absolute" style={{ bottom: 6, left: 8 }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #f5d76e, #d4a017)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
            border: '1px solid rgba(0,0,0,0.2)',
          }} />
          <div style={{
            width: 3, height: 3, borderRadius: '50%',
            background: '#888',
            margin: '0 auto',
            marginTop: -2,
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }} />
        </div>
        {/* Bottom-right — blue pin */}
        <div className="absolute" style={{ bottom: 6, right: 8 }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #6ba3ff, #3366cc)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)',
            border: '1px solid rgba(0,0,0,0.2)',
          }} />
          <div style={{
            width: 3, height: 3, borderRadius: '50%',
            background: '#888',
            margin: '0 auto',
            marginTop: -2,
            boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }} />
        </div>
      </div>

      {/* ─── Full-width top bar — region-tinted ─── */}
      <div
        className="absolute top-0 left-0 right-0 z-[600] flex items-center gap-2.5 px-4 transition-all duration-500"
        style={{
          height: 64,
          background: `linear-gradient(180deg, rgba(10,22,16,0.95) 0%, rgba(10,22,16,0.85) 60%, rgba(10,22,16,0) 100%)`,
          borderBottom: `1px solid ${accent}15`,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        {/* Avatar */}
        <button
          onClick={() => setShowAvatarPicker(v => !v)}
          className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center transition-all hover:scale-105 shrink-0"
          style={{
            fontSize: 28,
            background: 'radial-gradient(circle, #1a3520, #0a1610)',
            border: `2px solid ${accent}80`,
            boxShadow: `0 0 10px ${accent}20`,
          }}
        >
          {state.avatar}
        </button>

        {/* Name + rank */}
        <div className="min-w-0 shrink-0" style={{ maxWidth: 180 }}>
          {isEditingName ? (
            <input
              ref={nameInputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') cancelRename();
              }}
              maxLength={32}
              className="text-lg font-bold italic bg-transparent outline-none w-full border-b"
              style={{ fontFamily: 'Georgia, serif', color: '#e8e4d8', borderColor: accent }}
            />
          ) : (
            <div
              onClick={() => { setDraftName(state.playerName); setIsEditingName(true); }}
              className="text-lg font-bold italic truncate cursor-text hover:opacity-80 transition-colors duration-500"
              style={{ fontFamily: 'Georgia, serif', color: accent }}
            >
              {state.playerName}
            </div>
          )}
          <div className="text-[13px] transition-colors duration-500" style={{ color: '#8aaa7a' }}>
            {RANK_LABELS[state.rank]} · {state.xp} XP
          </div>
        </div>

        {/* XP progress bar — fills space between name and economy pills */}
        <div className="hidden sm:flex flex-1 items-center gap-2 min-w-0" title={`Daily XP: ${dailyXp}/${DAILY_XP_GOAL}`}>
          <div className="flex-1 min-w-0">
            <div className="h-3 rounded-full" style={{ background: 'rgba(20,35,26,0.85)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, xpProgress)}%`,
                  background: `linear-gradient(90deg, ${accent}, #c9a84c)`,
                  boxShadow: `0 0 8px ${accent}40`,
                }}
              />
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold shrink-0"
            style={{
              background: 'rgba(10,22,16,0.85)',
              color: dailyGoalHit ? '#c9a84c' : '#5a7a5a',
            }}
            title={`Daily XP: ${dailyXp}/${DAILY_XP_GOAL}`}
          >
            {dailyGoalHit ? '✦' : '○'} {dailyXp}/{DAILY_XP_GOAL}
          </div>
        </div>

        {/* Resource pills */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
          <div
            className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold"
            style={{ background: 'rgba(10,22,16,0.88)', border: `1px solid ${accent}25`, color: '#4a8a4a' }}
            title={`Stamina ${state.stamina}/${state.maxStamina + buffs.maxStaminaBonus}`}
          >
            ⚡{state.stamina}
          </div>
          <div
            className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold ${lowFuel ? 'animate-low-fuel-pulse' : ''}`}
            style={{ background: 'rgba(10,22,16,0.88)', border: `1px solid ${accent}25`, color: lowFuel ? '#ff8a8a' : '#8aaa7a' }}
            title={fuelResetLabel}
          >
            ⛽{state.expeditionFuel}
          </div>
          <div
            className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold"
            style={{ background: 'rgba(10,22,16,0.88)', border: `1px solid ${accent}25`, color: '#c9a84c' }}
            title={`Credits ${state.bioCredits}`}
          >
            💰{state.bioCredits}
          </div>
          {displayStreak > 0 && (
            <div
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-bold"
              style={{ background: 'rgba(10,22,16,0.88)', border: '1px solid #c9a84c40', color: '#c9a84c' }}
            >
              🔥{displayStreak}
            </div>
          )}
          {pendingLab > 0 && (
            <button
              onClick={() => onNavigate('lab')}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
              style={{
                background: 'rgba(10,22,16,0.88)',
                border: '1px solid #c9a84c60',
                color: '#c9a84c',
                boxShadow: '0 0 10px rgba(201,168,76,0.15)',
              }}
              title={`${pendingLab} specimen${pendingLab === 1 ? '' : 's'} pending in lab`}
            >
              🔬{pendingLab}
            </button>
          )}
        </div>

        {/* Sound toggle */}
        <button
          onClick={() => {
            const next = !soundOn;
            setSoundEnabled(next);
            setSoundOn(next);
          }}
          className="w-11 h-11 rounded-lg flex items-center justify-center text-lg transition-all hover:scale-110 shrink-0"
          style={{
            background: 'rgba(10,22,16,0.88)',
            border: `1px solid ${accent}25`,
            color: soundOn ? '#c9a84c' : '#5a7a5a',
          }}
        >
          {soundOn ? '🔊' : '🔇'}
        </button>
      </div>

      {/* XP bar is now inside the top bar — no standalone section needed */}

      {/* Avatar picker dropdown */}
      {showAvatarPicker && (
        <>
          <div className="fixed inset-0 z-[650]" onClick={() => setShowAvatarPicker(false)} />
          <div
            className="absolute left-3 z-[660] p-3 rounded-lg"
            style={{
              top: 56,
              background: 'linear-gradient(135deg, #14231a, #0a1610)',
              border: `1.5px solid ${accent}80`,
              boxShadow: `0 12px 32px rgba(0,0,0,0.7), 0 0 20px ${accent}10`,
              minWidth: 220,
            }}
          >
            <div className="text-xs font-bold tracking-widest mb-2.5 px-1" style={{ color: accent }}>
              CHOOSE AVATAR
            </div>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_OPTIONS.map(a => (
                <button
                  key={a}
                  onClick={() => { onSetAvatar?.(a); setShowAvatarPicker(false); }}
                  className="aspect-square rounded-xl flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    fontSize: 28,
                    background: a === state.avatar ? '#1a3520' : '#0c1a12',
                    border: `${a === state.avatar ? '2px' : '1px'} solid ${a === state.avatar ? accent : '#2a4030'}`,
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom: Briefing card (collapsible) — region-tinted.
          Cap at ~60% of viewport height so it never overflows the top bar area. */}
      <div
        className="absolute bottom-3 left-3 right-3 z-[600] flex flex-col"
        style={{
          maxWidth: 460,
          marginLeft: 'auto',
          marginRight: 'auto',
          maxHeight: 'calc(100% - 66px)',
        }}
        id="briefing-panel"
      >
        {/* Briefing toggle */}
        <button
          onClick={() => setShowBriefing(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 transition-all duration-500 shrink-0"
          style={{
            background: `linear-gradient(135deg, rgba(10,22,16,0.95), rgba(15,31,21,0.92))`,
            borderTop: `1px solid ${accent}30`,
            borderLeft: `1px solid ${accent}20`,
            borderRight: `1px solid ${accent}20`,
            borderBottom: showBriefing ? `1px solid ${accent}10` : `1px solid ${accent}20`,
            borderRadius: showBriefing ? '14px 14px 0 0' : '14px',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{weather.icon}</span>
            <div>
              <div className="text-xs font-bold tracking-wide transition-colors duration-500" style={{ color: accent }}>
                TODAY'S BRIEFING
              </div>
              <div className="text-[11px]" style={{ color: '#5a7a5a' }}>
                {regionInfo.region.name}
              </div>
            </div>
          </div>
          <span
            className="text-base transition-transform duration-300"
            style={{
              color: accent,
              transform: showBriefing ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▾
          </span>
        </button>

        {showBriefing && (
          <div
            className="rounded-b-2xl overflow-y-auto overflow-x-hidden transition-all duration-500 min-h-0 briefing-scroll"
            style={{
              background: `linear-gradient(135deg, rgba(10,22,16,0.95), rgba(15,31,21,0.92))`,
              borderBottom: `1px solid ${accent}20`,
              borderLeft: `1px solid ${accent}20`,
              borderRight: `1px solid ${accent}20`,
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 30px ${accent}08`,
              ['--briefing-scroll-accent' as string]: accent,
            } as React.CSSProperties}
          >
            {/* Weather + Event row */}
            <div className="px-4 py-2.5 flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-all duration-500"
                style={{
                  fontSize: 24,
                  background: `linear-gradient(135deg, #14231a, #0c1a12)`,
                  border: `1.5px solid ${weather.accent}50`,
                  boxShadow: `inset 0 0 10px ${weather.accent}15`,
                }}
              >
                {weather.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: '#e8e4d8' }}>
                  {weather.name}
                </div>
                <div className="text-xs" style={{ color: '#8aaa7a' }}>
                  {weather.temp} · {weather.humidity}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold" style={{ color: activeEvent.accent }}>
                  {activeEvent.icon} {activeEvent.title.split(' ').slice(0, 2).join(' ')}
                </div>
                <div className="text-[11px]" style={{ color: '#5a7a5a' }}>
                  {eventTime.days}d {eventTime.hours}h left
                </div>
              </div>
            </div>

            {/* Selected region strip */}
            <div
              className="px-4 py-2.5 flex items-center gap-2.5 transition-all duration-500"
              style={{ borderTop: `1px solid ${accent}15` }}
            >
              <span className="text-2xl">{regionInfo.region.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold transition-colors duration-500" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
                  {regionInfo.region.name}
                  {!regionInfo.tierOpen && <span className="ml-1.5 text-xs">🔒</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: '#14231a' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(2, Math.round(regionInfo.pct * 100))}%`,
                        background: `linear-gradient(90deg, ${accent}90, ${accent})`,
                        boxShadow: `0 0 4px ${accent}40`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold tabular-nums transition-colors duration-500" style={{ color: accent }}>
                    {Math.round(regionInfo.pct * 100)}%
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowRegionDetail(v => !v)}
                className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all duration-300 hover:scale-105"
                style={{
                  background: `${accent}18`,
                  color: accent,
                  border: `1px solid ${accent}40`,
                }}
              >
                {showRegionDetail ? 'Hide' : 'Details'}
              </button>
            </div>

            {/* Region detail: biomes + milestones */}
            {showRegionDetail && (
              <div className="px-4 pb-3 space-y-1.5" style={{ borderTop: `1px solid ${accent}15` }}>
                <div className="pt-2">
                  {regionInfo.biomes.map(biome => {
                    const discovered = state.discoveredSpecies.filter(
                      sid => SPECIES.find(s => s.id === sid)?.biomeIds.includes(biome.id),
                    ).length;
                    const total = getBiomeSpeciesCount(biome.id);
                    const biomePct = total > 0 ? discovered / total : 0;
                    const isUnlocked = state.unlockedBiomes.includes(biome.id) || biome.unlocked;
                    return (
                      <div
                        key={biome.id}
                        className="flex items-center gap-2 py-1.5"
                        style={{ opacity: isUnlocked ? 1 : 0.4 }}
                      >
                        <span className="text-lg" style={{ filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>
                          {biome.emoji}
                        </span>
                        <span className="text-xs flex-1 truncate" style={{ color: '#e8e4d8' }}>
                          {biome.name}
                        </span>
                        <span className="text-[11px] tabular-nums font-semibold" style={{ color: '#5a7a5a' }}>
                          {discovered}/{total}
                        </span>
                        <div className="w-12 h-1.5 rounded-full" style={{ background: '#14231a' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round(biomePct * 100)}%`,
                              background: accent,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Milestones */}
                <div className="pt-1">
                  <div className="text-[11px] font-bold tracking-widest mb-1.5 transition-colors duration-500" style={{ color: accent }}>
                    MILESTONES · ⛽ {getRegionFuelCost(regionInfo.region.id)} FUEL/TRIP
                  </div>
                  {getMilestonesForRegion(regionInfo.region.id).map(m => {
                    const earned = regionInfo.pct >= m.threshold;
                    const claimed = state.claimedMilestones.includes(m.id);
                    return (
                      <div key={m.id} className="flex items-center gap-2 py-1" style={{ opacity: earned ? 1 : 0.35 }}>
                        <span className="text-base">{earned ? m.emoji : '○'}</span>
                        <span className="text-xs flex-1 truncate" style={{ color: earned ? '#e8e4d8' : '#5a7a5a' }}>
                          {m.title} — {Math.round(m.threshold * 100)}%
                          {!claimed && m.reward.maxFuel && (
                            <span className="ml-1.5 text-[10px] font-bold" style={{ color: '#8aaa7a' }}>+{m.reward.maxFuel}⛽</span>
                          )}
                        </span>
                        {earned && !claimed && (
                          <button
                            onClick={() => onClaimMilestone(m.id, m.reward)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all hover:scale-105"
                            style={{
                              background: `${accent}30`,
                              color: accent,
                              border: `1px solid ${accent}60`,
                            }}
                          >
                            CLAIM
                          </button>
                        )}
                        {claimed && <span className="text-[11px]" style={{ color: '#4a6a4a' }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Daily challenges compact */}
            <div className="px-4 pb-2.5" style={{ borderTop: `1px solid ${accent}15` }}>
              <DailyChallenges challenges={state.dailyChallenges} onClaim={onClaimChallenge} />
            </div>

            {/* Cross-save leaderboard */}
            <div className="px-4 pb-2.5" style={{ borderTop: `1px solid ${accent}15` }}>
              <div className="pt-2.5">
                <CrossSaveLeaderboard currentState={state} />
              </div>
            </div>

            {/* Publish research (when close or ready) */}
            {state.discoveredSpecies.length >= PUBLISH_THRESHOLD - 5 && (
              <div className="px-4 pb-2.5" style={{ borderTop: `1px solid ${accent}15` }}>
                <div className="flex items-center gap-2.5 pt-2.5">
                  <span className="text-lg">📜</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: '#e8e4d8' }}>
                        Publish Research
                      </span>
                      <span className="text-xs tabular-nums font-bold" style={{ color: canPublish ? '#c9a84c' : '#5a7a5a' }}>
                        {state.discoveredSpecies.length}/{PUBLISH_THRESHOLD}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full mt-1" style={{ background: '#14231a' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (state.discoveredSpecies.length / PUBLISH_THRESHOLD) * 100)}%`,
                          background: canPublish ? '#c9a84c' : '#4a8a4a',
                        }}
                      />
                    </div>
                  </div>
                  {canPublish && (
                    <button
                      onClick={() => setShowPublishConfirm(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                      style={{ background: '#c9a84c', color: '#0f1f15' }}
                    >
                      PUBLISH
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Publish confirmation modal */}
      {showPublishConfirm && (
        <div
          className="fixed inset-0 z-[9000] flex items-center justify-center p-5"
          style={{ background: 'rgba(5, 12, 8, 0.85)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowPublishConfirm(false)}
        >
          <div
            className="max-w-sm w-full rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, #1a3520, #14231a)',
              border: '1.5px solid #c9a84c',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px #c9a84c30',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-5xl mb-3">📜</div>
              <h2
                className="text-lg font-bold mb-2"
                style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}
              >
                Publish Research Paper?
              </h2>
              <p className="text-xs leading-relaxed mb-4" style={{ color: '#a8c4a0' }}>
                Resets discoveries, specimens, reagents, credits, and rank. Grants permanent{' '}
                <span style={{ color: '#c9a84c' }}>Impact Factor {state.impactFactor + 1}×</span> (+{(state.impactFactor + 1) * 10}% XP & credits).
              </p>
              <div className="text-[11px] p-3 rounded-lg mb-4 text-left" style={{ background: '#0a1610', border: '1px solid #2a4030', color: '#8aaa7a' }}>
                <div className="font-semibold mb-1" style={{ color: '#e8e4d8' }}>Preserved:</div>
                <div>✓ {state.unlockedSkills.length} skills · {state.researchPoints} RP · {state.achievements.length} achievements · Field notes</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPublishConfirm(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: '#14231a', border: '1px solid #2a4030', color: '#8aaa7a' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowPublishConfirm(false); onPublishResearch(); }}
                  className="flex-1 py-2 rounded-lg text-xs font-bold tracking-wide hover:scale-[1.02] transition-all"
                  style={{ background: '#c9a84c', color: '#0f1f15' }}
                >
                  PUBLISH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes lowFuelPulse {
          0%, 100% { box-shadow: none; }
          50% { text-shadow: 0 0 4px rgba(255, 138, 138, 0.6); }
        }
        .animate-low-fuel-pulse {
          animation: lowFuelPulse 1.6s ease-in-out infinite;
        }
        /* Slim, region-tinted scrollbar for the briefing panel */
        .briefing-scroll { scrollbar-width: thin; scrollbar-color: var(--briefing-scroll-accent, #8aaa7a) transparent; }
        .briefing-scroll::-webkit-scrollbar { width: 6px; }
        .briefing-scroll::-webkit-scrollbar-track { background: transparent; }
        .briefing-scroll::-webkit-scrollbar-thumb {
          background: var(--briefing-scroll-accent, #8aaa7a);
          border-radius: 3px;
          opacity: 0.4;
        }
        @media (min-width: 640px) {
          #briefing-panel { zoom: 1.2; }
        }
      `}</style>
    </div>
  );
}
