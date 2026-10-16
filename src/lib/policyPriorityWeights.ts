import { POLICY_CATEGORIES, type PriorityWeights } from './policyPriorityTypes';

export const WEIGHT_CONFIGURATION = 'policy-priority-weights-v1' as const;
export const WEIGHT_BOUNDS = Object.freeze({ min: 0, max: 10 });
export const DEFAULT_PRIORITY_WEIGHTS: Readonly<PriorityWeights> = Object.freeze({ tourism: 4, night_market: 4, traditional_market: 3, commercial: 3, mrt: 2, bus: 1 });
export const EQUAL_PRIORITY_WEIGHTS: Readonly<PriorityWeights> = Object.freeze({ tourism: 1, night_market: 1, traditional_market: 1, commercial: 1, mrt: 1, bus: 1 });
export const WEIGHT_ASSUMPTION = 'Relative analytical category priorities, not measured persons, waste volume, causal effects, or official policy coefficients.';

export function validatePriorityWeights(input: unknown): PriorityWeights {
  const weights = input as PriorityWeights;
  if (!weights || POLICY_CATEGORIES.some(key => typeof weights[key] !== 'number' || !Number.isFinite(weights[key]) || weights[key] < WEIGHT_BOUNDS.min || weights[key] > WEIGHT_BOUNDS.max)) throw new Error('Invalid policy weights: expected all six finite values within 0–10');
  return Object.fromEntries(POLICY_CATEGORIES.map(key => [key, weights[key]])) as PriorityWeights;
}
