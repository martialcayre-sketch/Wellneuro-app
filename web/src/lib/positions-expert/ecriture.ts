// L'ATELIER DES POSITIONS D'EXPERT — LES TROIS ÉCRITURES (D-439 §2, §3, §5,
// A2, A3). SEUL CE MODULE INSÈRE dans `positions_expert_versions`,
// `positions_expert_actes` et `arbitrages_conflits_sources` (garde :
// `ecritures.guard.test.ts`). Rien ne s'y réécrit : la base refuse UPDATE,
// DELETE et TRUNCATE.
//
// UNE ÉCRITURE PAR TRANSACTION (revue `wn-reviewer` de #1871, P2-3). Deux
// transactions qui croiseraient un acte et un arbitrage sur deux positions
// prendraient leurs verrous dans l'ordre inverse et s'interbloqueraient. Ici,
// chaque transaction écrit une ligne, et ses verrous se prennent toujours dans
// le même ordre, celui des triggers :
//   — version et acte : la FICHE (`fu|FU_…`), puis la POSITION (`pe|WN-PE-…`) ;
//   — arbitrage : le COUPLE (`cs|CS-…|FU_…`), puis la POSITION retenue.
// Les clés `pe|` et `cs|` sont celles des triggers, dans l'espace 439 : le
// trigger reprend le verrou que la transaction tient déjà. La clé `fu|` est
// propre à la route : la base n'a pas d'index pour la question 3.
//
// READ COMMITTED, NOMMÉ : les triggers refusent REPEATABLE READ et
// SERIALIZABLE. En READ COMMITTED, chaque lecture faite après le verrou voit ce
// que le précédent détenteur vient de commettre.
//
// CE QUE LA ROUTE AJOUTE À LA BASE (D-439 et arbitrages du 2026-11-06) :
//   — Q1 : les actes alternent (`refusAlternance`) ;
//   — Q2 : la position retenue fonde la fiche de l'arbitrage ;
//   — Q3 : une fiche n'est fondée que par une position non retirée ;
//   — conflit inconnu (bien formé) refusé, fiche hors de la liste curée
//     refusée, claim retenu hors du conflit refusé ;
//   — un claim d'appui ou retenu qui n'est pas frais (absent compris) est
//     refusé à l'écriture. À la lecture, il rend la position, ou
//     l'arbitrage, « à relire ».
//
// L'ÉCRAN VOIT, LA ROUTE VÉRIFIE CE QU'IL A VU : la version courante vue (une
// version), l'empreinte et le dernier acte vus (un acte), la tête vue (un
// arbitrage). Si l'un d'eux a bougé, rien n'est écrit (409).
//
// AUCUN TEXTE NE SORT D'ICI VERS UN JOURNAL ([[D-251]] §4).

import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { FICHES_USAGE_BESOIN2_SHA256, FICHES_USAGE_BESOIN2_V1, structureSignee } from '@/lib/fiches-usage/ficheUsageBesoin2V1';
import { empreinteContenuBrut } from './empreinte';
import { appuisNonFrais, etatVersion, jetonDernierActe, refusAlternance, type RefusAlternance } from './etat';
import { claimsFrais, type LecteurFraicheur } from './fraicheur';
import {
  claimsDuConflit,
  conflitPublie,
  empreinteEntreeConflit,
  fichesCurees,
  REGISTRE_DU_DEPOT,
  type RegistreConflits,
} from './registreConflits';
import type { ActePosition, ContenuPosition, DossierPosition } from './vocabulaire';
import { versionSuit } from './vocabulaire';

export type ContexteEcriture = {
  registre: RegistreConflits;
  structure: { signee: boolean; fiches: ReadonlySet<string>; empreinte: string };
  lireFraicheur: LecteurFraicheur;
};

export function contexteDuDepot(): ContexteEcriture {
  return {
    registre: REGISTRE_DU_DEPOT,
    structure: {
      signee: structureSignee(),
      fiches: new Set(FICHES_USAGE_BESOIN2_V1.fiches.map(f => f.id)),
      empreinte: FICHES_USAGE_BESOIN2_SHA256,
    },
    lireFraicheur: claimsFrais,
  };
}

