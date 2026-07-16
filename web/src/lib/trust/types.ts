/**
 * TRUST V1 — types du cadre d'information patient (LOT-01).
 * Sous-ensemble exécuté du contrat de campagne
 * (docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/
 * CONTRATS_DONNEES_ET_EVENEMENTS.md). Les objets différés (délégations,
 * CommunicationEvent, cycle de vie du compte) sont documentés dans
 * MATRICE_FRONTIERES_TRUST.md — ne pas les ajouter ici sans lot dédié.
 */

/** Clés des documents d'information normatifs (registre en code). */
export type TrustDocumentKey =
  | 'cadre_accompagnement'
  | 'limites_securite'
  | 'donnees_confidentialite'
  | 'usage_ia'
  | 'droits_patient'
  | 'consentement_suivi';

export type TrustDocumentType =
  | 'care_framework'
  | 'medical_safety'
  | 'privacy'
  | 'ai_transparency'
  | 'patient_rights';

export type NiveauChangement =
  | 'editorial'
  | 'clarification'
  | 'information_substantielle'
  | 'nouvelle_finalite_facultative'
  | 'evenement_securite';

export type SectionDocument = {
  titre: string;
  paragraphes: string[];
  /** Points listés après les paragraphes (rendu en liste). */
  points?: string[];
};

/** Une version publiée est immuable : toute évolution = nouvelle version. */
export type VersionDocumentTrust = {
  key: TrustDocumentKey;
  type: TrustDocumentType;
  version: string;
  titre: string;
  resume: string;
  sections: SectionDocument[];
  changeLevel: NiveauChangement;
  changeSummary: string;
  publieLe: string;
  requiresAcknowledgement: boolean;
  /** SHA-256 canonique de { key, version, titre, resume, sections } —
   * verrouillé par test (lib/trust/contenus/registre.test.ts). */
  hash: string;
};

/** Accusé de lecture : « j'ai pris connaissance », jamais « j'autorise ». */
export type TypeAccuse = 'presente' | 'pris_connaissance';

/** Finalités réellement facultatives proposées en V1. */
export type FinaliteChoix =
  | 'partage_medecin_traitant'
  | 'communications_non_essentielles';

export type StatutChoix = 'accorde' | 'refuse' | 'retire';

export type ChoixEvenement = {
  finalite: FinaliteChoix;
  statut: StatutChoix;
  enregistreLe: string;
  documentVersion: string;
};

/** Sévérité d'un effet indésirable telle que déclarée par le patient. */
export type SeveriteDeclaree = 'legere' | 'moderee' | 'severe' | 'incertaine';

export type OrientationEI =
  | 'urgence_conseillee'
  | 'contact_medical_conseille'
  | 'revue_praticien';

export type ActionPriseDeclaree = 'aucune' | 'reduit' | 'arrete' | 'ne_sait_pas';

export type CategorieIncidentConfidentialite =
  | 'connexion_non_reconnue'
  | 'document_dun_autre_patient'
  | 'information_incorrecte'
  | 'appareil_perdu'
  | 'partage_incorrect'
  | 'autre';

export type TypeDemandeDroit =
  | 'acces'
  | 'rectification'
  | 'effacement'
  | 'limitation'
  | 'opposition'
  | 'portabilite'
  | 'retrait_choix'
  | 'information';

/** Statuts de traitement côté praticien — jamais de suppression. */
export type StatutTraitementSignalement =
  | 'recu'
  | 'en_cours'
  | 'traite'
  | 'clos';
