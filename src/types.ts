export type Language = 'zh' | 'en';

export type Bin = {
  id: string;
  district: string;
  address: string;
  longitude: number;
  latitude: number;
  note: string;
};

export type BinWithDistance = Bin & {
  distanceMeters?: number;
};
