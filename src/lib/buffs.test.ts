import { describe, it, expect } from 'vitest';
import { computeBuffs } from '@/lib/buffs';
import type { GameState } from '@/types/game';

const st = (unlockedSkills: string[], impactFactor = 0) =>
  ({ unlockedSkills, impactFactor } as unknown as GameState);

describe('computeBuffs', () => {
  it('is neutral with no skills and no impact', () => {
    const b = computeBuffs(st([]));
    expect(b.xpMultiplier).toBe(1);
    expect(b.creditMultiplier).toBe(1);
    expect(b.staminaRegenMultiplier).toBe(1);
    expect(b.maxStaminaBonus).toBe(0);
    expect(b.reagentSaveChance).toBe(0);
    expect(b.fuelRefundChance).toBe(0);
    expect(b.collectStaminaCost).toBe(5);
  });
  it('stacks biology XP and impact factor multiplicatively', () => {
    const b = computeBuffs(st(['biology-1', 'biology-2'], 2));
    expect(b.xpMultiplier).toBeCloseTo(1.2 * 1.2);
    expect(b.creditMultiplier).toBeCloseTo(1.2);
  });
  it('lab tier 4 overrides tier 3 reagent save; field skills apply', () => {
    const b = computeBuffs(st(['lab-3', 'lab-4', 'field-1', 'field-2', 'field-3', 'field-4']));
    expect(b.reagentSaveChance).toBe(0.35);
    expect(b.staminaRegenMultiplier).toBe(1.5);
    expect(b.fuelRefundChance).toBe(0.3);
    expect(b.maxStaminaBonus).toBe(25);
    expect(b.collectStaminaCost).toBe(3);
  });
});
