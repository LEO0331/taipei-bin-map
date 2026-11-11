import { priorityCategories, type ActivePriorityCategory, type PriorityContract, type PriorityWeights } from './policyPriorityTypes';

export const WEIGHT_CONFIGURATION = 'policy-priority-weights-v1' as const;
export const ACTIVE_WEIGHT_CONFIGURATION = 'policy-priority-weights-v2' as const;
export const WEIGHT_BOUNDS = Object.freeze({ min: 0, max: 10 });
export const ACTIVE_DEFAULT_PRIORITY_WEIGHTS: Readonly<Record<ActivePriorityCategory, number>> = Object.freeze({ night_market: 4, traditional_market: 3, commercial: 3, mrt: 2, bus: 1 });
const ACTIVE_EQUAL_PRIORITY_WEIGHTS = Object.freeze({ night_market: 1, traditional_market: 1, commercial: 1, mrt: 1, bus: 1 });
export const DEFAULT_PRIORITY_WEIGHTS: Readonly<Required<PriorityWeights>> = Object.freeze({ tourism: 4, ...ACTIVE_DEFAULT_PRIORITY_WEIGHTS });
export const EQUAL_PRIORITY_WEIGHTS: Readonly<Required<PriorityWeights>> = Object.freeze({ tourism: 1, ...ACTIVE_EQUAL_PRIORITY_WEIGHTS });
export const defaultPriorityWeights = (version: PriorityContract): Readonly<PriorityWeights> =>
  version === 2 ? ACTIVE_DEFAULT_PRIORITY_WEIGHTS : DEFAULT_PRIORITY_WEIGHTS;
export const equalPriorityWeights = (version: PriorityContract): Readonly<PriorityWeights> =>
  version === 2 ? ACTIVE_EQUAL_PRIORITY_WEIGHTS : EQUAL_PRIORITY_WEIGHTS;
export const priorityWeightConfiguration = (version: PriorityContract) => version === 2 ? ACTIVE_WEIGHT_CONFIGURATION : WEIGHT_CONFIGURATION;
export const WEIGHT_ASSUMPTION = 'Relative analytical category priorities, not measured persons, waste volume, causal effects, or official policy coefficients.';

export function validatePriorityWeights(input: unknown, version: PriorityContract = 1): PriorityWeights {
  const categories = priorityCategories(version);
  const weights = input as Record<string, unknown>;
  if (!weights || typeof weights !== 'object' || (version === 2 && Object.keys(weights).length !== categories.length) || categories.some(key => {
    const value = weights[key];
    return !Object.prototype.hasOwnProperty.call(weights, key) || typeof value !== 'number' || !Number.isFinite(value) || value < WEIGHT_BOUNDS.min || value > WEIGHT_BOUNDS.max;
  })) throw new Error(`Invalid policy weights: expected ${categories.length} finite category values within 0–10`);
  return Object.fromEntries(categories.map(key => [key, weights[key]])) as PriorityWeights;
}
