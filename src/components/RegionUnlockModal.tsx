import { useEffect, useState } from 'react';
import type { Region } from '@/types/game';
import { playRegionUnlock } from '@/lib/sounds';

interface RegionUnlockModalProps {
  region: Region;
  onDismiss: () => void;
}

export default function RegionUnlockModal({ region, onDismiss }: RegionUnlockModalProps) {
  const [phase, setPhase] = useState<'enter' | 'idle' | 'exit'>('enter');

  useEffect(() => {
    playRegionUnlock();
    const t1 = setTimeout(() => setPhase('idle'), 50);
    return () => clearTimeout(t1);
  }, []);

  const handleDismiss = () => {
    setPhase('exit');
    setTimeout(onDismiss, 400);
  };

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center"
      style={{
        background: phase === 'enter' ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.8)',
        transition: 'background 0.6s ease',
        opacity: phase === 'exit' ? 0 : 1,
      }}
      onClick={handleDismiss}
    >
      <div
        className="relative rounded-2xl overflow-hidden p-6 text-center max-w-xs mx-4"
        style={{
          background: `linear-gradient(135deg, #1a3520, #0c1a12 60%)`,
          border: `2px solid ${region.accent}80`,
          boxShadow: `0 0 80px ${region.accent}40, 0 0 160px ${region.accent}15, inset 0 0 40px ${region.accent}10`,
          transform: phase === 'idle' ? 'scale(1)' : 'scale(0.8)',
          opacity: phase === 'idle' ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 3 + Math.random() * 4,
              height: 3 + Math.random() * 4,
              background: region.accent,
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              opacity: 0,
              animation: `unlockParticle ${1.5 + Math.random()}s ease-out ${0.2 + Math.random() * 0.5}s forwards`,
            }}
          />
        ))}

        <div
          className="text-[10px] font-bold tracking-[0.3em] mb-3"
          style={{ color: region.accent }}
        >
          ✦ REGION UNLOCKED ✦
        </div>

        <div
          className="text-6xl mb-3"
          style={{
            filter: `drop-shadow(0 0 20px ${region.accent}80)`,
            animation: 'unlockBounce 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both',
          }}
        >
          {region.emoji}
        </div>

        <div
          className="text-xl font-bold italic mb-1"
          style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}
        >
          {region.name}
        </div>

        <div className="text-xs italic mb-1" style={{ color: region.accent }}>
          {region.tagline}
        </div>

        <div className="text-[11px] mt-3 mb-4 leading-relaxed" style={{ color: '#a8c4a0' }}>
          {region.description.slice(0, 120)}...
        </div>

        <div
          className="text-[10px] font-bold tracking-wider mb-3"
          style={{ color: '#5a7a5a' }}
        >
          TIER {region.tier} · {BIOMES_PER_TIER[region.tier] ?? '?'} NEW BIOMES
        </div>

        <button
          onClick={handleDismiss}
          className="px-5 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
          style={{
            background: `${region.accent}30`,
            color: region.accent,
            border: `1.5px solid ${region.accent}60`,
          }}
        >
          Begin Exploration
        </button>
      </div>

      <style>{`
        @keyframes unlockBounce {
          0% { transform: scale(0) rotate(-15deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes unlockParticle {
          0% { opacity: 0; transform: scale(0); }
          30% { opacity: 0.8; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(0) translateY(-30px); }
        }
      `}</style>
    </div>
  );
}

// Quick lookup — how many biomes per tier
const BIOMES_PER_TIER: Record<number, number> = { 1: 5, 2: 3, 3: 4, 4: 3, 5: 3 };
