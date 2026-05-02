import type { RegionId } from '@/types/game';

export interface RegionMilestone {
  id: string;
  regionId: RegionId;
  threshold: number; // catalog percent (0.25 = 25%)
  title: string;
  description: string;
  emoji: string;
  reward: {
    xp: number;
    credits: number;
    researchPoints: number;
    maxFuel?: number;
  };
}

function milestones(regionId: RegionId, regionName: string): RegionMilestone[] {
  return [
    {
      id: `${regionId}-25`,
      regionId,
      threshold: 0.25,
      title: `${regionName} Scout`,
      description: `Catalog 25% of ${regionName} species`,
      emoji: '🥉',
      reward: { xp: 200, credits: 500, researchPoints: 1, maxFuel: 1 },
    },
    {
      id: `${regionId}-50`,
      regionId,
      threshold: 0.50,
      title: `${regionName} Surveyor`,
      description: `Catalog 50% of ${regionName} species`,
      emoji: '🥈',
      reward: { xp: 500, credits: 1000, researchPoints: 2 },
    },
    {
      id: `${regionId}-75`,
      regionId,
      threshold: 0.75,
      title: `${regionName} Expert`,
      description: `Catalog 75% of ${regionName} species`,
      emoji: '🥇',
      reward: { xp: 1000, credits: 2000, researchPoints: 3, maxFuel: 1 },
    },
    {
      id: `${regionId}-100`,
      regionId,
      threshold: 1.0,
      title: `${regionName} Master`,
      description: `Catalog 100% of ${regionName} species`,
      emoji: '⭐',
      reward: { xp: 2500, credits: 5000, researchPoints: 5 },
    },
  ];
}

export const REGION_MILESTONES: RegionMilestone[] = [
  ...milestones('marin-county', 'Marin County'),
  ...milestones('redwood-coast', 'Redwood Coast'),
  ...milestones('sierra-nevada', 'Sierra Nevada'),
  ...milestones('mojave-desert', 'Mojave Desert'),
  ...milestones('channel-islands', 'Channel Islands'),
];

export function getMilestonesForRegion(regionId: RegionId): RegionMilestone[] {
  return REGION_MILESTONES.filter(m => m.regionId === regionId);
}

export function getNextMilestone(regionId: RegionId, currentPct: number): RegionMilestone | null {
  const regionMilestones = getMilestonesForRegion(regionId);
  return regionMilestones.find(m => currentPct < m.threshold) ?? null;
}

export function getEarnedMilestones(regionId: RegionId, currentPct: number): RegionMilestone[] {
  return getMilestonesForRegion(regionId).filter(m => currentPct >= m.threshold);
}
