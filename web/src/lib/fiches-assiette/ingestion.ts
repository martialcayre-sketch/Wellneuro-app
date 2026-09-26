// LE DÉPÔT D'UN BROUILLON DE FICHE D'ASSIETTE ([[D-251]] §5, lot 4).
//
// SEUL CE MODULE CRÉE UNE VERSION (garde : `catalogue.guard.test.ts`). Il ne
// crée jamais d'acte : une version déposée ici est un BROUILLON, et le reste
// jusqu'à ce que le responsable la valide par un autre chemin (`DC-16`).
//
// L'ORDRE DES CONTRÔLES, avant toute écriture :
//   1. chaque claim cité est VALIDE au corpus, par les prédicats de
//      `claimsValidesAuCorpus` — un claim en attente, rejeté ou désactivé ne
//      fonde aucun texte patient ;
//   2. `controlerFiche` sur le texte source, les textes des claims cités et
//      les réserves de sécurité de l'assiette (invariants.ts).
// Une seule anomalie refuse le dépôt entier : une fiche à moitié juste n'est
// pas un brouillon à relire, c'est un brouillon à refaire.
//
// AUCUN TEXTE NE SORT D'ICI. Ni la fiche, ni sa source, ni un claim : le dépôt
// public ne doit rien en recevoir, pas même par un journal ([[D-251]] §4).

import type { Prisma } from '@/generated/prisma';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { prisma } from '@/lib/prisma';
import { cleClaim, type ReferenceClaim } from '@/lib/rag/claims/validite';
import type { BrouillonFiche } from './contrat';
import { controlerFiche, type AnomalieFiche } from './invariants';
import { clesSecuriteDeLAssiette } from './securite';

export type AnomalieIngestion = AnomalieFiche | { code: 'claim_non_valide'; detail: string };

export type IssueDepot =
  | { issue: 'refusee'; anomalies: AnomalieIngestion[] }
  /** `inchangee` : la dernière version de la fiche porte déjà exactement ce dépôt. */
  | { issue: 'deposee' | 'inchangee'; idVersion: string; numero: number; contenuSha256: string };

const RE_CLE = /^(WN-CL-\d{4}-\d{3})::(v\d+\.\d+)$/;

/** Les claims cités, précautions et blocs confondus — les seules clés bien formées. */
function referencesCitees(brouillon: BrouillonFiche): ReferenceClaim[] {
  const cles = new Set<string>([
    ...brouillon.contenu.precautions.flatMap(p => p.claims),
    ...brouillon.contenu.sections.flatMap(s =>
      s.blocs.flatMap(b => (b.provenance.type === 'claims' ? b.provenance.claims : [])),
    ),
  ]);
  const references: ReferenceClaim[] = [];
  for (const cle of cles) {
    const m = RE_CLE.exec(cle);
    // Une clé mal formée n'est pas cherchée : `controlerFiche` la nomme.
    if (m) references.push({ claimId: m[1], versionClaim: m[2] });
  }
  return references;
}

/**
 * Les claims cités qui sont VALIDE au corpus, chacun avec son texte — lu pour
 * contrôler les nombres, jamais rendu.
 *
 * UNE SEULE LECTURE (constat de revue, #1234). Valider les claims par une
 * requête puis lire leur texte par une autre laissait une fenêtre : un claim
 * désactivé entre les deux aurait encore fourni ses nombres au contrôle. Ici,
 * un claim est valide PARCE QU'il revient de cette requête, et son texte vient
 * de la même ligne.
 *
 * LES PRÉDICATS SONT CEUX DE `claimsValidesAuCorpus`, MOT POUR MOT — recopiés
 * parce que ce module-là s'interdit de rendre un texte ; `ingestion.test.ts`
 * rougit s'ils divergent. `rag_corpus_claims` est hors du schéma Prisma, d'où
 * la requête brute ; le `unnest` apparie les couples position par position.
 */
async function claimsValidesEtLeursTextes(references: readonly ReferenceClaim[]): Promise<Map<string, string>> {
  if (references.length === 0) return new Map();
  const lignes = await prisma.$queryRaw<Array<{ claim_id: string; version_claim: string; texte_normalise: string }>>`
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

/**
 * Contrôle puis dépose un brouillon. Idempotent sur la DERNIÈRE version de la
 * fiche : le même dépôt rejoué (une reprise après coupure réseau) ne crée pas
 * de doublon.
 */
export async function deposerBrouillonFiche(brouillon: BrouillonFiche): Promise<IssueDepot> {
  const citees = referencesCitees(brouillon);
  const valides = await claimsValidesEtLeursTextes(citees);
  const anomalies: AnomalieIngestion[] = citees
    .filter(r => !valides.has(cleClaim(r)))
    .map(r => ({ code: 'claim_non_valide' as const, detail: `${cleClaim(r)} n'est pas un claim VALIDE du corpus.` }));

  anomalies.push(
    ...controlerFiche({
      contenu: brouillon.contenu,
      sourceIdFiche: brouillon.sourceId,
      texteSource: brouillon.texteSource,
      textesClaimsCites: [...valides.values()],
      clesSecuriteAttendues: clesSecuriteDeLAssiette(brouillon.plateCode),
    }),
  );
  if (anomalies.length > 0) return { issue: 'refusee', anomalies };

  const contenuSha256 = canonicalSha256(brouillon.contenu);

  return prisma.$transaction(async (tx): Promise<IssueDepot> => {
    // LE MÊME VERROU QUE LE TRIGGER D'INSERTION, pris AVANT de lire le dernier
    // numéro : sans lui, deux dépôts concurrents liraient le même maximum et le
    // second échouerait au trigger. Réentrant dans la transaction, relâché au
    // COMMIT.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fiches_assiette_versions:${brouillon.sourceId}`}))`;

    const derniere = await tx.ficheAssietteVersion.findFirst({
      where: { sourceId: brouillon.sourceId },
      orderBy: { numero: 'desc' },
      select: {
        id: true,
        numero: true,
        contenuSha256: true,
        texteSource: true,
        sourceSha256: true,
        modeleRedaction: true,
        modeleFidelite: true,
        versionConsigne: true,
      },
    });
    if (
      derniere &&
      derniere.contenuSha256 === contenuSha256 &&
      derniere.texteSource === brouillon.texteSource &&
      derniere.sourceSha256 === brouillon.sourceSha256 &&
      derniere.modeleRedaction === brouillon.modeleRedaction &&
      derniere.modeleFidelite === brouillon.modeleFidelite &&
      derniere.versionConsigne === brouillon.versionConsigne
    ) {
      return { issue: 'inchangee', idVersion: derniere.id, numero: derniere.numero, contenuSha256 };
    }

    const creee = await tx.ficheAssietteVersion.create({
      data: {
        sourceId: brouillon.sourceId,
        plateCode: brouillon.plateCode,
        numero: (derniere?.numero ?? 0) + 1,
        contenu: brouillon.contenu as unknown as Prisma.InputJsonValue,
        contenuSha256,
        texteSource: brouillon.texteSource,
        sourceSha256: brouillon.sourceSha256,
        modeleRedaction: brouillon.modeleRedaction,
        modeleFidelite: brouillon.modeleFidelite,
        versionConsigne: brouillon.versionConsigne,
      },
      select: { id: true, numero: true },
    });
    return { issue: 'deposee', idVersion: creee.id, numero: creee.numero, contenuSha256 };
  });
}
