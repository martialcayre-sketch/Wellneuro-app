import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien } from '@/lib/praticien/appartenance';

// Annulation d'un rendez-vous (accueil-observatoire LOT-04). Petite route
// dédiée (patron de `fil/refus`) : l'annulation est un STATUT (`annule`) daté,
// jamais une suppression — le rendez-vous reste une trace. Bornée au praticien
// propriétaire de la ligne.

export type AnnulationApiResponse = { ok: true } | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<AnnulationApiResponse>({ ok: false, reason, error }, { status });
}

export async function POST(req: Request): Promise<NextResponse<AnnulationApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

  try {
    const corps = (await req.json().catch(() => null)) as { id?: unknown } | null;
    const id = corps && typeof corps.id === 'string' ? corps.id : '';
    if (!id || id.length > 64) return echec('invalid', 'Rendez-vous invalide.', 400);

    const email = emailPraticien(session) ?? '';
    // Propriété vérifiée par le praticien de session : on n'annule que le sien.
    const rdv = await prisma.rendezVous.findUnique({
      where: { id },
      select: { praticienEmail: true, statut: true },
    });
    if (!rdv || rdv.praticienEmail.toLowerCase() !== email.toLowerCase()) {
      return echec('not_found', 'Rendez-vous introuvable.', 404);
    }

    // Idempotent : un rendez-vous déjà annulé n'est pas ré-écrit (la base fait
    // foi, `annule_le` garde sa première date).
    if (rdv.statut !== 'annule') {
      await prisma.rendezVous.update({
        where: { id },
        data: { statut: 'annule', annuleLe: new Date() },
      });
    }

    return NextResponse.json<AnnulationApiResponse>({ ok: true });
  } catch (err) {
    console.error('[rendez-vous annulation POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
