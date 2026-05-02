import { playTap } from '@/lib/sounds';

type TabId = 'hq' | 'expedition' | 'lab' | 'catalog' | 'more';

interface BottomTabBarProps {
  activeTab: TabId;
  onChangeTab: (tab: TabId) => void;
  badges?: Partial<Record<TabId, number>>;
}

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'hq', label: 'HQ', emoji: '🗺️' },
  { id: 'expedition', label: 'Explore', emoji: '🌿' },
  { id: 'lab', label: 'Lab', emoji: '🔬' },
  { id: 'catalog', label: 'Catalog', emoji: '📖' },
  { id: 'more', label: 'More', emoji: '≡' },
];

export default function BottomTabBar({ activeTab, onChangeTab, badges }: BottomTabBarProps) {
  return (
    <nav
      className="fixed z-[8000] left-0 right-0 bottom-0 flex flex-row items-stretch md:flex-col md:justify-evenly md:left-2 md:right-auto md:top-2 md:bottom-auto md:rounded-2xl md:px-2 md:py-6 md:gap-4"
      style={{
        background: 'linear-gradient(180deg, #0c1a12f0, #080e0af8)',
        border: '1px solid #2a4030',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        const badge = badges?.[tab.id];
        return (
          <button
            key={tab.id}
            onClick={() => {
              playTap();
              if (isActive && tab.id !== 'hq') {
                onChangeTab('hq');
              } else if (!isActive) {
                onChangeTab(tab.id);
              }
            }}
            className="flex flex-col items-center justify-center relative transition-all flex-1 py-2 md:py-0 md:flex-none"
            style={{ minHeight: 56, minWidth: 56 }}
          >
            {/* Active indicator: top bar on mobile, left bar on desktop */}
            {isActive && (
              <>
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-7 rounded-full md:hidden"
                  style={{ background: '#c9a84c' }}
                />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-full hidden md:block"
                  style={{ background: '#c9a84c' }}
                />
              </>
            )}

            <div
              className="relative leading-none transition-transform"
              style={{
                fontSize: 22,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
                filter: isActive ? 'drop-shadow(0 0 6px #c9a84c60)' : 'none',
              }}
            >
              {tab.id === 'more' ? (
                <span
                  className="text-xl font-bold"
                  style={{ color: isActive ? '#c9a84c' : '#5a7a5a' }}
                >
                  ≡
                </span>
              ) : (
                tab.emoji
              )}

              {badge != null && badge > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold leading-none px-0.5"
                  style={{ background: '#c9a84c', color: '#0f1f15' }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>

            <span
              className="text-[10px] font-bold mt-0.5 tracking-wide"
              style={{ color: isActive ? '#c9a84c' : '#5a7a5a' }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
