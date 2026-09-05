import { describe, it, expect } from 'vitest';
import { speciesBarcode, gapIndices, scoreBarcode, barcodeBonusMultiplier } from '@/lib/barcode';

describe('speciesBarcode', () => {
  it('is deterministic for the same species id', () => {
    expect(speciesBarcode('tule-elk')).toEqual(speciesBarcode('tule-elk'));
  });
  it('returns the requested length of A/T/C/G bases', () => {
    const b = speciesBarcode('tule-elk', 12);
    expect(b).toHaveLength(12);
    for (const base of b) expect(['A', 'T', 'C', 'G']).toContain(base);
  });
  it('differs between species', () => {
    expect(speciesBarcode('tule-elk')).not.toEqual(speciesBarcode('island-fox'));
  });
});

describe('gapIndices', () => {
  it('returns the requested number of sorted unique indices within range', () => {
    const gaps = gapIndices('tule-elk', 8, 6);
    expect(gaps).toHaveLength(6);
    expect([...gaps].sort((a, b) => a - b)).toEqual(gaps);
    expect(new Set(gaps).size).toBe(6);
    for (const g of gaps) {
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThan(8);
    }
  });
  it('never asks for more gaps than positions', () => {
    expect(gapIndices('x', 4, 10)).toHaveLength(4);
  });
});

describe('scoreBarcode', () => {
  it('counts only gap positions', () => {
    const answer = ['A', 'T', 'C', 'G'] as const;
    const guess = ['A', 'A', 'C', null] as const;
    const r = scoreBarcode([...answer], [...guess], [0, 1, 3]);
    expect(r).toEqual({ correct: 1, total: 3, accuracy: 1 / 3 });
  });
});

describe('barcodeBonusMultiplier', () => {
  it('maps accuracy bands to bonus tiers', () => {
    expect(barcodeBonusMultiplier(1)).toBe(0.5);
    expect(barcodeBonusMultiplier(5 / 6)).toBe(0.3);
    expect(barcodeBonusMultiplier(4 / 6)).toBe(0.15);
    expect(barcodeBonusMultiplier(3 / 6)).toBe(0);
  });
});
