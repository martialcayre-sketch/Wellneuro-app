import {
  claimsNonSupplantesAuCorpus,
  claimsValidesAuCorpus,
  cleClaim,
  type ReferenceClaim,
} from '@/lib/rag/claims/validite';

// L'ADMISSIBILITÉ D'UN COUPLE CITÉ PAR UNE TABLE SIGNÉE, LUE AU SERVICE
// ([[D-491]], critère de [[D-472]] §2).
//
// Un couple `(claim_id, version_claim)` est admissible s'il est valide au
// corpus (`VALIDE`, actif, non identifiant, compartiment `ACTIF`, adossé à une
// source) ET non supplanté (`superseded_at IS NULL`) : le critère du préflight
// de `release-db`, constaté ici à la lecture au lieu d'attendre la release
// suivante. Le couple fait l'identité — aucune version plus récente n'est
// substituée à celle que la table cite. Un couple absent du corpus n'est pas
// admissible (`DC-24`).
//
// CE MODULE NE DÉCIDE RIEN. Il rend l'ensemble des clés admissibles, ou `null`
// quand le corpus est illisible ; chaque service décide de ce que vaut une
// règle dont un couple manque, parce que la réponse diffère d'une table à
// l'autre ([[D-491]] : une règle d'arrêt n'éteint plus, une contradiction et un
// conflit restent servis avec une réserve).

export type CoupleClaim = ReferenceClaim;

/**
 * Les clés `cleClaim` admissibles parmi `references`, ou `null` si le corpus
 * est illisible. Les deux lectures partent en parallèle ; l'échec de l'une ou
 * de l'autre rend le corpus illisible — ne rien pouvoir vérifier n'autorise
 * rien. La trace serveur ne porte que la signature de l'erreur.
 */
export async function claimsAdmissiblesAuCorpus(
  references: readonly CoupleClaim[],
  etiquette: string,
): Promise<ReadonlySet<string> | null> {
  try {
    const [valides, nonSupplantes] = await Promise.all([
      claimsValidesAuCorpus(references),
      claimsNonSupplantesAuCorpus(references),
    ]);
    return new Set([...valides].filter(cle => nonSupplantes.has(cle)));
  } catch (err) {
    console.error(`[${etiquette}] corpus illisible`, signatureErreur(err));
    return null;
  }
}

/** Les couples de `references` absents de `admissibles`, dédoublonnés, dans l'ordre. */
export function couplesNonAdmissibles(
  references: readonly CoupleClaim[],
  admissibles: ReadonlySet<string>,
): CoupleClaim[] {
  const vus = new Set<string>();
  const manquants: CoupleClaim[] = [];
  for (const reference of references) {
    const cle = cleClaim(reference);
    if (admissibles.has(cle) || vus.has(cle)) continue;
    vus.add(cle);
    manquants.push({ claimId: reference.claimId, versionClaim: reference.versionClaim });
  }
  return manquants;
}

function signatureErreur(err: unknown): string {
  const nom = err instanceof Error ? err.name : 'inconnue';
  const code = (err as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' ? `${nom}/${code}` : nom;
}
