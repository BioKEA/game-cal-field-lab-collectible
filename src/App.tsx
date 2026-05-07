import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Toaster } from 'sonner';
import { useGameState, ACTIVE_SLOT_KEY } from '@/hooks/useGameState';
import FileSelect from '@/pages/FileSelect';
import HQ from '@/pages/HQ';
import Expedition from '@/pages/Expedition';
import Lab from '@/pages/Lab';
import DiscoveryReveal from '@/pages/DiscoveryReveal';
import Catalog from '@/pages/Catalog';
import Shop from '@/pages/Shop';
import FieldNotes from '@/pages/FieldNotes';
import Achievements from '@/pages/Achievements';
import Stats from '@/pages/Stats';
import Biomes from '@/pages/Biomes';
import Missions from '@/pages/Missions';
import Requests from '@/pages/Requests';
import Team from '@/pages/Team';
import SkillTree from '@/pages/SkillTree';
import Museum from '@/pages/Museum';
import MoreMenu from '@/pages/MoreMenu';
import OnboardingModal from '@/components/OnboardingModal';
import { BiokeaLeaderboardPrompt } from '@/components/BiokeaLeaderboardPrompt';
import RegionUnlockModal from '@/components/RegionUnlockModal';
import CrossSavePrompt, { shouldShowCrossSavePrompt, hasCrossSaveBadge } from '@/components/CrossSavePrompt';
import BottomTabBar from '@/components/BottomTabBar';
import { REGIONS, isTierUnlocked } from '@/data/regions';
import type { Region } from '@/types/game';

const ONBOARDING_KEY_PREFIX = 'biokea-onboarded-slot-';
const PAGE_KEY_PREFIX = 'biokea-lastpage-slot-';

type Page = 'hq' | 'expedition' | 'lab' | 'discovery' | 'catalog' | 'shop' | 'notes' | 'achievements' | 'stats' | 'biomes' | 'missions' | 'requests' | 'team' | 'skills' | 'museum' | 'more';

// Pages that live under each tab
type TabId = 'hq' | 'expedition' | 'lab' | 'catalog' | 'more';

function pageToTab(page: Page): TabId {
  if (page === 'hq') return 'hq';
  if (page === 'expedition') return 'expedition';
  if (page === 'lab' || page === 'discovery') return 'lab';
  if (page === 'catalog') return 'catalog';
  return 'more';
}

// Pages that show the bottom tab bar (most pages except discovery reveal)
function showTabBar(page: Page): boolean {
  return page !== 'discovery';
}

function App() {
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  // Prevent overscroll bounce on mobile
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
  }, []);

  const handleSelectSlot = useCallback((slot: number) => {
    try {
      localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
    } catch { /* ignore */ }
    setActiveSlot(slot);
  }, []);

  const handleSwitchResearcher = useCallback(() => {
    try {
      localStorage.removeItem(ACTIVE_SLOT_KEY);
    } catch { /* ignore */ }
    setActiveSlot(null);
  }, []);

  if (activeSlot == null) {
    return <FileSelect onSelectSlot={handleSelectSlot} />;
  }

  return (
    <GameShell
      key={activeSlot}
      slot={activeSlot}
      onSwitchResearcher={handleSwitchResearcher}
    />
  );
}

interface GameShellProps {
  slot: number;
  onSwitchResearcher: () => void;
}

