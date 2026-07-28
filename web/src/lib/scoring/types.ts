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
  /**
   * Conduite clinique. N'est PLUS émis ici depuis le 2026-07-26 — il sort sous
   * `ScoreResultBase.conduite`. Le champ reste déclaré parce que les réponses
   * enregistrées avant cette date le portent toujours, et que la fiche
   * praticien continue de les afficher.
   */
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
  /**
   * Découpage descriptif d'un total unique (scoring `sum`). À la différence de
   * `subScores`, une dimension ne porte pas d'interprétation propre et ne
   * remplace jamais le score global : elle le détaille.
   */
  dimensions?: ScoreSubScore[];
  /** Sous-scores SERVIS à un besoin de Mon équilibre — lus par `BESOIN_SOURCES`.
   *  Distincts de `dimensions` (profil affiché) et de `subScores` (que la fiche
   *  patient substituerait au total). */
  scoresBesoins?: ScoreSubScore[];
  /**
   * Conduite clinique associée à la bande atteinte — « ce qu'il faut faire »,
   * séparé de « ce que vaut la mesure ». Sorti de `interpretation` le
   * 2026-07-26 : un moteur de scoring mesure, il ne prescrit pas.
   */
  conduite?: string;
  missing?: number;
  missingIds?: string[];
  notApplicable?: string[];
  note?: string | null;
  certification?: ScoreCertification | null;
};
