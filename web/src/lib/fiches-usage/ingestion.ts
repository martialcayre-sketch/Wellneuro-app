// LE DÉPÔT D'UN BROUILLON DE FICHE D'USAGE OU DE LIBELLÉ ([[D-314]] §3, §4).
//
// SEUL CE MODULE CRÉE UNE VERSION OU UN LIBELLÉ (garde :
// `ecritures.guard.test.ts`). Il ne crée jamais d'acte : ce qu'il dépose est un
// BROUILLON, et le reste jusqu'à ce que le responsable le valide, rubrique par
// rubrique, par un autre chemin (`DC-16`).
//
// AVANT TOUTE ÉCRITURE, le contrôle contre la structure signée (`controle.ts`,
// partagé avec la décision) : fiche ou terme déclaré, rubriques exactement
// celles qu'attend la structure, structure du jour. Une seule anomalie refuse
// le dépôt entier.
//
// AUCUN TEXTE NE SORT D'ICI. Ni une rubrique, ni un libellé : le dépôt public
// ne doit rien en recevoir, pas même par un journal ([[D-251]] §4).

import type { Prisma } from '@/generated/prisma';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { prisma } from '@/lib/prisma';
import type { BrouillonLibelle, BrouillonVersionUsage } from './contrat';
import {
  CONTEXTE_DU_DEPOT,
  controlerLibelleContreStructure,
  controlerVersionContreStructure,
  type AnomalieStructure,
  type ContexteControle,
} from './controle';
import { empreinteTexte } from './empreintes';

export type IssueDepot =
  | { issue: 'refusee'; anomalies: AnomalieStructure[] }
  /** `inchangee` : le dernier dépôt de la fiche (du terme) porte déjà exactement ceci. */
  | { issue: 'deposee' | 'inchangee'; id: string; numero: number };

/**
 * Contrôle puis dépose le brouillon d'une version. Idempotent sur la DERNIÈRE
 * version de la fiche : le même dépôt rejoué (une reprise après coupure
 * réseau) ne crée pas de doublon.
 */
export async function deposerBrouillonVersionUsage(
  brouillon: BrouillonVersionUsage,
  contexte: ContexteControle = CONTEXTE_DU_DEPOT,
): Promise<IssueDepot> {
  const anomalies = controlerVersionContreStructure(
    { ficheId: brouillon.ficheId, rubriques: Object.keys(brouillon.contenu), structureSha256: brouillon.structureSha256 },
    contexte,
  );
  if (anomalies.length > 0) return { issue: 'refusee', anomalies };

  const contenuSha256 = canonicalSha256(brouillon.contenu);

  return prisma.$transaction(async (tx): Promise<IssueDepot> => {
    // LE MÊME VERROU QUE LE TRIGGER D'INSERTION, pris AVANT de lire le dernier
    // numéro : sans lui, deux dépôts concurrents liraient le même maximum et le
    // second échouerait au trigger. Réentrant dans la transaction.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fiches_usage_versions:${brouillon.ficheId}`}))`;

    const derniere = await tx.ficheUsageVersion.findFirst({
      where: { ficheId: brouillon.ficheId },
      orderBy: { numero: 'desc' },
      select: {
        id: true,
        numero: true,
        contenu: true,
        structureSha256: true,
        modeleRedaction: true,
        modeleContreLecture: true,
        versionConsigne: true,
      },
    });
    if (
      derniere &&
      canonicalSha256(derniere.contenu) === contenuSha256 &&
      derniere.structureSha256 === brouillon.structureSha256 &&
      derniere.modeleRedaction === brouillon.modeleRedaction &&
      derniere.modeleContreLecture === brouillon.modeleContreLecture &&
      derniere.versionConsigne === brouillon.versionConsigne
    ) {
      return { issue: 'inchangee', id: derniere.id, numero: derniere.numero };
    }

    const creee = await tx.ficheUsageVersion.create({
      data: {
        ficheId: brouillon.ficheId,
        numero: (derniere?.numero ?? 0) + 1,
        contenu: brouillon.contenu as unknown as Prisma.InputJsonValue,
        structureSha256: brouillon.structureSha256,
        modeleRedaction: brouillon.modeleRedaction,
        modeleContreLecture: brouillon.modeleContreLecture,
        versionConsigne: brouillon.versionConsigne,
      },
      select: { id: true, numero: true },
    });
    return { issue: 'deposee', id: creee.id, numero: creee.numero };
  });
}

/** Contrôle puis dépose le brouillon d'un libellé. Idempotent sur le dernier libellé du terme. */
export async function deposerBrouillonLibelle(
  brouillon: BrouillonLibelle,
  contexte: ContexteControle = CONTEXTE_DU_DEPOT,
): Promise<IssueDepot> {
  const anomalies = controlerLibelleContreStructure(brouillon, contexte);
  if (anomalies.length > 0) return { issue: 'refusee', anomalies };

  // La base tient cette égalité par CHECK ; le serveur la pose, jamais l'appelant.
  const libelleSha256 = empreinteTexte(brouillon.libelle);

  return prisma.$transaction(async (tx): Promise<IssueDepot> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fiches_usage_libelles:${brouillon.termeId}`}))`;

    const dernier = await tx.ficheUsageLibelle.findFirst({
      where: { termeId: brouillon.termeId },
      orderBy: { numero: 'desc' },
      select: {
        id: true,
        numero: true,
        libelleSha256: true,
        structureSha256: true,
        modeleRedaction: true,
        modeleContreLecture: true,
        versionConsigne: true,
      },
    });
    if (
      dernier &&
      dernier.libelleSha256 === libelleSha256 &&
      dernier.structureSha256 === brouillon.structureSha256 &&
      dernier.modeleRedaction === brouillon.modeleRedaction &&
      dernier.modeleContreLecture === brouillon.modeleContreLecture &&
      dernier.versionConsigne === brouillon.versionConsigne
    ) {
      return { issue: 'inchangee', id: dernier.id, numero: dernier.numero };
    }

    const cree = await tx.ficheUsageLibelle.create({
      data: {
        nature: brouillon.nature,
        termeId: brouillon.termeId,
        numero: (dernier?.numero ?? 0) + 1,
        libelle: brouillon.libelle,
        libelleSha256,
        structureSha256: brouillon.structureSha256,
        modeleRedaction: brouillon.modeleRedaction,
        modeleContreLecture: brouillon.modeleContreLecture,
        versionConsigne: brouillon.versionConsigne,
      },
      select: { id: true, numero: true },
    });
    return { issue: 'deposee', id: cree.id, numero: cree.numero };
  });
}
