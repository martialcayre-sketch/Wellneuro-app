import type { CibleExploration } from '@/lib/clinical/orientationEngine';

// ÉCARTEMENT PRATICIEN D'UNE PROPOSITION D'ORIENTATION — la lecture du fil.
//
// Module FEUILLE : aucun accès base, aucun import serveur. La route qui écrit et
// le service qui lit partagent donc exactement la même façon de nommer une cible
// et de déterminer l'état courant d'un fil — deux implémentations de ces deux
// règles-là divergeraient, et c'est l'écran qui mentirait. Même patron que
// `clinical-engine/rideauT0.ts` et `assignations/peremption.ts`.
//
// Contrat de la table : [[D-178]], `orientation_ecartements`.

/**
 * Nom canonique d'une cible EN BASE, et la conversion appartient à ce module.
 *
 * DEUX ORTHOGRAPHES EXISTENT, ET ELLES NE SONT PAS INTERCHANGEABLES. Le moteur
 * porte déjà une clé de cible — `cleCible`, privée à `orientationEngine.ts` —
 * qui s'écrit `q:<qid>` / `p:<packId>`. La base, elle, exige
 * `questionnaire:` / `pack:` par un CHECK de forme. Passer l'une pour l'autre
 * vaut un `23514` opaque.
 *
 * La forme LONGUE est canonique en base, délibérément : `cleCible` est une clé
 * de déduplication interne jamais persistée ni relue par un humain, alors que
 * `cible_id` est un enregistrement durable qu'un audit ouvre des mois plus tard.
 */
export function cleCibleEcartement(cible: CibleExploration): string {
  return cible.type === 'questionnaire'
    ? `questionnaire:${cible.questionnaireId}`
    : `pack:${cible.packId}`;
}

/** La forme que le CHECK de la base impose — répliquée pour refuser AVANT d'écrire. */
const FORME_CIBLE = /^(questionnaire|pack):[A-Za-z0-9_]+$/;

export function cibleBienFormee(cibleId: string): boolean {
  return FORME_CIBLE.test(cibleId);
}

export type EspeceGeste = 'ecartement' | 'reprise';

/** Une ligne du fil, telle que la base la rend. */
export type GesteEcartement = {
  id: string;
  cibleId: string;
  espece: EspeceGeste;
  /** Règles qui motivaient la ligne à l'instant du geste. Vide sur une reprise. */
  reglesAuGeste: string[];
  motif: string;
  parEmail: string;
  faitLe: string;
  supersedesEcartementId: string | null;
};

/**
 * Profondeur maximale de marche d'un fil.
 *
 * UN CYCLE RESTE REPRÉSENTABLE EN BASE, et c'est dit plutôt que supposé. Le
 * CHECK non réflexif ferme `A→A` ; un cycle de longueur 2 (`A→B, B→A`) passe
 * l'unicité de `supersedes_ecartement_id` puisque les deux valeurs diffèrent. Il
 * produit des lignes qu'aucune racine n'atteint — pas deux têtes —, mais une
 * marche sans borne y tournerait sans fin. La borne est donc ici, et elle est
 * large : un fil réel compte deux ou trois gestes.
 */
const PROFONDEUR_MAX_FIL = 64;

/**
 * La TÊTE du fil de chaque cible — la ligne qu'aucune autre ne supplante.
 *
 * JAMAIS PAR `max(faitLe)`, ET C'EST UNE RÈGLE, PAS UNE PRÉFÉRENCE. `fait_le`
 * vaut `CURRENT_TIMESTAMP` en base — horodatage de TRANSACTION — sur une colonne
 * `TIMESTAMP(3)` : deux lignes écrites dans la même transaction portent la MÊME
 * valeur, et deux transactions rapprochées peuvent partager la milliseconde. Un
 * tri par date élirait alors au hasard.
 *
 * Une cible dont le fil est cassé (cycle, ou `supersedes` pendouillant) rend
 * `null` plutôt qu'une tête devinée : un état qu'on ne sait pas lire ne se
 * présente pas comme un état connu (`DC-24`).
 */
export function teteDuFil(gestes: readonly GesteEcartement[]): GesteEcartement | null {
  if (gestes.length === 0) return null;
  const supplantes = new Set(
    gestes.map(g => g.supersedesEcartementId).filter((id): id is string => id !== null),
  );
  const tetes = gestes.filter(g => !supplantes.has(g.id));
  // Zéro tête = fil cassé (tout le monde est supplanté : cycle). Plus d'une =
  // deux fils concurrents, que l'index partiel de racine interdit — s'ils
  // existent, c'est que la garde a sauté, et on ne tranche pas à sa place.
  //
  // LA DIRECTION DE L'ÉCHEC EST CHOISIE : `null` fait retomber la cible en
  // « visible », donc la proposition RESTE AFFICHÉE. Sur un fil qu'on ne sait
  // pas lire, montrer est le seul défaut réparable — cacher ferait disparaître
  // une exploration clinique sans que personne ne l'ait demandé (`DC-24`,
  // `DC-30`). Le praticien verra une ligne qu'il croyait écartée, ce qui appelle
  // un signalement ; l'inverse ne s'appelle pas.
  if (tetes.length !== 1) return null;
  // Marche de contrôle : la tête doit REJOINDRE une racine en un nombre borné de
  // pas. Sans elle, une tête légitime posée au bout d'un fil cyclique passerait.
  let courant: GesteEcartement | undefined = tetes[0];
  const parId = new Map(gestes.map(g => [g.id, g]));
  for (let pas = 0; pas <= PROFONDEUR_MAX_FIL; pas += 1) {
    if (courant === undefined) return null;
    if (courant.supersedesEcartementId === null) return tetes[0];
    courant = parId.get(courant.supersedesEcartementId);
  }
  return null;
}

