import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveDefinition } from '@/lib/instruments';
import { isDeadlineExpired } from '@/lib/patient-access';
import { isSessionAuthorizedForAssignment, readPatientSession } from '@/lib/patient-session';

export type PatientQuestionnaireResponse =
  | { ok: true; assignation: AssignationInfo; questionnaire: unknown }
  | { ok: false; reason: 'not_found' | 'expired' | 'invalid' | 'exception'; error: string };

export type AssignationInfo = {
  idAssignation: string;
  idPatient: string;
  emailPatient: string;
  idQuestionnaire: string;
  titre: string;
  dateLimite: string | null;
  notes: string | null;
  statut: string;
  consentement: string;
  statutReponses: string;
};

// GET /api/patient/questionnaire?id=ASS...&email=...
export async function GET(req: Request): Promise<NextResponse<PatientQuestionnaireResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idAssignation = (searchParams.get('id') ?? '').trim();
    // Identité : cookie de session portail en priorité, sinon email en query
    // (compat liens email legacy /patient/[idAssignation]).
    const patientSession = readPatientSession(req);
    const emailRaw = (patientSession?.email ?? searchParams.get('email') ?? '').trim().toLowerCase();

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
    const accessAllowed = patientSession
      ? await isSessionAuthorizedForAssignment(patientSession, ass)
      : ass.emailPatient.toLowerCase() === emailRaw;
    if (!accessAllowed) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Adresse email non reconnue pour ce questionnaire.' }, { status: 404 });
    }
    // La date limite ne bloque que le remplissage/modification, pas la consultation
    // des réponses déjà verrouillées (droit de consultation permanent, R8-lite).
    const bloqueParDeadline = ass.statutReponses !== 'verrouille' && ass.statutReponses !== 'modification_demandee';
    if (bloqueParDeadline && isDeadlineExpired(ass.dateLimite)) {
      return NextResponse.json({ ok: false, reason: 'expired', error: 'Ce lien de questionnaire a expiré.' }, { status: 410 });
    }

    // Resolver commun catalogue/cabinet en mode passation : l'assignation
    // fait autorité — un instrument CAB_ déjà envoyé reste rendu même s'il a
    // été désactivé ou dépublié entre-temps. Un id sans définition (ligne
    // absente) rend null : l'écran « pas encore disponible » fait le reste.
    const questionnaire = await resolveDefinition(ass.idQuestionnaire, { pourPassation: true });

    const assignationInfo: AssignationInfo = {
      idAssignation: ass.idAssignation,
      idPatient: ass.idPatient,
      emailPatient: ass.emailPatient,
      idQuestionnaire: ass.idQuestionnaire,
      titre: ass.titre,
      dateLimite: ass.dateLimite ?? null,
      notes: ass.notes ?? null,
      statut: ass.statut,
      consentement: ass.consentement,
      statutReponses: ass.statutReponses,
    };

    return NextResponse.json({ ok: true, assignation: assignationInfo, questionnaire });
  } catch (err) {
    console.error('[patient/questionnaire GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
