export type LifeEventCategory = "milestone" | "general" | "emergent" | "accident" | "historical";

export interface VintageAsset {
  id: string;
  name: string;
  icon: string;
  category: "toy" | "clothing" | "food" | "appliance" | "commemoration";
  yearAcquired: number;
  description: string;
  bonusText: string;
}

export interface EventOption {
  label: string;
  hint: string;
  resultDesc: string;
  effect: {
    health?: number;
    intelligence?: number;
    charm?: number;
    happiness?: number;
    cash?: number;
    affinityTarget?: string;
    affinityDelta?: number;
    affinityTargetSecond?: string;
    affinityDeltaSecond?: number;
    unlockAssetId?: string;
  };
}

export interface LifeEventDefinition {
  id: string;
  category: LifeEventCategory;
  minAge: number;
  maxAge: number;
  weight?: number;
  title: string;
  icon: string;
  narrative: string;
  options: EventOption[];
}
