import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { cleCarteValide, refusCourant } from '@/lib/fil/refus';

// POST /api/praticien/fil/refus — refuse une carte du Fil, ou annule ce refus
// (gate G1).
//
// Append-only : ni UPDATE ni DELETE. Annuler un refus écrit une nouvelle ligne
// chaînée sur la précédente — c'est ce qui rend le refus réversible sans jamais
// réécrire l'histoire. Le garde-fou 5.0 dit « refusable », pas « supprimable ».
//
// Ce qui est refusé est une CLÉ DE CARTE (`lib/fil/cartes.ts`, `cleCarte`), pas
// une carte : les cartes sont des projections recalculées à chaque ouverture.

export type RefusApiResponse =
  | { ok: true; carteCle: string; refusee: boolean; inchange: boolean }
  | { ok: false; reason: string; error: string };

type PostBody = {
  idPatient?: string;
  carteCle?: string;
  refusee?: boolean;
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<RefusApiResponse>({ ok: false, reason, error }, { status });
}

export async function POST(req: Request): Promise<NextResponse<RefusApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = (body.idPatient ?? '').trim();
    if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
      return echec('invalid', 'Identifiant patient invalide.', 400);
    }
    if (!cleCarteValide(body.carteCle)) {
      return echec('invalid', 'Carte inconnue.', 400);
    }
    if (typeof body.refusee !== 'boolean') {
      return echec('invalid', 'Décision de refus manquante.', 400);
    }
    const carteCle = body.carteCle;

    const email = emailPraticien(session);
    const appartenance = await verifierAppartenancePatient(idPatient, email);
    if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    const lignes = await prisma.filCardRejection.findMany({
      where: { idPatient, carteCle },
      select: { id: true, carteCle: true, refusee: true, supersedesRejectionId: true, refuseLe: true },
    });
    const courant = refusCourant(lignes, carteCle);

    // Idempotence : la carte est déjà dans l'état demandé. Rien à écrire —
    // chaîner une ligne identique n'ajouterait aucune information.
    if ((courant?.refusee ?? false) === body.refusee) {
      return NextResponse.json({ ok: true, carteCle, refusee: body.refusee, inchange: true });
    }

    await prisma.filCardRejection.create({
      data: {
        idPatient,
        carteCle,
        refusee: body.refusee,
        refusePar: email ?? '',
        supersedesRejectionId: courant?.id ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, carteCle, refusee: body.refusee, inchange: false }, { status: 201 });
  } catch (err) {
    console.error('[praticien/fil/refus POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
