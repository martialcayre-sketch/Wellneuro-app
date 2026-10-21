/**
 * LE TEXTE DES MINEURS SERVI AU JEUNE — G-11 (H38), texte 2B ; ACT-5 (H78).
 *
 * Texte validé tel quel par le responsable le 2026-10-14 (#1441), mot pour mot :
 * `docs/claude/propositions/2026-10-14-g11-textes-patient/README.md`, « 2B — Pour
 * le jeune ». Il ne change plus sans nouvelle validation ; le banc le compare à
 * cette source. Seules les apostrophes sont typographiques ici.
 *
 * SERVI À UN SEUL CAS : un dossier ouvert dont la date de naissance dit moins de
 * 18 ans (`statutAge === 'mineur'`, D-284 §4). Jamais à un majeur, jamais à un
 * dossier sans date — celui-là se voit d'abord demander sa date. L'écran ne
 * décide rien : la pause des questionnaires et de la biologie reste celle des
 * routes (`gardeAge.ts`).
 *
 * LE TEXTE 2A (au titulaire de l'autorité parentale) N'EST PAS SERVI : il décrit
 * une validation en ligne par un titulaire, qui n'existe qu'avec J3-mineurs
 * (H79), et aucun parent n'a accès au portail. Arbitrage du 2026-10-21 : 2B seul
 * à ACT-5, 2A avec J3-mineurs (un texte dit ce qui a lieu).
 *
 * Module pur, sans dépendance Node : lu par un composant client.
 */

export type SectionTexteMineur = Readonly<{
  titre: string;
  texte: string;
  /** Numéros du texte rendus appelables (`tel:`), sans changer un mot. */
  numerosAppelables?: readonly string[];
}>;

export const TEXTE_MINEUR_JEUNE: readonly SectionTexteMineur[] = Object.freeze([
  Object.freeze({
    titre: 'Avant 18 ans, un parent donne d’abord son accord',
    texte:
      'Ton accompagnement commence quand l’un de tes parents, ou la personne qui exerce l’autorité parentale, a donné son accord. D’ici là, les questionnaires attendent.',
  }),
  Object.freeze({
    titre: 'Ton avis compte',
    texte:
      'Le praticien t’explique ce qu’il propose, et tu peux poser toutes tes questions. Tu peux aussi dire ce que tu ne veux pas.',
  }),
  Object.freeze({
    titre: 'Ce n’est pas secret pour tes parents',
    texte: 'Tes parents peuvent demander à savoir ce que contient ton dossier.',
  }),
  Object.freeze({
    titre: 'En cas d’urgence',
    texte:
      'Si tu te sens en danger ou très mal, n’attends pas de réponse ici : appelle le 15 ou le 112. Si quelque chose t’inquiète à la maison ou ailleurs, tu peux aussi appeler le 119 (Allô enfance en danger), gratuit, jour et nuit.',
    numerosAppelables: Object.freeze(['15', '112', '119']),
  }),
]);

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
