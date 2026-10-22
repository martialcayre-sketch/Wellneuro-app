// Les FILS d'une table en ajout seul ([[D-335]] §5, patron de [[D-331]] §2)
// — PUR. Une ligne est une pose ou un retrait ; chacune désigne au plus la
// ligne qu'elle remplace (`idLigneRemplacee`). La TÊTE d'un fil est la pose
// que rien ne vise ; un fil dont la dernière ligne est un retrait n'a plus de
// tête (« non renseigné »). Les écrans, la route et la synthèse lisent ici la
// même chose : aucune seconde dérivation.

export type LigneDeFil = {
  id: string;
  /** `ordre` de la base, en chaîne (BigInt ne passe pas en JSON). */
  ordre: string;
  acte: 'pose' | 'retrait';
  idLigneRemplacee: string | null;
};

export type Fil<L extends LigneDeFil> = {
  /** La première ligne du fil : son identité stable. */
  racine: L;
  /** La pose en vigueur, ou `null` (retirée). */
  tete: L | null;
  /** Toutes les lignes du fil, dans l'ordre de la base. */
  historique: L[];
};

const parOrdre = <L extends LigneDeFil>(a: L, b: L) => (BigInt(a.ordre) < BigInt(b.ordre) ? -1 : 1);

/**
 * Les fils formés par des lignes : chaque ligne sans prédécesseur en ouvre
 * un, chaque successeur le prolonge. Une ligne dont le prédécesseur manque
 * (illisible) ouvre son propre fil plutôt que de disparaître.
 */
export function construireFils<L extends LigneDeFil>(lignes: readonly L[]): Fil<L>[] {
  const triees = [...lignes].sort(parOrdre);
  const filDe = new Map<string, Fil<L>>();
  const fils: Fil<L>[] = [];
  for (const ligne of triees) {
    const parent = ligne.idLigneRemplacee !== null ? filDe.get(ligne.idLigneRemplacee) : undefined;
    const fil = parent ?? { racine: ligne, tete: null, historique: [] };
    if (!parent) fils.push(fil);
    fil.historique.push(ligne);
    fil.tete = ligne.acte === 'pose' ? ligne : null;
    filDe.set(ligne.id, fil);
  }
  return fils;
}

/**
 * La tête d'un ensemble de lignes qui forment UN fil par construction (un
 * critère d'un dossier) : la pose que rien ne vise, la plus récente si un état
 * antérieur en laissait deux — le départage du trigger.
 */
export function teteUnique<L extends LigneDeFil>(lignes: readonly L[]): L | null {
  const visees = new Set(lignes.map(l => l.idLigneRemplacee).filter((id): id is string => id !== null));
  const tetes = lignes.filter(l => l.acte === 'pose' && !visees.has(l.id)).sort(parOrdre);
  return tetes.at(-1) ?? null;
}

/** Une ligne est-elle une tête : une pose que rien ne vise ? */
export function estTete<L extends LigneDeFil>(ligne: L | undefined, lignes: readonly L[]): boolean {
  return ligne !== undefined && ligne.acte === 'pose' && !lignes.some(l => l.idLigneRemplacee === ligne.id);
}
