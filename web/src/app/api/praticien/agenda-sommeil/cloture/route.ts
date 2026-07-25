import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { cloturerAgenda } from '@/lib/agenda-sommeil/cloture';
import { AGENDA_SOMMEIL_ID } from '@/lib/agenda-sommeil/types';

// Clôture praticien d'un agenda du sommeil : possible à tout moment (patient qui
// ne revient plus), dès qu'au moins une nuit existe (garanti par cloturerAgenda).
// Produit les agrégats et la réponse — chemin partagé avec la clôture patient.

type PostResponse =
  | { ok: true; idReponse: string; nbNuits: number; dejaCloture: boolean }
  | { ok: false; reason: string; error: string };

function sanitizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? trimmed : null;
}

export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification praticien requise.' },
        { status: 401 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
    }

    const idPatient = sanitizeId(body.idPatient);
    const idAssignation = sanitizeId(body.idAssignation);
    if (!idPatient || !idAssignation) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Identifiants invalides.' },
        { status: 400 },
      );
    }

    // Journal d'accès (G-TRUST-04) : la clôture lit les nuits du patient et
    // produit une réponse — elle laisse donc une trace nommée, comme le GET.
    const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: '/api/praticien/agenda-sommeil/cloture',
      methode: 'POST',
    });
    if (verdict !== 'accessible') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    // Garde d'appartenance croisée : l'assignation doit être celle de CE patient
    // et bien un agenda du sommeil (cloturerAgenda re-vérifie l'instrument).
    const ass = await prisma.assignation.findUnique({
      where: { idAssignation },
      select: { idPatient: true, idQuestionnaire: true },
    });
    if (!ass || ass.idPatient !== idPatient || ass.idQuestionnaire !== AGENDA_SOMMEIL_ID) {
      return NextResponse.json(
        { ok: false, reason: 'not_found', error: 'Agenda introuvable pour ce patient.' },
        { status: 404 },
      );
    }

    const { idReponse, nbNuits, dejaCloture } = await cloturerAgenda({ idAssignation });
    return NextResponse.json({ ok: true, idReponse, nbNuits, dejaCloture });
  } catch (err) {
    if (err instanceof TypeError) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: err.message }, { status: 400 });
    }
    console.error('[praticien/agenda-sommeil/cloture POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
