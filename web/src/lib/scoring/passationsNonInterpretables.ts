// « La suspension ferme le robinet, pas le réservoir. » C'est la réserve écrite
// au changelog du lot précédent (2026-07-27, #406), et c'est ce fichier qui la
// ferme. `actif: false` empêche d'ENVOYER encore un instrument ; il ne dit rien
// des passations DÉJÀ enregistrées, qui continuent d'alimenter la fiche
// praticien et le prompt de synthèse avec une lecture que ce même lot a
// déclarée invalide.
//
// Mesuré en production le 2026-07-27 : 4 passations de `Q_SOM_07`, sur
// 3 patients, **toutes** porteuses d'un `scorePrincipal` et d'une
// `interpretation`. Elles ne se contredisent pas seulement avec leur source,
// elles se contredisent **entre elles** — un total de 31 y est enregistré
// « Fatigue multidimensionnelle sévère » (forme héritée, clés `GF`/`AM`/
// `global`) quand un total de 33 est enregistré « Fatigue dans les limites
// normales » (bandes /80 actuelles). Deux formats coexistent, leurs lectures
// s'inversent, et rien à l'écran ne le signale.
//
// ── Pourquoi un registre séparé, et pas `IDS_SUSPENDUS` ──────────────────────
//
// Pour exactement la raison qui a fait écarter `IDS_ASSIGNABLES` comme garde au
// lot précédent : deux ensembles voisins ne disent pas la même chose. `actif:
// false` est une décision d'ENVOI, et elle peut tenir à n'importe quel motif —
// `Q_FIB_03` (ELFE) est inactif depuis toujours parce qu'il n'a jamais été
// déployé, non parce que ses résultats seraient faux. Ses passations, s'il en
// existait, seraient parfaitement lisibles. Ici on nomme exactement les
// instruments dont le RÉSULTAT ENREGISTRÉ ne peut pas être lu comme une mesure.
//
// L'inclusion ne vaut donc que dans un sens : tout instrument listé ici est
// suspendu, jamais l'inverse. `passationsNonInterpretables.guard.test.ts`
// vérifie ce sens-là — et lui seul.
//
// ── Le piège de la réactivation, et comment il a été désarmé ─────────────────
//
// Cette table était indexée par identifiant d'instrument, pas par passation.
// Elle portait donc en elle-même l'avertissement suivant : si `Q_SOM_07` est un
// jour reconstruit depuis sa source et réactivé, ses NOUVELLES passations
// seraient marquées à tort. Le garde tenait la porte — il exigeait que tout
// instrument listé ici soit `actif: false` — mais il la tenait FERMÉE : il
// interdisait la réactivation au lieu de la rendre possible.
//
// Le 2026-07-31, le MFI-20 a été reconstruit. Il fallait donc trancher pour de
// bon, et c'est une DATE qui le fait : chaque entrée porte la date à partir de
// laquelle le servi a cessé d'être fautif. Une passation ANTÉRIEURE reste non
// interprétable — ce qui a été calculé sur l'ancienne grille l'a été, et le
// redater ne le corrigerait pas ; une passation POSTÉRIEURE est une mesure
// ordinaire.
//
// FRONTIÈRE FERMÉE, jamais ouverte : une passation dont la date est absente ou
// illisible est traitée comme ANTÉRIEURE, donc marquée. Se tromper dans ce
// sens-là affiche « interprétation retirée » sur une mesure saine — visible, et
// corrigible d'un regard. Se tromper dans l'autre servirait au praticien un
// score qui n'en est pas un, en silence. Ce n'est pas le même prix.
//
// `reconstruitLe` reste facultatif : une entrée sans date se comporte comme
// avant — marquée pour toujours, et le garde exige alors que l'instrument soit
// suspendu.
type EntreeNonInterpretable = {
  motif: string;
  /** Date de mise en service du servi corrigé. Les passations enregistrées à
   *  partir de ce jour-là sont des mesures ordinaires. */
  reconstruitLe?: Date;
};

const MOTIF_Q_SOM_07 =
  "L'instrument servi sous ce nom n'était pas le MFI-20 publié : échelle d'accord 1→5 " +
  'servie en fréquence 0→4, aucune des 10 inversions appliquée, 5 sous-échelles ' +
  'servies en 2 sections, et 3 bandes sur /80 alors que la source indique qu\'il ' +
  "n'existe pas de barème d'interprétation. Le total et la bande enregistrés ne " +
  'sont donc pas une mesure de fatigue. L\'instrument a été reconstruit depuis sa ' +
  'source le 2026-07-31 ; cette mention ne vise que les passations antérieures.';

export const MOTIFS_PASSATION_NON_INTERPRETABLE: ReadonlyMap<string, EntreeNonInterpretable> = new Map([
  ['Q_SOM_07', { motif: MOTIF_Q_SOM_07, reconstruitLe: new Date('2026-07-31T00:00:00.000Z') }],
]);

/**
 * Motif pour lequel le résultat enregistré d'une passation ne peut pas être lu
 * comme une mesure — `null` si elle n'est pas concernée.
 *
 * `dateReponse` est la date de la PASSATION, pas celle du jour. L'omettre fait
 * retomber sur la frontière fermée décrite plus haut : la passation est traitée
 * comme antérieure, donc marquée.
 */
