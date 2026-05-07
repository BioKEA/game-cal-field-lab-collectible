import { useState, useMemo } from 'react';
import type { GameState } from '@/types/game';
import { RANK_LABELS } from '@/types/game';
import { peekSlot, eraseSlot, createSlot, createDevSlot, SLOT_COUNT } from '@/hooks/useGameState';
import { BIOMES } from '@/data/biomes';
import { SPECIES } from '@/data/species';
import NewResearcherModal from '@/components/NewResearcherModal';

interface FileSelectProps {
  onSelectSlot: (slot: number) => void;
}

type Mode = 'select' | 'erase';

const RANK_COLORS: Record<string, string> = {
  'volunteer': '#8aaa7a',
  'junior-explorer': '#6ac46a',
  'field-researcher': '#60a5fa',
  'lead-scientist': '#c9a84c',
  'lab-director': '#e85aec',
};

export default function FileSelect({ onSelectSlot }: FileSelectProps) {
  const [slots, setSlots] = useState<(GameState | null)[]>(() =>
    Array.from({ length: SLOT_COUNT }, (_, i) => peekSlot(i + 1))
  );
  const [mode, setMode] = useState<Mode>('select');
  const [creatingSlot, setCreatingSlot] = useState<number | null>(null);
  const [confirmErase, setConfirmErase] = useState<number | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  const totalSpecies = SPECIES.length;

  const handleSlotClick = (slotNum: number) => {
    const existing = slots[slotNum - 1];
    if (mode === 'erase') {
      if (existing) setConfirmErase(slotNum);
      return;
    }
    if (existing) {
      onSelectSlot(slotNum);
    } else {
      setCreatingSlot(slotNum);
    }
  };

  const handleCreate = (name: string, avatar: string) => {
    if (creatingSlot == null) return;
    createSlot(creatingSlot, name, avatar);
    setCreatingSlot(null);
    onSelectSlot(creatingSlot);
  };

  const handleErase = (slotNum: number) => {
    eraseSlot(slotNum);
    setSlots(prev => prev.map((s, i) => (i === slotNum - 1 ? null : s)));
    setConfirmErase(null);
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 20%, #1a3520 0%, #0a1610 55%, #050b08 100%)',
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Atmospheric glow layers */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, #c9a84c 0%, transparent 40%), radial-gradient(circle at 80% 70%, #4a8a4a 0%, transparent 40%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M20 0 L25 15 L40 20 L25 25 L20 40 L15 25 L0 20 L15 15 Z' fill='%23c9a84c'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Drifting particle motes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${(i * 83) % 100}%`,
              top: `${(i * 47) % 100}%`,
              width: '3px',
              height: '3px',
              background: i % 2 ? '#c9a84c' : '#4a8a4a',
              opacity: 0.25,
              filter: 'blur(1px)',
              animation: `drift ${18 + (i % 6) * 3}s ease-in-out ${i * 0.8}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 px-6 pt-10 pb-8 flex flex-col items-center min-h-screen">
        {/* Title */}
        <div className="text-center mb-8 animate-title-in">
          <div
            className="text-[10px] tracking-[0.3em] font-bold mb-2"
            style={{ color: '#8aaa7a' }}
          >
            CALIFORNIA BIODIVERSITY SURVEY
          </div>
          <h1
            className="text-5xl font-bold italic"
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              color: '#c9a84c',
              textShadow:
                '0 2px 20px rgba(201,168,76,0.25), 0 0 60px rgba(74,138,74,0.2)',
              letterSpacing: '0.02em',
            }}
          >
            BioKEA
          </h1>
          <div
            className="text-xs mt-3 italic"
            style={{ color: '#8aaa7a', fontFamily: "'Cinzel', Georgia, serif" }}
          >
            {mode === 'erase' ? '~ Erase a Researcher ~' : '~ Select Your Researcher ~'}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div
              className="h-px w-20"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5))',
              }}
            />
            <div style={{ color: '#c9a84c' }}>✦</div>
            <div
              className="h-px w-20"
              style={{
                background: 'linear-gradient(90deg, rgba(201,168,76,0.5), transparent)',
              }}
            />
          </div>
        </div>

        {/* Slots */}
        <div className="w-full space-y-3" style={{ maxWidth: 512 }}>
          {slots.map((save, idx) => {
            const slotNum = idx + 1;
            const isHovered = hoveredSlot === slotNum;
            return (
              <SlotCard
                key={slotNum}
                slotNum={slotNum}
                save={save}
                totalSpecies={totalSpecies}
                isHovered={isHovered}
                mode={mode}
                onEnter={() => setHoveredSlot(slotNum)}
                onLeave={() => setHoveredSlot(prev => (prev === slotNum ? null : prev))}
                onClick={() => handleSlotClick(slotNum)}
                delay={idx * 80}
              />
            );
          })}
        </div>

        {/* Menu */}
        <div className="mt-8 flex items-center gap-3">
          <button
            onClick={() => setMode(mode === 'erase' ? 'select' : 'erase')}
            className="px-4 py-2 rounded text-[10px] tracking-[0.25em] font-bold transition-all hover:scale-[1.04] active:scale-[0.97]"
            style={{
              background: mode === 'erase' ? '#3a1a1a' : 'transparent',
              border: `1.5px solid ${mode === 'erase' ? '#c94343' : '#2a4030'}`,
              color: mode === 'erase' ? '#e85a5a' : '#5a7a5a',
            }}
          >
            {mode === 'erase' ? '✕ CANCEL' : 'ERASE'}
          </button>
          {/*
            DEV MODE creates a save slot with all regions unlocked +
            unlimited reagents. Useful for developers / testing, but
            it's not a player feature — gate it behind import.meta.env
            .DEV so it only renders under `vite dev`, never in the
            production bundle served from biokea.ai.
          */}
          {import.meta.env.DEV && (
            <button
              onClick={() => {
                const emptyIdx = slots.findIndex(s => s === null);
                if (emptyIdx === -1) {
                  eraseSlot(SLOT_COUNT);
                  createDevSlot(SLOT_COUNT);
                  onSelectSlot(SLOT_COUNT);
                } else {
                  const slotNum = emptyIdx + 1;
                  createDevSlot(slotNum);
                  onSelectSlot(slotNum);
                }
              }}
              className="px-4 py-2 rounded text-[10px] tracking-[0.25em] font-bold transition-all hover:scale-[1.04] active:scale-[0.97]"
              style={{
                background: 'transparent',
                border: '1.5px solid #4a3a8a',
                color: '#8a7acc',
              }}
            >
              🛠️ DEV MODE
            </button>
          )}
          <div
            className="text-[9px] italic opacity-60"
            style={{ color: '#5a7a5a', fontFamily: "'Cinzel', Georgia, serif" }}
          >
            v1.0 · california field station
          </div>
        </div>
      </div>

      {/* New researcher modal */}
      {creatingSlot != null && (
        <NewResearcherModal
          slotNum={creatingSlot}
          onCancel={() => setCreatingSlot(null)}
          onConfirm={handleCreate}
        />
      )}

      {/* Erase confirm */}
      {confirmErase != null && (() => {
        const save = slots[confirmErase - 1];
        return (
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-5"
            style={{ background: 'rgba(5, 11, 8, 0.94)', backdropFilter: 'blur(6px)' }}
            onClick={() => setConfirmErase(null)}
          >
            <div
              onClick={e => e.stopPropagation()}
              className="w-full rounded-2xl p-6"
              style={{
                maxWidth: 512,
                background: 'linear-gradient(180deg, #2a1410, #1a0a08)',
                border: '2px solid #c94343',
                boxShadow: '0 0 60px rgba(201,67,67,0.3)',
              }}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">⚠️</div>
                <div
                  className="text-[10px] tracking-[0.3em] font-bold mb-1"
                  style={{ color: '#e85a5a' }}
                >
                  ERASE FILE {confirmErase}
                </div>
                <div
                  className="text-xl font-bold mb-1"
                  style={{ fontFamily: "'Cinzel', Georgia, serif", color: '#e8e4d8' }}
                >
                  {save?.playerName || 'Researcher'}
                </div>
                <div className="text-xs mb-5" style={{ color: '#a89878' }}>
                  All discoveries, exhibits, and progress will be permanently lost.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmErase(null)}
                    className="flex-1 rounded-lg py-2.5 text-xs font-bold transition-all"
                    style={{
                      background: '#14231a',
                      border: '1.5px solid #2a4030',
                      color: '#8aaa7a',
                    }}
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => handleErase(confirmErase)}
                    className="flex-1 rounded-lg py-2.5 text-xs font-bold transition-all hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, #c94343, #8a2020)',
                      border: '1.5px solid #e85a5a',
                      color: '#fff',
                    }}
                  >
                    Erase forever
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        @keyframes titleIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slotIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); opacity: 0.25; }
          50% { transform: translate(30px, -20px); opacity: 0.5; }
        }
        .animate-title-in {
          animation: titleIn 0.6s ease-out;
        }
        .animate-slot-in {
          animation: slotIn 0.5s ease-out backwards;
        }
      `}</style>
    </div>
  );
}

