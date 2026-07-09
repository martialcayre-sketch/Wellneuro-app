export type CertificationSource = 'drive' | 'historique' | 'externe' | 'non_certifie';

export type CertificationStatus = 'certifie' | 'ambigu' | 'a_verifier' | 'non_score';

export type ScoreCertification = {
  source: CertificationSource;
  status: CertificationStatus;
};

export type ScoreInterpretation = {
  label: string;
  color?: string;
  detail?: string;
  protocol?: string;
};

export type ScoreSubScore = {
  id: string;
  label: string;
  total: number | null;
  max?: number;
  interpretation?: ScoreInterpretation | null;
};

export type ScoreResultBase = {
  type: string;
  total?: number | null;
  maxTotal?: number | null;
  interpretation?: ScoreInterpretation | null;
  subScores?: ScoreSubScore[];
  missing?: number;
  missingIds?: string[];
  notApplicable?: string[];
  note?: string | null;
  certification?: ScoreCertification | null;
};
