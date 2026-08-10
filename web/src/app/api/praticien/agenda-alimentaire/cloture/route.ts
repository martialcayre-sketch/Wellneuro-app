import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { cloturerAgendaAli } from '@/lib/agenda-alimentaire/cloture';
import { AGENDA_ALI_ID } from '@/lib/agenda-alimentaire/types';

// Clôture praticien d'un agenda alimentaire : possible à tout moment (patient
// qui ne revient plus), dès qu'au moins une journée existe et qu'aucune ligne
// n'est en quarantaine (garanti par cloturerAgendaAli). Produit la
// QuestionnaireReponse standard non scorée (D-039) — patron copié de
// `praticien/agenda-sommeil/cloture/route.ts`.
//
// ── AUCUNE GARDE DE DRAPEAU `WN_AGENDA_ALI` ICI, ET C'EST DÉLIBÉRÉ ──────────
// Même arbitrage que le lecteur praticien (LOT-05 de la campagne agenda,
// amendant D-025) : le drapeau gouverne la bibliothèque, le hub patient et
// l'ÉCRITURE de journées — jamais la consolidation d'un recueil déjà collecté.
// La clôture ne collecte rien : elle rend lisible ce qui existe, et doit le
// rester après extinction (le cas « patient qui ne revient plus » est
// précisément celui du drapeau éteint). D-033 est ainsi tenue : le chemin est
// le même dans les deux positions. Ne pas ajouter `isAgendaAlimentaireEnabled`
// ici sans repasser par une décision.

type PostResponse =
  | { ok: true; idReponse: string; nbJours: number; dejaCloture: boolean }
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

    // Journal d'accès (G-TRUST-04) : la clôture lit les journées du patient et
    // produit une réponse — elle laisse donc une trace nommée, comme le GET.
    const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: '/api/praticien/agenda-alimentaire/cloture',
      methode: 'POST',
    });
    if (verdict !== 'accessible') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    // Garde d'appartenance croisée : l'assignation doit être celle de CE patient
    // et bien un agenda alimentaire (cloturerAgendaAli re-vérifie l'instrument).
    const ass = await prisma.assignation.findUnique({
      where: { idAssignation },
      select: { idPatient: true, idQuestionnaire: true },
    });
    if (!ass || ass.idPatient !== idPatient || ass.idQuestionnaire !== AGENDA_ALI_ID) {
      return NextResponse.json(
        { ok: false, reason: 'not_found', error: 'Agenda introuvable pour ce patient.' },
        { status: 404 },
      );
    }

    const { idReponse, nbJours, dejaCloture } = await cloturerAgendaAli({ idAssignation });
    return NextResponse.json({ ok: true, idReponse, nbJours, dejaCloture });
  } catch (err) {
    if (err instanceof TypeError) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: err.message }, { status: 400 });
    }
    console.error('[praticien/agenda-alimentaire/cloture POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
