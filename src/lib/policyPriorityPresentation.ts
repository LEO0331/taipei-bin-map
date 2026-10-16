import type { PriorityCategory } from './policyPriorityTypes';
import type { Language } from '../types';

export const PRIORITY_CATEGORY_LABELS: Record<PriorityCategory, [string, string]> = {
  tourism: ['觀光景點', 'Tourist attractions'],
  night_market: ['夜市／官方攤販集中場', 'Night markets / official vendor areas'],
  traditional_market: ['傳統市場', 'Traditional markets'],
  commercial: ['具空間證據的商圈', 'Spatially verified commercial districts'],
  mrt: ['捷運站參考位置', 'MRT station reference locations'],
  bus: ['公車站位參考位置', 'Bus reference locations'],
};
export const categoryLabel = (category: PriorityCategory, language: Language) => PRIORITY_CATEGORY_LABELS[category][language === 'zh' ? 0 : 1];
export const PRIORITY_LIMITATIONS = [
  'Category-balanced reference coverage is not persons served, waste reduction, demand prediction, or official policy effectiveness.',
  'Weights are explicit analytical scenario assumptions, not official Taipei coefficients or observed activity intensity.',
  'Missing categories do not represent zero demand; their weights are not redistributed.',
  'Reference places and candidate anchors are not approved installation sites; station centres are not entrances.',
  'Straight-line coverage ignores walking barriers, current operation and pedestrian accessibility.',
  'All candidate locations require current legal, jurisdictional, sidewalk, collection and field verification.',
  'The historical procedure stopped in 2022 is not enforced as current law; minimum separation is an analytical assumption.',
];
