import { ageAnnees } from './age';

/**
 * LA GARDE D'ÂGE DU PORTAIL — D-284 §3 et §4, lot (h).
 *
 * Un dossier sans date de naissance se voit demander sa date à la prochaine
 * connexion ; tant qu'elle manque, ses QUESTIONNAIRES et sa BIOLOGIE sont en
 * pause. Dès qu'elle est donnée, tout se rouvre si le patient est majeur.
 * Jusqu'à 18 ans, le dossier est celui d'un mineur : son circuit (validation
 * par un titulaire de l'autorité parentale, lot (i)) n'existe pas encore, et la
 * pause CONTINUE — fail-closed — jusqu'à ce qu'il existe.
 *
 * Périmètre arbitré par le responsable le 2026-10-14 : questionnaires (agendas
 * compris) et biologie, rien d'autre. Le suivi du protocole, l'alliance, le
 * signalement d'un effet indésirable et les demandes de droits restent ouverts.
 *
 * Point unique de décision, sur le patron d'`accepteNouvelEnvoi` : appelé par
 * les ROUTES, jamais seulement par l'écran (#181).
 *
 * Le module ne lit aucune horloge : l'instant est fourni par l'appelant, comme
 * pour `ageAnnees`.
 */

/** Seuil juridique d'âge (D-284 §4) — pas un seuil clinique. */
export const AGE_MAJORITE = 18;

export type StatutAge = 'date_manquante' | 'mineur' | 'majeur';

/**
 * UNE DATE ILLISIBLE VAUT UNE DATE MANQUANTE. `ageAnnees` rend `null` pour une
 * chaîne vide, hors format, irréelle (`2026-02-31`) ou future : aucune de ces
 * valeurs ne permet de dire que le patient est majeur, et la lui redemander est
 * le seul geste qui sorte de l'impasse.
 */
export function statutAge(dateNaissance: string | null | undefined, maintenantMs: number): StatutAge {
  const age = ageAnnees(dateNaissance, maintenantMs);
  if (age === null) return 'date_manquante';
  return age >= AGE_MAJORITE ? 'majeur' : 'mineur';
}

/** Questionnaires et biologie ne s'ouvrent qu'à un patient majeur. */
export function accepteSaisieSante(statut: StatutAge): boolean {
  return statut === 'majeur';
}

export const RAISON_DATE_NAISSANCE_REQUISE = 'date_naissance_requise';
export const RAISON_CIRCUIT_MINEUR = 'circuit_mineur_requis';

/** Les deux raisons d'un refus de la pause d'âge, typées pour les contrats de route. */
export type RaisonRefusAge = typeof RAISON_DATE_NAISSANCE_REQUISE | typeof RAISON_CIRCUIT_MINEUR;

/** Le refus opposé au patient. Une seule formulation par cas, un seul endroit. */
export const MESSAGE_DATE_NAISSANCE_REQUISE =
  'Votre date de naissance est nécessaire avant de continuer. Indiquez-la sur la page d’accueil de votre espace.';
export const MESSAGE_CIRCUIT_MINEUR =
  'Votre praticien reprendra contact avec vous avant la suite de votre accompagnement.';

/** Le refus à renvoyer par une route gardée, ou `null` si la saisie est ouverte. */
export function refusSaisieSante(
  statut: StatutAge,
): { reason: RaisonRefusAge; error: string } | null {
  if (statut === 'majeur') return null;
  return statut === 'mineur'
    ? { reason: RAISON_CIRCUIT_MINEUR, error: MESSAGE_CIRCUIT_MINEUR }
    : { reason: RAISON_DATE_NAISSANCE_REQUISE, error: MESSAGE_DATE_NAISSANCE_REQUISE };
}
