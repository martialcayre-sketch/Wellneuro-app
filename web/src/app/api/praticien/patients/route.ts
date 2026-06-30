import { getServerSession, type Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DATA_START = 3;
const MAX_ASSIGNATIONS = 40;

type Patient = {
  idPatient: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: string;
  actif: string;
};

type Assignation = {
  idAssignation: string;
  idPatient: string;
  emailPatient: string;
  idQuestionnaire: string;
  titre: string;
  dateAssignation: string;
  statut: string;
};

export type PatientsApiResponse = {
  patients: Patient[];
  assignations: Assignation[];
  unavailable?: boolean;
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

export type CreatePatientResponse = {
  success: boolean;
  patient?: Patient;
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'no_sheet_id'
    | 'no_access_token'
    | 'invalid_payload'
    | 'duplicate_email'
    | 'sheets_400'
    | 'sheets_401'
    | 'sheets_403'
    | 'sheets_404'
    | 'exception';
};

export type PatchPatientResponse = {
  success: boolean;
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'no_sheet_id'
    | 'no_access_token'
    | 'invalid_payload'
    | 'patient_not_found'
    | 'sheets_400'
    | 'sheets_401'
    | 'sheets_403'
    | 'sheets_404'
    | 'exception';
};

type SessionContext = {
  session: Session | null;
  sheetId?: string;
  accessToken?: string;
};

function getSessionContext(session: SessionContext['session']): SessionContext {
  return {
    session,
    sheetId: process.env.SHEET_ID,
    accessToken: session?.accessToken,
  };
}

function mapSheetsReason(status: number): 'sheets_400' | 'sheets_401' | 'sheets_403' | 'sheets_404' | 'exception' {
  if (status === 400) return 'sheets_400';
  if (status === 401) return 'sheets_401';
  if (status === 403) return 'sheets_403';
  if (status === 404) return 'sheets_404';
  return 'exception';
}

export async function GET(): Promise<NextResponse<PatientsApiResponse>> {
  const session = await getServerSession(authOptions);
  const { sheetId, accessToken } = getSessionContext(session);

  if (!session) {
    return NextResponse.json(
      {
        patients: [],
        assignations: [],
        unavailable: true,
        reason: 'unauthenticated',
      },
      { status: 401 }
    );
  }

  if (!sheetId || !accessToken) {
    return NextResponse.json({
      patients: [],
      assignations: [],
      unavailable: true,
      reason: !sheetId ? 'no_sheet_id' : 'no_access_token',
    });
  }

  const ranges = ['Patients!A:J', 'Assignations!A:H'];
  const qs = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${qs}`;

  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!resp.ok) {
      const reason =
        mapSheetsReason(resp.status);

      return NextResponse.json({
        patients: [],
        assignations: [],
        unavailable: true,
        reason,
      });
    }

    const data = await resp.json();
    const [patientsRange, assignationsRange] = data.valueRanges ?? [];

    const patientRows: string[][] = (patientsRange?.values ?? []).slice(DATA_START);
    const assignationRows: string[][] = (assignationsRange?.values ?? []).slice(DATA_START);

    const patients = patientRows
      .filter(row => row[0] && row[2] === 'Patient')
      .map(row => ({
        idPatient: row[0] ?? '',
        email: row[1] ?? '',
        prenom: row[3] ?? '',
        nom: row[4] ?? '',
        telephone: row[6] ?? '',
        actif: row[9] ?? '',
      }));

    const assignations = assignationRows
      .filter(row => row[0])
      .slice(-MAX_ASSIGNATIONS)
      .reverse()
      .map(row => ({
        idAssignation: row[0] ?? '',
        idPatient: row[1] ?? '',
        emailPatient: row[2] ?? '',
        idQuestionnaire: row[3] ?? '',
        titre: row[4] ?? '',
        dateAssignation: row[5] ?? '',
        statut: row[7] ?? '',
      }));

    // Sync best-effort : nouveaux patients Sheets → PostgreSQL (skipDuplicates = idempotent)
    const praticienEmail = (session.user?.email ?? '').toLowerCase();
    prisma.patient.createMany({
      data: patients.map(p => ({
        idPatient: p.idPatient,
        email: p.email,
        prenom: p.prenom,
        nom: p.nom,
        telephone: p.telephone || null,
        praticienEmail,
        actif: p.actif === 'OUI',
      })),
      skipDuplicates: true,
    }).catch(e => console.error('[patients GET] sync PG:', (e as Error).message));

    return NextResponse.json({ patients, assignations });
  } catch {
    return NextResponse.json({
      patients: [],
      assignations: [],
      unavailable: true,
      reason: 'exception',
    });
  }
}

export async function POST(req: Request): Promise<NextResponse<CreatePatientResponse>> {
  const session = await getServerSession(authOptions);
  const { sheetId, accessToken } = getSessionContext(session);

  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  if (!sheetId || !accessToken) {
    return NextResponse.json({
      success: false,
      reason: !sheetId ? 'no_sheet_id' : 'no_access_token',
      error: 'Configuration incomplète.',
    });
  }

  type CreatePatientPayload = {
    prenom?: string;
    nom?: string;
    email?: string;
    telephone?: string;
    dateNaissance?: string;
  };

  let payload: CreatePatientPayload;
  try {
    payload = (await req.json()) as CreatePatientPayload;
  } catch {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'JSON invalide.' },
      { status: 400 }
    );
  }

  const prenom = (payload.prenom ?? '').trim().slice(0, 100);
  const nom = (payload.nom ?? '').trim().slice(0, 100);
  const email = (payload.email ?? '').trim().toLowerCase().slice(0, 254);
  const telephone = (payload.telephone ?? '').trim().slice(0, 30);
  const dateNaissance = (payload.dateNaissance ?? '').trim();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isDateValid = !dateNaissance || /^\d{4}-\d{2}-\d{2}$/.test(dateNaissance);
  if (!prenom || !nom || !isEmailValid || !isDateValid) {
    return NextResponse.json(
      {
        success: false,
        reason: 'invalid_payload',
        error: !prenom || !nom
          ? 'Prénom et nom sont requis.'
          : !isEmailValid
            ? 'Email invalide.'
            : 'Date de naissance invalide (format attendu : AAAA-MM-JJ).',
      },
      { status: 400 }
    );
  }

  try {
    const readRanges = ['Patients!A:J'];
    const readQs = readRanges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${readQs}`;

    const readResp = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!readResp.ok) {
      const reason = mapSheetsReason(readResp.status);
      return NextResponse.json({
        success: false,
        reason,
        error: 'Impossible de lire la feuille Patients.',
      });
    }

    const readData = await readResp.json();
    const patientRows: string[][] = (readData.valueRanges?.[0]?.values ?? []).slice(DATA_START);

    const duplicate = patientRows.some(row => {
      const rowEmail = (row[1] ?? '').trim().toLowerCase();
      const rowRole = row[2] ?? '';
      return rowEmail === email && rowRole === 'Patient';
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, reason: 'duplicate_email', error: 'Un patient avec cet email existe déjà.' },
        { status: 409 }
      );
    }

    const maxId = patientRows.reduce((max, row) => {
      const id = row[0] ?? '';
      const m = /^PAT(\d+)$/.exec(id);
      if (!m) return max;
      return Math.max(max, Number(m[1]));
    }, 0);
    const idPatient = `PAT${String(maxId + 1).padStart(3, '0')}`;

    const praticienEmail = (session.user?.email ?? '').toLowerCase();
    const nowIso = new Date().toISOString();

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Patients!A:K')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const appendResp = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[
          idPatient,
          email,
          'Patient',
          prenom,
          nom,
          dateNaissance,
          telephone,
          praticienEmail,
          nowIso,
          'OUI',
          '',
        ]],
      }),
    });

    if (!appendResp.ok) {
      const reason = mapSheetsReason(appendResp.status);
      return NextResponse.json({
        success: false,
        reason,
        error: 'Impossible de créer le patient dans Google Sheets.',
      });
    }

    // Sync best-effort → PostgreSQL
    prisma.patient.upsert({
      where: { idPatient },
      update: { email, prenom, nom, telephone: telephone || null, actif: true },
      create: { idPatient, email, prenom, nom, telephone: telephone || null, praticienEmail, actif: true },
    }).catch(e => console.error('[patients POST] sync PG:', (e as Error).message));

    return NextResponse.json({
      success: true,
      patient: {
        idPatient,
        email,
        prenom,
        nom,
        telephone,
        actif: 'OUI',
      },
    });
  } catch {
    return NextResponse.json({
      success: false,
      reason: 'exception',
      error: 'Erreur technique lors de la création du patient.',
    });
  }
}

