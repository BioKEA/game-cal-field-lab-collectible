import { useMemo } from 'react';
import type { GameState } from '@/types/game';
import { RANK_LABELS } from '@/types/game';
import { peekSlot, SLOT_COUNT } from '@/hooks/useGameState';

interface CrossSaveLeaderboardProps {
  currentState: GameState;
}

interface SlotEntry {
  slot: number;
  state: GameState;
  isCurrent: boolean;
}

/**
 * Cross-save leaderboard — ranks the three researcher slots by XP and
 * highlights the active one. Reads each slot from localStorage at render
 * time so it reflects whatever the other researchers have done on their
 * own playthroughs.
 */
export default function CrossSaveLeaderboard({ currentState }: CrossSaveLeaderboardProps) {
  const entries = useMemo<SlotEntry[]>(() => {
    const list: SlotEntry[] = [];
    for (let slot = 1; slot <= SLOT_COUNT; slot++) {
      const loaded = peekSlot(slot);
      if (!loaded) continue;
      // "isCurrent" matches by createdAt — GameState createdAt is an ISO
      // timestamp unique to each researcher.
      const isCurrent = loaded.createdAt === currentState.createdAt;
      // If this is the current slot, prefer the live `currentState` so the
      // leaderboard stays in sync with unsaved in-memory XP gains.
      list.push({ slot, state: isCurrent ? currentState : loaded, isCurrent });
    }
    return list.sort((a, b) => b.state.xp - a.state.xp);
  }, [currentState]);

  if (entries.length < 2) return null;

  const topXp = entries[0]?.state.xp ?? 0;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'linear-gradient(180deg, #14231a, #0f1a12)',
        border: '1px solid #c9a84c40',
        boxShadow: '0 0 20px rgba(201,168,76,0.08), inset 0 0 14px rgba(201,168,76,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color: '#c9a84c' }}>★</span>
          <div
            className="text-[10px] font-bold tracking-[0.22em]"
            style={{ color: '#c9a84c' }}
          >
            RESEARCHER STANDINGS
          </div>
          <span className="text-[10px]" style={{ color: '#c9a84c' }}>★</span>
        </div>
        <div className="text-[9px] tracking-wider" style={{ color: '#8aaa7a' }}>
          {entries.length}/{SLOT_COUNT} FILES
        </div>
      </div>

      <div className="space-y-1.5">
        {entries.map((entry, idx) => {
          const rankNum = idx + 1;
          const medal = rankNum === 1 ? '🥇' : rankNum === 2 ? '🥈' : '🥉';
          const barPct = topXp > 0 ? (entry.state.xp / topXp) * 100 : 0;

          return (
            <div
              key={entry.slot}
              className="relative rounded-md overflow-hidden"
              style={{
                background: entry.isCurrent ? 'rgba(201,168,76,0.12)' : 'rgba(10,22,16,0.5)',
                border: entry.isCurrent ? '1px solid #c9a84c' : '1px solid #1a2a20',
                boxShadow: entry.isCurrent ? '0 0 12px rgba(201,168,76,0.2)' : 'none',
              }}
            >
              {/* XP bar fill */}
              <div
                className="absolute inset-y-0 left-0 pointer-events-none"
                style={{
                  width: `${barPct}%`,
                  background: entry.isCurrent
                    ? 'linear-gradient(90deg, rgba(201,168,76,0.18), rgba(201,168,76,0.04))'
                    : 'linear-gradient(90deg, rgba(138,170,122,0.12), transparent)',
                  transition: 'width 0.5s ease-out',
                }}
              />

              <div className="relative flex items-center gap-2.5 px-2.5 py-2">
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 20,
                    textAlign: 'center',
                    fontSize: 14,
                    filter: rankNum === 1 ? 'drop-shadow(0 0 4px rgba(201,168,76,0.6))' : 'none',
                  }}
                >
                  {medal}
                </div>
                <div className="text-xl shrink-0" style={{ lineHeight: 1 }}>
                  {entry.state.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="text-xs font-semibold truncate"
                      style={{
                        color: entry.isCurrent ? '#e8e4d8' : '#c4d4bc',
                        fontFamily: 'Georgia, serif',
                      }}
                    >
                      {entry.state.playerName}
                    </div>
                    {entry.isCurrent && (
                      <span
                        className="text-[8px] font-bold px-1 py-[1px] rounded tracking-wider shrink-0"
                        style={{
                          background: '#c9a84c',
                          color: '#14231a',
                        }}
                      >
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div
                      className="text-[9px]"
                      style={{ color: entry.isCurrent ? '#c9a84c' : '#8aaa7a' }}
                    >
                      {RANK_LABELS[entry.state.rank]}
                    </div>
                    <div className="text-[9px]" style={{ color: '#4a5a50' }}>·</div>
                    <div
                      className="text-[9px] tabular-nums"
                      style={{ color: '#a8c4a0' }}
                    >
                      {entry.state.discoveredSpecies.length} species
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="text-sm font-bold tabular-nums leading-none"
                    style={{
                      color: entry.isCurrent ? '#c9a84c' : '#e8e4d8',
                      fontFamily: 'Georgia, serif',
                    }}
                  >
                    {entry.state.xp.toLocaleString()}
                  </div>
                  <div
                    className="text-[8px] tracking-wider mt-0.5"
                    style={{ color: '#8aaa7a' }}
                  >
                    XP
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length < SLOT_COUNT && (
        <div
          className="text-[9px] italic text-center mt-2.5 pt-2"
          style={{
            color: '#8aaa7a',
            borderTop: '1px dashed #1a2a20',
          }}
        >
          {SLOT_COUNT - entries.length} empty slot{SLOT_COUNT - entries.length === 1 ? '' : 's'} — invite other researchers via "Switch Researcher"
        </div>
      )}
    </div>
  );
}
