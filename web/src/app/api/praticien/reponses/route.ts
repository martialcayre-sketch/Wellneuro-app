import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Colonnes de l'onglet Rep_Questionnaires (0-indexé)
// A: ID_Reponse | B: ID_Patient | C: Email | D: ID_Assignation
// E: ID_Questionnaire | F: Titre_Questionnaire | G: Date_Soumission
// H: Reponses_JSON | I: Scores_JSON | J: Score_Principal | K: Interpretation
const DATA_START = 3; // GAS réserve lignes 1-2 pour titre/headers, données à partir de la ligne 4 (index 3)

export type ReponseQuestionnaire = {
  idReponse: string;
  idPatient: string;
  emailPatient: string;
  idAssignation: string;
  idQuestionnaire: string;
  titre: string;
  dateSoumission: string;
  scoresParsed: Record<string, unknown> | null;
  scorePrincipal: number | null;
  interpretation: string;
};

export type ReponsesApiResponse = {
  reponses: ReponseQuestionnaire[];
  error?: string;
};

// GET /api/praticien/reponses?email=<email_du_patient>
export async function GET(req: Request): Promise<NextResponse<ReponsesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ reponses: [], error: 'Non authentifié.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const email = (searchParams.get('email') ?? '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ reponses: [], error: 'email requis.' }, { status: 400 });
  }

  const sheetId = process.env.SHEET_ID;
  const accessToken = session.accessToken;

  if (!sheetId || !accessToken) {
    return NextResponse.json({ reponses: [], error: 'Configuration Sheets absente.' }, { status: 503 });
  }

  const range = 'Rep_Questionnaires!A:K';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;

  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!resp.ok) {
      return NextResponse.json({ reponses: [], error: `Erreur Sheets ${resp.status}.` }, { status: resp.status });
    }

    const data = (await resp.json()) as { values?: string[][] };
    const rows = data.values ?? [];

    const reponses: ReponseQuestionnaire[] = [];
    for (let i = DATA_START; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 7) continue;
      const emailRow = (row[2] ?? '').trim().toLowerCase();
      if (emailRow !== email) continue;

      let scoresParsed: Record<string, unknown> | null = null;
      try {
        const raw = row[8] ?? '';
        if (raw) scoresParsed = JSON.parse(raw) as Record<string, unknown>;
      } catch { /* ignore malformed JSON */ }

      let scorePrincipal: number | null = null;
      const rawScore = row[9] ?? '';
      if (rawScore !== '') {
        const parsed = parseFloat(rawScore);
        if (!isNaN(parsed)) scorePrincipal = parsed;
      }

      reponses.push({
        idReponse: row[0] ?? '',
        idPatient: row[1] ?? '',
        emailPatient: row[2] ?? '',
        idAssignation: row[3] ?? '',
        idQuestionnaire: row[4] ?? '',
        titre: row[5] ?? '',
        dateSoumission: row[6] ?? '',
        scoresParsed,
        scorePrincipal,
        interpretation: row[10] ?? '',
      });
    }

    // Tri antéchronologique
    reponses.sort((a, b) =>
      new Date(b.dateSoumission).getTime() - new Date(a.dateSoumission).getTime()
    );

    return NextResponse.json({ reponses });
  } catch (err) {
    console.error('[reponses GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ reponses: [], error: 'Erreur technique.' }, { status: 500 });
  }
}
