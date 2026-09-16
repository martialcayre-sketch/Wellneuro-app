// La SOURCE d'un constat de sécurité, lisible depuis son identifiant.
//
// MODULE FEUILLE — il n'importe rien, et il ne porte que des libellés. C'est ce
// qui l'autorise à être lu par un composant client : `lib/clinical` est fermé au
// bundle du navigateur (`bundleClient.guard.test.ts`), et `safetyFindings.ts`
// importe la table signée, donc `crypto` et le référentiel entier.
//
// POURQUOI IL EXISTE. `review.safetyFindings` mélange DEUX producteurs : les
// signaux d'alerte déclarés à l'anamnèse ([[D-099]]) et les signalements d'effet
// indésirable rattachés à un protocole ([[D-101]]). Ils inhibent la décision de
// la même façon, mais ils n'appellent pas le même geste — la lettre d'adressage
// ([[D-218]]) ne sait écrire que les premiers. Offrir le geste sur un dossier qui
// ne porte que des seconds, c'était offrir un bouton dont la route répond 409.
//
// Le préfixe EST le contrat du producteur : il le compose ici, l'écran le lit
// ici, et une seule constante les tient ensemble.

/** Préfixe des constats issus des signaux d'alerte DÉCLARÉS à l'anamnèse. */
export const PREFIXE_FINDING_ANAMNESE = 'safety:anamnese:';

/** Préfixe des constats issus d'un signalement d'effet indésirable. */
export const PREFIXE_FINDING_EFFET_INDESIRABLE = 'safety:effet-indesirable:';

/**
 * `true` si ce constat vient d'un signal d'alerte déclaré à l'anamnèse.
 *
 * Un identifiant inconnu rend `false` : l'éligibilité au geste ne se PRÉSUME
 * pas. Un producteur neuf n'ouvre pas la lettre d'adressage par accident — il
 * vient s'inscrire ici, ou il reste hors du geste.
 */
export function estFindingAnamnese(findingId: unknown): boolean {
  return typeof findingId === 'string' && findingId.startsWith(PREFIXE_FINDING_ANAMNESE);
}