interface SlotCardProps {
  slotNum: number;
  save: GameState | null;
  totalSpecies: number;
  isHovered: boolean;
  mode: Mode;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
  delay: number;
}

function SlotCard({
  slotNum,
  save,
  totalSpecies,
  isHovered,
  mode,
  onEnter,
  onLeave,
  onClick,
  delay,
}: SlotCardProps) {
  const primaryBiome = useMemo(() => {
    if (!save) return null;
    return BIOMES.find(b => b.id === save.unlockedBiomes[save.unlockedBiomes.length - 1]);
  }, [save]);

  if (!save) {
    const isEraseMode = mode === 'erase';
    return (
      <button
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onClick={onClick}
        disabled={isEraseMode}
        className="w-full rounded-xl p-8 text-center transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 animate-slot-in"
        style={{
          background:
            'repeating-linear-gradient(135deg, #0a1610, #0a1610 8px, #0f1f15 8px, #0f1f15 16px)',
          border: '1.5px dashed #2a4030',
          animationDelay: `${delay}ms`,
          cursor: isEraseMode ? 'not-allowed' : 'pointer',
        }}
      >
        <div className="text-3xl mb-1 opacity-60">＋</div>
        <div className="text-sm tracking-widest font-bold" style={{ color: '#8aaa7a' }}>
          FILE {toRoman(slotNum)} · EMPTY
        </div>
        <div className="text-sm mt-1 italic" style={{ color: '#6a8a6a' }}>
          Begin a new survey
        </div>
      </button>
    );
  }

  const rankColor = RANK_COLORS[save.rank] || '#8aaa7a';
  const isEraseMode = mode === 'erase';
  const borderColor = isEraseMode ? '#c94343' : '#c9a84c';
  const glow = isHovered
    ? `0 0 28px ${isEraseMode ? 'rgba(201,67,67,0.35)' : 'rgba(201,168,76,0.35)'}`
    : '0 0 12px rgba(201,168,76,0.12)';

  return (
    <button
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="w-full rounded-xl p-5 relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] animate-slot-in text-left"
      style={{
        background: 'linear-gradient(135deg, #1a3520, #0f1f15 80%)',
        border: `2px solid ${isHovered ? borderColor : `${borderColor}99`}`,
        boxShadow: `${glow}, inset 0 0 40px rgba(10, 22, 16, 0.4)`,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Ornate top line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${borderColor}, transparent)`,
        }}
      />
      {/* Corner jewels */}
      <div className="absolute -top-1 -left-1 text-xs" style={{ color: borderColor }}>
        ◆
      </div>
      <div className="absolute -top-1 -right-1 text-xs" style={{ color: borderColor }}>
        ◆
      </div>
      <div className="absolute -bottom-1 -left-1 text-xs" style={{ color: borderColor }}>
        ◆
      </div>
      <div className="absolute -bottom-1 -right-1 text-xs" style={{ color: borderColor }}>
        ◆
      </div>

      {isEraseMode && (
        <div
          className="absolute top-2 right-2 text-[9px] tracking-widest font-bold px-2 py-0.5 rounded"
          style={{ background: '#c9434330', color: '#e85a5a', border: '1px solid #c94343' }}
        >
          ERASE
        </div>
      )}
      {/*
        DEV badge on a save slot. Gated under import.meta.env.DEV — a
        production build won't render it even on saves whose devMode
        flag is true (e.g. saves created in dev and exported via
        localStorage to a production browser).
      */}
      {!isEraseMode && save.devMode && import.meta.env.DEV && (
        <div
          className="absolute top-2 right-2 text-[9px] tracking-widest font-bold px-2 py-0.5 rounded"
          style={{ background: '#4a3a8a30', color: '#8a7acc', border: '1px solid #4a3a8a' }}
        >
          DEV
        </div>
      )}

      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0"
          style={{
            fontSize: 44,
            background: 'radial-gradient(circle, #1a3520, #0a1610)',
            border: `1.5px solid ${borderColor}80`,
            boxShadow: 'inset 0 0 12px rgba(201,168,76,0.15)',
          }}
        >
          {save.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-[10px] tracking-widest font-bold"
            style={{ color: '#8aaa7a' }}
          >
            FILE {toRoman(slotNum)}
          </div>
          <div
            className="text-xl font-bold truncate"
            style={{ fontFamily: "'Cinzel', Georgia, serif", color: '#e8e4d8' }}
          >
            {save.playerName}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: rankColor }}>
            ⭐ {RANK_LABELS[save.rank]}
            {save.impactFactor > 0 && ` · IF ${save.impactFactor}`}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] tracking-wider" style={{ color: '#5a7a5a' }}>
            DISCOVERIES
          </div>
          <div
            className="text-2xl font-bold"
            style={{ color: borderColor, fontFamily: "'Cinzel', Georgia, serif" }}
          >
            {save.discoveredSpecies.length}/{totalSpecies}
          </div>
        </div>
      </div>

      <div
        className="mt-4 pt-4 border-t flex items-center justify-between text-[20px] font-semibold"
        style={{ borderColor: '#2a4030' }}
      >
        <span style={{ color: '#8aaa7a' }}>🧪 {save.xp.toLocaleString()} XP</span>
        <span style={{ color: '#8aaa7a' }}>💠 {save.bioCredits.toLocaleString()} cr</span>
        <span style={{ color: '#8aaa7a' }}>
          🏛️ {countExhibits(save)}
        </span>
        {primaryBiome && (
          <span style={{ color: '#8aaa7a' }} className="truncate max-w-[120px]">
            {primaryBiome.emoji} {primaryBiome.name.split(' ')[0]}
          </span>
        )}
      </div>
    </button>
  );
}

function countExhibits(save: GameState): number {
  let n = 0;
  for (const hall of Object.values(save.exhibits || {})) {
    for (const s of hall) if (s) n++;
  }
  return n;
}

function toRoman(n: number): string {
  return ['I', 'II', 'III'][n - 1] || String(n);
}
