import type { ContradictionClaimRef, ResolutionContradiction } from './contradictionFinding';

// Politique de résolution d'un conflit entre sources — `DC-54`, LOT-06 de la
// campagne « Doctrine exécutable » ([[D-103]]).
//
// CE MODULE NE COMPARE RIEN, ET C'EST SON CONTENU. `DC-54` demande de comparer
// « niveau de preuve, contexte, date, population » avant de produire la
// position la plus prudente. Les quatre axes ont été MESURÉS sur la production
// le 2026-08-23 (conteneurs one-off, lecture seule, 8 224 claims `VALIDE`), et
// aucun n'est comparable. La politique le DIT, au lieu de faire comme si :
// un axe manquant qu'on tait est un axe qu'on croit couvert.
//
// LA POSITION LA PLUS PRUDENTE, ICI, EST DE NE PAS TRANCHER. C'est la lecture
// littérale de `DC-54` une fois la mesure faite — et non un renoncement :
// `DC-55` pose que l'arbitrage humain est une ISSUE de la politique, pas son
// échec. Le praticien reçoit le conflit, ses deux claims et le motif exact pour
// lequel la machine s'abstient.
//
// CE QUE CE MODULE N'EST PAS. Il ne rédige aucun arbitrage : `DC-01` et `DC-02`
// réservent au déterministe la production et au LLM la seule restitution. Le
// motif d'escalade est ASSEMBLÉ à partir des axes déclarés ci-dessous, jamais
// formulé pour la circonstance.

/** Version de la politique, épinglée par le constat qu'elle produit. */
export const POLITIQUE_RESOLUTION_CONFLIT_VERSION = 'politique-resolution-conflit-v1';

export type AxeResolution = 'population' | 'niveau_preuve' | 'classe_autorite' | 'date';

export type AxeDeclare = {
  axe: AxeResolution;
  /** Libellé français de l'axe, servi au praticien dans le motif d'escalade. */
  libelle: string;
  /**
   * `false` tant que l'axe n'est pas comparable. Le banc
   * `politiqueResolutionConflit.test.ts` épingle qu'AUCUN ne l'est : le jour où
   * l'un passe à `true`, il rougit et force à écrire la branche de comparaison
   * — plutôt que de la laisser manquer en silence.
   */
  comparable: boolean;
  /** Pourquoi l'axe n'est pas comparable, et sur quelle mesure on l'affirme. */
  motif: string;
};

/**
 * Les quatre axes de `DC-54`, chacun avec le motif MESURÉ de sa non-comparaison.
 *
 * Les chiffres viennent de la production du 2026-08-23 et ne sont pas des
 * estimations : ils sont reproductibles par la requête d'agrégat citée dans
 * [[D-103]].
 */
export const AXES_RESOLUTION: readonly AxeDeclare[] = [
  {
    axe: 'population',
    libelle: 'population',
    comparable: false,
    // [[D-095]] : la population ne vit pas sur le claim et n'y vivra pas — elle
    // est portée par l'intervention. Un claim descriptif n'a pas de population.
    motif:
      "la population n'est pas portée par le claim et ne le sera pas (D-095) : "
      + "elle appartient à l'intervention, pas à l'affirmation.",
  },
  {
    axe: 'niveau_preuve',
    libelle: 'niveau de preuve',
    comparable: false,
    motif:
      'renseigné sur 45 claims sur 8 224 (0,55 %), en texte libre — 32 valeurs '
      + "distinctes, de « B » à « evidence based » en passant par « Niveau 1 / "
      + "Niveau 2 ». Aucun vocabulaire fermé, aucune hiérarchie publiée : les "
      + "ordonner serait inventer un classement (DC-19).",
  },
  {
    axe: 'classe_autorite',
    libelle: "classe d'autorité",
    comparable: false,
    motif:
      'renseignée sur 154 claims sur 8 224 (1,87 %), en texte libre — 73 valeurs '
      + "distinctes mêlant institutions et noms d'auteurs. Un seul claim du "
      + "corpus porte à la fois un niveau de preuve et une classe d'autorité.",
  },
  {
    axe: 'date',
    libelle: 'date',
    comparable: false,
    // L'axe le plus trompeur des quatre : la colonne EXISTE et elle est
    // peuplée partout. C'est précisément pour cela qu'il faut écrire pourquoi
    // on ne s'en sert pas.
    motif:
      "`valide_at` est la date de VALIDATION praticien du claim, pas la date de "
      + 'la source : les 8 224 claims ont été validés sur onze jours de juillet '
      + "et août 2026, dans l'ordre de l'ingestion. Comparer ces dates ferait "
      + "gagner le claim ingéré le plus tard, ce qui ne dit rien de la preuve.",
  },
];

/**
 * Le motif servi au praticien : les axes non comparés, chacun avec sa raison.
 *
 * ASSEMBLÉ, PAS RÉDIGÉ. La phrase est une concaténation déterministe des axes
 * déclarés ci-dessus ; deux appels rendent le même texte, et un axe qui
 * changerait de motif changerait le texte partout à la fois.
 */
export function motifEscalade(): string {
  const nonCompares = AXES_RESOLUTION.filter(axe => !axe.comparable);
  const details = nonCompares.map(axe => `${axe.libelle} — ${axe.motif}`).join(' ');
  return (
    'Aucun axe de comparaison de DC-54 n’est exploitable sur ce corpus, '
    + `l’arbitrage revient donc au praticien (DC-55). ${details}`
  );
}

/**
 * L'issue de la politique pour un conflit déclaré.
 *
 * ELLE EST UNE, ET C'EST LE RÉSULTAT DE LA MESURE, pas une simplification :
 * zéro axe comparable ⇒ zéro résolution automatique possible ⇒ escalade. Le
 * jour où un axe devient comparable, `AXES_RESOLUTION` le dira, le banc
 * rougira, et cette fonction devra rendre autre chose que cette constante.
 *
 * Les deux claims sont pris en paramètre bien qu'aucun ne soit lu : la
 * signature est celle que la politique aura le jour où elle comparera, et une
 * fonction sans entrée aurait dû être réécrite entièrement à ce moment-là. Le
 * banc épingle que les deux claims sont EXIGÉS et que l'issue ne dépend pas
 * d'eux tant qu'aucun axe n'est comparable.
 */
export function resoudreConflitDeSources(
  _premier: ContradictionClaimRef,
  _second: ContradictionClaimRef,
): Extract<ResolutionContradiction, { statut: 'escaladee_praticien' }> {
  return { statut: 'escaladee_praticien', motif: motifEscalade() };
}
