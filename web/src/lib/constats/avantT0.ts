import { SEUIL_COHORTE_CABINET } from '@/lib/protocol/cabinet';

/**
 * Constat H07 du plan (R:Comptage T0) : les dossiers qui n'ont pas atteint le
 * T0, et les conditions dures qui les retiennent. Module PUR : le script de
 * conteneur (`scripts/constatAvantT0.ts`) lit la base et évalue les
 * préconditions par le chemin des trois routes (`preconditionsT0PourPatient`) ;
 * ce module ne fait que compter et masquer.
 *
 * MASQUAGE ([[D-298]]) : l'effectif reste affiché ; toute répartition portant
 * sur un à quatre dossiers est masquée. Un zéro reste affiché : il ne décrit
 * personne. Deux partitions : avec et sans T0 (de l'effectif), bloqués et
 * prêts (des dossiers sans T0). Si une part est masquée, l'autre l'est aussi,
 * sans quoi elle se déduirait par soustraction ; et sans T0 masqué, bloqués et
 * prêts le sont aussi, leur somme le rendant. Bloqués masqués, les comptes par
 * condition le sont tous : un seul motif partagé par tous les bloqués rendrait
 * leur nombre exact.
 *
 * AUCUN DÉLAI ICI : « trop longtemps » attend la D-xxx du délai, de la main du
 * responsable, après ce comptage (H07). L'ancienneté est décrite par ses
 * quartiles, jamais rangée dans des tranches qu'il faudrait inventer.
 */
export const EFFECTIF_MASQUAGE = SEUIL_COHORTE_CABINET;

export type DossierSansT0 = {
  /** Identifiants des conditions DURES non satisfaites (`PreconditionsT0.dures`). */
  manquantes: readonly string[];
  /** Jours entiers depuis la première assignation ; null sans assignation datée. */
  ancienneteJours: number | null;
};

export type Compte = number | 'masqué';

export type ConstatAvantT0 = {
  /** Dossiers actifs portant au moins une assignation : l'effectif, toujours affiché. */
  effectif: number;
  /** Dossiers dont le T0 est confirmé. */
  avecT0: Compte;
  /** Dossiers sans T0 confirmé. */
  sansT0: Compte;
  /** Au moins une condition dure manque : la confirmation serait refusée. */
  bloques: Compte;
  /** Aucune condition dure ne manque : le T0 attend le geste du praticien. */
  prets: Compte;
  /** Dossiers par condition dure manquante (un dossier peut en manquer plusieurs). */
  parCondition: Record<string, Compte>;
  /** Ancienneté des dossiers bloqués, en jours depuis la première assignation. */
  ancienneteBloques: { q1: number; mediane: number; q3: number } | 'masqué';
};

function masquer(n: number): Compte {
  return n > 0 && n < EFFECTIF_MASQUAGE ? 'masqué' : n;
}

/** Quantile au rang le plus proche, sur une liste triée non vide. */
function quantile(tries: readonly number[], p: number): number {
  return tries[Math.max(0, Math.ceil(p * tries.length) - 1)];
}

export function agregerConstatAvantT0(avecT0: number, dossiers: readonly DossierSansT0[]): ConstatAvantT0 {
  const premierePartitionMasquee = masquer(avecT0) === 'masqué' || masquer(dossiers.length) === 'masqué';
  const bloques = dossiers.filter(d => d.manquantes.length > 0);
  const nbBloques = bloques.length;
  const nbPrets = dossiers.length - nbBloques;
  const partitionMasquee =
    premierePartitionMasquee || masquer(nbBloques) === 'masqué' || masquer(nbPrets) === 'masqué';

  const parCondition: Record<string, Compte> = {};
  const comptes = new Map<string, number>();
  for (const dossier of bloques) {
    for (const id of new Set(dossier.manquantes)) comptes.set(id, (comptes.get(id) ?? 0) + 1);
  }
  for (const [id, n] of [...comptes].sort(([a], [b]) => a.localeCompare(b))) parCondition[id] = partitionMasquee ? 'masqué' : masquer(n);

  const anciennetes = bloques
    .map(d => d.ancienneteJours)
    .filter((j): j is number => j !== null)
    .sort((a, b) => a - b);

  return {
    effectif: avecT0 + dossiers.length,
    avecT0: premierePartitionMasquee ? 'masqué' : avecT0,
    sansT0: premierePartitionMasquee ? 'masqué' : dossiers.length,
    bloques: partitionMasquee ? 'masqué' : nbBloques,
    prets: partitionMasquee ? 'masqué' : nbPrets,
    parCondition,
    ancienneteBloques:
      anciennetes.length < EFFECTIF_MASQUAGE
        ? 'masqué'
        : { q1: quantile(anciennetes, 0.25), mediane: quantile(anciennetes, 0.5), q3: quantile(anciennetes, 0.75) },
  };
}
