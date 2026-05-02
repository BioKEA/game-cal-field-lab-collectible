import type { DailyChallenge } from '@/types/game';

interface DailyChallengesProps {
  challenges: DailyChallenge[];
  onClaim: (id: string) => void;
}

export default function DailyChallenges({ challenges, onClaim }: DailyChallengesProps) {
  if (challenges.length === 0) return null;

  const completedCount = challenges.filter(c => c.completed).length;

  return (
    <div className="rounded-xl p-2.5" style={{ background: '#14231a', border: '1px solid #2a4030' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <div className="text-xs font-bold" style={{ color: '#c9a84c', letterSpacing: '1px' }}>
            DAILY CHALLENGES
          </div>
        </div>
        <div className="text-xs font-semibold" style={{ color: '#5a7a5a' }}>
          {completedCount}/{challenges.length}
        </div>
      </div>

      <div className="space-y-1.5">
        {challenges.map(challenge => {
          const claimed = challenge.progress === -1;
          const pct = claimed ? 100 : Math.min(100, (challenge.progress / challenge.target) * 100);

          return (
            <div
              key={challenge.id}
              className="rounded-lg px-2.5 py-2 transition-all"
              style={{
                background: claimed ? '#1a2e2010' : challenge.completed ? '#1a2e20' : '#0c1a12',
                border: `1px solid ${challenge.completed && !claimed ? '#c9a84c40' : '#1a2e20'}`,
                opacity: claimed ? 0.5 : 1,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold" style={{
                  color: claimed ? '#5a7a5a' : challenge.completed ? '#c9a84c' : '#e8e4d8',
                }}>
                  {challenge.title}
                  {claimed && ' ✓'}
                </div>
                {challenge.completed && !claimed && (
                  <button
                    onClick={() => onClaim(challenge.id)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-bold transition-all hover:scale-105 active:scale-95"
                    style={{ background: '#c9a84c', color: '#0f1f15' }}
                  >
                    Claim +{challenge.reward.xp}XP
                  </button>
                )}
              </div>
              <div className="text-[11px] mb-1" style={{ color: '#5a7a5a' }}>
                {challenge.description}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full" style={{ background: '#0a1610' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: challenge.completed
                        ? 'linear-gradient(90deg, #c9a84c, #4a8a4a)'
                        : '#4a8a4a',
                      minWidth: pct > 0 ? '6px' : '0',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold" style={{ color: '#5a7a5a' }}>
                  {claimed ? '✓' : `${Math.min(challenge.progress, challenge.target)}/${challenge.target}`}
                </span>
              </div>
              {!claimed && (
                <div className="flex gap-2.5 mt-1">
                  <span className="text-[10px] font-semibold" style={{ color: '#c9a84c' }}>
                    +{challenge.reward.xp} XP
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: '#8aaa7a' }}>
                    +{challenge.reward.credits} Credits
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
