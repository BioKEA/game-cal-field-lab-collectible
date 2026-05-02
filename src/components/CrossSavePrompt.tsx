import { useState, useEffect, useMemo } from 'react';
import type { GameState } from '@/types/game';
import { RANK_LABELS } from '@/types/game';
import { peekSlot, SLOT_COUNT } from '@/hooks/useGameState';

interface CrossSavePromptProps {
  currentState: GameState;
  slot: number;
  onNavigate: (page: string) => void;
  onDismiss: () => void;
}

const DISMISS_KEY_PREFIX = 'biokea-cross-save-prompted-slot-';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function shouldShowCrossSavePrompt(state: GameState, slot: number): boolean {
  const raw = localStorage.getItem(`${DISMISS_KEY_PREFIX}${slot}`);
  if (raw) {
    if (raw === 'true') return false; // legacy permanent dismiss
    const dismissedAt = Number(raw);
    if (!isNaN(dismissedAt) && Date.now() - dismissedAt < COOLDOWN_MS) return false;
  }
  const hasPlaytime = state.totalPlaytimeSec >= 600;
  const hasUnlockedBiome = state.unlockedBiomes.length >= 3;
  return hasPlaytime && hasUnlockedBiome;
}

export function hasCrossSaveBadge(state: GameState, slot: number): boolean {
  return shouldShowCrossSavePrompt(state, slot);
}

export default function CrossSavePrompt({ currentState, slot, onNavigate, onDismiss }: CrossSavePromptProps) {
  const [phase, setPhase] = useState<'enter' | 'idle' | 'exit'>('enter');

  useEffect(() => {
    const t = setTimeout(() => setPhase('idle'), 50);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${slot}`, String(Date.now()));
    } catch { /* ignore */ }
    setPhase('exit');
    setTimeout(onDismiss, 350);
  };

  const handleCheckItOut = () => {
    try {
      localStorage.setItem(`${DISMISS_KEY_PREFIX}${slot}`, String(Date.now()));
    } catch { /* ignore */ }
    setPhase('exit');
    setTimeout(() => {
      onDismiss();
      onNavigate('file-select');
    }, 350);
  };

  const otherSlots = useMemo(() => {
    const slots: { slot: number; state: GameState | null }[] = [];
    for (let s = 1; s <= SLOT_COUNT; s++) {
      if (s === slot) continue;
      slots.push({ slot: s, state: peekSlot(s) });
    }
    return slots;
  }, [slot]);

  const filledSlots = otherSlots.filter(s => s.state !== null);
  const emptySlots = otherSlots.filter(s => s.state === null);
  const hasCompetition = filledSlots.length > 0;

  return (
    <div
      className="fixed inset-0 z-[8000] flex items-end sm:items-center justify-center"
      style={{
        background: phase === 'idle' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        transition: 'background 0.4s ease',
        opacity: phase === 'exit' ? 0 : 1,
        pointerEvents: phase === 'exit' ? 'none' : 'auto',
      }}
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #14231a, #0c1a12)',
          border: '1.5px solid #c9a84c40',
          boxShadow: '0 0 60px rgba(201,168,76,0.1), 0 24px 48px rgba(0,0,0,0.5)',
          transform: phase === 'idle' ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-colors"
          style={{
            background: '#0a1610',
            color: '#5a7a5a',
            border: '1px solid #2a4030',
          }}
        >
          <span className="text-xs">✕</span>
        </button>

        {/* Top accent bar */}
        <div
          className="h-1"
          style={{
            background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
          }}
        />

        <div className="p-5">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="text-2xl mb-2">🏆</div>
            <h3
              className="text-base font-bold"
              style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}
            >
              {hasCompetition ? 'Check the Standings' : 'Start a Rivalry'}
            </h3>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#8aaa7a' }}>
              {hasCompetition
                ? 'Your fellow researchers have been busy. See how you stack up.'
                : 'Create additional researcher files and compete for the top spot on the leaderboard.'}
            </p>
          </div>

          {/* Mini leaderboard preview (if there are other saves) */}
          {hasCompetition && (
            <div
              className="rounded-xl p-3 mb-4"
              style={{
                background: '#0a1610',
                border: '1px solid #1a2a20',
              }}
            >
              <div
                className="text-[9px] font-bold tracking-[0.2em] mb-2"
                style={{ color: '#c9a84c' }}
              >
                STANDINGS
              </div>
              <div className="space-y-1.5">
                {/* Current player */}
                <MiniEntry
                  avatar={currentState.avatar}
                  name={currentState.playerName}
                  rank={RANK_LABELS[currentState.rank]}
                  xp={currentState.xp}
                  isCurrent
                />
                {filledSlots.map(({ slot: s, state: st }) => (
                  <MiniEntry
                    key={s}
                    avatar={st!.avatar}
                    name={st!.playerName}
                    rank={RANK_LABELS[st!.rank]}
                    xp={st!.xp}
                    isCurrent={false}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty slot callout (if there are empty slots) */}
          {emptySlots.length > 0 && !hasCompetition && (
            <div
              className="rounded-xl p-3 mb-4 flex items-center gap-3"
              style={{
                background: '#0a1610',
                border: '1px dashed #2a4030',
              }}
            >
              <div className="text-xl">👤</div>
              <div>
                <div className="text-xs font-medium" style={{ color: '#a8c4a0' }}>
                  {emptySlots.length} open slot{emptySlots.length > 1 ? 's' : ''}
                </div>
                <div className="text-[10px]" style={{ color: '#5a7a5a' }}>
                  Hand the device to a friend, or start a new researcher yourself
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleCheckItOut}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #b8943a)',
                color: '#0f1f15',
                boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
              }}
            >
              {hasCompetition ? 'View Researchers' : 'Add a Researcher'}
            </button>
            <button
              onClick={handleDismiss}
              className="w-full py-2 text-xs transition-colors"
              style={{ color: '#5a7a5a' }}
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniEntry({
  avatar,
  name,
  rank,
  xp,
  isCurrent,
}: {
  avatar: string;
  name: string;
  rank: string;
  xp: number;
  isCurrent: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{
        background: isCurrent ? 'rgba(201,168,76,0.08)' : 'transparent',
        border: isCurrent ? '1px solid #c9a84c40' : '1px solid transparent',
      }}
    >
      <div className="text-base shrink-0">{avatar}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span
            className="text-[11px] font-semibold truncate"
            style={{ color: isCurrent ? '#e8e4d8' : '#a8c4a0', fontFamily: 'Georgia, serif' }}
          >
            {name}
          </span>
          {isCurrent && (
            <span
              className="text-[7px] font-bold px-1 py-[1px] rounded shrink-0"
              style={{ background: '#c9a84c', color: '#14231a' }}
            >
              YOU
            </span>
          )}
        </div>
        <div className="text-[9px]" style={{ color: '#5a7a5a' }}>
          {rank}
        </div>
      </div>
      <div
        className="text-xs font-bold tabular-nums shrink-0"
        style={{ color: isCurrent ? '#c9a84c' : '#8aaa7a', fontFamily: 'Georgia, serif' }}
      >
        {xp.toLocaleString()} XP
      </div>
    </div>
  );
}
