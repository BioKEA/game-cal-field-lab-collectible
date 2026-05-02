import { useMemo } from 'react';
import type { GameState } from '@/types/game';
import { SKILLS, BRANCH_INFO, canUnlockSkill, type SkillBranch } from '@/data/skills';

interface SkillTreeProps {
  state: GameState;
  onNavigate: (page: string) => void;
  onUnlockSkill: (id: string) => void;
}

export default function SkillTree({ state, onNavigate, onUnlockSkill }: SkillTreeProps) {
  const unlocked = useMemo(() => new Set(state.unlockedSkills), [state.unlockedSkills]);
  const branches: SkillBranch[] = ['field', 'lab', 'biology'];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0f1f2a, #0a1318)' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: '#1a2a38', background: '#0a1318' }}>
        <button
          onClick={() => onNavigate('hq')}
          className="flex items-center gap-2 text-sm mb-3 transition-colors"
          style={{ color: '#c9a84c' }}
        >
          ← HQ
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-bold italic"
              style={{ fontFamily: 'Georgia, serif', color: '#c9a84c' }}
            >
              Research Skills
            </h1>
            <p className="text-xs mt-1" style={{ color: '#6a88aa' }}>
              Spend research points on passive bonuses
            </p>
          </div>
          <div
            className="px-4 py-2.5 rounded-xl text-center"
            style={{
              background: 'linear-gradient(135deg, #1a2e4a, #14231a)',
              border: '1.5px solid #60a5fa',
              boxShadow: '0 0 24px #60a5fa25',
            }}
          >
            <div className="text-[9px] tracking-widest font-bold" style={{ color: '#60a5fa' }}>
              RESEARCH POINTS
            </div>
            <div
              className="text-2xl font-bold leading-none mt-0.5"
              style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}
            >
              {state.researchPoints}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <p className="text-xs leading-relaxed px-1" style={{ color: '#8aaa7a' }}>
          Earn research points by identifying new species. Rare species yield more points.
          Each branch offers cumulative bonuses across four tiers — prerequisites must be unlocked first.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branches.map(branch => {
          const info = BRANCH_INFO[branch];
          const branchSkills = SKILLS.filter(s => s.branch === branch).sort((a, b) => a.tier - b.tier);
          const unlockedCount = branchSkills.filter(s => unlocked.has(s.id)).length;
          return (
            <div
              key={branch}
              className="rounded-2xl p-4"
              style={{
                background: `linear-gradient(180deg, ${info.accent}10, #0a1318 80%)`,
                border: `1px solid ${info.accent}35`,
              }}
            >
              {/* Branch header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{
                    background: `${info.accent}18`,
                    border: `1.5px solid ${info.accent}60`,
                    boxShadow: `0 0 16px ${info.accent}25`,
                  }}
                >
                  {info.icon}
                </div>
                <div className="flex-1">
                  <div
                    className="text-base font-bold"
                    style={{ color: info.accent, fontFamily: 'Georgia, serif' }}
                  >
                    {info.name}
                  </div>
                  <div className="text-[10px]" style={{ color: '#6a88aa' }}>
                    {info.description}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] tracking-widest" style={{ color: '#5a7a8a' }}>
                    UNLOCKED
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: info.accent, fontFamily: 'Georgia, serif' }}
                  >
                    {unlockedCount}/4
                  </div>
                </div>
              </div>

              {/* Skill nodes — vertical chain */}
              <div className="relative pl-1">
                {/* Connecting line */}
                <div
                  className="absolute left-[26px] top-6 bottom-6 w-0.5"
                  style={{ background: `${info.accent}25` }}
                />

                <div className="space-y-3">
                  {branchSkills.map(skill => {
                    const isUnlocked = unlocked.has(skill.id);
                    const canUnlock = canUnlockSkill(skill, state.unlockedSkills, state.researchPoints);
                    const prereqMet = !skill.prerequisite || unlocked.has(skill.prerequisite);
                    const locked = !isUnlocked && !prereqMet;
                    return (
                      <div key={skill.id} className="relative flex items-stretch gap-3">
                        {/* Node circle */}
                        <div
                          className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-xl shrink-0 relative z-10 transition-all"
                          style={{
                            background: isUnlocked
                              ? info.accent
                              : canUnlock
                                ? `${info.accent}25`
                                : '#14231a',
                            border: `2px solid ${isUnlocked ? info.accent : canUnlock ? info.accent : '#2a3545'}`,
                            boxShadow: isUnlocked ? `0 0 18px ${info.accent}60` : 'none',
                            opacity: locked ? 0.45 : 1,
                            filter: isUnlocked ? 'saturate(1.2)' : locked ? 'grayscale(0.6)' : 'none',
                          }}
                        >
                          {locked ? '🔒' : skill.icon}
                        </div>

                        {/* Skill info + action */}
                        <button
                          onClick={() => canUnlock && onUnlockSkill(skill.id)}
                          disabled={!canUnlock}
                          className="flex-1 text-left rounded-xl p-3 transition-all"
                          style={{
                            background: isUnlocked
                              ? `linear-gradient(135deg, ${info.accent}20, #14231a 80%)`
                              : canUnlock
                                ? 'linear-gradient(135deg, #1a2535, #14231a)'
                                : '#0e161e',
                            border: `1px solid ${isUnlocked ? `${info.accent}60` : canUnlock ? `${info.accent}50` : '#1a2535'}`,
                            opacity: locked ? 0.55 : 1,
                            cursor: canUnlock ? 'pointer' : 'default',
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div
                              className="text-sm font-bold"
                              style={{
                                color: isUnlocked ? info.accent : '#e8e4d8',
                                fontFamily: 'Georgia, serif',
                              }}
                            >
                              {skill.title}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div
                                className="text-[9px] tracking-widest"
                                style={{ color: '#5a7a8a' }}
                              >
                                T{skill.tier}
                              </div>
                              {!isUnlocked && (
                                <div
                                  className="px-1.5 py-0.5 rounded-md text-[9px] font-bold"
                                  style={{
                                    background: canUnlock ? `${info.accent}25` : '#14231a',
                                    color: canUnlock ? info.accent : '#5a7a8a',
                                    border: `1px solid ${canUnlock ? `${info.accent}70` : '#2a3545'}`,
                                  }}
                                >
                                  {skill.cost} RP
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] leading-relaxed mb-1.5" style={{ color: '#8aaa7a' }}>
                            {skill.description}
                          </p>
                          <div
                            className="text-[10px] font-semibold"
                            style={{ color: isUnlocked ? info.accent : '#c9a84c' }}
                          >
                            → {skill.effect}
                          </div>
                          {isUnlocked && (
                            <div
                              className="mt-1.5 text-[9px] font-bold tracking-widest"
                              style={{ color: info.accent }}
                            >
                              ✓ UNLOCKED
                            </div>
                          )}
                          {!isUnlocked && !prereqMet && skill.prerequisite && (
                            <div
                              className="mt-1.5 text-[9px] italic"
                              style={{ color: '#5a7a8a' }}
                            >
                              Requires: {SKILLS.find(s => s.id === skill.prerequisite)?.title}
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        </div>

        {/* Impact factor note */}
        {state.impactFactor > 0 && (
          <div
            className="rounded-xl p-4 mt-4"
            style={{
              background: 'linear-gradient(135deg, #3a2f1a, #14231a 70%)',
              border: '1px solid #c9a84c60',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">📜</div>
              <div>
                <div className="text-xs font-bold" style={{ color: '#c9a84c', fontFamily: 'Georgia, serif' }}>
                  Impact Factor {state.impactFactor}× Active
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: '#8aaa7a' }}>
                  +{state.impactFactor * 10}% XP and credits from all sources (stacks with skills)
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
