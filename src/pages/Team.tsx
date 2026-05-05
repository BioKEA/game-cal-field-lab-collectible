import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  RESEARCHERS,
  getWeeklyLeaderboard,
  getWeekTimeRemaining,
  type Researcher,
  type LeaderboardEntry,
} from '@/data/researchers';
import type { GameState } from '@/types/game';
import {
  currentWeekKey,
  fetchWeeklyTopScores,
  hasSubmittedThisWeek,
  submitWeeklyScore,
  type LeaderboardRow,
} from '@/lib/game/leaderboard';

interface TeamProps {
  state: GameState;
  onNavigate: (page: string) => void;
}

type Tab = 'leaderboard' | 'roster';

export default function Team({ state, onNavigate }: TeamProps) {
  const [tab, setTab] = useState<Tab>('leaderboard');
  const [selectedResearcher, setSelectedResearcher] = useState<Researcher | null>(null);
  const [remoteRows, setRemoteRows] = useState<LeaderboardRow[]>([]);

  const weekKey = useMemo(() => currentWeekKey(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasSubmittedThisWeek(weekKey) && state.xp > 0) {
        await submitWeeklyScore({ weekKey, state });
      }
      const rows = await fetchWeeklyTopScores(weekKey, 25);
      if (!cancelled) setRemoteRows(rows);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, state.xp, state.playerName]);

  const leaderboard = useMemo(
    () => mergeLeaderboard(getWeeklyLeaderboard(state.xp, state.playerName), remoteRows, state.playerName),
    [state.xp, state.playerName, remoteRows],
  );

  const { days, hours } = getWeekTimeRemaining();

  const playerRank = leaderboard.findIndex(e => e.isPlayer) + 1;

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
        <h2 className="text-sm font-semibold" style={{ color: '#e8e4d8' }}>
          Research Team
        </h2>
        <div className="text-xs" style={{ color: '#8aaa7a' }}>
          {RESEARCHERS.length + 1} members
        </div>
      </div>

      {/* Tab switcher */}
      <div
        className="flex gap-1 p-3 border-b"
        style={{ borderColor: '#2a4030', background: '#0a1610' }}
      >
        <TabButton active={tab === 'leaderboard'} onClick={() => setTab('leaderboard')}>
          🏆 Weekly Board
        </TabButton>
        <TabButton active={tab === 'roster'} onClick={() => setTab('roster')}>
          👥 Roster
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === 'leaderboard' && (
          <>
            {/* Week banner */}
            <div
              className="rounded-xl p-4"
              style={{
                background: 'linear-gradient(135deg, #1a3520, #14231a)',
                border: '1px solid #c9a84c30',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className="text-[10px] font-semibold tracking-wider"
                  style={{ color: '#c9a84c' }}
                >
                  THIS WEEK
                </div>
                <div className="text-[10px]" style={{ color: '#8aaa7a' }}>
                  Resets in {days}d {hours}h
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold" style={{ color: '#e8e4d8' }}>
                  #{playerRank}
                </div>
                <div className="text-xs" style={{ color: '#8aaa7a' }}>
                  your rank of {leaderboard.length}
                </div>
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#8aaa7a' }}>
                {state.xp.toLocaleString()} XP this week
              </div>
            </div>

            {/* This long-form game tracks weekly XP here, not the cross-game daily leaderboard. */}
            <div
              className="rounded-xl p-3"
              style={{
                background: '#0c1a12',
                border: '1px solid #2a4030',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="text-lg leading-none mt-0.5">ℹ️</div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[10px] font-semibold tracking-[0.18em] uppercase"
                    style={{ color: '#c9a84c' }}
                  >
                    BioKEA Daily Leaderboard
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: '#e8e4d8' }}>
                    Cal Field Lab is a long-form game and doesn't post to the daily leaderboard.{' '}
                    <a
                      href="https://biokea.ai/mission/games/leaderboard"
                      target="_top"
                      className="underline font-semibold"
                      style={{ color: '#c9a84c' }}
                    >
                      See the four arcade games ↗
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Leaderboard list */}
            <div className="space-y-2">
              {leaderboard.map((entry, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const medalIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

                return (
                  <div
                    key={entry.id}
                    className="rounded-xl p-3 flex items-center gap-3"
                    style={{
                      background: entry.isPlayer
                        ? 'linear-gradient(135deg, #1a3520, #14231a)'
                        : '#14231a',
                      border: `1.5px solid ${
                        entry.isPlayer ? '#c9a84c' : isTop3 ? entry.accent + '50' : '#2a4030'
                      }`,
                      boxShadow: entry.isPlayer ? '0 0 20px #c9a84c30' : 'none',
                    }}
                  >
                    {/* Rank */}
                    <div
                      className="w-8 text-center flex-shrink-0 font-bold text-sm"
                      style={{
                        color: entry.isPlayer
                          ? '#c9a84c'
                          : isTop3
                            ? entry.accent
                            : '#5a7a5a',
                      }}
                    >
                      {medalIcon || `#${rank}`}
                    </div>

                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                      style={{
                        background: '#0c1a12',
                        border: `1.5px solid ${entry.accent}50`,
                      }}
                    >
                      {entry.avatar}
                    </div>

                    {/* Name + specialty */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm font-semibold truncate"
                        style={{
                          color: entry.isPlayer ? '#e8e4d8' : '#a8c4a0',
                          fontFamily: 'Georgia, serif',
                        }}
                      >
                        {entry.name}
                        {entry.isPlayer && (
                          <span
                            className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded align-middle"
                            style={{ background: '#c9a84c', color: '#0f1f15' }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] truncate" style={{ color: '#5a7a5a' }}>
                        {entry.specialty}
                      </div>
                    </div>

                    {/* XP + trend */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold" style={{ color: '#c9a84c' }}>
                        {entry.weeklyXp.toLocaleString()}
                      </div>
                      <div className="text-[9px] flex items-center justify-end gap-0.5">
                        {entry.trend === 'up' && (
                          <span style={{ color: '#4a8a4a' }}>▲</span>
                        )}
                        {entry.trend === 'down' && (
                          <span style={{ color: '#aa4a4a' }}>▼</span>
                        )}
                        {entry.trend === 'flat' && (
                          <span style={{ color: '#5a7a5a' }}>—</span>
                        )}
                        <span style={{ color: '#5a7a5a' }}>XP</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === 'roster' && (
          <>
            <div className="text-[10px] font-semibold tracking-wider" style={{ color: '#5a7a5a' }}>
              THE BIOKEA TEAM · {RESEARCHERS.length} MEMBERS
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {RESEARCHERS.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedResearcher(r)}
                  className="rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: '#14231a',
                    border: `1.5px solid ${r.accent}40`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-2"
                    style={{
                      background: '#0c1a12',
                      border: `1.5px solid ${r.accent}60`,
                    }}
                  >
                    {r.avatar}
                  </div>
                  <div
                    className="text-xs font-bold truncate"
                    style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}
                  >
                    {r.name}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: r.accent }}>
                    {r.title}
                  </div>
                  <div className="text-[9px] mt-1" style={{ color: '#5a7a5a' }}>
                    {r.specialty}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="h-4" />
      </div>

      {/* Researcher detail modal */}
      {selectedResearcher && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(10,22,16,0.85)' }}
          onClick={() => setSelectedResearcher(null)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl"
            style={{
              background: 'linear-gradient(180deg, #14231a, #0f1f15)',
              border: `1.5px solid ${selectedResearcher.accent}40`,
              borderBottom: 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
                  style={{
                    background: '#0c1a12',
                    border: `2px solid ${selectedResearcher.accent}60`,
                    boxShadow: `0 0 24px ${selectedResearcher.accent}30`,
                  }}
                >
                  {selectedResearcher.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-lg font-bold"
                    style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}
                  >
                    {selectedResearcher.name}
                  </div>
                  <div className="text-xs" style={{ color: selectedResearcher.accent }}>
                    {selectedResearcher.title}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: '#8aaa7a' }}>
                    Specialty: {selectedResearcher.specialty}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedResearcher(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: '#0c1a12', color: '#5a7a5a' }}
                >
                  ✕
                </button>
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: '#a8c4a0' }}
              >
                {selectedResearcher.bio}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Merge simulated researcher entries with real submissions from the shared
 * leaderboard. Real submissions take precedence: the player's own real row
 * (matched by handle) replaces the simulated player slot, and any other real
 * researcher handles are appended. Simulated entries fill the rest so the UI
 * is never empty even when the shared service has few submissions.
 */
function mergeLeaderboard(
  simulated: LeaderboardEntry[],
  remote: LeaderboardRow[],
  playerName: string,
): LeaderboardEntry[] {
  if (remote.length === 0) return simulated;

  const normalize = (s: string) => s.trim().toLowerCase();
  const playerKey = normalize(playerName);

  const realEntries: LeaderboardEntry[] = remote.map(r => ({
    id: `remote-${r.id}`,
    name: r.handle,
    title: r.rank ? humanizeRank(r.rank) : 'Researcher',
    avatar: '🧬',
    specialty: `${r.speciesCount} species · ${r.regionsUnlocked} regions`,
    accent: '#c9a84c',
    weeklyXp: r.score,
    isPlayer: normalize(r.handle) === playerKey,
    trend: r.trend,
  }));

  // If a real player entry exists, drop the simulated one to avoid duplication.
  const hasRealPlayer = realEntries.some(e => e.isPlayer);
  const baseSimulated = hasRealPlayer ? simulated.filter(e => !e.isPlayer) : simulated;

  // Avoid duplicating a simulated researcher that happens to share a name with
  // a real submission.
  const remoteHandles = new Set(realEntries.map(e => normalize(e.name)));
  const dedupedSim = baseSimulated.filter(e => !remoteHandles.has(normalize(e.name)));

  return [...realEntries, ...dedupedSim].sort((a, b) => b.weeklyXp - a.weeklyXp);
}

function humanizeRank(rank: string): string {
  return rank
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-lg p-2 text-xs font-semibold transition-all"
      style={{
        background: active ? 'linear-gradient(135deg, #1a3520, #14231a)' : '#0c1a12',
        color: active ? '#c9a84c' : '#5a7a5a',
        border: `1px solid ${active ? '#c9a84c40' : '#1a2a20'}`,
      }}
    >
      {children}
    </button>
  );
}
