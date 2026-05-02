import type { GameState } from '@/types/game';

export interface Buffs {
  xpMultiplier: number;
  creditMultiplier: number;
  staminaRegenMultiplier: number;
  maxStaminaBonus: number;
  rareChanceBonus: number; // additive, 0.03 = +3%
  legendaryChanceBonus: number;
  reagentSaveChance: number; // 0.20 = 20% chance to refund
  fuelRefundChance: number;
  collectStaminaCost: number; // 5 default, 3 with Master Tracker
}

export function computeBuffs(state: GameState): Buffs {
  const skills = new Set(state.unlockedSkills || []);
  const impact = state.impactFactor || 0;

  // Impact Factor: +10% XP and credits per point
  const impactXpMult = 1 + 0.1 * impact;
  const impactCreditMult = 1 + 0.1 * impact;

  // Biology branch — XP
  let biologyXp = 0;
  if (skills.has('biology-1')) biologyXp += 0.1;
  if (skills.has('biology-2')) biologyXp += 0.1; // cumulative = 0.2 at tier 2
  if (skills.has('biology-3')) biologyXp += 0.1;
  if (skills.has('biology-4')) biologyXp += 0.2;

  // Biology branch — rare/legendary chance
  let rareBonus = 0;
  let legendaryBonus = 0;
  if (skills.has('biology-3')) rareBonus += 0.03;
  if (skills.has('biology-4')) legendaryBonus += 0.06;

  // Lab branch — credits
  let labCredits = 0;
  if (skills.has('lab-1')) labCredits += 0.1;
  if (skills.has('lab-2')) labCredits += 0.1;

  // Lab branch — reagent save
  let reagentSave = 0;
  if (skills.has('lab-3')) reagentSave = 0.2;
  if (skills.has('lab-4')) reagentSave = 0.35;

  // Field branch
  let staminaRegen = 1;
  if (skills.has('field-1')) staminaRegen = 1.5;
  const maxStaminaBonus = skills.has('field-3') ? 25 : 0;
  const fuelRefund = skills.has('field-2') ? 0.3 : 0;
  const collectCost = skills.has('field-4') ? 3 : 5;

  return {
    xpMultiplier: (1 + biologyXp) * impactXpMult,
    creditMultiplier: (1 + labCredits) * impactCreditMult,
    staminaRegenMultiplier: staminaRegen,
    maxStaminaBonus,
    rareChanceBonus: rareBonus,
    legendaryChanceBonus: legendaryBonus,
    reagentSaveChance: reagentSave,
    fuelRefundChance: fuelRefund,
    collectStaminaCost: collectCost,
  };
}
