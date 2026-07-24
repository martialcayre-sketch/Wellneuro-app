import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { lignesInbox, type LigneInbox } from '@/lib/fil/inbox';
import { getSubScoreRanges, type ScoreRange } from '@/lib/scoring/ranges';

export type InboxQuestionnaireDetail = {
  idReponse: string;
  idPatient: string;
  idAssignation: string;
  idQuestionnaire: string;
  titre: string;
  dateSoumission: string;
  scoresParsed: Record<string, unknown> | null;
  rawAnswers: Record<string, unknown> | null;
  scorePrincipal: number | null;
  interpretation: string;
  subScoreRanges: Record<string, ScoreRange[]> | null;
};

export type InboxQuestionnairesApiResponse = {
  ok: boolean;
  lignes: LigneInbox[];
  patient?: { idPatient: string; nom: string };
  reponses?: InboxQuestionnaireDetail[];
  unavailable?: boolean;
  error?: string;
};

const INDISPONIBLE: Omit<InboxQuestionnairesApiResponse, 'error'> = {
  ok: false,
  lignes: [],
  unavailable: true,
};

function extraireRawAnswers(scores: unknown): Record<string, unknown> | null {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return null;
  const raw = (scores as Record<string, unknown>).rawAnswers;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

type ReponseInboxDb = {
  idReponse: string;
  idPatient: string;
  idAssignation: string | null;
  idQuestionnaire: string;
  titre: string;
  dateReponse: Date;
  scoresJson: unknown;
  scorePrincipal: number | null;
  interpretation: string | null;
};

function filtrerReponsesEnAttente(
  reponses: ReponseInboxDb[],
  ancres: Map<string, Date>,
  lues: Set<string>,
): ReponseInboxDb[] {
  return reponses.filter(r => {
    if (lues.has(r.idReponse)) return false;
    const ancre = ancres.get(r.idPatient);
    return !ancre || r.dateReponse > ancre;
  });
}

// GET /api/praticien/inbox-questionnaires — questionnaires reçus en attente
// de consultation, groupés PAR PATIENT (accueil Observatoire LOT-02, décision
// propriétaire 2026-07-23 : remplace les cartes « Reçu » du Fil). L'ancre
// « déjà vu » est la dernière consultation validée — même ancre que le
// pré-vol SP-COP ; l'accusé de lecture praticien retire ensuite les réponses
// confirmées lues, questionnaire par questionnaire.
export async function GET(req: Request): Promise<NextResponse<InboxQuestionnairesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }

  const idPatientDetail = (new URL(req.url).searchParams.get('idPatient') ?? '').trim();
  const emailSession = emailPraticien(session) ?? '';
  if (!emailSession) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const patients = await prisma.patient.findMany({
      where: {
        actif: true,
        ...(idPatientDetail ? { idPatient: idPatientDetail } : {}),
        ...filtrePatientsDuPraticien(emailSession),
      },
      select: { idPatient: true, prenom: true, nom: true },
      take: 200,
    });
    const ids = patients.map(p => p.idPatient);
    if (ids.length === 0) return NextResponse.json({ ok: true, lignes: [] });

    const selectReponse = idPatientDetail
      ? {
          idReponse: true,
          idPatient: true,
          idAssignation: true,
          idQuestionnaire: true,
          titre: true,
          dateReponse: true,
          scoresJson: true,
          scorePrincipal: true,
          interpretation: true,
        }
      : {
          idReponse: true,
          idPatient: true,
          titre: true,
          dateReponse: true,
        };
    const [reponses, consultations] = await Promise.all([
      prisma.questionnaireReponse.findMany({
        where: { idPatient: { in: ids } },
        select: selectReponse,
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
    const reponsesNormalisees: ReponseInboxDb[] = reponses.map(r => ({
      idReponse: r.idReponse,
      idPatient: r.idPatient,
      idAssignation: 'idAssignation' in r ? r.idAssignation : null,
      idQuestionnaire: 'idQuestionnaire' in r ? r.idQuestionnaire : '',
      titre: r.titre,
      dateReponse: r.dateReponse,
      scoresJson: 'scoresJson' in r ? r.scoresJson : null,
      scorePrincipal: 'scorePrincipal' in r ? r.scorePrincipal : null,
      interpretation: 'interpretation' in r ? r.interpretation : null,
    }));
    const lectures = reponses.length > 0
      ? await prisma.questionnaireLecturePraticien.findMany({
          where: { idReponse: { in: reponses.map(r => r.idReponse) } },
          select: { idReponse: true },
        })
      : [];
    const lues = new Set(lectures.map(l => l.idReponse));

    if (idPatientDetail) {
      const patient = patients[0];
      const enAttente = filtrerReponsesEnAttente(reponsesNormalisees, ancres, lues);
      return NextResponse.json({
        ok: true,
        lignes: [],
        patient: { idPatient: patient.idPatient, nom: noms.get(patient.idPatient) ?? 'Patient' },
        reponses: enAttente.map(r => ({
          idReponse: r.idReponse,
          idPatient: r.idPatient,
          idAssignation: r.idAssignation ?? '',
          idQuestionnaire: r.idQuestionnaire,
          titre: r.titre,
          dateSoumission: r.dateReponse.toISOString(),
          scoresParsed: (r.scoresJson as Record<string, unknown>) ?? null,
          rawAnswers: extraireRawAnswers(r.scoresJson),
          scorePrincipal: r.scorePrincipal ?? null,
          interpretation: r.interpretation ?? '',
          subScoreRanges: getSubScoreRanges(r.idQuestionnaire),
        })),
      });
    }

    return NextResponse.json({ ok: true, lignes: lignesInbox(reponsesNormalisees, ancres, noms, lues) });
  } catch (err) {
    console.error('[inbox-questionnaires GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ...INDISPONIBLE, error: 'Erreur technique.' }, { status: 500 });
  }
}

type LecturePayload = { idPatient?: string; idsReponses?: unknown };

// POST /api/praticien/inbox-questionnaires — confirmation explicite de lecture
// praticien. Le serveur revalide l'appartenance et ne crée une lecture que pour
// les réponses encore en attente de ce patient.
export async function POST(req: Request): Promise<NextResponse<InboxQuestionnairesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }
  const emailSession = emailPraticien(session) ?? '';
  if (!emailSession) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }

  let payload: LecturePayload;
  try {
    payload = (await req.json()) as LecturePayload;
  } catch {
    return NextResponse.json({ ...INDISPONIBLE, error: 'JSON invalide.' }, { status: 400 });
  }

  const idPatient = (payload.idPatient ?? '').trim();
  const idsReponses = Array.isArray(payload.idsReponses)
    ? payload.idsReponses.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : [];
  if (!idPatient || idsReponses.length === 0) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Patient ou réponses invalides.' }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: { idPatient, actif: true, ...filtrePatientsDuPraticien(emailSession) },
      select: { idPatient: true },
    });
    if (!patient) {
      return NextResponse.json({ ...INDISPONIBLE, error: 'Patient introuvable.' }, { status: 404 });
    }

    const [reponses, consultation] = await Promise.all([
      prisma.questionnaireReponse.findMany({
        where: { idPatient, idReponse: { in: idsReponses } },
        select: { idReponse: true, idPatient: true, titre: true, dateReponse: true },
      }),
      prisma.consultation.groupBy({
        by: ['idPatient'],
        where: { idPatient, dateValidation: { not: null } },
        _max: { dateValidation: true },
      }),
    ]);
    const ancres = new Map(
      consultation
        .filter(c => c._max.dateValidation !== null)
        .map(c => [c.idPatient, c._max.dateValidation as Date]),
    );
    const dejaLues = reponses.length > 0
      ? await prisma.questionnaireLecturePraticien.findMany({
          where: { idReponse: { in: reponses.map(r => r.idReponse) } },
          select: { idReponse: true },
        })
      : [];
    const idsLues = new Set(dejaLues.map(l => l.idReponse));
    const aConfirmer = filtrerReponsesEnAttente(
      reponses.map(r => ({
        ...r,
        idAssignation: null,
        idQuestionnaire: '',
        scoresJson: null,
        scorePrincipal: null,
        interpretation: null,
      })),
      ancres,
      idsLues,
    );
    if (aConfirmer.length === 0) {
      return NextResponse.json({ ok: true, lignes: [] });
    }

    await prisma.questionnaireLecturePraticien.createMany({
      data: aConfirmer.map(r => ({
        idReponse: r.idReponse,
        idPatient,
        praticienEmail: emailSession,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true, lignes: [] });
  } catch (err) {
    console.error('[inbox-questionnaires POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ...INDISPONIBLE, error: 'Erreur technique.' }, { status: 500 });
  }
}
