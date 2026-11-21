/**
 * LE TEXTE DES MINEURS SERVI AU JEUNE — G-11 (H38), texte 2B ; ACT-5 (H78) ;
 * réécrit par [[D-537]] §7.
 *
 * Texte validé tel quel par le responsable le 2026-11-17, mot pour mot :
 * `docs/claude/propositions/2026-11-17-texte-2b-neuf/README.md`. Il remplace le
 * 2B validé le 2026-10-14, qui disait encore « l'un de tes parents » et « Ce
 * n'est pas secret pour tes parents » (contraires à D-537 §1 et §2). Il ne
 * change plus sans nouvelle validation ; le banc compare chaque variante à
 * cette source. Seules les apostrophes sont typographiques ici.
 *
 * DEUX VARIANTES, UNE SEULE SECTION DIFFÈRE : la première. Moins de 15 ans,
 * aucun circuit d'admission (D-537 §4) ; 15 à 17 ans, le circuit à venir est
 * annoncé sans être promis. Les quatre sections suivantes sont communes.
 *
 * SERVI À UN SEUL CAS : un dossier ouvert dont la date de naissance dit moins de
 * 18 ans (`statutAge === 'mineur'`, D-284 §4). Jamais à un majeur, jamais à un
 * dossier sans date — celui-là se voit d'abord demander sa date. L'écran ne
 * décide rien : la pause des questionnaires et de la biologie reste celle des
 * routes (`gardeAge.ts`). Une tranche inconnue sert la variante des moins de
 * 15 ans, qui n'annonce aucune ouverture.
 *
 * LE TEXTE 2A (au titulaire de l'autorité parentale) N'EST PAS SERVI : il décrit
 * une validation en ligne par un titulaire, qui n'existe qu'avec J3-mineurs
 * (H79), et aucun parent n'a accès au portail. Arbitrage du 2026-10-21 : 2B seul
 * à ACT-5, 2A avec J3-mineurs (un texte dit ce qui a lieu).
 *
 * Module pur, sans dépendance Node : lu par un composant client.
 */

import type { TrancheMineur } from './gardeAge';

export type SectionTexteMineur = Readonly<{
  titre: string;
  texte: string;
  /** Numéros du texte rendus appelables (`tel:`), sans changer un mot. */
  numerosAppelables?: readonly string[];
}>;

const ENTREE_MOINS_15: SectionTexteMineur = Object.freeze({
  titre: 'Avant 15 ans, l’accompagnement ne se fait pas ici',
  texte:
    'Pour l’instant, cet espace n’accompagne pas les personnes de moins de 15 ans. Les questionnaires restent en pause. Tu peux en parler avec le praticien.',
});

const ENTREE_15_17: SectionTexteMineur = Object.freeze({
  titre: 'Avant 18 ans, ton accompagnement attend encore',
  texte:
    'Pour l’instant, l’accompagnement ne s’ouvre pas encore ici avant 18 ans, et les questionnaires restent en pause. Quand il s’ouvrira, il faudra l’accord des personnes qui exercent l’autorité parentale sur toi (le plus souvent tes deux parents), et le tien aussi. Tu pourras ensuite retirer ton accord quand tu veux.',
});

/** L'encart d'urgence, seul servi aussi au mineur dont le dossier est clos. */
export const SECTION_URGENCE_MINEUR: SectionTexteMineur = Object.freeze({
  titre: 'En cas d’urgence',
  texte:
    'Si tu te sens en danger ou très mal, n’attends pas de réponse ici : appelle le 15 ou le 112. Si quelque chose t’inquiète à la maison ou ailleurs, tu peux aussi appeler le 119 (Allô enfance en danger), gratuit, jour et nuit.',
  numerosAppelables: Object.freeze(['15', '112', '119']),
});

const SUITE_COMMUNE: readonly SectionTexteMineur[] = Object.freeze([
  Object.freeze({
    titre: 'Ton avis compte',
    texte:
      'Le praticien t’explique ce qu’il propose, et tu peux poser toutes tes questions. Tu peux aussi dire ce que tu ne veux pas.',
  }),
  Object.freeze({
    titre: 'Ce que tes parents peuvent savoir',
    texte:
      'Tes parents peuvent demander des informations sur ton dossier. Le praticien examine chaque demande, en tenant compte de ton âge, de ta vie privée et de ton intérêt. Wellneuro ne leur ouvre pas d’accès à cet espace. Personne ne peut te promettre que tout restera secret, ni que tout leur sera montré.',
  }),
  Object.freeze({
    titre: 'L’intelligence artificielle',
    texte:
      'Pendant l’accompagnement, certains documents sont préparés avec l’aide d’un outil d’intelligence artificielle, à partir de tes réponses. Le praticien relit chaque document avant qu’il te parvienne. Même quand ton nom est masqué, ce qui reste parle de ta santé : masquer ne rend pas anonyme.',
  }),
  SECTION_URGENCE_MINEUR,
]);

export const TEXTE_MINEUR_MOINS_15: readonly SectionTexteMineur[] = Object.freeze([
  ENTREE_MOINS_15,
  ...SUITE_COMMUNE,
]);

export const TEXTE_MINEUR_15_17: readonly SectionTexteMineur[] = Object.freeze([
  ENTREE_15_17,
  ...SUITE_COMMUNE,
]);

/** La variante servie : celle des 15-17 ans à ce seul cas, sinon celle des moins de 15 ans. */
export function texteMineurJeune(tranche: TrancheMineur | null | undefined): readonly SectionTexteMineur[] {
  return tranche === '15_17' ? TEXTE_MINEUR_15_17 : TEXTE_MINEUR_MOINS_15;
}

/**
 * Découpe un texte en morceaux, chaque numéro appelable isolé, sans rien
 * ajouter ni retirer : la concaténation des morceaux rend le texte d'origine.
 * Un numéro n'est reconnu qu'entier (« 15 » ne se lit pas dans « 150 ») : on
 * lit chaque nombre en entier, et seuls ceux de la liste deviennent appelables.
 * Pas de lookbehind : Safari ne le comprend qu'à partir de 16.4, et ce module
 * est rendu sur le téléphone du patient.
 */
export function decouperNumeros(
  texte: string,
  numeros: readonly string[] = [],
): { morceau: string; numero: boolean }[] {
  const appelables = new Set(numeros);
  const morceaux: { morceau: string; numero: boolean }[] = [];
  let curseur = 0;
  for (const m of texte.matchAll(/\d+/g)) {
    if (!appelables.has(m[0])) continue;
    const debut = m.index ?? 0;
    if (debut > curseur) morceaux.push({ morceau: texte.slice(curseur, debut), numero: false });
    morceaux.push({ morceau: m[0], numero: true });
    curseur = debut + m[0].length;
  }
  if (curseur < texte.length) morceaux.push({ morceau: texte.slice(curseur), numero: false });
  return morceaux;
}
