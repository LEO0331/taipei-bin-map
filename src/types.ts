export type Language = 'zh' | 'en';

export type FacilityType = 'pedestrian_bin' | 'dog_waste_bag_box' | 'public_toilet';

export type Facility = {
  id: string;
  type: FacilityType;
  district: string;
  address: string;
  road?: string;
  location?: string;
  longitude: number;
  latitude: number;
  note: string;
  source: string;
  isCoordinateOutlier?: boolean;
  name?: string;
  category?: string;
  manager?: string;
  totalSeats?: number;
  excellentGradeCount?: number;
  superiorGradeCount?: number;
  ordinaryGradeCount?: number;
  improvementGradeCount?: number;
  accessibleToiletSeats?: number;
  parentChildToiletSeats?: number;
};

export type FacilityWithDistance = Facility & {
  distanceMeters?: number;
};

export type ConversionSourceReport = {
  sourceFilename: string;
  totalRows: number;
  validRows: number;
  droppedRows: number;
  coordinateOutlierRows: number;
  invalidCoordinateRows: Array<{
    rowNumber: number;
    longitude?: string;
    latitude?: string;
  }>;
  missingRequiredFields: Array<{
    rowNumber: number;
    fields: string[];
  }>;
};

export type ConversionReport = {
  generatedAt: string;
  totalValidRows: number;
  sources: ConversionSourceReport[];
};
