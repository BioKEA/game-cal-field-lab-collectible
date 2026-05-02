import { useState, useEffect } from 'react';
import { SPECIES } from '@/data/species';
import { BIOMES } from '@/data/biomes';
import { RARITY_COLORS, RARITY_LABELS } from '@/types/game';
import type { GameState } from '@/types/game';
import { playDiscovery } from '@/lib/sounds';

interface DiscoveryRevealProps {
  state: GameState;
  specimenId: string;
  onDismiss: () => void;
}

function DNAStream() {
  const bases = ['A', 'T', 'C', 'G'];
  const colors = ['#4a8a4a', '#ef4444', '#60a5fa', '#c9a84c'];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Scanning lines */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`line-${i}`}
          className="absolute left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, #4a8a4a40, transparent)`,
            top: `${15 + i * 14}%`,
            animation: `scanLine 2s ${i * 0.3}s infinite linear`,
          }}
        />
      ))}
      {/* Floating bases */}
      {Array.from({ length: 40 }).map((_, i) => {
        const baseIdx = i % 4;
        return (
          <div
            key={i}
            className="absolute font-mono font-bold"
            style={{
              color: `${colors[baseIdx]}60`,
              left: `${(i * 2.5) % 100}%`,
              top: `${(i * 7 + 5) % 100}%`,
              fontSize: `${8 + (i % 3) * 4}px`,
              animation: `floatBase ${2 + (i % 3)}s ${i * 0.08}s infinite alternate ease-in-out`,
            }}
          >
            {bases[baseIdx]}
          </div>
        );
      })}
      {/* Central analysis indicator */}
      <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#4a8a4a', borderTopColor: 'transparent', animationDuration: '1.5s' }}
          />
          <div
            className="absolute inset-2 rounded-full border-2 border-b-transparent animate-spin"
            style={{ borderColor: '#c9a84c40', borderBottomColor: 'transparent', animationDirection: 'reverse', animationDuration: '2s' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🧬</span>
          </div>
        </div>
        <div className="text-sm font-semibold animate-pulse" style={{ color: '#4a8a4a' }}>
          Analyzing DNA barcode...
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="w-1 rounded-full"
              style={{
                height: `${12 + Math.sin(i * 0.8) * 8}px`,
                background: colors[i % 4],
                opacity: 0.5,
                animation: `barPulse 1s ${i * 0.08}s infinite alternate`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DiscoveryReveal({ state, specimenId, onDismiss }: DiscoveryRevealProps) {
  const [phase, setPhase] = useState<'dna' | 'reveal' | 'details'>('dna');

  const specimen = state.specimens.find(s => s.id === specimenId);
  const species = specimen ? SPECIES.find(s => s.id === specimen.speciesId) : null;
  const biome = specimen ? BIOMES.find(b => b.id === specimen.biomeId) : null;
  const isNewDiscovery = species ? state.discoveredSpecies.filter(id => id === species.id).length === 1 : false;

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('reveal');
      playDiscovery();
    }, 3000);
    const t2 = setTimeout(() => setPhase('details'), 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!specimen || !species) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a1610' }}>
        <button onClick={onDismiss} className="text-sm" style={{ color: '#c9a84c' }}>
          Back to Lab
        </button>
      </div>
    );
  }

  const rarityColor = RARITY_COLORS[species.rarity];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: '#0a1610' }}
    >
      {/* DNA Stream Background */}
      {phase === 'dna' && <DNAStream />}

      {/* Reveal Phase */}
      {phase === 'reveal' && (
        <div className="text-center animate-reveal-in relative z-10">
          <div
            className="text-8xl mb-6"
            style={{
              animation: 'bounceIn 0.8s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
              filter: `drop-shadow(0 0 30px ${rarityColor}80)`,
            }}
          >
            {species.emoji}
          </div>
          {isNewDiscovery && (
            <div className="mb-3 tracking-widest" style={{ animation: 'shimmer 2s infinite' }}>
              <span className="text-xs font-bold" style={{ color: '#c9a84c' }}>
                ★ NEW SPECIES DISCOVERED ★
              </span>
            </div>
          )}
          <div
            className="text-2xl font-bold mb-1"
            style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}
          >
            {species.commonName}
          </div>
          <div className="text-sm italic mb-4" style={{ color: '#8aaa7a' }}>
            {species.scientificName}
          </div>
          <div
            className="inline-block px-4 py-1.5 rounded-full text-sm font-bold"
            style={{
              background: `${rarityColor}20`,
              color: rarityColor,
              border: `2px solid ${rarityColor}60`,
              boxShadow: `0 0 40px ${rarityColor}30`,
            }}
          >
            {RARITY_LABELS[species.rarity]}
          </div>
        </div>
      )}

      {/* Details Phase */}
      {phase === 'details' && (
        <div className="w-full max-w-md animate-reveal-in relative z-10">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3" style={{ filter: `drop-shadow(0 0 16px ${rarityColor}40)` }}>
              {species.emoji}
            </div>
            {isNewDiscovery && (
              <div className="text-xs font-bold mb-2 tracking-widest" style={{ color: '#c9a84c' }}>
                ★ NEW DISCOVERY ★
              </div>
            )}
            <div className="text-xl font-bold" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
              {species.commonName}
            </div>
            <div className="text-sm italic" style={{ color: '#8aaa7a' }}>
              {species.scientificName}
            </div>
          </div>

          <div
            className="rounded-2xl p-5 mb-4"
            style={{
              background: 'linear-gradient(180deg, #14231a, #0f1f15)',
              border: `1.5px solid ${rarityColor}40`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  background: `${rarityColor}20`,
                  color: rarityColor,
                  border: `1px solid ${rarityColor}40`,
                }}
              >
                {RARITY_LABELS[species.rarity]}
              </div>
              <div className="text-xs" style={{ color: '#5a7a5a' }}>
                {species.order} · {species.family}
              </div>
            </div>

            <p className="text-xs leading-relaxed mb-4" style={{ color: '#8aaa7a' }}>
              {species.description}
            </p>

            <div className="rounded-xl p-3 mb-4" style={{ background: '#0c1a12', border: '1px solid #1a2e20' }}>
              <div className="text-xs font-semibold mb-1" style={{ color: '#c9a84c' }}>Fun Fact</div>
              <p className="text-xs" style={{ color: '#8aaa7a' }}>{species.funFact}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2 text-center" style={{ background: '#0c1a12' }}>
                <div className="text-xs" style={{ color: '#5a7a5a' }}>Gene</div>
                <div className="text-sm font-semibold" style={{ color: '#4a8a4a' }}>{species.barcodeGene}</div>
              </div>
              <div className="rounded-lg p-2 text-center" style={{ background: '#0c1a12' }}>
                <div className="text-xs" style={{ color: '#5a7a5a' }}>Length</div>
                <div className="text-sm font-semibold" style={{ color: '#4a8a4a' }}>{species.barcodeLength} bp</div>
              </div>
              <div className="rounded-lg p-2 text-center" style={{ background: '#0c1a12' }}>
                <div className="text-xs" style={{ color: '#5a7a5a' }}>Match</div>
                <div className="text-sm font-semibold" style={{ color: '#c9a84c' }}>
                  {specimen.matchPercent?.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg p-2 text-center" style={{ background: '#0c1a12' }}>
                <div className="text-xs" style={{ color: '#5a7a5a' }}>Conservation</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: species.conservationStatus === 'Least Concern' ? '#4a8a4a' : '#c9a84c' }}>
                  {species.conservationStatus}
                </div>
              </div>
            </div>
          </div>

          {biome && (
            <div className="text-center text-xs mb-4" style={{ color: '#5a7a5a' }}>
              Collected at {biome.emoji} {biome.name}
            </div>
          )}

          <button
            onClick={onDismiss}
            className="w-full rounded-xl p-3 text-center font-semibold transition-all hover:scale-[1.01] active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #1a3520, #14231a)',
              border: '1.5px solid #4a8a4a',
              color: '#c9a84c',
            }}
          >
            Continue to Lab
          </button>
        </div>
      )}

      {/* Ambient rarity glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${rarityColor}10 0%, transparent 60%)`,
        }}
      />

      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          70% { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes scanLine {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes floatBase {
          0% { transform: translateY(0) scale(1); opacity: 0.3; }
          100% { transform: translateY(-8px) scale(1.1); opacity: 0.6; }
        }
        @keyframes barPulse {
          0% { transform: scaleY(0.6); }
          100% { transform: scaleY(1.4); }
        }
        @keyframes shimmer {
          0%,100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-reveal-in {
          animation: revealIn 0.6s ease-out;
        }
        @keyframes revealIn {
          0% { opacity: 0; transform: translateY(15px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
