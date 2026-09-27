// LES CLAIMS QU'UNE FICHE D'ASSIETTE CITE — lus au corpus, avec leur texte
// ([[D-251]] §5).
//
// MODULE NEUTRE. Le dépôt d'un brouillon (lot 4) et la décision du responsable
// (lot 6) contrôlent tous deux une fiche contre ses claims ; ce sont deux
// chemins que `DC-16` veut disjoints — aucun des deux n'importe l'autre. Ce
// qu'ils partagent vit ici, et n'écrit rien.
//
// UNE SEULE LECTURE (constat de revue, #1234). Un claim est valide PARCE QU'il
// revient de cette requête, et son texte vient de la même ligne : aucune
// fenêtre entre « valide » et « son texte ».
//
// LES PRÉDICATS SONT CEUX DE `claimsValidesAuCorpus`, MOT POUR MOT — recopiés
// parce que ce module-là s'interdit de rendre un texte ; `ingestion.test.ts`
// rougit s'ils divergent. `rag_corpus_claims` est hors du schéma Prisma, d'où
// la requête brute ; le `unnest` apparie les couples position par position.
//
// LE TEXTE NE SORT JAMAIS VERS UN JOURNAL. Il sert au contrôle des nombres, et
// à la relecture du responsable (lot 6), dans l'application seulement.

import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { cleClaim, type ReferenceClaim } from '@/lib/rag/claims/validite';
import type { ContenuFicheAssiette } from './types';

type ClientLecture = Pick<Prisma.TransactionClient, '$queryRaw'>;

const RE_CLE = /^(WN-CL-\d{4}-\d{3})::(v\d+\.\d+)$/;

/** Une clé `WN-CL-nnnn-nnn::vX.Y` en référence, ou `null` si elle est mal formée. */
export function referenceDeCle(cle: string): ReferenceClaim | null {
  const m = RE_CLE.exec(cle);
  return m ? { claimId: m[1], versionClaim: m[2] } : null;
}

/** Les clés citées d'un contenu, précautions et blocs confondus, sans doublon. */
export function clesCiteesDuContenu(contenu: ContenuFicheAssiette): string[] {
  return [
    ...new Set([
      ...contenu.precautions.flatMap(p => p.claims),
      ...contenu.sections.flatMap(s =>
        s.blocs.flatMap(b => (b.provenance.type === 'claims' ? b.provenance.claims : [])),
      ),
    ]),
  ];
}

/**
 * Parmi les références données, celles qui sont VALIDE au corpus, chacune avec
 * son texte — par clé `claimId::versionClaim`. Une référence absente de la
 * carte n'est pas valide ; l'appelant n'en déduit rien de plus (`DC-24`).
 */
export async function claimsValidesEtLeursTextes(
  references: readonly ReferenceClaim[],
  client: ClientLecture = prisma,
): Promise<Map<string, string>> {
  if (references.length === 0) return new Map();
  const lignes = await client.$queryRaw<Array<{ claim_id: string; version_claim: string; texte_normalise: string }>>`
    SELECT c.claim_id, c.version_claim, c.texte_normalise
    FROM public.rag_corpus_claims AS c
    JOIN unnest(${references.map(r => r.claimId)}::text[], ${references.map(r => r.versionClaim)}::text[])
      AS demande(claim_id, version_claim)
      ON demande.claim_id = c.claim_id
     AND demande.version_claim = c.version_claim
    WHERE c.active = true
      AND c.statut = 'VALIDE'
      AND c.patient_identifiable = false
      AND c.compartment = 'ACTIF'
      AND EXISTS (
        SELECT 1 FROM public.rag_corpus_claim_sources AS s WHERE s.claim_pk = c.id
      )
  `;
  return new Map(
    lignes.map(l => [cleClaim({ claimId: l.claim_id, versionClaim: l.version_claim }), l.texte_normalise]),
  );
}
