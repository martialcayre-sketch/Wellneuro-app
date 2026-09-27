// LE DÉPÔT D'UN BROUILLON DE FICHE D'ASSIETTE ([[D-251]] §5, lot 4).
//
// SEUL CE MODULE CRÉE UNE VERSION (garde : `catalogue.guard.test.ts`). Il ne
// crée jamais d'acte : une version déposée ici est un BROUILLON, et le reste
// jusqu'à ce que le responsable la valide par un autre chemin (`DC-16`).
//
// LES CONTRÔLES, avant toute écriture, sont ceux de `controle.ts` — partagés
// avec la décision du responsable (lot 6), sans que l'un des deux chemins
// n'importe l'autre (`DC-16`) :
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
import type { BrouillonFiche } from './contrat';
import { controlerContenuFiche, type AnomalieContenu } from './controle';

export type AnomalieIngestion = AnomalieContenu;

export type IssueDepot =
  | { issue: 'refusee'; anomalies: AnomalieIngestion[] }
  /** `inchangee` : la dernière version de la fiche porte déjà exactement ce dépôt. */
  | { issue: 'deposee' | 'inchangee'; idVersion: string; numero: number; contenuSha256: string };

/**
 * Contrôle puis dépose un brouillon. Idempotent sur la DERNIÈRE version de la
 * fiche : le même dépôt rejoué (une reprise après coupure réseau) ne crée pas
 * de doublon.
 */
export async function deposerBrouillonFiche(brouillon: BrouillonFiche): Promise<IssueDepot> {
  const { anomalies } = await controlerContenuFiche({
    contenu: brouillon.contenu,
    sourceId: brouillon.sourceId,
    plateCode: brouillon.plateCode,
    texteSource: brouillon.texteSource,
  });
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
