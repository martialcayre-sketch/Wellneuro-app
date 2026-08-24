import { LONGUEUR_MAX_POINT } from '@/lib/synthese-praticien';
import type { ContradictionFinding } from './contradictionFinding';

/**
 * Scinde une ligne de vigilance trop longue PAR POSITION — [[D-107]], dette
 * nommée par [[D-104]].
 *
 * LE DÉFAUT QU'ELLE FERME. Le découpage en deux lignes suffisait aux règles de
 * contradiction ; il ne suffit plus aux CONFLITS, dont la phrase est COMPOSÉE
 * (deux claims cités, leur opposition, les quatre axes non comparés). Mesuré :
 * la description de `CS-BIO-01` fait à elle seule **569** caractères, pour un
 * plafond de `LONGUEUR_MAX_POINT`. Sans effet aujourd'hui — les conflits
 * n'atteignent que le cockpit, qui ne plafonne rien — mais le jour où un conflit
 * alimenterait la synthèse, l'enregistrement d'un brouillon praticien serait
 * refusé avec un message qui ne nomme pas la cause. C'est le précédent exact de
 * C-STR (730 caractères, scindée en 411 + 326).
 *
 * SCINDER, JAMAIS RACCOURCIR. Le texte d'un conflit est une donnée SIGNÉE
 * (`shaPerimetre` le couvre) : le tronquer ou le résumer changerait un contenu
 * clinique pour tenir dans un gabarit d'affichage (`DC-19`). On coupe donc aux
 * FINS DE PHRASE, et à défaut entre deux mots — jamais au milieu de l'un.
 *
 * LA BORNE DE LA GARANTIE, mesurée par la contre-revue adverse du 2026-08-24
 * ([[D-108]]). Les deux propriétés ci-dessus — « jamais au milieu d'un mot » et
 * « chaque morceau sous le plafond » — sont INCOMPATIBLES dès qu'un seul mot
 * dépasse à lui seul `LONGUEUR_MAX_POINT`. Vérifié : `scinderSousPlafond` rend
 * alors ce mot SEUL, hors plafond, plutôt que de le couper.
 *
 * C'EST LE BON ARBITRAGE, et il est délibéré : couper un mot de 500 caractères
 * en deux fabriquerait deux mots qui n'existent pas dans un texte SIGNÉ, là où
 * un morceau trop long ne fait que refuser un enregistrement — bruyamment, et
 * sans avoir rien altéré (`DC-19`). Un banc l'épingle désormais au lieu de le
 * laisser se découvrir en production.
 *
 * Aucun conflit publié n'en approche : le plus long mot du registre est très
 * loin du plafond, et le cas ne se rencontre que sur une URL ou un identifiant
 * collé. La garantie tenable est donc : « aucun mot coupé, et aucun morceau
 * hors plafond SAUF un mot qui dépassait déjà seul ».
 *
 * CHAQUE MORCEAU GARDE SON MARQUEUR `[regleId]`. `documents/depuisSynthese.ts`
 * reconnaît les vigilances déterministes à ce marqueur : un morceau qui le
 * perdrait cesserait d'être reconnu comme tel au milieu d'une phrase.
 *
 * MODULE FEUILLE, et c'est une propriété : `contradictionsService.ts` instancie
 * Prisma au chargement. Y loger cette fonction pure aurait obligé tout banc qui
 * la mesure à provisionner une base — le voisin exact que
 * `claimsEpinglesFraicheur.guard.test.ts` nomme déjà.
 */
export function scinderSousPlafond(ligne: string, regleId: string): string[] {
  if (ligne.length <= LONGUEUR_MAX_POINT) return [ligne];

  const suite = `[${regleId}] (suite) `;
  const morceauxBruts = ligne.split(/(?<=\.)\s+/).flatMap(phrase =>
    phrase.length <= LONGUEUR_MAX_POINT - suite.length ? [phrase] : phrase.split(/\s+/),
  );

  const lignes: string[] = [];
  let courant = '';
  for (const morceau of morceauxBruts) {
    const prefixe = lignes.length === 0 ? '' : suite;
    const candidat = courant ? `${courant} ${morceau}` : `${prefixe}${morceau}`;
    if (candidat.length <= LONGUEUR_MAX_POINT) {
      courant = candidat;
      continue;
    }
    if (courant) lignes.push(courant);
    courant = `${suite}${morceau}`;
  }
  if (courant) lignes.push(courant);
  return lignes;
}

/**
 * Intitulé par FORME. « Discordance entre instruments » était appliqué aux
 * trois formes : un `CONFLIT_SOURCES`, qui oppose des claims et non des
 * passations, aurait été servi sous une étiquette fausse. Ce sont des libellés,
 * pas du contenu clinique — la phrase du déterministe suit, intacte.
 */
const INTITULE_PAR_FORME: Record<ContradictionFinding['forme'], string> = {
  DISCORDANCE: 'Discordance entre instruments constatée par le déterministe',
  CONFLIT_SOURCES: 'Conflit entre sources constaté par le déterministe',
  CONVERGENCE: 'Convergence constatée par le déterministe',
};

/**
 * Une ligne de vigilance, EXPLICABLE.
 *
 * `limitations` et `regleId` ne sont pas décoratifs, et les omettre reproduisait
 * l'amputation que la revue du cockpit avait déjà fait corriger une fois. Sans
 * les limitations, le praticien ne sait pas ce que le constat NE dit pas — pour
 * C-STR, « la discordance dit qu'ils ne concordent pas, jamais lequel a raison »
 * (`DC-25`, `DC-28`), et il tranchera en faveur d'un instrument. Sans le
 * `regleId`, il n'a aucun moyen de nommer la règle qu'il conteste : un faux
 * positif devient irremontable (`DC-34`, `DC-35`).
 *
 * Les passations datées restent au cockpit, où elles s'ouvrent — arbitrage 2 de
 * [[D-057]], inchangé.
 *
 * DEUX POINTS AU MOINS, ET AUTANT QUE NÉCESSAIRE. Constat et limitations réunis
 * atteignaient 730 caractères pour C-STR : scindés en deux, ils font 411 et 326.
 * Cela ne suffit plus aux CONFLITS, dont la description composée dépasse le
 * plafond À ELLE SEULE (569 pour `CS-BIO-01`) — d'où `scinderSousPlafond`,
 * appliqué aux deux points ([[D-107]]).
 *
 * DÉPLACÉE ICI DEPUIS `contradictionsService.ts` par le LOT-11, et c'est le
 * point : ce module-là instancie Prisma au chargement, donc un banc qui mesure
 * ces lignes devait provisionner une base — ou bien les recomposer lui-même,
 * c'est-à-dire mesurer une autre phrase que celle réellement servie.
 */
export function lignesDeVigilance(constat: ContradictionFinding): string[] {
  const lignes = scinderSousPlafond(
    `${INTITULE_PAR_FORME[constat.forme]} [${constat.regleId}] : `
    + `${constat.description} ${constat.actionSuggeree}`,
    constat.regleId,
  );
  if (constat.limitations.length > 0) {
    lignes.push(...scinderSousPlafond(
      `Ce que le constat [${constat.regleId}] ne dit pas : ${constat.limitations.join(' ')}`,
      constat.regleId,
    ));
  }
  return lignes;
}
