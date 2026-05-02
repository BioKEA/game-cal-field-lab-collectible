import { useState, useMemo, useCallback } from 'react';
import { speciesBarcode, gapIndices, scoreBarcode, barcodeBonusMultiplier, type Base } from '@/lib/barcode';

interface BarcodeMiniGameProps {
  speciesId: string;
  speciesName: string;
  speciesEmoji: string;
  gene: string;
  onComplete: (bonusMultiplier: number) => void;
  onSkip: () => void;
}

const BASES: Base[] = ['A', 'T', 'C', 'G'];
const BASE_COLORS: Record<Base, string> = {
  A: '#4a8a4a',
  T: '#c94343',
  C: '#60a5fa',
  G: '#c9a84c',
};

const SEQUENCE_LENGTH = 8;

export default function BarcodeMiniGame({
  speciesId,
  speciesName,
  speciesEmoji,
  gene,
  onComplete,
  onSkip,
}: BarcodeMiniGameProps) {
  const answer = useMemo(() => speciesBarcode(speciesId, SEQUENCE_LENGTH), [speciesId]);
  const gaps = useMemo(() => gapIndices(speciesId, SEQUENCE_LENGTH, 6), [speciesId]);
  const [guess, setGuess] = useState<(Base | null)[]>(() => {
    const arr: (Base | null)[] = answer.map((b, i) => gaps.includes(i) ? null : b);
    return arr;
  });
  const [activeGap, setActiveGap] = useState<number>(gaps[0]);
  const [submitted, setSubmitted] = useState(false);

  const placeBase = useCallback((base: Base) => {
    if (submitted) return;
    setGuess(prev => {
      const next = [...prev];
      next[activeGap] = base;
      return next;
    });
    // Auto-advance to the next empty gap
    const remaining = gaps.filter(g => g !== activeGap && guess[g] === null);
    if (remaining.length > 0) {
      // Pick the next gap after the current one
      const next = gaps.find(g => g > activeGap && guess[g] === null) ?? remaining[0];
      setActiveGap(next);
    }
  }, [activeGap, gaps, guess, submitted]);

  const result = useMemo(() => scoreBarcode(answer, guess, gaps), [answer, guess, gaps]);
  const allFilled = gaps.every(g => guess[g] !== null);

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
  }, []);

  const handleContinue = useCallback(() => {
    const bonus = barcodeBonusMultiplier(result.accuracy);
    onComplete(bonus);
  }, [onComplete, result.accuracy]);

  const bonusPct = Math.round(barcodeBonusMultiplier(result.accuracy) * 100);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 11, 16, 0.94)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #14231a, #0a1610)',
          border: '1.5px solid #4a8a4a60',
          boxShadow: '0 0 60px #4a8a4a25',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b"
          style={{
            borderColor: '#1a2e20',
            background: 'linear-gradient(135deg, #1a3520, #0f1f15)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">{speciesEmoji}</div>
            <div className="flex-1">
              <div className="text-[10px] tracking-widest font-bold" style={{ color: '#4a8a4a' }}>
                BARCODE SEQUENCING · {gene}
              </div>
              <div className="text-base font-bold" style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}>
                {speciesName}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs leading-relaxed" style={{ color: '#8aaa7a' }}>
            {submitted
              ? 'Sequence verified. Higher accuracy = larger XP bonus on identification.'
              : 'Fill in the missing base pairs. Tap a gap, then choose A, T, C, or G to call the base.'}
          </p>
        </div>

        {/* Sequence display */}
        <div className="px-5 py-4">
          <div className="text-[9px] tracking-widest mb-2 font-bold" style={{ color: '#5a7a5a' }}>
            5' ─────────────────────────────────── 3'
          </div>
          <div className="flex items-center justify-between gap-1">
            {answer.map((trueBase, i) => {
              const isGap = gaps.includes(i);
              const placed = guess[i];
              const isActive = !submitted && i === activeGap;
              const isCorrect = submitted && placed === trueBase;
              const isWrong = submitted && placed !== null && placed !== trueBase;
              const display = submitted ? trueBase : placed ?? '?';
              const baseColor = display && display !== '?' ? BASE_COLORS[display as Base] : '#2a4030';
              return (
                <button
                  key={i}
                  onClick={() => isGap && !submitted && setActiveGap(i)}
                  disabled={!isGap || submitted}
                  className="flex-1 aspect-square rounded-lg flex items-center justify-center text-base font-bold transition-all"
                  style={{
                    background: isGap
                      ? isActive
                        ? `${baseColor}30`
                        : isCorrect
                          ? `${baseColor}25`
                          : isWrong
                            ? '#c9434325'
                            : placed
                              ? `${baseColor}20`
                              : '#0a1610'
                      : `${baseColor}15`,
                    border: `1.5px solid ${
                      isActive
                        ? '#c9a84c'
                        : isWrong
                          ? '#c94343'
                          : isCorrect
                            ? baseColor
                            : isGap
                              ? placed ? `${baseColor}80` : '#2a4030'
                              : `${baseColor}40`
                    }`,
                    color: isWrong ? '#c94343' : baseColor,
                    fontFamily: 'monospace',
                    boxShadow: isActive ? '0 0 12px #c9a84c40' : 'none',
                    cursor: isGap && !submitted ? 'pointer' : 'default',
                  }}
                >
                  {display}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[9px] mt-2 font-mono" style={{ color: '#5a7a5a' }}>
            <span>Position 1</span>
            <span>Read length: {SEQUENCE_LENGTH} bp</span>
            <span>Position {SEQUENCE_LENGTH}</span>
          </div>
        </div>

        {/* Base buttons or result */}
        {!submitted ? (
          <div className="px-5 pb-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {BASES.map(base => (
                <button
                  key={base}
                  onClick={() => placeBase(base)}
                  className="rounded-xl py-3 font-bold text-lg transition-all hover:scale-[1.05] active:scale-[0.97]"
                  style={{
                    background: `linear-gradient(135deg, ${BASE_COLORS[base]}30, ${BASE_COLORS[base]}10)`,
                    border: `1.5px solid ${BASE_COLORS[base]}80`,
                    color: BASE_COLORS[base],
                    fontFamily: 'monospace',
                    boxShadow: `0 0 12px ${BASE_COLORS[base]}25`,
                  }}
                >
                  {base}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onSkip}
                className="flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all"
                style={{
                  background: '#14231a',
                  border: '1px solid #2a4030',
                  color: '#5a7a5a',
                }}
              >
                Skip (no bonus)
              </button>
              <button
                onClick={handleSubmit}
                disabled={!allFilled}
                className="flex-[2] rounded-xl py-2.5 text-xs font-bold transition-all disabled:opacity-40"
                style={{
                  background: allFilled
                    ? 'linear-gradient(135deg, #2a5530, #1a3520)'
                    : '#14231a',
                  border: `1.5px solid ${allFilled ? '#4a8a4a' : '#2a4030'}`,
                  color: allFilled ? '#c9a84c' : '#5a7a5a',
                }}
              >
                {allFilled ? '🧬 Verify Sequence' : `Fill ${gaps.filter(g => guess[g] === null).length} more base${gaps.filter(g => guess[g] === null).length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-3">
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: bonusPct >= 30
                  ? 'linear-gradient(135deg, #1a3520, #0f1f15)'
                  : bonusPct > 0
                    ? 'linear-gradient(135deg, #2a2a1a, #14231a)'
                    : 'linear-gradient(135deg, #2a1a1a, #14231a)',
                border: `1.5px solid ${bonusPct >= 30 ? '#4a8a4a' : bonusPct > 0 ? '#c9a84c' : '#c94343'}60`,
              }}
            >
              <div className="text-[10px] tracking-widest font-bold mb-1" style={{ color: '#5a7a5a' }}>
                SEQUENCE ACCURACY
              </div>
              <div
                className="text-3xl font-bold mb-1"
                style={{
                  color: bonusPct >= 30 ? '#4a8a4a' : bonusPct > 0 ? '#c9a84c' : '#c94343',
                  fontFamily: 'Georgia, serif',
                }}
              >
                {result.correct}/{result.total}
              </div>
              <div className="text-xs" style={{ color: '#8aaa7a' }}>
                {Math.round(result.accuracy * 100)}% match
              </div>
              {bonusPct > 0 ? (
                <div
                  className="mt-3 inline-block px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: '#c9a84c20',
                    color: '#c9a84c',
                    border: '1px solid #c9a84c60',
                  }}
                >
                  +{bonusPct}% XP & credit bonus
                </div>
              ) : (
                <div className="mt-3 text-xs" style={{ color: '#8aaa7a' }}>
                  Accuracy too low — no bonus this time
                </div>
              )}
            </div>
            <button
              onClick={handleContinue}
              className="w-full rounded-xl py-3 font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #2a5530, #1a3520)',
                border: '1.5px solid #4a8a4a',
                color: '#c9a84c',
              }}
            >
              ✓ Confirm Identification
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
