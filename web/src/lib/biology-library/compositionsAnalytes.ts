// Composition signée des analyses groupées et des valeurs calculées (F80,
// D-323 §1) — PRATICIEN SEUL. C'est LE véhicule d'écriture de
// `biology_analyte_compositions` et de ses éléments.
//
// Patron de la signature NABM (`correspondancesNabm.ts`) :
//  - le signataire est l'e-mail de session, la date est posée par la base et
//    relue — jamais reçus du client ;
//  - la décision est prise SUR un état vu à l'écran : la signature exige
//    qu'aucune composition ne soit active, le retrait désigne la composition
//    vue par sa date. Un état qui a bougé n'écrit rien (`etat_divergent`) ;
//  - la liste vient du code (`compositionsPreparees.ts`) : le praticien signe
//    la liste préparée ou une partie d'elle, jamais un analyte hors liste.
//
// La base tient le reste (migration `20261018100000_compositions_analytes_v1`) :
// ajout seul, éléments écrits dans la transaction de la signature, au moins un
// élément au COMMIT, une composition active par analyte, retrait une fois.
//
// Ce fichier ne dérive aucun remboursement et ne touche pas la proposition.
import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  compositionPrepareePour,
  operandesAbsentsPour,
  type CompositionPreparee,
  type TypeComposition,
} from './compositionsPreparees';

export type ComposantAffiche = { code: string; libelle: string; actif: boolean };

export type CompositionSigneeAffichee = {
  type: TypeComposition;
  composants: ComposantAffiche[];
  verifiePar: string;
  verifieLe: string;
  retireePar: string | null;
  retireeLe: string | null;
};

export type CompositionPrepareeAffichee = {
  type: TypeComposition;
  composants: ComposantAffiche[];
  motif: string;
};

export type LireCompositionResultat =
  | {
      ok: true;
      /** La composition signée active, ou `null`. */
      active: CompositionSigneeAffichee | null;
      /** Les compositions retirées, de la plus récente à la plus ancienne. */
      retirees: CompositionSigneeAffichee[];
      preparee: CompositionPrepareeAffichee | null;
      /** Calculé dont les opérandes manquent au catalogue : le motif. */
      operandesAbsents: string | null;
      /** Les compositions signées actives où cet analyte figure. */
      membreDe: { code: string; libelle: string; type: TypeComposition }[];
    }
  | { ok: false; raison: 'analyte_inconnu' };

const selectionComposition = {
  type: true,
  verifiePar: true,
  verifieLe: true,
  retireePar: true,
  retireeLe: true,
  items: {
    orderBy: { position: 'asc' },
    select: { composant: { select: { code: true, libelle: true, actif: true } } },
  },
} satisfies Prisma.BiologyAnalyteCompositionSelect;

type CompositionLue = Prisma.BiologyAnalyteCompositionGetPayload<{ select: typeof selectionComposition }>;

function afficher(c: CompositionLue): CompositionSigneeAffichee {
  return {
    type: c.type as TypeComposition,
    composants: c.items.map(i => i.composant),
    verifiePar: c.verifiePar,
    verifieLe: c.verifieLe.toISOString(),
    retireePar: c.retireePar,
    retireeLe: c.retireeLe?.toISOString() ?? null,
  };
}

async function libellesDe(codes: readonly string[]): Promise<Map<string, ComposantAffiche>> {
  const lignes = await prisma.biologyAnalyte.findMany({
    where: { code: { in: [...codes] } },
    select: { code: true, libelle: true, actif: true },
  });
  return new Map(lignes.map(l => [l.code, l]));
}

/** La composition d'un analyte : signée (active et retirées), préparée, et
 *  les groupes signés dont il est membre. */
export async function lireCompositionAnalyte(analyteCode: string): Promise<LireCompositionResultat> {
  const analyte = await prisma.biologyAnalyte.findUnique({
    where: { code: analyteCode },
    select: {
      code: true,
      compositions: { orderBy: { verifieLe: 'desc' }, select: selectionComposition },
      elementsComposition: {
        where: { composition: { retireeLe: null } },
        select: { composition: { select: { type: true, analyte: { select: { code: true, libelle: true } } } } },
      },
    },
  });
  if (!analyte) return { ok: false, raison: 'analyte_inconnu' };

  const active = analyte.compositions.find(c => c.retireeLe === null) ?? null;
  const preparee = compositionPrepareePour(analyteCode);
  let prepareeAffichee: CompositionPrepareeAffichee | null = null;
  if (preparee) {
    const libelles = await libellesDe(preparee.composants);
    prepareeAffichee = {
      type: preparee.type,
      motif: preparee.motif,
      // Un code préparé absent du catalogue ne s'affiche pas : la base le
      // refuserait à la signature (clé étrangère).
      composants: preparee.composants.flatMap(code => {
        const l = libelles.get(code);
        return l ? [l] : [];
      }),
    };
  }

  return {
    ok: true,
    active: active ? afficher(active) : null,
    retirees: analyte.compositions.filter(c => c.retireeLe !== null).map(afficher),
    preparee: prepareeAffichee,
    operandesAbsents: operandesAbsentsPour(analyteCode),
    membreDe: analyte.elementsComposition.map(e => ({
      code: e.composition.analyte.code,
      libelle: e.composition.analyte.libelle,
      type: e.composition.type as TypeComposition,
    })),
  };
}