type PatchPatientPayload = {
  idPatient?: string;
  telephone?: string;
  actif?: 'OUI' | 'NON';
};

export async function PATCH(req: Request): Promise<NextResponse<PatchPatientResponse>> {
  const session = await getServerSession(authOptions);
  const { sheetId, accessToken } = getSessionContext(session);

  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }
  if (!sheetId || !accessToken) {
    return NextResponse.json({
      success: false,
      reason: !sheetId ? 'no_sheet_id' : 'no_access_token',
      error: 'Configuration incomplète.',
    });
  }

  let payload: PatchPatientPayload;
  try {
    payload = (await req.json()) as PatchPatientPayload;
  } catch {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'JSON invalide.' },
      { status: 400 }
    );
  }

  const idPatient = (payload.idPatient ?? '').trim();
  const telephone = (payload.telephone ?? '').trim().slice(0, 30);
  const actif = payload.actif;

  if (!idPatient || !/^PAT\d+$/.test(idPatient)) {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'idPatient invalide.' },
      { status: 400 }
    );
  }
  if (actif !== undefined && actif !== 'OUI' && actif !== 'NON') {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'Valeur actif invalide (OUI ou NON).' },
      { status: 400 }
    );
  }

  try {
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Patients!A:J')}`;
    const readResp = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!readResp.ok) {
      return NextResponse.json({
        success: false,
        reason: mapSheetsReason(readResp.status),
        error: 'Impossible de lire la feuille Patients.',
      });
    }

    const readData = await readResp.json();
    const allRows: string[][] = readData.values ?? [];
    const rowIndex = allRows.findIndex((row, i) => i >= DATA_START && row[0] === idPatient);

    if (rowIndex === -1) {
      return NextResponse.json(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 }
      );
    }

    const sheetRow = rowIndex + 1; // 1-indexed
    const updates: { range: string; values: string[][] }[] = [];

    if (telephone !== undefined) {
      updates.push({ range: `Patients!G${sheetRow}`, values: [[telephone]] });
    }
    if (actif !== undefined) {
      updates.push({ range: `Patients!J${sheetRow}`, values: [[actif]] });
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`;
    const batchResp = await fetch(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updates,
      }),
    });

    if (!batchResp.ok) {
      return NextResponse.json({
        success: false,
        reason: mapSheetsReason(batchResp.status),
        error: 'Impossible de mettre à jour le patient.',
      });
    }

    // Sync best-effort → PostgreSQL
    prisma.patient.updateMany({
      where: { idPatient },
      data: {
        ...(telephone !== undefined && { telephone: telephone || null }),
        ...(actif !== undefined && { actif: actif === 'OUI' }),
      },
    }).catch(e => console.error('[patients PATCH] sync PG:', (e as Error).message));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({
      success: false,
      reason: 'exception',
      error: 'Erreur technique lors de la modification du patient.',
    });
  }
}
