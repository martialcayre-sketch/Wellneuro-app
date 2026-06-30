import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/praticien/migrate-historique
// Lot C5 — migration ponctuelle des données historiques Google Sheets vers PostgreSQL.
// Idempotent (upsert par identifiant métier) : peut être relancé sans dupliquer.
// Ordre obligatoire patients → assignations → réponses (contraintes FK sur id_patient).

const DATA_START = 3;

type MigratePayload = { dryRun?: boolean };

type EntityReport = {
  total: number;
  migres: number;
  ignores: number;
  erreurs: number;
  details: string[];
};

export type MigrateHistoriqueResponse = {
  success: boolean;
  dryRun?: boolean;
  patients?: EntityReport;
  assignations?: EntityReport;
  reponses?: EntityReport;
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'no_sheet_id'
    | 'no_access_token'
    | 'sheets_400'
    | 'sheets_401'
    | 'sheets_403'
    | 'sheets_404'
    | 'exception';
};

function mapSheetsReason(status: number): MigrateHistoriqueResponse['reason'] {
  if (status === 400) return 'sheets_400';
  if (status === 401) return 'sheets_401';
  if (status === 403) return 'sheets_403';
  if (status === 404) return 'sheets_404';
  return 'exception';
}

function newReport(): EntityReport {
  return { total: 0, migres: 0, ignores: 0, erreurs: 0, details: [] };
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request): Promise<NextResponse<MigrateHistoriqueResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  const sheetId = process.env.SHEET_ID;
  const accessToken = session.accessToken;
  if (!sheetId || !accessToken) {
    return NextResponse.json({
      success: false,
      reason: !sheetId ? 'no_sheet_id' : 'no_access_token',
      error: 'Configuration incomplète.',
    });
  }

  let payload: MigratePayload = {};
  try {
    payload = (await req.json()) as MigratePayload;
  } catch {
    // body optionnel, dryRun=false par défaut
  }
  const dryRun = payload.dryRun === true;

  const ranges = ['Patients!A:J', 'Assignations!A:I', 'Rep_Questionnaires!A:K'];
  const qs = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${qs}`;

  let valueRanges: { values?: string[][] }[];
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!resp.ok) {
      return NextResponse.json({ success: false, reason: mapSheetsReason(resp.status), error: 'Lecture Google Sheets impossible.' });
    }
    const data = await resp.json();
    valueRanges = data.valueRanges ?? [];
  } catch {
    return NextResponse.json({ success: false, reason: 'exception', error: 'Erreur technique lors de la lecture Sheets.' });
  }

  const patientRows: string[][] = (valueRanges[0]?.values ?? []).slice(DATA_START);
  const assignationRows: string[][] = (valueRanges[1]?.values ?? []).slice(DATA_START);
  const reponseRows: string[][] = (valueRanges[2]?.values ?? []).slice(DATA_START);

  const patientsReport = newReport();
  const assignationsReport = newReport();
  const reponsesReport = newReport();

  // 1. Patients (A:idPatient B:email C:role D:prenom E:nom F:dateNaissance G:telephone H:praticienEmail I:createdAt J:actif)
  const migratedPatientIds = new Set<string>();
  for (const row of patientRows) {
    const idPatient = row[0] ?? '';
    const email = (row[1] ?? '').trim().toLowerCase();
    const role = row[2] ?? '';
    patientsReport.total += role === 'Patient' ? 1 : 0;
    if (!idPatient || role !== 'Patient' || !email) continue;

    const prenom = row[3] ?? '';
    const nom = row[4] ?? '';
    const dateNaissance = row[5] || null;
    const telephone = row[6] || null;
    const praticienEmail = (row[7] ?? '').trim().toLowerCase() || 'inconnu@wellneuro.fr';
    const actif = row[9] === 'OUI';

    try {
      if (!dryRun) {
        await prisma.patient.upsert({
          where: { idPatient },
          update: {},
          create: { idPatient, email, prenom, nom, dateNaissance, telephone, praticienEmail, actif },
        });
      }
      migratedPatientIds.add(idPatient);
      patientsReport.migres++;
    } catch (e) {
      patientsReport.erreurs++;
      patientsReport.details.push(`${idPatient}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  patientsReport.ignores = patientsReport.total - patientsReport.migres - patientsReport.erreurs;

  // 2. Assignations (A:id B:idPatient C:email D:idQuestionnaire E:titre F:dateAssignation G:dateLimite H:statut I:notes)
  for (const row of assignationRows) {
    const idAssignation = row[0] ?? '';
    assignationsReport.total += idAssignation ? 1 : 0;
    if (!idAssignation) continue;

    const idPatient = row[1] ?? '';
    const emailPatient = (row[2] ?? '').trim().toLowerCase();
    const idQuestionnaire = row[3] ?? '';
    const titre = row[4] ?? idQuestionnaire;
    const dateAssignation = parseDate(row[5]);
    const dateLimite = row[6] || null;
    const statut = row[7] || 'En attente';
    const notes = row[8] || null;

    const patientConnu = migratedPatientIds.has(idPatient) || (dryRun && patientRows.some(p => p[0] === idPatient));
    if (!idPatient || !emailPatient || !idQuestionnaire || !dateAssignation || !patientConnu) {
      assignationsReport.erreurs++;
      assignationsReport.details.push(`${idAssignation}: données invalides ou patient ${idPatient} introuvable`);
      continue;
    }

    try {
      if (!dryRun) {
        await prisma.assignation.upsert({
          where: { idAssignation },
          update: {},
          create: { idAssignation, idPatient, emailPatient, idQuestionnaire, titre, dateAssignation, dateLimite, statut, notes },
        });
      }
      assignationsReport.migres++;
    } catch (e) {
      assignationsReport.erreurs++;
      assignationsReport.details.push(`${idAssignation}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3. Réponses (A:id B:idPatient C:email D:idAssignation E:idQuestionnaire F:titre G:dateSoumission H:reponsesJson I:scoresJson J:scorePrincipal K:interpretation)
  for (const row of reponseRows) {
    const idReponse = row[0] ?? '';
    reponsesReport.total += idReponse ? 1 : 0;
    if (!idReponse) continue;

    const idPatient = row[1] ?? '';
    const emailPatient = (row[2] ?? '').trim().toLowerCase();
    const idAssignation = row[3] || null;
    const idQuestionnaire = row[4] ?? '';
    const titre = row[5] ?? idQuestionnaire;
    const dateReponse = parseDate(row[6]);
    const scorePrincipalRaw = row[9] !== undefined ? parseFloat(row[9]) : NaN;
    const scorePrincipal = Number.isNaN(scorePrincipalRaw) ? null : scorePrincipalRaw;
    const interpretation = row[10] || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scoresJson: any;
    try {
      scoresJson = row[8] ? JSON.parse(row[8]) : {};
    } catch {
      scoresJson = { _migration_raw_non_parsable: row[8] ?? '' };
    }

    const patientConnu = migratedPatientIds.has(idPatient) || (dryRun && patientRows.some(p => p[0] === idPatient));
    if (!idPatient || !emailPatient || !idQuestionnaire || !dateReponse || !patientConnu) {
      reponsesReport.erreurs++;
      reponsesReport.details.push(`${idReponse}: données invalides ou patient ${idPatient} introuvable`);
      continue;
    }

    try {
      if (!dryRun) {
        await prisma.questionnaireReponse.upsert({
          where: { idReponse },
          update: {},
          create: {
            idReponse, idPatient, emailPatient, idAssignation, idQuestionnaire, titre,
            dateReponse, scoresJson, scorePrincipal, interpretation,
          },
        });
      }
      reponsesReport.migres++;
    } catch (e) {
      reponsesReport.erreurs++;
      reponsesReport.details.push(`${idReponse}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({
    success: true,
    dryRun,
    patients: patientsReport,
    assignations: assignationsReport,
    reponses: reponsesReport,
  });
}
