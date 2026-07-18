export type PatientFoodCompassSafeView = {
  foodRef: string;
  foodLabel: string;
  qualitativeSummary: string;
  reasons: string[];
  sourceLabel: string;
  limitations: string[];
  alternative: string | null;
};