const OPTIONS_TX = { isolationLevel: 'ReadCommitted' } as const;

type Tx = Prisma.TransactionClient;

async function verrouFiche(tx: Tx, ficheId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(439, hashtext(${`fu|${ficheId}`}))`;
}
async function verrouPosition(tx: Tx, positionId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(439, hashtext(${`pe|${positionId}`}))`;
}
async function verrouCouple(tx: Tx, conflitId: string, ficheId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(439, hashtext(${`cs|${conflitId}|${ficheId}`}))`;
}

/** La version courante d'une position : celle qu'aucune version ne révise. */
function versionCourante(tx: Tx, positionId: string) {
  return tx.positionExpertVersion.findFirst({
    where: { positionId, revisePar: { is: null } },
    select: { id: true, version: true, dossier: true, ficheId: true },
  });
}

/**
 * Question 3 : une AUTRE position, non retirée, fonde-t-elle déjà cette fiche ?
 * Se lit sous le verrou de la fiche. Rend l'identifiant de cette position, ou
 * `null`.
 */
async function ficheFondeeParUneAutre(tx: Tx, ficheId: string, positionId: string): Promise<string | null> {
  const courantes = await tx.positionExpertVersion.findMany({
    where: { ficheId, positionId: { not: positionId }, revisePar: { is: null } },
    select: { positionId: true, actes: { select: { ordre: true, acte: true } } },
  });
  const occupante = courantes.find(v => etatVersion(v.actes) !== 'retiree');
  return occupante ? occupante.positionId : null;
}

const SELECTION_VERSION = {
  id: true,
  positionId: true,
  version: true,
  dossier: true,
  ficheId: true,
  idVersionRevisee: true,
  auteur: true,
  creeLe: true,
} as const;
const SELECTION_ACTE = { id: true, ordre: true, acte: true, auteur: true, motif: true, le: true } as const;
const SELECTION_ARBITRAGE = {
  id: true,
  ordre: true,
  conflitId: true,
  ficheId: true,
  acte: true,
  idArbitrageRemplace: true,
  claimRetenu: true,
  idPositionVersion: true,
  auteur: true,
  le: true,
} as const;

// ── 1. VERSER UNE VERSION ────────────────────────────────────────────────────

export type DemandeVersion = {
  positionId: string;
  version: string;
  dossier: DossierPosition;
  ficheId: string | null;
  contenu: ContenuPosition;
  claimsAppui: string[];
  /** La version courante que l'écran a vue (`null` : la position n'en avait pas). Elle devient la version révisée. */
  idVersionCouranteVue: string | null;
  auteur: string;
};

export type RaisonRefusVersion =
  | 'fiche_hors_structure'
  | 'appui_non_frais'
  | 'etat_divergent'
  | 'version_ne_suit_pas'
  | 'dossier_different'
  | 'fiche_deja_fondee';

export type IssueVersion =
  | { issue: 'ecrite'; version: { id: string; positionId: string; version: string } }
  | { issue: 'refusee'; raison: RaisonRefusVersion; claims?: string[] };

export async function verserVersion(demande: DemandeVersion, ctx: ContexteEcriture = contexteDuDepot()): Promise<IssueVersion> {
  if (demande.ficheId !== null && !ctx.structure.fiches.has(demande.ficheId)) {
    return { issue: 'refusee', raison: 'fiche_hors_structure' };
  }
  const nonFrais = appuisNonFrais(demande.claimsAppui, await ctx.lireFraicheur(demande.claimsAppui));
  if (nonFrais.length > 0) return { issue: 'refusee', raison: 'appui_non_frais', claims: nonFrais };

  return prisma.$transaction(async (tx): Promise<IssueVersion> => {
    if (demande.ficheId !== null) await verrouFiche(tx, demande.ficheId);
    await verrouPosition(tx, demande.positionId);

    const courante = await versionCourante(tx, demande.positionId);
    if ((courante?.id ?? null) !== demande.idVersionCouranteVue) return { issue: 'refusee', raison: 'etat_divergent' };
    if (courante) {
      if (!versionSuit(demande.version, courante.version)) return { issue: 'refusee', raison: 'version_ne_suit_pas' };
      if (courante.dossier !== demande.dossier) return { issue: 'refusee', raison: 'dossier_different' };
    }
    if (demande.ficheId !== null && (await ficheFondeeParUneAutre(tx, demande.ficheId, demande.positionId)) !== null) {
      return { issue: 'refusee', raison: 'fiche_deja_fondee' };
    }

    const cree = await tx.positionExpertVersion.create({
      data: {
        positionId: demande.positionId,
        version: demande.version,
        dossier: demande.dossier,
        ficheId: demande.ficheId,
        contenu: demande.contenu,
        claimsAppui: demande.claimsAppui,
        idVersionRevisee: courante?.id ?? null,
        auteur: demande.auteur,
      },
      select: SELECTION_VERSION,
    });
    return { issue: 'ecrite', version: { id: cree.id, positionId: cree.positionId, version: cree.version } };
  }, OPTIONS_TX);
}

// ── 2. SIGNER OU RETIRER LA VERSION COURANTE ─────────────────────────────────

export type DemandeActe = {
  idVersion: string;
  acte: ActePosition;
  empreinteVue: string;
  dernierActeVu: string | null;
  relectureIntegrale: unknown;
  motif: string | null;
  auteur: string;
};

export type RaisonRefusActe =
  | 'relecture_requise'
  | 'motif_requis'
  | 'introuvable'
  | 'version_depassee'
  | 'contenu_illisible'
  | 'empreinte_divergente'
  | 'etat_divergent'
  | RefusAlternance
  | 'fiche_hors_structure'
  | 'fiche_deja_fondee'
  | 'appui_non_frais';

export type IssueActe =
  | { issue: 'ecrite'; acte: { id: string; ordre: string; acte: string } }
  | { issue: 'refusee'; raison: RaisonRefusActe; claims?: string[] };

export async function poserActePosition(demande: DemandeActe, ctx: ContexteEcriture = contexteDuDepot()): Promise<IssueActe> {
  // SIGNER, C'EST DÉCLARER AVOIR TOUT LU ([[D-195]] §1) : strictement `true`.
  if (demande.acte === 'signee' && demande.relectureIntegrale !== true) return { issue: 'refusee', raison: 'relecture_requise' };
  if (demande.acte === 'retiree' && demande.motif === null) return { issue: 'refusee', raison: 'motif_requis' };

  // Les champs d'une version ne changent jamais (ajout seul) : les lire hors
  // verrou est sûr. Seuls « courante » et « dernier acte » se relisent dessous.
  const cible = await prisma.positionExpertVersion.findUnique({
    where: { id: demande.idVersion },
    select: { positionId: true, ficheId: true, claimsAppui: true },
  });
  if (!cible) return { issue: 'refusee', raison: 'introuvable' };
  if (demande.acte === 'signee') {
    if (cible.ficheId !== null && !ctx.structure.fiches.has(cible.ficheId)) return { issue: 'refusee', raison: 'fiche_hors_structure' };
    const nonFrais = appuisNonFrais(cible.claimsAppui, await ctx.lireFraicheur(cible.claimsAppui));
    if (nonFrais.length > 0) return { issue: 'refusee', raison: 'appui_non_frais', claims: nonFrais };
  }

  return prisma.$transaction(async (tx): Promise<IssueActe> => {
    if (cible.ficheId !== null) await verrouFiche(tx, cible.ficheId);
    await verrouPosition(tx, cible.positionId);

    const version = await tx.positionExpertVersion.findUnique({
      where: { id: demande.idVersion },
      select: { contenu: true, revisePar: { select: { id: true } }, actes: { select: { ordre: true, acte: true } } },
    });
    if (!version) return { issue: 'refusee', raison: 'introuvable' };
    if (version.revisePar !== null) return { issue: 'refusee', raison: 'version_depassee' };

    const empreinte = empreinteContenuBrut(version.contenu);
    if (empreinte === null) return { issue: 'refusee', raison: 'contenu_illisible' };
    if (empreinte !== demande.empreinteVue) return { issue: 'refusee', raison: 'empreinte_divergente' };
    if (jetonDernierActe(version.actes) !== demande.dernierActeVu) return { issue: 'refusee', raison: 'etat_divergent' };

    const alternance = refusAlternance(etatVersion(version.actes), demande.acte);
    if (alternance !== null) return { issue: 'refusee', raison: alternance };

    if (
      demande.acte === 'signee'
      && cible.ficheId !== null
      && (await ficheFondeeParUneAutre(tx, cible.ficheId, cible.positionId)) !== null
    ) {
      return { issue: 'refusee', raison: 'fiche_deja_fondee' };
    }

    const cree = await tx.positionExpertActe.create({
      data: {
        idVersion: demande.idVersion,
        acte: demande.acte,
        // Recalculée ici, et encore par le trigger : l'acte porte sur CE texte.
        empreinte,
        auteur: demande.auteur,
        relectureIntegrale: demande.acte === 'signee',
        motif: demande.acte === 'retiree' ? demande.motif : null,
      },
      select: SELECTION_ACTE,
    });
    return { issue: 'ecrite', acte: { id: cree.id, ordre: String(cree.ordre), acte: cree.acte } };
  }, OPTIONS_TX);
}

// ── 3. POSER OU RÉVOQUER L'ARBITRAGE D'UN COUPLE CONFLIT × FICHE ──────────────

export type RetenuArbitrage = { claim: string } | { idPositionVersion: string };

export type DemandePose = {
  conflitId: string;
  ficheId: string;
  /** La tête que l'écran a vue (`null` : le couple n'était pas arbitré). La pose la remplace. */
  teteVue: string | null;
  retenu: RetenuArbitrage;
  motif: string;
  auteur: string;
};

export type DemandeRevocation = {
  conflitId: string;
  ficheId: string;
  /** La tête que l'écran a vue, et qu'il révoque. */
  teteVue: string;
  motif: string;
  auteur: string;
};

export type RaisonRefusArbitrage =
  | 'conflit_inconnu'
  | 'structure_non_signee'
  | 'fiche_hors_structure'
  | 'fiche_hors_liste'
  | 'claim_hors_conflit'
  | 'claim_non_frais'
  | 'position_introuvable'
  | 'position_autre_fiche'
  | 'position_a_relire'
  | 'position_hors_vigueur'
  | 'etat_divergent';

export type IssueArbitrage =
  | { issue: 'ecrite'; arbitrage: { id: string; ordre: string; acte: string } }
  | { issue: 'refusee'; raison: RaisonRefusArbitrage; claims?: string[] };

/** La tête du couple : la pose que ni un remplacement ni une révocation ne vise. */
function teteDuCouple(tx: Tx, conflitId: string, ficheId: string) {
  return tx.arbitrageConflitSource.findFirst({
    where: { conflitId, ficheId, acte: 'pose', remplacePar: { is: null } },
    orderBy: { ordre: 'desc' },
    select: { id: true },
  });
}

export async function poserArbitrage(demande: DemandePose, ctx: ContexteEcriture = contexteDuDepot()): Promise<IssueArbitrage> {
  // Le conflit : publié au registre signé. Bien formé mais inconnu ⇒ refusé.
  const entree = conflitPublie(demande.conflitId, ctx.registre);
  if (!entree) return { issue: 'refusee', raison: 'conflit_inconnu' };
  // La fiche : dans la structure signée, ET dans la liste curée du conflit (A2).
  if (!ctx.structure.signee) return { issue: 'refusee', raison: 'structure_non_signee' };
  if (!ctx.structure.fiches.has(demande.ficheId)) return { issue: 'refusee', raison: 'fiche_hors_structure' };
  if (!fichesCurees(entree).includes(demande.ficheId)) return { issue: 'refusee', raison: 'fiche_hors_liste' };

  let positionRetenue: { positionId: string } | null = null;
  if ('claim' in demande.retenu) {
    // Le claim retenu : l'un des deux du conflit, et frais.
    if (!claimsDuConflit(entree).includes(demande.retenu.claim)) return { issue: 'refusee', raison: 'claim_hors_conflit' };
    if (!(await ctx.lireFraicheur([demande.retenu.claim])).has(demande.retenu.claim)) {
      return { issue: 'refusee', raison: 'claim_non_frais', claims: [demande.retenu.claim] };
    }
  } else {
    const v = await prisma.positionExpertVersion.findUnique({
      where: { id: demande.retenu.idPositionVersion },
      select: { positionId: true, ficheId: true, claimsAppui: true },
    });
    if (!v) return { issue: 'refusee', raison: 'position_introuvable' };
    // Question 2 : la position retenue fonde la fiche de l'arbitrage. Sans
    // fiche, elle ne se retient pas.
    if (v.ficheId !== demande.ficheId) return { issue: 'refusee', raison: 'position_autre_fiche' };
    const nonFrais = appuisNonFrais(v.claimsAppui, await ctx.lireFraicheur(v.claimsAppui));
    if (nonFrais.length > 0) return { issue: 'refusee', raison: 'position_a_relire', claims: nonFrais };
    positionRetenue = { positionId: v.positionId };
  }

  const conflitSha256 = empreinteEntreeConflit(entree);
  return prisma.$transaction(async (tx): Promise<IssueArbitrage> => {
    await verrouCouple(tx, demande.conflitId, demande.ficheId);
    const tete = await teteDuCouple(tx, demande.conflitId, demande.ficheId);
    if ((tete?.id ?? null) !== demande.teteVue) return { issue: 'refusee', raison: 'etat_divergent' };

    if (positionRetenue !== null && 'idPositionVersion' in demande.retenu) {
      await verrouPosition(tx, positionRetenue.positionId);
      const v = await tx.positionExpertVersion.findUnique({
        where: { id: demande.retenu.idPositionVersion },
        select: { revisePar: { select: { id: true } }, actes: { select: { ordre: true, acte: true } } },
      });
      if (!v || v.revisePar !== null || etatVersion(v.actes) !== 'signee') {
        return { issue: 'refusee', raison: 'position_hors_vigueur' };
      }
    }

    const cree = await tx.arbitrageConflitSource.create({
      data: {
        conflitId: demande.conflitId,
        ficheId: demande.ficheId,
        acte: 'pose',
        idArbitrageRemplace: tete?.id ?? null,
        claimRetenu: 'claim' in demande.retenu ? demande.retenu.claim : null,
        idPositionVersion: 'idPositionVersion' in demande.retenu ? demande.retenu.idPositionVersion : null,
        conflitSha256,
        structureSha256: ctx.structure.empreinte,
        motif: demande.motif,
        auteur: demande.auteur,
      },
      select: SELECTION_ARBITRAGE,
    });
    return { issue: 'ecrite', arbitrage: { id: cree.id, ordre: String(cree.ordre), acte: cree.acte } };
  }, OPTIONS_TX);
}

/**
 * Révoquer ne lit pas le registre : c'est le coupe-circuit. Un conflit
 * dépublié, une fiche retirée de la structure n'empêchent pas de ramener le
 * couple à « non arbitré ».
 */
export async function revoquerArbitrage(demande: DemandeRevocation): Promise<IssueArbitrage> {
  return prisma.$transaction(async (tx): Promise<IssueArbitrage> => {
    await verrouCouple(tx, demande.conflitId, demande.ficheId);
    const tete = await teteDuCouple(tx, demande.conflitId, demande.ficheId);
    if (tete === null || tete.id !== demande.teteVue) return { issue: 'refusee', raison: 'etat_divergent' };
    const cree = await tx.arbitrageConflitSource.create({
      data: {
        conflitId: demande.conflitId,
        ficheId: demande.ficheId,
        acte: 'revocation',
        idArbitrageRemplace: tete.id,
        motif: demande.motif,
        auteur: demande.auteur,
      },
      select: SELECTION_ARBITRAGE,
    });
    return { issue: 'ecrite', arbitrage: { id: cree.id, ordre: String(cree.ordre), acte: cree.acte } };
  }, OPTIONS_TX);
}
