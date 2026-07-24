import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { lignesInbox, type LigneInbox } from '@/lib/fil/inbox';

export type InboxQuestionnairesApiResponse = {
  ok: boolean;
  lignes: LigneInbox[];
  unavailable?: boolean;
  error?: string;
};

const INDISPONIBLE: Omit<InboxQuestionnairesApiResponse, 'error'> = {
  ok: false,
  lignes: [],
  unavailable: true,
};

// GET /api/praticien/inbox-questionnaires — questionnaires reçus en attente
// de consultation, groupés PAR PATIENT (accueil Observatoire LOT-02, décision
// propriétaire 2026-07-23 : remplace les cartes « Reçu » du Fil). L'ancre
// « déjà vu » est la dernière consultation validée — même ancre que le
// pré-vol SP-COP. Lecture seule.
export async function GET(): Promise<NextResponse<InboxQuestionnairesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const patients = await prisma.patient.findMany({
      where: { actif: true, ...filtrePatientsDuPraticien(emailPraticien(session) ?? '') },
      select: { idPatient: true, prenom: true, nom: true },
      take: 200,
    });
    const ids = patients.map(p => p.idPatient);
    if (ids.length === 0) return NextResponse.json({ ok: true, lignes: [] });

    const [reponses, consultations] = await Promise.all([
      prisma.questionnaireReponse.findMany({
        where: { idPatient: { in: ids } },
        select: { idPatient: true, titre: true, dateReponse: true },
        orderBy: { dateReponse: 'desc' },
        take: 500,
      }),
      prisma.consultation.groupBy({
        by: ['idPatient'],
        where: { idPatient: { in: ids }, dateValidation: { not: null } },
        _max: { dateValidation: true },
      }),
    ]);

    const ancres = new Map(
      consultations
        .filter(c => c._max.dateValidation !== null)
        .map(c => [c.idPatient, c._max.dateValidation as Date]),
    );
    const noms = new Map(patients.map(p => [p.idPatient, `${p.prenom} ${p.nom}`.trim()]));

    return NextResponse.json({ ok: true, lignes: lignesInbox(reponses, ancres, noms) });
  } catch (err) {
    console.error('[inbox-questionnaires GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ...INDISPONIBLE, error: 'Erreur technique.' }, { status: 500 });
  }
}
