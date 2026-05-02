import { useMemo } from 'react';
import { getDailyRequests } from '@/data/requests';
import { getResearcherById } from '@/data/researchers';
import type { GameState } from '@/types/game';

interface RequestsProps {
  state: GameState;
  onNavigate: (page: string) => void;
  onClaimRequest: (id: string) => void;
}

function getHoursUntilMidnight(): { hours: number; minutes: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  return { hours, minutes };
}

export default function Requests({ state, onNavigate, onClaimRequest }: RequestsProps) {
  const requests = useMemo(() => getDailyRequests(), []);
  const { hours, minutes } = getHoursUntilMidnight();

  const claimedSet = new Set(state.claimedRequests);

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
          Field Requests
        </h2>
        <div className="text-xs" style={{ color: '#8aaa7a' }}>
          Resets in {hours}h {minutes}m
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Intro */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'linear-gradient(135deg, #1a3520, #14231a)',
            border: '1px solid #c9a84c30',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">📩</div>
            <div>
              <div
                className="text-sm font-semibold mb-1"
                style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}
              >
                Team Requests
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#8aaa7a' }}>
                The BioKEA research team has sent over today's requests. Fulfill them with
                species from your catalog — progress counts automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {requests.map(req => {
            const progress = req.check(state);
            const researcher = getResearcherById(req.researcherId);
            const isClaimed = claimedSet.has(req.id);
            const canClaim = progress.done && !isClaimed;
            const pct = (progress.progress / progress.target) * 100;

            return (
              <div
                key={req.id}
                className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: isClaimed
                    ? '#0c1a12'
                    : canClaim
                      ? 'linear-gradient(135deg, #1a3520, #14231a)'
                      : '#14231a',
                  border: `1.5px solid ${
                    isClaimed ? '#1a3520' : canClaim ? '#c9a84c' : '#2a4030'
                  }`,
                  boxShadow: canClaim ? '0 0 24px #c9a84c20' : 'none',
                  opacity: isClaimed ? 0.65 : 1,
                }}
              >
                <div className="p-4">
                  {/* Researcher header */}
                  {researcher && (
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                        style={{
                          background: '#0c1a12',
                          border: `1.5px solid ${researcher.accent}50`,
                          boxShadow: canClaim ? `0 0 16px ${researcher.accent}30` : 'none',
                        }}
                      >
                        {researcher.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-bold truncate"
                          style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}
                        >
                          {researcher.name}
                        </div>
                        <div className="text-[10px] truncate" style={{ color: researcher.accent }}>
                          {researcher.title} · {researcher.specialty}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[9px]" style={{ color: '#5a7a5a' }}>
                          REWARD
                        </div>
                        <div className="text-xs font-bold" style={{ color: '#c9a84c' }}>
                          {req.reward.xp} XP
                        </div>
                        <div className="text-[10px]" style={{ color: '#c9a84c' }}>
                          💰 {req.reward.credits}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Title + description */}
                  <div
                    className="text-base font-bold mb-1"
                    style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}
                  >
                    {req.title}
                  </div>
                  <p className="text-xs mb-3" style={{ color: '#a8c4a0' }}>
                    {req.description}
                  </p>

                  {/* Flavor quote */}
                  <div
                    className="rounded-lg p-2.5 mb-3 text-[11px] italic leading-relaxed"
                    style={{
                      background: '#0c1a12',
                      border: '1px solid #1a3520',
                      color: '#8aaa7a',
                    }}
                  >
                    {req.flavor}
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="flex-1 h-1.5 rounded-full"
                      style={{ background: '#0c1a12' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: canClaim
                            ? 'linear-gradient(90deg, #4a8a4a, #c9a84c)'
                            : '#4a8a4a',
                        }}
                      />
                    </div>
                    <div
                      className="text-[10px] font-mono flex-shrink-0"
                      style={{ color: '#8aaa7a' }}
                    >
                      {progress.progress}/{progress.target}
                    </div>
                  </div>

                  {/* Action button */}
                  {isClaimed ? (
                    <div
                      className="w-full rounded-lg p-2 text-center text-xs font-semibold"
                      style={{
                        background: '#0c1a12',
                        color: '#5a7a5a',
                        border: '1px dashed #2a4030',
                      }}
                    >
                      ✓ Delivered
                    </div>
                  ) : canClaim ? (
                    <button
                      onClick={() => onClaimRequest(req.id)}
                      className="w-full rounded-lg p-2 text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.98]"
                      style={{
                        background: 'linear-gradient(135deg, #c9a84c, #8a7030)',
                        color: '#0f1f15',
                        boxShadow: '0 2px 12px #c9a84c40',
                      }}
                    >
                      ✦ Deliver Report ✦
                    </button>
                  ) : (
                    <div
                      className="w-full rounded-lg p-2 text-center text-[11px]"
                      style={{ background: '#0c1a12', color: '#5a7a5a' }}
                    >
                      In progress — keep exploring
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}
