import { useMemo } from 'react';

interface DNABarcodeViewerProps {
  seed: string; // species id — used to deterministically generate a sequence
  gene: string;
  length: number;
  matchPercent?: number;
}

const BASES = ['A', 'T', 'C', 'G'] as const;
const BASE_COLORS: Record<string, string> = {
  A: '#4a8a4a', // green
  T: '#ef4444', // red
  C: '#60a5fa', // blue
  G: '#c9a84c', // gold
};

// Simple deterministic hash → PRNG
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSequence(seed: string, length: number): string[] {
  const rng = mulberry32(hashSeed(seed));
  const out: string[] = [];
  for (let i = 0; i < length; i++) {
    out.push(BASES[Math.floor(rng() * 4)]);
  }
  return out;
}

export default function DNABarcodeViewer({ seed, gene, length, matchPercent }: DNABarcodeViewerProps) {
  // Show ~120 bases with the rest truncated — enough to feel real
  const displayLength = Math.min(120, length);
  const sequence = useMemo(() => generateSequence(seed, displayLength), [seed, displayLength]);

  // Split into rows of 30 with position markers every 10
  const perRow = 30;
  const rows: string[][] = [];
  for (let i = 0; i < sequence.length; i += perRow) {
    rows.push(sequence.slice(i, i + perRow));
  }

  // Compute base frequencies for the mini histogram
  const freq: Record<string, number> = { A: 0, T: 0, C: 0, G: 0 };
  for (const b of sequence) freq[b]++;
  const gcContent = Math.round(((freq.G + freq.C) / sequence.length) * 100);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0a1610, #0c1a12)',
        border: '1px solid #1a3520',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ background: '#14231a', borderBottom: '1px solid #1a3520' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs">🧬</span>
          <span className="text-xs font-semibold tracking-wider" style={{ color: '#4a8a4a' }}>
            DNA BARCODE
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: '#5a7a5a' }}>
          <span>{gene}</span>
          <span>·</span>
          <span>{length} bp</span>
          {matchPercent !== undefined && (
            <>
              <span>·</span>
              <span style={{ color: '#c9a84c' }}>{matchPercent.toFixed(1)}%</span>
            </>
          )}
        </div>
      </div>

      {/* Sequence display */}
      <div className="p-3 font-mono text-[11px] leading-relaxed overflow-x-auto">
        {rows.map((row, rowIdx) => {
          const position = rowIdx * perRow + 1;
          return (
            <div key={rowIdx} className="flex items-center gap-2 whitespace-nowrap">
              <span className="inline-block w-10 text-right" style={{ color: '#2a4030' }}>
                {position}
              </span>
              <div className="flex">
                {row.map((base, i) => (
                  <span
                    key={i}
                    className="inline-block px-[2px]"
                    style={{
                      color: BASE_COLORS[base],
                      textShadow: `0 0 6px ${BASE_COLORS[base]}40`,
                    }}
                  >
                    {base}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {length > displayLength && (
          <div className="mt-2 text-[10px] text-center" style={{ color: '#2a4030' }}>
            ⋯ {length - displayLength} additional bases hidden ⋯
          </div>
        )}
      </div>

      {/* Footer: base frequencies */}
      <div
        className="px-3 py-2 flex items-center gap-3"
        style={{ background: '#0c1a12', borderTop: '1px solid #1a3520' }}
      >
        <div className="flex items-center gap-2 flex-1">
          {(['A', 'T', 'C', 'G'] as const).map(base => {
            const pct = (freq[base] / sequence.length) * 100;
            return (
              <div key={base} className="flex items-center gap-1">
                <span className="text-[10px] font-mono font-bold" style={{ color: BASE_COLORS[base] }}>
                  {base}
                </span>
                <div className="w-5 h-0.5 rounded-full" style={{ background: '#1a2e20' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: BASE_COLORS[base] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-[10px] font-mono" style={{ color: '#5a7a5a' }}>
          GC {gcContent}%
        </div>
      </div>
    </div>
  );
}
