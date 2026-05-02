import { useMemo } from 'react';
import { evaluateMissions } from '@/data/missions';
import type { GameState } from '@/types/game';

interface MissionsProps {
  state: GameState;
  onNavigate: (page: string) => void;
  onClaimMission: (id: string) => void;
}

export default function Missions({ state, onNavigate, onClaimMission }: MissionsProps) {
  const missions = useMemo(() => evaluateMissions(state), [state]);

  const activeMissions = missions.filter(m => !m.claimed);
  const completedMissions = missions.filter(m => m.claimed);

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
          Research Missions
        </h2>
        <div className="text-xs" style={{ color: '#8aaa7a' }}>
          {completedMissions.length}/{missions.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Intro banner */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'linear-gradient(135deg, #1a3520, #14231a)',
            border: '1px solid #c9a84c30',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">📜</div>
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
                Mission Briefings
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#8aaa7a' }}>
                Multi-step research objectives with generous rewards. Progress updates automatically as you play.
              </p>
            </div>
          </div>
        </div>

        {/* Active missions */}
        {activeMissions.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
              ACTIVE · {activeMissions.length}
            </div>
            <div className="space-y-3">
              {activeMissions.map(m => {
                const totalSteps = m.steps.length;
                const progressPct = (m.completedSteps / totalSteps) * 100;
                const canClaim = m.allStepsDone;

                return (
                  <div
                    key={m.def.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: canClaim
                        ? 'linear-gradient(135deg, #1a3520, #14231a)'
                        : '#14231a',
                      border: `1.5px solid ${canClaim ? '#c9a84c' : '#2a4030'}`,
                      boxShadow: canClaim ? '0 0 24px #c9a84c20' : 'none',
                    }}
                  >
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="text-3xl flex-shrink-0"
                          style={{ filter: canClaim ? 'drop-shadow(0 0 8px #c9a84c60)' : 'none' }}
                        >
                          {m.def.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
                            {m.def.title}
                          </div>
                          <div className="text-[10px]" style={{ color: '#5a7a5a' }}>
                            {m.completedSteps}/{totalSteps} objectives
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px]" style={{ color: '#5a7a5a' }}>REWARD</div>
                          <div className="text-xs font-bold" style={{ color: '#c9a84c' }}>
                            {m.def.reward.xp} XP
                          </div>
                          <div className="text-[10px]" style={{ color: '#c9a84c' }}>
                            💰 {m.def.reward.credits}
                          </div>
                        </div>
                      </div>

                      {/* Briefing */}
                      <p className="text-[11px] leading-relaxed italic mb-3" style={{ color: '#8aaa7a' }}>
                        {m.def.briefing}
                      </p>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 rounded-full mb-3" style={{ background: '#0c1a12' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progressPct}%`,
                            background: canClaim
                              ? 'linear-gradient(90deg, #4a8a4a, #c9a84c)'
                              : '#4a8a4a',
                          }}
                        />
                      </div>

                      {/* Steps */}
                      <div className="space-y-1.5 mb-3">
                        {m.steps.map(step => (
                          <div key={step.def.id} className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{
                                background: step.done ? '#4a8a4a' : '#0c1a12',
                                border: `1px solid ${step.done ? '#4a8a4a' : '#2a4030'}`,
                              }}
                            >
                              {step.done && (
                                <span className="text-[9px]" style={{ color: '#0f1f15' }}>✓</span>
                              )}
                            </div>
                            <div
                              className="text-[11px] flex-1"
                              style={{ color: step.done ? '#4a8a4a' : '#a8c4a0' }}
                            >
                              {step.def.description}
                            </div>
                            <div className="text-[10px] font-mono" style={{ color: '#5a7a5a' }}>
                              {step.progress}/{step.target}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Claim button */}
                      {canClaim && (
                        <button
                          onClick={() => onClaimMission(m.def.id)}
                          className="w-full rounded-lg p-2 text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.98]"
                          style={{
                            background: 'linear-gradient(135deg, #c9a84c, #8a7030)',
                            color: '#0f1f15',
                            boxShadow: '0 2px 12px #c9a84c40',
                          }}
                        >
                          ✦ Claim Reward ✦
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed missions */}
        {completedMissions.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold mb-2 tracking-wider" style={{ color: '#5a7a5a' }}>
              COMPLETED · {completedMissions.length}
            </div>
            <div className="space-y-2">
              {completedMissions.map(m => (
                <div
                  key={m.def.id}
                  className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: '#0c1a12',
                    border: '1px solid #1a3520',
                    opacity: 0.8,
                  }}
                >
                  <div className="text-2xl" style={{ filter: 'grayscale(20%)' }}>
                    {m.def.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: '#a8c4a0' }}>
                      {m.def.title}
                    </div>
                    <div className="text-[10px]" style={{ color: '#5a7a5a' }}>
                      ✓ {m.def.reward.xp} XP · 💰 {m.def.reward.credits}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty locked state */}
        {missions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3" style={{ opacity: 0.3 }}>📜</div>
            <p className="text-sm" style={{ color: '#5a7a5a' }}>
              Start collecting specimens to unlock your first mission
            </p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