export function motifNonInterpretable(
  idQuestionnaire: string | null | undefined,
  dateReponse?: Date | string | null,
): string | null {
  if (!idQuestionnaire) return null;
  const entree = MOTIFS_PASSATION_NON_INTERPRETABLE.get(idQuestionnaire);
  if (!entree) return null;
  if (!entree.reconstruitLe) return entree.motif;
  if (dateReponse === undefined || dateReponse === null) return entree.motif;
  const le = dateReponse instanceof Date ? dateReponse : new Date(dateReponse);
  if (Number.isNaN(le.getTime())) return entree.motif;
  return le < entree.reconstruitLe ? entree.motif : null;
}

// Phrase courte, affichable telle quelle à la place du score. Le motif long
// ci-dessus reste disponible pour l'infobulle et pour le prompt.
export const ETIQUETTE_NON_INTERPRETABLE = 'Interprétation retirée';

// ── Synthèses rédigées AVANT le retrait ─────────────────────────────────────
//
// Fermer la génération future ne dit rien des synthèses déjà en base. Mesuré en
// production le 2026-07-27 : les 3 patients concernés en portent 3, **toutes
// validées** (2 `Validee_Praticien`, 1 `Corrigee_Praticien`) — donc expédiables
// — dont 2 mentionnent explicitement « MFI ». Elles sont la seule source des
// documents patient et médecin : `lib/documents/depuisSynthese.ts` ne lit que
// `SyntheseIA`, jamais les passations.
//
// Le critère est la DATE, pas la version de prompt. Les versions en base sont
// `v1`, `synthese-v3`, `synthese-v4` et `synthese-praticien-v1` ; cette
// dernière est portée par les synthèses rédigées à la main, avant comme après
// ce lot, et ne permet donc pas de trancher. Une date le permet, pour les deux
// origines à la fois.
//
// Arbitrage assumé : si la mise en production glisse d'un jour, une synthèse
// fraîchement générée — donc saine — peut porter la mention une journée de
// trop. Ce faux positif se lève en régénérant ; le faux négatif inverse
// laisserait partir au patient une conclusion tirée d'une mesure retirée.
export const RETRAIT_EN_SERVICE_LE = new Date('2026-07-28T00:00:00.000Z');

export const AVERTISSEMENT_SYNTHESE_ANTERIEURE =
  'Cette synthèse a été rédigée avant le retrait de l’interprétation d’un des ' +
  'questionnaires du dossier : elle a pu s’appuyer sur une mesure qui n’en était ' +
  'pas une. La régénérer produit un texte qui n’en tient plus compte.';

/**
 * Avertissement à porter sur une synthèse — `null` si elle est hors de cause.
 *
 * Deux conditions, et les deux comptent : le dossier porte au moins une
 * passation non interprétable, ET la synthèse est antérieure au retrait. Sans
 * la première, tous les dossiers seraient marqués ; sans la seconde, la mention
 * ne s'effacerait jamais et l'on apprendrait à ne plus la lire.
 */
export function avertissementSyntheseAnterieure(
  idsQuestionnairesDuDossier: readonly string[],
  dateGeneration: Date | string,
): string | null {
  if (!idsQuestionnairesDuDossier.some(id => motifNonInterpretable(id) !== null)) return null;
  const le = dateGeneration instanceof Date ? dateGeneration : new Date(dateGeneration);
  if (Number.isNaN(le.getTime())) return null;
  return le < RETRAIT_EN_SERVICE_LE ? AVERTISSEMENT_SYNTHESE_ANTERIEURE : null;
}

/**
 * Ce qui subsiste des `scoresJson` d'une passation non interprétable : les
 * **réponses brutes du patient**, et rien d'autre.
 *
 * Liste blanche à dessein, et non liste noire des clés interprétatives. Les
 * formes de scoring varient d'un moteur à l'autre — les 4 passations de
 * `Q_SOM_07` en base en portent déjà deux (`{type, total, maxTotal, note,
 * interpretation, certification, rawAnswers}` et l'héritée `{GF, AM, global}`)
 * — et une liste noire ne couvre que les clés qu'on a pensé à y écrire. Le
 * total d'une somme sans inversion d'items n'est pas plus une mesure que la
 * bande qu'on en tire : les deux partent.
 *
 * Ce que le patient a effectivement répondu, en revanche, reste vrai : ce sont
 * ses réponses à des items, pas la lecture qu'on en a faite. Les conserver est
 * ce qui distingue « marquer » d'« effacer », et c'est ce qui permettra de
 * rescorer si l'instrument est un jour reconstruit depuis sa source.
 *
 * Réserve mesurée, à ne pas généraliser : sur les 4 passations de `Q_SOM_07` en
 * production, **3 portent 20 réponses brutes et la quatrième n'en porte
 * aucune** — la ligne du 2026-06-15, de forme héritée, n'a pas même la clé.
 * Celle-là n'est donc pas rescorable, quoi qu'il advienne de l'instrument, et
 * l'écran affichera « Réponses brutes non disponibles ». « Les réponses restent »
 * vaut pour ce qui a été enregistré, pas pour ce qui ne l'a jamais été.
 *
 * `null` est traité comme l'absence : livrer `{ rawAnswers: null }` annoncerait
 * une clé sans contenu, que chaque consommateur devrait revalider.
 */
export function scoresSansMesure(scores: unknown): Record<string, unknown> {
  if (scores === null || typeof scores !== 'object' || Array.isArray(scores)) return {};
  const rawAnswers = (scores as Record<string, unknown>).rawAnswers;
  return rawAnswers === undefined || rawAnswers === null ? {} : { rawAnswers };
}
