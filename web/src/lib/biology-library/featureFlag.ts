// Deux flags DISTINCTS pour le rayon biologie fonctionnelle (décision A du
// cadrage CB), et non un seul à deux paliers. Le premier ouvre l'étage
// documentaire ; le second, et lui seul, ouvrirait le stockage de résultats
// biologiques patient — donnée de santé, interdite tant que l'hébergement
// n'est pas certifié HDS.
//
// Voir docs/claude/propositions/2026-07-25-rayon-biologie-fonctionnelle/
// (§2 « Verrou HDS — modèle à deux étages »).

/**
 * Étage 1 — documentaire : catalogue d'analyses, plages, bilans, propositions
 * d'exploration. Aucune valeur biologique patient n'existe derrière ce flag.
 *
 * Fail-closed : seule la chaîne exacte « true » active, comme WN_C4_ENABLED.
 * Une variable absente, vide, « 1 » ou « TRUE » laisse le rayon fermé — une
 * faute de frappe dans un panneau Vercel n'ouvre rien par accident.
 */
export function isCbEnabled(value = process.env.WN_CB_ENABLED): boolean {
  return value === 'true';
}

const MESSAGE_CB_DESACTIVE =
  "Le rayon biologie fonctionnelle n'est pas encore ouvert sur cet environnement. Son activation métier se fait via le flag WN_CB_ENABLED.";

/** Message de repli du rayon documentaire, patron C4 (`getC4DisabledMessage`). */
export function getCbDisabledMessage(): string {
  return MESSAGE_CB_DESACTIVE;
}

/**
 * Étage 1 bis — PROPOSITION DE BILAN servie au praticien ([[D-071]] §1).
 *
 * Drapeau NEUF et éteint, et non `WN_CB_ENABLED` : celui-ci vaut DÉJÀ `true`
 * en production ([[D-070]]). S'y adosser rendrait la proposition visible sur
 * tous les dossiers du cabinet dès le déploiement, sans qu'aucun geste
 * d'exploitation ne l'ait décidé — l'exact symétrique de ce que `D-070` vient
 * de constater. Écarté aussi : `WN_CB_RESULTS_ENABLED`, gate dur HDS ; une
 * surface documentaire ne s'adosse pas au verrou de stockage des résultats,
 * sinon les deux s'ouvriraient ensemble le jour venu.
 *
 * Exige les DEUX flags, comme l'étage résultats : la proposition est un étage
 * du rayon biologie, pas une voie parallèle qui s'ouvrirait sur un rayon
 * fermé.
 */
export function isCbPropositionEnabled(
  value = process.env.WN_CB_PROPOSITION,
  valueRayon = process.env.WN_CB_ENABLED,
): boolean {
  return isCbEnabled(valueRayon) && value === 'true';
}

/**
 * Étage 2 — résultats biologiques réels (saisie, import, boucle estimé ↔
 * mesuré). GATE DUR HDS : ne doit jamais passer à true avant l'attestation
 * d'hébergement de données de santé.
 *
 * Exige les DEUX flags : l'étage résultats ne peut pas s'ouvrir sur un rayon
 * fermé. C'est délibérément plus strict que « un flag par étage » — il faut
 * deux variables justes pour stocker une donnée de santé, jamais une seule.
 * Aucun appelant à ce jour : la fonction existe pour que le lot CB-09 trouve
 * le verrou déjà écrit et testé, plutôt que de l'inventer sous pression.
 */
export function isCbResultsEnabled(
  value = process.env.WN_CB_RESULTS_ENABLED,
  valueRayon = process.env.WN_CB_ENABLED,
): boolean {
  return isCbEnabled(valueRayon) && value === 'true';
}
