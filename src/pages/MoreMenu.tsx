import type { GameState } from '@/types/game';
import { SPECIES } from '@/data/species';
import { BIOMES } from '@/data/biomes';
import { evaluateMissions } from '@/data/missions';
import { getDailyRequests } from '@/data/requests';
import { computeVisitorCredits } from '@/lib/ecosystem';
import { useMemo, useState } from 'react';
import { playTap } from '@/lib/sounds';

interface MoreMenuProps {
  state: GameState;
  onNavigate: (page: string) => void;
  onResetGame: () => void;
}

interface MenuItem {
  id: string;
  emoji: string;
  label: string;
  subtitle: string;
  badge?: number;
  accent?: string;
}

interface MenuGroup {
  id: string;
  label: string;
  emoji: string;
  items: MenuItem[];
}

export default function MoreMenu({ state, onNavigate, onResetGame }: MoreMenuProps) {
  const missions = useMemo(() => evaluateMissions(state), [state]);
  const claimableMissions = missions.filter(m => m.allStepsDone && !m.claimed).length;
  const activeMissions = missions.filter(m => !m.claimed).length;

  const dailyRequests = useMemo(() => getDailyRequests(), []);
  const claimedRequestsSet = useMemo(() => new Set(state.claimedRequests), [state.claimedRequests]);
  const claimableRequests = dailyRequests.filter(r => {
    if (claimedRequestsSet.has(r.id)) return false;
    return r.check(state).done;
  }).length;
  const unclaimedRequests = dailyRequests.filter(r => !claimedRequestsSet.has(r.id)).length;

  const museumPending = useMemo(
    () => computeVisitorCredits(state, id => SPECIES.find(s => s.id === id)),
    [state],
  );

  const groups: MenuGroup[] = [
    {
      id: 'progress',
      label: 'Progress',
      emoji: '📜',
      items: [
        {
          id: 'missions',
          emoji: '📜',
          label: 'Research Missions',
          subtitle: claimableMissions > 0
            ? `${claimableMissions} ready to claim`
            : `${activeMissions} active`,
          badge: claimableMissions,
        },
        {
          id: 'requests',
          emoji: '📩',
          label: 'Field Requests',
          subtitle: claimableRequests > 0
            ? `${claimableRequests} ready to deliver`
            : `${unclaimedRequests} pending`,
          badge: claimableRequests,
          accent: '#60a5fa',
        },
        {
          id: 'achievements',
          emoji: '🏆',
          label: 'Achievements',
          subtitle: `${state.achievements.filter(a => a.unlockedAt).length}/14 earned`,
        },
        {
          id: 'stats',
          emoji: '📊',
          label: 'Statistics',
          subtitle: 'Analytics & history',
        },
      ],
    },
    {
      id: 'resources',
      label: 'Resources',
      emoji: '🏪',
      items: [
        {
          id: 'shop',
          emoji: '🏪',
          label: 'Supply Depot',
          subtitle: `💰 ${state.bioCredits} credits`,
        },
        {
          id: 'skills',
          emoji: '🧠',
          label: 'Research Skills',
          subtitle: `${state.unlockedSkills.length}/12 unlocked`,
          badge: state.researchPoints > 0 ? state.researchPoints : undefined,
          accent: '#60a5fa',
        },
        {
          id: 'biomes',
          emoji: '🗺️',
          label: 'Field Sites',
          subtitle: `${state.unlockedBiomes.length}/${BIOMES.length} unlocked`,
        },
      ],
    },
    {
      id: 'collection',
      label: 'Collection',
      emoji: '🏛️',
      items: [
        {
          id: 'museum',
          emoji: '🏛️',
          label: 'Natural History Museum',
          subtitle: museumPending.ratePerHour > 0
            ? `${museumPending.ratePerHour} cr/hr from exhibits`
            : 'Curate exhibits',
          badge: museumPending.credits > 0 ? museumPending.credits : undefined,
        },
        {
          id: 'notes',
          emoji: '📓',
          label: 'Field Notes',
          subtitle: `${state.fieldNotes.length} entries`,
        },
        {
          id: 'team',
          emoji: '🧑‍🔬',
          label: 'Research Team',
          subtitle: 'Weekly leaderboard',
        },
      ],
    },
  ];

  const groupsWithBadges = new Set(
    groups.filter(g => g.items.some(i => i.badge && i.badge > 0)).map(g => g.id)
  );

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    groups.forEach(g => {
      if (groupsWithBadges.has(g.id)) initial.add(g.id);
    });
    if (initial.size === 0) initial.add(groups[0].id);
    return initial;
  });

  const toggleGroup = (id: string) => {
    playTap();
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const groupBadgeTotal = (group: MenuGroup) =>
    group.items.reduce((sum, i) => sum + (i.badge ?? 0), 0);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'linear-gradient(180deg, #0f1f15, #0a1610)' }}
    >
      <div className="px-4 pt-4 pb-2">
        <h1
          className="text-lg font-bold italic"
          style={{ fontFamily: 'Georgia, serif', color: '#c9a84c' }}
        >
          More
        </h1>
        <p className="text-[11px]" style={{ color: '#5a7a5a' }}>
          All tools & features
        </p>
      </div>

      <div className="px-3 space-y-2">
        {groups.map(group => {
          const isOpen = expanded.has(group.id);
          const totalBadge = groupBadgeTotal(group);

          return (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full rounded-lg px-3 py-2.5 text-left transition-all hover:scale-[1.005] active:scale-[0.99]"
                style={{
                  background: isOpen
                    ? 'linear-gradient(135deg, #1a3520, #14231a)'
                    : '#14231a',
                  border: `1px solid ${isOpen ? '#c9a84c40' : '#2a4030'}`,
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="text-lg">{group.emoji}</div>
                  <span className="text-sm font-semibold flex-1" style={{ color: '#e8e4d8' }}>
                    {group.label}
                  </span>
                  {totalBadge > 0 && (
                    <div
                      className="px-1.5 py-0.5 rounded-full text-[11px] font-bold"
                      style={{ background: '#c9a84c', color: '#0f1f15' }}
                    >
                      {totalBadge}
                    </div>
                  )}
                  <div
                    className="text-sm transition-transform duration-200"
                    style={{
                      color: '#5a7a5a',
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  >
                    ›
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="mt-1 ml-3 space-y-1">
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        playTap();
                        onNavigate(item.id);
                      }}
                      className="w-full rounded-lg px-3 py-2 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={{
                        background: item.badge
                          ? `linear-gradient(135deg, ${item.accent === '#60a5fa' ? '#1a2540' : '#2a3520'}20, #0f1f15)`
                          : '#0f1f15',
                        border: `1px solid ${item.badge ? (item.accent ?? '#c9a84c') + '40' : '#1a2e20'}`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-base">{item.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-[13px] font-semibold" style={{ color: '#e8e4d8' }}>
                              {item.label}
                            </span>
                            <span className="text-[11px]" style={{ color: '#8aaa7a' }}>
                              {item.subtitle}
                            </span>
                          </div>
                        </div>
                        {item.badge != null && item.badge > 0 && (
                          <div
                            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: item.accent ?? '#c9a84c', color: '#0f1f15' }}
                          >
                            {item.badge}
                          </div>
                        )}
                        <div className="text-xs" style={{ color: '#5a7a5a' }}>›</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="px-3 pt-4 pb-6 flex items-center justify-center gap-2">
        <button
          onClick={() => onNavigate('file-select')}
          className="text-[11px] px-3 py-1.5 rounded-md transition-all hover:scale-105"
          style={{ background: '#14231a', border: '1px solid #2a4030', color: '#8aaa7a' }}
        >
          Switch Researcher
        </button>
        <button
          onClick={() => {
            if (window.confirm('Reset all progress for this researcher? This cannot be undone.')) {
              onResetGame();
            }
          }}
          className="text-[11px] px-3 py-1.5 rounded-md transition-all hover:scale-105"
          style={{ background: '#14231a', border: '1px solid #2a4030', color: '#5a7a5a' }}
        >
          Reset Progress
        </button>
      </div>
    </div>
  );
}
