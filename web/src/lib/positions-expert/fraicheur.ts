import { claimsNonSupplantesAuCorpus, claimsValidesAuCorpus, cleClaim } from '@/lib/rag/claims/validite';
import { lireReferenceClaim, type ReferenceClaimPosition } from './vocabulaire';

// LA FRAÎCHEUR D'UN CLAIM CITÉ PAR UNE POSITION OU UN ARBITRAGE (D-439 §2, A3) :
// valide au corpus (statut `VALIDE`, actif, compartiment actif, adossé à une
// source) ET non supplanté. Aucune clé étrangère ne lie ces tables à
// `rag_corpus_claims` (des bancs y suppriment leurs lignes) : la fraîcheur se
// lit ici, à chaque fois. Un claim ABSENT du corpus n'est pas frais : il rend
// la position, ou l'arbitrage, « à relire » (`DC-24`).

/** Le lecteur, injectable par les bancs. */
export type LecteurFraicheur = (refs: readonly string[]) => Promise<ReadonlySet<string>>;

/** Parmi les références `identifiant@version`, celles qui sont fraîches. */
export const claimsFrais: LecteurFraicheur = async refs => {
  const lues = [...new Set(refs)]
    .map(r => [r, lireReferenceClaim(r)] as const)
    .filter((p): p is readonly [string, ReferenceClaimPosition] => p[1] !== null);
  if (lues.length === 0) return new Set();
  const couples = lues.map(([, c]) => c);
  const [valides, nonSupplantes] = await Promise.all([
    claimsValidesAuCorpus(couples),
    claimsNonSupplantesAuCorpus(couples),
  ]);
  return new Set(lues.filter(([, c]) => valides.has(cleClaim(c)) && nonSupplantes.has(cleClaim(c))).map(([r]) => r));
};
