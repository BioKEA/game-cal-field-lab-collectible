import { ACHIEVEMENTS } from '@/data/achievements';
import type { GameState } from '@/types/game';

interface AchievementsProps {
  state: GameState;
  onNavigate: (page: string) => void;
}

export default function Achievements({ state, onNavigate }: AchievementsProps) {
  const unlockedIds = new Set(state.achievements.map(a => a.id));
  const unlockedCount = unlockedIds.size;
  const totalCount = ACHIEVEMENTS.length;
  const pct = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1610' }}>
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: '#2a4030', background: '#0c1a12' }}>
        <button
          onClick={() => onNavigate('hq')}
          className="text-sm"
          style={{ color: '#c9a84c' }}
        >
          ← HQ
        </button>
        <h2 className="text-sm font-semibold" style={{ color: '#e8e4d8', fontFamily: "'Outfit', sans-serif" }}>
          Achievements
        </h2>
        <div className="text-xs" style={{ color: '#8aaa7a' }}>
          {unlockedCount}/{totalCount}
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-3">
        <div className="rounded-xl p-4" style={{ background: '#14231a', border: '1px solid #2a4030' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: '#e8e4d8' }}>
              Achievement Progress
            </span>
            <span className="text-sm font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
              {pct}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full" style={{ background: '#0c1a12' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #c9a84c, #4a8a4a)',
                minWidth: pct > 0 ? '12px' : '0',
              }}
            />
          </div>
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {ACHIEVEMENTS.map(def => {
            const unlocked = unlockedIds.has(def.id);
            const achievement = state.achievements.find(a => a.id === def.id);

            return (
              <div
                key={def.id}
                className="rounded-xl p-4 text-center transition-all"
                style={{
                  background: unlocked
                    ? 'linear-gradient(135deg, #1a3520, #14231a)'
                    : '#0c1a12',
                  border: `1.5px solid ${unlocked ? '#c9a84c40' : '#1a2a20'}`,
                  opacity: unlocked ? 1 : 0.5,
                }}
              >
                <div
                  className="text-3xl mb-2"
                  style={{
                    filter: unlocked ? `drop-shadow(0 0 8px #c9a84c40)` : 'grayscale(1)',
                  }}
                >
                  {unlocked ? def.emoji : '🔒'}
                </div>
                <div
                  className="text-xs font-semibold mb-1"
                  style={{ color: unlocked ? '#e8e4d8' : '#5a7a5a' }}
                >
                  {def.title}
                </div>
                <div className="text-xs" style={{ color: '#5a7a5a', fontSize: '10px' }}>
                  {def.description}
                </div>
                {unlocked && achievement?.unlockedAt && (
                  <div className="text-xs mt-2" style={{ color: '#c9a84c', fontSize: '9px' }}>
                    {new Date(achievement.unlockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
