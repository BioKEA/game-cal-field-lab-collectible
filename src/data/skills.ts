export type SkillBranch = 'field' | 'lab' | 'biology';

export interface Skill {
  id: string;
  branch: SkillBranch;
  tier: number; // 1-4
  title: string;
  icon: string;
  description: string;
  effect: string;
  cost: number; // research points
  prerequisite?: string; // previous skill in branch
}

export const SKILLS: Skill[] = [
  // === FIELD BRANCH (green — stamina/fuel) ===
  {
    id: 'field-1',
    branch: 'field',
    tier: 1,
    title: 'Trail Snacks',
    icon: '🥾',
    description: 'Light calories on the trail extend your day.',
    effect: '+50% stamina regen rate',
    cost: 1,
  },
  {
    id: 'field-2',
    branch: 'field',
    tier: 2,
    title: 'Fuel Logistics',
    icon: '⛽',
    description: 'Careful route planning saves fuel on return trips.',
    effect: '30% chance expeditions cost no fuel',
    cost: 2,
    prerequisite: 'field-1',
  },
  {
    id: 'field-3',
    branch: 'field',
    tier: 3,
    title: 'Endurance Training',
    icon: '💪',
    description: 'Regular conditioning keeps you in the field longer.',
    effect: '+25 max stamina',
    cost: 3,
    prerequisite: 'field-2',
  },
  {
    id: 'field-4',
    branch: 'field',
    tier: 4,
    title: 'Master Tracker',
    icon: '🧭',
    description: 'Years of experience make collection nearly free.',
    effect: 'Collection stamina cost halved',
    cost: 4,
    prerequisite: 'field-3',
  },

  // === LAB BRANCH (blue — reagents/credits) ===
  {
    id: 'lab-1',
    branch: 'lab',
    tier: 1,
    title: 'Bulk Reagents',
    icon: '🧪',
    description: 'You negotiate discounts on supplies.',
    effect: '+10% credits from identification',
    cost: 1,
  },
  {
    id: 'lab-2',
    branch: 'lab',
    tier: 2,
    title: 'Grant Writing',
    icon: '📝',
    description: 'Small grants fund additional equipment purchases.',
    effect: '+20% credits from identification',
    cost: 2,
    prerequisite: 'lab-1',
  },
  {
    id: 'lab-3',
    branch: 'lab',
    tier: 3,
    title: 'Reagent Recycling',
    icon: '♻️',
    description: 'Reclaim trace reagents from used protocols.',
    effect: '20% chance lab stages cost no reagent',
    cost: 3,
    prerequisite: 'lab-2',
  },
  {
    id: 'lab-4',
    branch: 'lab',
    tier: 4,
    title: 'Master Technician',
    icon: '🥼',
    description: 'Your protocols are the envy of the department.',
    effect: '35% chance lab stages cost no reagent',
    cost: 4,
    prerequisite: 'lab-3',
  },

  // === BIOLOGY BRANCH (gold — XP/rare finds) ===
  {
    id: 'biology-1',
    branch: 'biology',
    tier: 1,
    title: 'Field Guide Mastery',
    icon: '📖',
    description: 'Familiarity with local taxa speeds identification.',
    effect: '+10% XP from all sources',
    cost: 1,
  },
  {
    id: 'biology-2',
    branch: 'biology',
    tier: 2,
    title: 'Taxonomy Expert',
    icon: '🔬',
    description: 'Deep knowledge of order-level classification.',
    effect: '+20% XP from all sources',
    cost: 2,
    prerequisite: 'biology-1',
  },
  {
    id: 'biology-3',
    branch: 'biology',
    tier: 3,
    title: 'Rare Spotter',
    icon: '👁️',
    description: 'Trained eye for uncommon specimens in the field.',
    effect: '+30% XP · +3% rare spawn rate',
    cost: 3,
    prerequisite: 'biology-2',
  },
  {
    id: 'biology-4',
    branch: 'biology',
    tier: 4,
    title: 'Legendary Tracker',
    icon: '✨',
    description: 'You find the unfindable. Published in Nature three times.',
    effect: '+50% XP · +6% legendary spawn rate',
    cost: 5,
    prerequisite: 'biology-3',
  },
];

export const BRANCH_INFO: Record<SkillBranch, { name: string; accent: string; description: string; icon: string }> = {
  field: {
    name: 'Fieldwork',
    accent: '#4a8a4a',
    description: 'Endurance, fuel, and stamina in the field.',
    icon: '🌿',
  },
  lab: {
    name: 'Laboratory',
    accent: '#60a5fa',
    description: 'Reagent efficiency and research funding.',
    icon: '🔬',
  },
  biology: {
    name: 'Biology',
    accent: '#c9a84c',
    description: 'Taxonomic knowledge and rare-species instincts.',
    icon: '🧬',
  },
};

export function getSkillById(id: string): Skill | undefined {
  return SKILLS.find(s => s.id === id);
}

export function canUnlockSkill(skill: Skill, unlockedSkills: string[], researchPoints: number): boolean {
  if (unlockedSkills.includes(skill.id)) return false;
  if (researchPoints < skill.cost) return false;
  if (skill.prerequisite && !unlockedSkills.includes(skill.prerequisite)) return false;
  return true;
}