export type RaisonRefusComposition =
  | 'composition_non_preparee'
  | 'composants_invalides'
  | 'analyte_inconnu'
  | 'analyte_inactif'
  | 'etat_divergent';

export type DeciderCompositionResultat =
  | { ok: true; active: CompositionSigneeAffichee | null }
  | { ok: false; raison: RaisonRefusComposition };

class RefusComposition extends Error {
  constructor(readonly raison: RaisonRefusComposition) {
    super(raison);
  }
}

/** Violation d'unicité (P2002 de Prisma, 23505 de Postgres) : une autre
 *  signature est passée entre la lecture et l'écriture. */
function estUniciteViolee(err: unknown): boolean {
  const cause = (e: unknown) => (e as { cause?: unknown } | null)?.cause;
  return [err, cause(err), cause(cause(err))].some(e => {
    const { code, message } = (e ?? {}) as { code?: unknown; message?: unknown };
    return code === 'P2002' || code === '23505' || (typeof message === 'string' && message.includes('23505'));
  });
}

/** Les composants retenus : une partie non vide de la liste préparée, sans
 *  doublon, dans l'ordre de la liste. `null` si la demande en sort. */
export function composantsRetenus(preparee: CompositionPreparee, demandes: readonly string[]): string[] | null {
  const voulus = new Set(demandes);
  if (voulus.size !== demandes.length || voulus.size === 0) return null;
  for (const code of voulus) if (!preparee.composants.includes(code)) return null;
  return preparee.composants.filter(code => voulus.has(code));
}

/**
 * Signe ou retire une composition.
 *
 *  - signer : aucune composition active (état vu), composants pris dans la
 *    liste préparée ; l'en-tête et ses éléments dans UNE transaction ;
 *  - retirer : la composition active VUE, désignée par sa date de signature.
 */
export async function deciderComposition(params: {
  analyteCode: string;
  decision: 'signer' | 'retirer';
  /** Signature seulement : les codes cochés à l'écran. */
  composants?: readonly string[];
  /** Retrait seulement : la date de la composition affichée. */
  verifieLeVu?: Date;
  praticien: string;
}): Promise<DeciderCompositionResultat> {
  const { analyteCode, decision, praticien } = params;

  try {
    if (decision === 'retirer') {
      const verifieLeVu = params.verifieLeVu;
      if (!verifieLeVu) return { ok: false, raison: 'etat_divergent' };
      return await prisma.$transaction(
        async tx => {
          const { count } = await tx.biologyAnalyteComposition.updateMany({
            where: { analyteCode, verifieLe: verifieLeVu, retireeLe: null },
            data: { retireePar: praticien },
          });
          if (count !== 1) throw new RefusComposition('etat_divergent');
          return { ok: true as const, active: null };
        },
        { isolationLevel: 'ReadCommitted' },
      );
    }

    const preparee = compositionPrepareePour(analyteCode);
    if (!preparee) return { ok: false, raison: 'composition_non_preparee' };
    const retenus = composantsRetenus(preparee, params.composants ?? []);
    if (!retenus) return { ok: false, raison: 'composants_invalides' };

    return await prisma.$transaction(
      async tx => {
        const analyte = await tx.biologyAnalyte.findUnique({
          where: { code: analyteCode },
          select: { actif: true, compositions: { where: { retireeLe: null }, select: { id: true } } },
        });
        if (!analyte) throw new RefusComposition('analyte_inconnu');
        if (!analyte.actif) throw new RefusComposition('analyte_inactif');
        if (analyte.compositions.length > 0) throw new RefusComposition('etat_divergent');
        // Un composant inactif au catalogue ne se signe pas : la composition
        // nommerait une analyse que le catalogue ne propose plus.
        const presents = await tx.biologyAnalyte.count({ where: { code: { in: retenus }, actif: true } });
        if (presents !== retenus.length) throw new RefusComposition('composants_invalides');

        const { id } = await tx.biologyAnalyteComposition.create({
          data: { analyteCode, type: preparee.type, verifiePar: praticien },
          select: { id: true },
        });
        await tx.biologyAnalyteCompositionItem.createMany({
          data: retenus.map((composantCode, position) => ({ compositionId: id, composantCode, position })),
        });
        // La date est posée par la base : relire avant de rendre.
        const pose = await tx.biologyAnalyteComposition.findUniqueOrThrow({
          where: { id },
          select: selectionComposition,
        });
        return { ok: true as const, active: afficher(pose) };
      },
      { isolationLevel: 'ReadCommitted' },
    );
  } catch (err) {
    if (err instanceof RefusComposition) return { ok: false, raison: err.raison };
    if (estUniciteViolee(err)) return { ok: false, raison: 'etat_divergent' };
    throw err;
  }
}
