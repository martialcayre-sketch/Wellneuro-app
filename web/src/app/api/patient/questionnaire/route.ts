import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { isDeadlineExpired } from '@/lib/patient-access';

export type PatientQuestionnaireResponse =
  | { ok: true; assignation: AssignationInfo; questionnaire: unknown }
  | { ok: false; reason: 'not_found' | 'already_done' | 'expired' | 'invalid' | 'exception'; error: string };

type AssignationInfo = {
  idAssignation: string;
  idPatient: string;
  emailPatient: string;
  idQuestionnaire: string;
  titre: string;
  dateLimite: string | null;
  notes: string | null;
  statut: string;
};

// GET /api/patient/questionnaire?id=ASS...&email=...
export async function GET(req: Request): Promise<NextResponse<PatientQuestionnaireResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idAssignation = (searchParams.get('id') ?? '').trim();
    const emailRaw = (searchParams.get('email') ?? '').trim().toLowerCase();

    if (!idAssignation || !/^[A-Za-z0-9_-]+$/.test(idAssignation) || idAssignation.length > 64) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant invalide.' }, { status: 400 });
    }
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Email invalide.' }, { status: 400 });
    }

    const ass = await prisma.assignation.findUnique({ where: { idAssignation } });

    if (!ass) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Questionnaire introuvable. Vérifiez votre lien.' }, { status: 404 });
    }
    if (ass.emailPatient.toLowerCase() !== emailRaw) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Adresse email non reconnue pour ce questionnaire.' }, { status: 404 });
    }
    if (ass.statut === 'Complété') {
      return NextResponse.json({ ok: false, reason: 'already_done', error: 'Ce questionnaire a déjà été complété.' }, { status: 409 });
    }
    if (isDeadlineExpired(ass.dateLimite)) {
      return NextResponse.json({ ok: false, reason: 'expired', error: 'Ce lien de questionnaire a expiré.' }, { status: 410 });
    }

    const questionnaire = (QUESTIONNAIRE_CATALOGUE as Record<string, unknown>)[ass.idQuestionnaire] ?? null;

    const assignationInfo: AssignationInfo = {
      idAssignation: ass.idAssignation,
      idPatient: ass.idPatient,
      emailPatient: ass.emailPatient,
      idQuestionnaire: ass.idQuestionnaire,
      titre: ass.titre,
      dateLimite: ass.dateLimite ?? null,
      notes: ass.notes ?? null,
      statut: ass.statut,
    };

    return NextResponse.json({ ok: true, assignation: assignationInfo, questionnaire });
  } catch (err) {
    console.error('[patient/questionnaire GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