function GameShell({ slot, onSwitchResearcher }: GameShellProps) {
  const {
    state,
    collectSpecimen,
    advanceLabStage,
    setCurrentLocation,
    useExpeditionFuel,
    purchaseItem,
    renamePlayer,
    setAvatar,
    resetGame,
    claimChallengeReward,
    claimMission,
    claimRequest,
    claimMilestone,
    unlockSkill,
    publishResearch,
    placeExhibit,
    collectVisitors,
  } = useGameState(slot);

  const getInitialPage = useCallback((): Page => {
    return 'hq';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  const [currentPage, setCurrentPage] = useState<Page>(getInitialPage);
  const [discoverySpecimenId, setDiscoverySpecimenId] = useState<string | null>(null);
  const [pageKey, setPageKey] = useState(0);
  const [expeditionTarget, setExpeditionTarget] = useState<{ biomeId: string; pointId: string } | null>(null);
  const [expeditionBiome, setExpeditionBiome] = useState<string | null>(null);
  const [unlockModal, setUnlockModal] = useState<Region | null>(null);
  const [showCrossSavePrompt, setShowCrossSavePrompt] = useState(false);

  // Persist current page
  useEffect(() => {
    try {
      localStorage.setItem(`${PAGE_KEY_PREFIX}${slot}`, currentPage);
    } catch { /* ignore */ }
  }, [currentPage, slot]);

  // Track which tiers are unlocked to detect new unlocks
  const unlockedTiers = useMemo(
    () => new Set(REGIONS.filter(r => isTierUnlocked(r.tier, state)).map(r => r.tier)),
    [state],
  );
  const prevTiersRef = useRef<Set<number>>(unlockedTiers);
  useEffect(() => {
    const prev = prevTiersRef.current;
    for (const tier of unlockedTiers) {
      if (!prev.has(tier) && tier > 1) {
        const region = REGIONS.find(r => r.tier === tier);
        if (region) {
          setUnlockModal(region);
          break;
        }
      }
    }
    prevTiersRef.current = unlockedTiers;
  }, [unlockedTiers]);

  // Check cross-save prompt conditions periodically
  useEffect(() => {
    if (showCrossSavePrompt) return;
    if (shouldShowCrossSavePrompt(state, slot)) {
      setShowCrossSavePrompt(true);
    }
  }, [state.totalPlaytimeSec, state.unlockedBiomes.length, slot, showCrossSavePrompt]);

  const onboardingKey = `${ONBOARDING_KEY_PREFIX}${slot}`;
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return localStorage.getItem(onboardingKey) !== 'true';
    } catch {
      return false;
    }
  });

  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(onboardingKey, 'true');
    } catch { /* ignore */ }
    setShowOnboarding(false);
  }, [onboardingKey]);

  // Show the BioKEA leaderboard prompt at game-start when the player still
  // has the default 'Researcher' handle. This is the long-form game's
  // chance to capture a real handle + optional email subscription before
  // the player goes deep — same modal shape as the arcade games' game-end
  // version, just triggered earlier in the arc.
  const [biokeaPromptOpen, setBiokeaPromptOpen] = useState(false);
  useEffect(() => {
    if (showOnboarding) return;
    if (state.playerName && state.playerName !== 'Researcher') return;
    setBiokeaPromptOpen(true);
  }, [showOnboarding, state.playerName]);

  const handleNavigate = useCallback((page: string) => {
    if (page === 'file-select') {
      onSwitchResearcher();
      return;
    }
    if (page.startsWith('expedition:')) {
      const biomeId = page.split(':')[1];
      setExpeditionBiome(biomeId);
      setExpeditionTarget(null);
      setCurrentPage('expedition');
      setPageKey(k => k + 1);
      return;
    }
    if (page !== 'expedition') {
      setExpeditionTarget(null);
    }
    setExpeditionBiome(null);
    setCurrentPage(page as Page);
    setPageKey(k => k + 1);
  }, [onSwitchResearcher]);

  const handleTabChange = useCallback((tab: TabId) => {
    if (tab === 'more') {
      setCurrentPage('more');
    } else {
      setCurrentPage(tab);
    }
    setExpeditionTarget(null);
    setExpeditionBiome(null);
    setPageKey(k => k + 1);
  }, []);


  const handleDiscovery = useCallback((specimenId: string) => {
    setDiscoverySpecimenId(specimenId);
    setCurrentPage('discovery');
    setPageKey(k => k + 1);
  }, []);

  const activeTab = pageToTab(currentPage);

  // Badge counts for tabs
  const labBadge = state.specimens.filter(s => s.labStatus !== 'identified' && s.labStatus !== 'failed').length;
  const moreBadge = hasCrossSaveBadge(state, slot) ? 1 : 0;

  return (
    <div className="min-h-screen" style={{ background: '#0a1610', fontFamily: "'Outfit', sans-serif" }}>
      <div
        key={pageKey}
        className={`animate-page-in ${showTabBar(currentPage) ? 'pb-[64px] md:pb-0 md:pl-[68px]' : ''}`}
      >
        {currentPage === 'hq' && (
          <HQ state={state} onNavigate={handleNavigate} onClaimChallenge={claimChallengeReward} onClaimMilestone={claimMilestone} onPublishResearch={publishResearch} onRenamePlayer={renamePlayer} onSetAvatar={setAvatar} />
        )}
        {currentPage === 'skills' && (
          <SkillTree state={state} onNavigate={handleNavigate} onUnlockSkill={unlockSkill} />
        )}
        {currentPage === 'expedition' && (
          <Expedition
            state={state}
            onNavigate={handleNavigate}
            onCollectSpecimen={collectSpecimen}
            onSetLocation={setCurrentLocation}
            onUseFuel={useExpeditionFuel}
            initialTarget={expeditionTarget}
            initialBiomeId={expeditionBiome}
          />
        )}
        {currentPage === 'lab' && (
          <Lab
            state={state}
            onNavigate={handleNavigate}
            onAdvanceLab={advanceLabStage}
            onDiscovery={handleDiscovery}
            onPurchase={purchaseItem}
          />
        )}
        {currentPage === 'discovery' && discoverySpecimenId && (
          <DiscoveryReveal
            state={state}
            specimenId={discoverySpecimenId}
            onDismiss={() => {
              setDiscoverySpecimenId(null);
              setCurrentPage('lab');
              setPageKey(k => k + 1);
            }}
          />
        )}
        {currentPage === 'catalog' && (
          <Catalog state={state} onNavigate={handleNavigate} />
        )}
        {currentPage === 'shop' && (
          <Shop state={state} onNavigate={handleNavigate} onPurchase={purchaseItem} />
        )}
        {currentPage === 'notes' && (
          <FieldNotes state={state} onNavigate={handleNavigate} />
        )}
        {currentPage === 'achievements' && (
          <Achievements state={state} onNavigate={handleNavigate} />
        )}
        {currentPage === 'stats' && (
          <Stats state={state} onNavigate={handleNavigate} />
        )}
        {currentPage === 'biomes' && (
          <Biomes state={state} onNavigate={handleNavigate} />
        )}
        {currentPage === 'missions' && (
          <Missions state={state} onNavigate={handleNavigate} onClaimMission={claimMission} />
        )}
        {currentPage === 'requests' && (
          <Requests state={state} onNavigate={handleNavigate} onClaimRequest={claimRequest} />
        )}
        {currentPage === 'team' && (
          <Team state={state} onNavigate={handleNavigate} />
        )}
        {currentPage === 'museum' && (
          <Museum
            state={state}
            onNavigate={handleNavigate}
            onPlaceExhibit={placeExhibit}
            onCollectVisitors={collectVisitors}
          />
        )}
        {currentPage === 'more' && (
          <MoreMenu state={state} onNavigate={handleNavigate} onResetGame={resetGame} />
        )}
      </div>

      {/* Bottom tab bar */}
      {showTabBar(currentPage) && (
        <BottomTabBar
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          badges={{
            lab: labBadge || undefined,
            more: moreBadge || undefined,
          }}
        />
      )}

      {showOnboarding && currentPage === 'hq' && <OnboardingModal onComplete={completeOnboarding} />}
      {biokeaPromptOpen && !showOnboarding && (
        <BiokeaLeaderboardPrompt
          trigger="game-start"
          gameSlug="cal-field-lab-collectible"
          gameTitle="Biodiversity Discovery Lab"
          defaultHandle={state.playerName === 'Researcher' ? '' : state.playerName}
          onSubmit={(result) => {
            renamePlayer(result.handle);
            setBiokeaPromptOpen(false);
          }}
        />
      )}
      {unlockModal && <RegionUnlockModal region={unlockModal} onDismiss={() => setUnlockModal(null)} />}
      {showCrossSavePrompt && !showOnboarding && !unlockModal && (
        <CrossSavePrompt
          currentState={state}
          slot={slot}
          onNavigate={handleNavigate}
          onDismiss={() => setShowCrossSavePrompt(false)}
        />
      )}

      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: 'linear-gradient(135deg, #1a3520, #14231a)',
            border: '1.5px solid #c9a84c60',
            color: '#e8e4d8',
            fontFamily: "'Outfit', sans-serif",
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          },
        }}
      />

      <style>{`
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-page-in {
          animation: pageIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}

export default App;