/** Les fils groupés par cible, chacun réduit à sa tête (ou absent si cassé). */
export function tetesParCible(
  gestes: readonly GesteEcartement[],
): Map<string, GesteEcartement> {
  const parCible = new Map<string, GesteEcartement[]>();
  for (const geste of gestes) {
    const fil = parCible.get(geste.cibleId);
    if (fil === undefined) parCible.set(geste.cibleId, [geste]);
    else fil.push(geste);
  }
  const tetes = new Map<string, GesteEcartement>();
  for (const [cibleId, fil] of parCible) {
    const tete = teteDuFil(fil);
    if (tete !== null) tetes.set(cibleId, tete);
  }
  return tetes;
}

/**
 * Verdict pour UNE cible, règles actuelles à l'appui.
 *
 * `ecartee` : la tête est un écartement, et aucune règle NOUVELLE ne la motive.
 * `reveillee` : la tête est un écartement, mais une règle ABSENTE de
 *   `reglesAuGeste` motive désormais la cible — la ligne revient, avec ses
 *   nouvelles règles nommées.
 * `visible` : aucun fil, ou la tête est une reprise.
 *
 * LE RÉVEIL EST CE QUI FAIT TENIR `DC-30`, et ce n'est pas décoratif.
 * L'écartement porte sur la CIBLE — le geste que le praticien fait réellement —
 * mais une même cible peut être motivée par des axes différents : le Cungi
 * (`Q_STR_03`) est proposé par `R2-STR-02` depuis l'axe stress ET par
 * `R-SOM-01` depuis l'axe sommeil. Sans réveil, écarter la ligne ferait taire un
 * axe qui n'a rien demandé — l'objection exacte qui fait renoncer à éteindre par
 * cible dans `stopRulesV1.ts` ([[D-053]] arbitrage 3).
 */
export type VerdictEcartement =
  | { etat: 'visible' }
  | { etat: 'ecartee'; geste: GesteEcartement }
  | { etat: 'reveillee'; geste: GesteEcartement; reglesNouvelles: string[] };

export function verdictPourCible(
  tete: GesteEcartement | undefined,
  reglesActuelles: readonly string[],
): VerdictEcartement {
  if (tete === undefined || tete.espece !== 'ecartement') return { etat: 'visible' };
  const figees = new Set(tete.reglesAuGeste);
  const nouvelles = [...new Set(reglesActuelles)].filter(regle => !figees.has(regle)).sort();
  if (nouvelles.length > 0) {
    return { etat: 'reveillee', geste: tete, reglesNouvelles: nouvelles };
  }
  return { etat: 'ecartee', geste: tete };
}

/** Borne du motif, répliquée du CHECK : refuser AVANT d'écrire, pas sur un 23514. */
export const MOTIF_LONGUEUR_MAX = 2000;

/**
 * Les blancs que cette fonction refuse — PLUS LARGE que le `btrim` de la base,
 * et c'est le point.
 *
 * `btrim("motif", E' \t\r\n')` ne connaît que quatre caractères. Un motif fait
 * d'une seule espace INSÉCABLE (`U+00A0`), d'une espace de largeur nulle
 * (`U+200B`) ou d'une espace idéographique (`U+3000`) passe donc le CHECK : la
 * base accepterait un écartement dont le motif s'affiche VIDE à l'écran, et le
 * repli montrerait « Écartée le … par … » suivi de rien. C'est l'écartement sans
 * motif écrit que [[D-178]] existe pour interdire, obtenu sans rien contourner.
 *
 * La garde ne peut pas vivre en base — ce lot n'ouvre pas de migration, et la
 * table est déjà appliquée en production. Elle vit donc ici, et elle refuse
 * DAVANTAGE que la base : c'est la seule divergence admise, dans ce sens-là.
 * `\s` de JavaScript couvre déjà `U+00A0`, `U+3000`, `U+000B`, `U+000C` et
 * `U+FEFF` ; les largeurs nulles et le joignant de mots sont ajoutés à la main,
 * `\s` ne les contenant pas.
 */
// Écrits en ÉCHAPPEMENTS, jamais en littéral : un `U+200B` posé tel quel dans ce
// fichier serait invisible à la relecture — exactement le caractère qu'on refuse.
const BLANCS_REFUSES = /[\s\u200b\u200c\u200d\u2060]+/g;

/**
 * Le motif écrit est-il recevable ?
 *
 * Deux divergences avec la base, toutes deux dans le sens sûr — refuser ici ce
 * qu'elle accepterait, jamais l'inverse : les blancs Unicode ci-dessus, et la
 * borne haute (`char_length` compte des CARACTÈRES, `String.length` des unités
 * UTF-16 — un motif riche en émojis est refusé un peu plus tôt qu'en base).
 *
 * L'inverse serait un vrai défaut : la route laisserait passer ce que la base
 * rejette, et le praticien recevrait un `23514` au lieu d'une phrase.
 */
export function motifRecevable(motif: unknown): motif is string {
  return typeof motif === 'string'
    && motif.replace(BLANCS_REFUSES, '').length > 0
    && motif.length <= MOTIF_LONGUEUR_MAX;
}

/**
 * Le motif tel qu'il doit être STOCKÉ : bords blancs retirés.
 *
 * La base stocke ce qu'on lui donne : `"\n\n  Déjà exploré."` s'afficherait tel
 * quel dans le repli, et deux motifs identiques à un saut de ligne près se
 * liraient comme deux textes différents à l'audit. Le milieu n'est pas touché —
 * un motif de deux paragraphes reste deux paragraphes.
 */
export function motifStockable(motif: string): string {
  return motif.replace(new RegExp(`^${BLANCS_REFUSES.source}|${BLANCS_REFUSES.source}$`, 'g'), '');
}
