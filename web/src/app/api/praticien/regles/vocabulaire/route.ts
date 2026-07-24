import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isC4Enabled } from '@/lib/supplement-library/featureFlag';
import {
  CATEGORIE_MAX,
  CODE_GOUVERNE_RE,
  LABEL_MAX,
} from '@/lib/supplement-library/gouvernance';

// Vocabulaire gouverné de l'atelier de règles (C4, LOT-03b).
//
// Décisions actées n°4 et n°7 : les intentions (`clinical_intent_tags`) et les
// critères (`clinical_criteria`) sont de la DONNÉE, pas du code — ajouter une
// entrée est un acte praticien ici, jamais un déploiement. Le GET sert aussi,
// en lecture seule, les référentiels que le formulaire de règle doit citer
// (ingrédients + formes, sources) : leur gouvernance d'écriture appartient à
// d'autres lots (C4A, décision n°11 — une source externe ne produit que des
// brouillons) et n'a pas de POST ici.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type EntreeVocabulaire = {
  id: string;
  code: string;
  labelFr: string;
  categorie: string | null;
};

export type ReglesVocabulaireApiResponse =
  | {
      ok: true;
      intentions: EntreeVocabulaire[];
      criteres: EntreeVocabulaire[];
      ingredients: Array<{
        id: string;
        code: string;
        nomFr: string;
        formes: Array<{ id: string; code: string; labelFr: string }>;
      }>;
      sources: Array<{ id: string; citation: string; lienUrl: string | null }>;
    }
  | { ok: false; reason: string; error: string };

export type VocabulaireCreationApiResponse =
  | { ok: true; type: 'intention' | 'critere'; entree: EntreeVocabulaire }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false as const, reason, error }, { status });
}

// GET /api/praticien/regles/vocabulaire
export async function GET(): Promise<NextResponse<ReglesVocabulaireApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    if (!isC4Enabled()) {
      return echec('flag_eteint', 'Atelier de règles indisponible (rayon compléments désactivé).', 404);
    }

    const [intentions, criteres, ingredients, sources] = await Promise.all([
      prisma.clinicalIntentTag.findMany({
        where: { actif: true },
        orderBy: [{ labelFr: 'asc' }],
        select: { id: true, code: true, labelFr: true, categorie: true },
      }),
      prisma.clinicalCriterion.findMany({
        where: { actif: true },
        orderBy: [{ labelFr: 'asc' }],
        select: { id: true, code: true, labelFr: true, categorie: true },
      }),
      prisma.supplementIngredient.findMany({
        where: { actif: true },
        orderBy: [{ nomFr: 'asc' }],
        select: {
          id: true,
          code: true,
          nomFr: true,
          formes: {
            where: { actif: true },
            orderBy: [{ labelFr: 'asc' }],
            select: { id: true, code: true, labelFr: true },
          },
        },
      }),
      prisma.supplementSourceReference.findMany({
        where: { actif: true },
        orderBy: [{ citation: 'asc' }],
        select: { id: true, citation: true, lienUrl: true },
      }),
    ]);

    return NextResponse.json({ ok: true, intentions, criteres, ingredients, sources });
  } catch (err) {
    console.error('[praticien/regles/vocabulaire GET]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}

type PostBody = { type?: unknown; code?: unknown; labelFr?: unknown; categorie?: unknown };

// POST /api/praticien/regles/vocabulaire — { type: 'intention'|'critere', code,
// labelFr, categorie? } — la catégorie est obligatoire pour une intention
// (schéma), facultative pour un critère.
export async function POST(req: Request): Promise<NextResponse<VocabulaireCreationApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    if (!isC4Enabled()) {
      return echec('flag_eteint', 'Atelier de règles indisponible (rayon compléments désactivé).', 404);
    }

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const type = typeof body.type === 'string' ? body.type.trim() : '';
    if (type !== 'intention' && type !== 'critere') {
      return echec('type_invalide', 'Type de vocabulaire inconnu (intention ou critere).', 400);
    }

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!CODE_GOUVERNE_RE.test(code)) {
      return echec('code_invalide', 'Code invalide (snake_case minuscule attendu).', 400);
    }

    const labelFr = typeof body.labelFr === 'string' ? body.labelFr.trim() : '';
    if (labelFr.length === 0 || labelFr.length > LABEL_MAX) {
      return echec('label_requis', `Le libellé français est obligatoire (${LABEL_MAX} caractères au plus).`, 400);
    }

    const categorie = typeof body.categorie === 'string' ? body.categorie.trim() : '';
    if (categorie.length > CATEGORIE_MAX) {
      return echec('categorie_invalide', `Catégorie trop longue (${CATEGORIE_MAX} caractères au plus).`, 400);
    }
    if (type === 'intention' && categorie.length === 0) {
      return echec('categorie_requise', 'La catégorie est obligatoire pour une intention.', 400);
    }

    try {
      const entree =
        type === 'intention'
          ? await prisma.clinicalIntentTag.create({
              data: { code, labelFr, categorie },
              select: { id: true, code: true, labelFr: true, categorie: true },
            })
          : await prisma.clinicalCriterion.create({
              data: { code, labelFr, categorie: categorie || null },
              select: { id: true, code: true, labelFr: true, categorie: true },
            });
      return NextResponse.json({ ok: true, type, entree }, { status: 201 });
    } catch (err) {
      // Unicité du code (P2002) : le vocabulaire ne duplique jamais un code.
      if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002') {
        return echec('code_deja_pris', 'Ce code existe déjà dans le vocabulaire.', 409);
      }
      throw err;
    }
  } catch (err) {
    console.error('[praticien/regles/vocabulaire POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
