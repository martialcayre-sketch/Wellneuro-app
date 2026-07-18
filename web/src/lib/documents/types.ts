// Domaine C3 — moteur de composition documentaire multi-destinataires (LOT-01).
//
// Frontière A2 : C3 NE POSSÈDE AUCUN CONTENU CLINIQUE SOURCE. Il compose des blocs
// déjà validés en amont (C1 snapshot/décision/protocole, C2 événements/revue,
// synthèse IA validée praticien). Ce module est un domaine PUR : types, fabriques
// et machine d'états, sans I/O ni Prisma (la couche route possède la persistance).
//
// V1 = option (a) SANS persistance : un document composite est recomposé à la
// demande ; sa version est le tuple des versions/hash de ses blocs sources
// (aucune nouvelle vérité clinique, aucune migration).

/** Origine d'un bloc source (frontière A2 : jamais produit par C3). */
export type SourceBloc =
  | 'c1_snapshot'
  | 'c1_review'
  | 'c1_decision'
  | 'c2_protocol'
  | 'c2_diffusion'
  | 'c2_checkin'
  | 'c2_trajectoire'
  | 'synthese_ia';

/**
 * Régime de contenu — jamais mélangés dans un rendu diffusé :
 * - `statique_valide` : contenu affichable sans IA ;
 * - `genere_ia` : exige la validation praticien de la source avant diffusion.
 */
export type RegimeBloc = 'statique_valide' | 'genere_ia';

/** Destinataires d'un rendu. La visibilité d'un bloc est déclarée par destinataire. */
export type Destinataire = 'patient' | 'medecin' | 'praticien';

/**
 * Statut d'une synthèse IA source (miroir des littéraux `SyntheseIA.statut`,
 * String libre non contraint côté base : la garde de régime vit donc EN CODE).
 */
export type StatutSyntheseSource =
  | 'Brouillon_IA'
  | 'Validee_Praticien'
  | 'Corrigee_Praticien'
  | 'Rejetee';

/** Statuts de synthèse validés praticien — seuls diffusables pour un bloc `genere_ia`. */
export const STATUTS_SYNTHESE_VALIDES: readonly StatutSyntheseSource[] = [
  'Validee_Praticien',
  'Corrigee_Praticien',
];

/**
 * Provenance d'un bloc : ancrée sur les hash/versions EXISTANTS des sources
 * (aucune nouvelle source de vérité). `ancrageHash` = `inputHash` C1/C2 ou, pour
 * la synthèse (pas d'`inputHash`), un ancrage dérivé de `versionPrompt`+date.
 */
export type ProvenanceBloc = {
  source: SourceBloc;
  ancrageHash: string;
  /** Version de contrat de la source (ex. `c1-protocol-draft-v1`, `synthese-v3`). */
  version: string;
  /** Renseigné pour un bloc `genere_ia` : statut de la synthèse source. */
  statutSource?: StatutSyntheseSource;
  /** Date de validation praticien (ISO), si applicable. */
  dateValidation?: string;
};

/** Type sémantique de contenu d'un bloc (colonne « sources » de la vue deux colonnes). */
export type TypeBloc =
  | 'donnee_declaree'
  | 'score_calcule'
  | 'decision_validee'
  | 'action_21j'
  | 'narratif'
  | 'vigilance'
  | 'note_praticien';

/**
 * Contenu d'un bloc, décliné PAR DESTINATAIRE (field-filter, pas row-filter).
 * `praticien` est toujours présent (rendu complet sourcé) ; `patient`/`medecin`
 * sont optionnels — leur absence signifie « non diffusé à ce destinataire ».
 * Le rendu patient ne doit JAMAIS puiser dans le champ `praticien`.
 */
export type ContenuBloc = {
  praticien: string;
  patient?: string;
  medecin?: string;
};

/** Un bloc composable : provenance, régime, contenu par destinataire. */
export type Bloc = {
  id: string;
  type: TypeBloc;
  regime: RegimeBloc;
  provenance: ProvenanceBloc;
  contenu: ContenuBloc;
};

/** États du document composite. Progression stricte, validation humaine obligatoire. */
export type EtatDocument = 'brouillon' | 'relu' | 'valide' | 'envoye';

/** Ordre canonique des états (une transition ne saute jamais d'étape). */
export const ORDRE_ETATS: readonly EtatDocument[] = ['brouillon', 'relu', 'valide', 'envoye'];

/**
 * Modèle documentaire = intention + liste ordonnée de types de blocs attendus.
 * Un modèle ne porte aucun contenu ; il décrit un assemblage.
 */
export type ModeleDocument = {
  id: string;
  titre: string;
  intention: string;
  typesBlocs: readonly TypeBloc[];
};

/** Version d'un bloc dans le tuple de version du document. */
export type VersionBloc = {
  id: string;
  source: SourceBloc;
  ancrageHash: string;
  version: string;
};

/**
 * Version d'un DocumentComposite (option (a)) : tuple des versions de blocs +
 * hash d'intégrité du tuple. Aucune ligne persistée : la version est dérivée.
 */
export type VersionDocument = {
  blocs: VersionBloc[];
  hash: string;
};

/** Document composite recomposé à la demande (V1 sans persistance). */
export type DocumentComposite = {
  modeleId: string;
  patientId: string;
  blocs: Bloc[];
  etat: EtatDocument;
  version: VersionDocument;
};
