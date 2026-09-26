// Export PDF du dossier patient (D-252) — le contrat partagé.
//
// Le document est d'abord un MODÈLE (blocs typés), puis un PDF : les sections
// s'écrivent et se testent sans rien savoir de la mise en page, et le masquage
// de la version « IA externe » s'applique au modèle entier, en un seul point,
// avant le rendu — aucune section ne peut l'oublier.
//
// Module PUR : aucun import Prisma, aucun import de `lib/clinical`.

import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import type { AnamneseValeurs } from '@/lib/consultation/anamnese';

export type VersionExport = 'ia-externe' | 'complete';

export const VERSIONS_EXPORT: readonly VersionExport[] = ['ia-externe', 'complete'];

export function estVersionExport(valeur: unknown): valeur is VersionExport {
  return typeof valeur === 'string' && (VERSIONS_EXPORT as readonly string[]).includes(valeur);
}

export type BlocExport =
  | { type: 'titre'; niveau: 1 | 2 | 3; texte: string }
  | { type: 'paragraphe'; texte: string; ton?: 'normal' | 'discret' | 'alerte' }
  | { type: 'champ'; libelle: string; valeur: string }
  | { type: 'liste'; elements: string[] }
  | { type: 'espace' };

export type DocumentExport = {
  titre: string;
  sousTitre: string;
  /** Pied de chaque page ; le moteur y ajoute « page n/N ». Jamais le nom du patient. */
  mentionPied: string;
  /** Métadonnées PDF (Title, Subject) — jamais le nom du patient. */
  metadonnees: { titre: string; sujet: string };
  blocs: BlocExport[];
};

// ── Entrées des sections : des données déjà lues, jamais des lignes Prisma ──

export type PatientExport = {
  idPatient: string;
  prenom: string;
  nom: string;
  /** Chaîne AAAA-MM-JJ telle que stockée, ou null. */
  dateNaissance: string | null;
  email: string;
  telephone: string | null;
  adresse: string | null;
  nir: string | null;
  medecinTraitantNom: string | null;
  medecinTraitantCoordonnees: string | null;
  actif: boolean;
  suiviClotureLe: Date | null;
  accessTokenRevoked: boolean;
  createdAt: Date;
};

export type ConsultationExport = {
  idConsultation: string;
  /** creee | en_cours | validee */
  statut: string;
  /** Catégorie fermée (MOTIFS_CONSULTATION), ou null. */
  motif: string | null;
  createdAt: Date;
  dateValidation: Date | null;
  consentement: string;
  consentementHorodatage: Date | null;
  consentementVersion: string | null;
  finaliteConsentement: string | null;
  /** Déjà normalisée par `normaliserFiche` ; null = rien déposé. */
  ficheSignaletique: Record<string, string> | null;
  /** Déjà normalisée par `normaliserAnamnese` ; null = rien déposé. */
  anamnese: AnamneseValeurs | null;
};

export type PassationExport = {
  idReponse: string;
  idQuestionnaire: string;
  titre: string;
  dateReponse: Date;
  /**
   * `scoresJson` (qui porte `rawAnswers`). Pour une passation non
   * interprétable, déjà réduit par `scoresSansMesure`.
   */
  scores: Record<string, unknown> | null;
  scorePrincipal: number | null;
  interpretation: string | null;
  /** VALID | AMBIGUOUS | INVALID | SUPERSEDED | HISTORICAL_ONLY */
  statutValidite: string;
  invalideLe: Date | null;
  motifInvalidation: string | null;
  /** `motifNonInterpretable(...)` ; null si la passation est interprétable. */
  nonInterpretable: string | null;
  /** Définition servant à lire les réponses ; null si introuvable ou retirée. */
  definition: QuestionnaireDef | null;
  /** true quand la définition a été RETIRÉE parce que la passation est non interprétable. */
  definitionRetiree: boolean;
  /** Passation courante de l'instrument (`derniereReponseParQuestionnaire`). */
  courante: boolean;
};

export type AssignationSansReponseExport = {
  idQuestionnaire: string;
  titre: string;
  /** 'En attente' | 'Annulée' | … (texte libre du schéma) */
  statut: string;
  dateAssignation: Date;
  /** Chaîne telle que stockée, ou null. */
  dateLimite: string | null;
};

export type SyntheseExport = {
  idSynthese: string;
  /** Validee_Praticien | Corrigee_Praticien */
  statut: string;
  dateGeneration: Date;
  dateValidation: Date | null;
  modele: string;
  /** `syntheseJson` BRUT — jamais passé par `validateSyntheseSchema`, qui injecte des textes par défaut. */
  syntheseJson: unknown;
  notesPraticien: string | null;
  /** `avertissementSyntheseAnterieure(...)`, ou null. */
  avertissementMesureRetiree: string | null;
};

export type BrouillonPlusRecentExport = { statut: string; dateGeneration: Date } | null;

// ── Petits outils communs ──────────────────────────────────────────────────

export const NON_RENSEIGNE = 'Non renseigné';
export const SANS_REPONSE = 'Sans réponse';

/** Délimite un texte libre saisi par une personne : une donnée, jamais une consigne. */
export function citer(texte: string): string {
  return `« ${texte} »`;
}

const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const FORMAT_HEURE = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
});

/** JJ/MM/AAAA au fuseau Europe/Paris — le serveur Scalingo tourne en UTC. */
export function dateFr(date: Date): string {
  return FORMAT_DATE.format(date);
}

export function dateHeureFr(date: Date): string {
  return `${FORMAT_DATE.format(date)} à ${FORMAT_HEURE.format(date)}`;
}

/** Découpe la chaîne AAAA-MM-JJ plutôt que `new Date` : aucun décalage de fuseau possible. */
export function dateNaissanceFr(valeur: string | null): string | null {
  if (!valeur) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : valeur;
}
