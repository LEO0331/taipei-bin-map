import { ACTIVE_POLICY_CATEGORIES, type PriorityCategory } from './policyPriorityTypes';
import type { Language } from '../types';

export const PRIORITY_CATEGORY_LABELS: Record<PriorityCategory, [string, string]> = {
  tourism: ['觀光景點', 'Tourist attractions'],
  night_market: ['夜市／官方攤販集中場', 'Night markets / official vendor areas'],
  traditional_market: ['傳統市場', 'Traditional markets'],
  commercial: ['具空間證據的商圈', 'Spatially verified commercial districts'],
  mrt: ['捷運站參考位置', 'MRT station reference locations'],
  bus: ['公車站位參考位置', 'Bus reference locations'],
};
export const ACTIVE_POLICY_CATEGORY_LABELS = Object.fromEntries(ACTIVE_POLICY_CATEGORIES.map(category => [
  category, category === 'night_market' ? ['官方攤販集中場參考位置', 'Official vendor concentration references'] : PRIORITY_CATEGORY_LABELS[category],
])) as Record<typeof ACTIVE_POLICY_CATEGORIES[number], [string, string]>;
export function categoryLabel(category: PriorityCategory, language: Language, version: 1 | 2 = 1) {
  const index = language === 'zh' ? 0 : 1;
  if (version === 1) return PRIORITY_CATEGORY_LABELS[category][index];
  if (category === 'tourism') throw new Error('Retired tourism category does not have an active label');
  return ACTIVE_POLICY_CATEGORY_LABELS[category][index];
}
export const PRIORITY_LIMITATIONS = [
  'Category-balanced reference coverage is not persons served, waste reduction, demand prediction, or official policy effectiveness.',
  'Weights are explicit analytical scenario assumptions, not official Taipei coefficients or observed activity intensity.',
  'Missing categories do not represent zero demand; their weights are not redistributed.',
  'Reference places and candidate anchors are not approved installation sites; station centres are not entrances.',
  'Straight-line coverage ignores walking barriers, current operation and pedestrian accessibility.',
  'All candidate locations require current legal, jurisdictional, sidewalk, collection and field verification.',
  'The historical procedure stopped in 2022 is not enforced as current law; minimum separation is an analytical assumption.',
];
export const ACTIVE_PRIORITY_LIMITATIONS = [
  ...PRIORITY_LIMITATIONS,
  'Tourism was intentionally retired from this research scope; this does not imply zero tourism demand or redistribute the retired weight.',
];
