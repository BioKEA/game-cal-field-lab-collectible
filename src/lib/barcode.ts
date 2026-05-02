// Deterministic barcode generation for a species ID.
// Uses FNV-1a hash so the same species always yields the same barcode.

const BASES = ['A', 'T', 'C', 'G'] as const;
export type Base = typeof BASES[number];

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Deterministic pseudo-random sequence from a seed string.
// Returns `length` bases (A/T/C/G) — the "true" barcode answer.
export function speciesBarcode(speciesId: string, length = 8): Base[] {
  let hash = fnv1a(speciesId);
  const result: Base[] = [];
  for (let i = 0; i < length; i++) {
    hash = Math.imul(hash ^ i, 0x01000193) >>> 0;
    result.push(BASES[hash & 3]);
  }
  return result;
}

// Which positions the player must fill in. Always 6 gaps by default.
export function gapIndices(speciesId: string, length = 8, gaps = 6): number[] {
  let hash = fnv1a(speciesId + ':gaps');
  const pool: number[] = [];
  for (let i = 0; i < length; i++) pool.push(i);
  // Fisher-Yates with deterministic seed
  for (let i = pool.length - 1; i > 0; i--) {
    hash = Math.imul(hash ^ i, 0x01000193) >>> 0;
    const j = hash % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(gaps, length)).sort((a, b) => a - b);
}

// Scoring: fraction of gaps correctly filled.
export function scoreBarcode(answer: Base[], guess: (Base | null)[], gaps: number[]): {
  correct: number;
  total: number;
  accuracy: number;
} {
  let correct = 0;
  for (const g of gaps) {
    if (guess[g] && guess[g] === answer[g]) correct++;
  }
  return { correct, total: gaps.length, accuracy: correct / gaps.length };
}

// Map accuracy → XP bonus multiplier (added on top of base XP).
// 100% = +50%, 83% (5/6) = +30%, 67% (4/6) = +15%, else 0.
export function barcodeBonusMultiplier(accuracy: number): number {
  if (accuracy >= 0.99) return 0.5;
  if (accuracy >= 0.82) return 0.3;
  if (accuracy >= 0.66) return 0.15;
  return 0;
}
