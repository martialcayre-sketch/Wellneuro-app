import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';
import { lireEquilibrePatient } from '@/lib/equilibre/lecturePatient';
import type { PatientEquilibreResponse } from '@/app/api/patient/equilibre/route';

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/apercu-patient/equilibre';

// Miroir patient-safe de /api/patient/equilibre, pour l'aperçu praticien de
// « Mon équilibre » (dette t07b, mécanisme PrévisualisationPatient,
// CONTRATS_UX_P1.md §3). Gate NextAuth au lieu du cookie portail.
//
// LA MÊME COMPOSITION QUE LE PORTAIL (`lireEquilibrePatient`), et pas
// `api/praticien/equilibre` : celle-là sert les niveaux de preuve et
// l'identité, que le patient ne voit pas — l'aperçu montrerait autre chose
// que ce que le patient lit. Ne rien ajouter à cette réponse.
export type ApercuPatientEquilibreResponse = PatientEquilibreResponse;

// GET /api/praticien/apercu-patient/equilibre?id=ASS...
export async function GET(req: Request): Promise<NextResponse<ApercuPatientEquilibreResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Non authentifié.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const idAssignation = (searchParams.get('id') ?? '').trim();
    if (!idAssignation || !/^[A-Za-z0-9_-]+$/.test(idAssignation) || idAssignation.length > 64) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant invalide.' }, { status: 400 });
    }

    const emailSession = emailPraticien(session);
    if (!emailSession) {
      return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Non authentifié.' }, { status: 401 });
    }

    // L'appartenance se juge sur le patient que l'assignation désigne : une
    // assignation d'un autre praticien est « non reconnue », comme une
    // assignation inexistante.
    const ass = await prisma.assignation.findFirst({
      where: { idAssignation, patient: filtrePatientsDuPraticien(emailSession) },
      select: { idPatient: true },
    });
    if (!ass) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Assignation non reconnue.' }, { status: 404 });
    }

    // Le dossier nommé par l'assignation résolue est consulté : journalisé
    // avant la lecture.
    await journaliserAccesDossier({ idPatient: ass.idPatient, praticienEmail: emailSession, route: ROUTE_JOURNAL, methode: 'GET' });

    return NextResponse.json(await lireEquilibrePatient(ass.idPatient));
  } catch (err) {
    console.error('[praticien/apercu-patient/equilibre GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
