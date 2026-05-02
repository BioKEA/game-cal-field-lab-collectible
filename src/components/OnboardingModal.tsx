import { useState } from 'react';

interface OnboardingStep {
  emoji: string;
  title: string;
  body: string;
}

const STEPS: OnboardingStep[] = [
  {
    emoji: '🧬',
    title: 'Welcome to BioKEA',
    body: 'You\'re joining the BioKEA biodiversity project — a survey of California\'s coastal ecosystems using DNA barcoding. Your job: find species, extract their DNA, identify them.',
  },
  {
    emoji: '🌿',
    title: 'Field Expeditions',
    body: 'Head out to biomes like Stinson Beach and Muir Woods. Pick a collection point, choose your sampling method, and gather specimens. Each expedition costs fuel and each collection costs stamina.',
  },
  {
    emoji: '🔬',
    title: 'The Laboratory',
    body: 'Back at the lab, run specimens through the full DNA workflow: extraction → PCR → qPCR → sequencing. Each stage needs reagents. The final stage reveals the species.',
  },
  {
    emoji: '📖',
    title: 'Your Catalog Grows',
    body: 'Every new species joins your catalog with its DNA barcode, habitat, fun facts, and collection history. Chase rarer species for bigger rewards.',
  },
  {
    emoji: '📜',
    title: 'Missions Guide You',
    body: 'Research missions give you structured goals and generous rewards. Daily challenges refresh each day for extra XP and credits. Good luck out there, researcher.',
  },
];

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,22,16,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden animate-modal-in"
        style={{
          background: 'linear-gradient(180deg, #14231a, #0f1f15)',
          border: '1.5px solid #c9a84c60',
          boxShadow: '0 20px 80px rgba(0,0,0,0.8), 0 0 40px #c9a84c20',
        }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-5 pb-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all"
              style={{
                width: i === stepIdx ? '20px' : '6px',
                background: i === stepIdx ? '#c9a84c' : i < stepIdx ? '#4a8a4a' : '#2a4030',
              }}
            />
          ))}
        </div>

        <div className="px-6 pb-6 pt-3 text-center">
          {/* Emoji */}
          <div
            key={stepIdx}
            className="text-6xl mb-4 inline-block animate-icon-in"
            style={{ filter: 'drop-shadow(0 0 20px #c9a84c40)' }}
          >
            {step.emoji}
          </div>

          {/* Title */}
          <div
            className="text-xl font-bold mb-3"
            style={{ color: '#e8e4d8', fontFamily: 'Georgia, serif' }}
          >
            {step.title}
          </div>

          {/* Body */}
          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: '#a8c4a0', fontFamily: "'Outfit', sans-serif" }}
          >
            {step.body}
          </p>

          {/* Buttons */}
          <div className="flex gap-2">
            {stepIdx > 0 && (
              <button
                onClick={() => setStepIdx(s => s - 1)}
                className="flex-1 rounded-xl p-3 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: '#0c1a12',
                  border: '1px solid #2a4030',
                  color: '#8aaa7a',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) onComplete();
                else setStepIdx(s => s + 1);
              }}
              className="flex-1 rounded-xl p-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #c9a84c, #8a7030)',
                color: '#0f1f15',
                boxShadow: '0 2px 12px #c9a84c40',
              }}
            >
              {isLast ? "Let's Go" : 'Next'}
            </button>
          </div>

          {!isLast && (
            <button
              onClick={onComplete}
              className="mt-3 text-xs transition-colors"
              style={{ color: '#5a7a5a' }}
            >
              Skip tutorial
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-modal-in {
          animation: modalIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes iconIn {
          0% { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          60% { transform: scale(1.1) rotate(3deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        .animate-icon-in {
          animation: iconIn 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }
      `}</style>
    </div>
  );
}
