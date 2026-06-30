import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { anthropic, CLAUDE_MODEL, SYSTEM_PROMPT_SYNTHESE, validateSyntheseSchema, sanitizeAuditError, maskEmail } from '@/lib/anthropic';

type ReponseInput = {
  titre: string;
  date: string;
  scores: Record<string, unknown>;
  scorePrincipal: number | null;
  interpretation: string | null;
};

function buildUserMessage(reponses: ReponseInput[], prenom: string, nom: string): string {
  const filtered = reponses.map(r => ({
    titre: r.titre,
    date: r.date,
    scores: r.scores,
    scorePrincipal: r.scorePrincipal,
    interpretation: r.interpretation,
  }));
  return `Patient : ${prenom} ${nom}\nNombre de questionnaires complétés : ${filtered.length}\n\nRésultats des questionnaires :\n${JSON.stringify(filtered, null, 2)}`;
}

// GET /api/praticien/synthese?idPatient=PAT001
// Liste des synthèses d'un patient
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();

  if (!idPatient) {
    return NextResponse.json({ syntheses: [] });
  }

  try {
    const syntheses = await prisma.syntheseIA.findMany({
      where: { idPatient },
      orderBy: { dateGeneration: 'desc' },
      select: {
        idSynthese: true,
        idPatient: true,
        dateGeneration: true,
        modele: true,
        statut: true,
        dateValidation: true,
        notesPraticien: true,
        syntheseJson: true,
      },
    });

    return NextResponse.json({ syntheses });
  } catch (err) {
    console.error('[synthese GET] Exception:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Erreur technique.' }, { status: 500 });
  }
}

// POST /api/praticien/synthese
// Génère une nouvelle synthèse IA pour un patient
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY absente. Ajoutez-la dans web/.env.local.' },
      { status: 503 }
    );
  }

  let idPatient: string;
  try {
    const body = (await req.json()) as { idPatient?: string };
    idPatient = (body.idPatient ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  if (!idPatient || !/^PAT\d+$/.test(idPatient)) {
    return NextResponse.json({ error: 'idPatient invalide.' }, { status: 400 });
  }

  let idSynthese = '';
  try {
    const patient = await prisma.patient.findUnique({ where: { idPatient } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient introuvable.' }, { status: 404 });
    }

    const reponses = await prisma.questionnaireReponse.findMany({
      where: { idPatient },
      orderBy: { dateReponse: 'desc' },
    });

    if (reponses.length === 0) {
      return NextResponse.json(
        { error: 'Aucun résultat de questionnaire disponible pour ce patient.' },
        { status: 422 }
      );
    }

    const reponsesInput: ReponseInput[] = reponses.map(r => ({
      titre: r.titre,
      date: r.dateReponse.toISOString().split('T')[0],
      scores: r.scoresJson as Record<string, unknown>,
      scorePrincipal: r.scorePrincipal,
      interpretation: r.interpretation,
    }));

    const userMessage = buildUserMessage(reponsesInput, patient.prenom, patient.nom);

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: [{ type: 'text', text: SYSTEM_PROMPT_SYNTHESE, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    });

    if (response.stop_reason === 'max_tokens') {
      throw new Error('La synthèse IA a été tronquée (réponse trop longue). Réessayez.');
    }

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    if (!text) throw new Error('Réponse vide de l\'API Claude.');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La réponse IA ne contient pas de JSON valide.');

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      const cleaned = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
      parsed = JSON.parse(cleaned);
    }

    const synthese = validateSyntheseSchema(parsed);
    idSynthese = `SYN${Date.now()}`;

    const record = await prisma.syntheseIA.create({
      data: {
        idSynthese,
        idPatient,
        emailPatient: patient.email,
        modele: CLAUDE_MODEL,
        versionPrompt: 'v1',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        donneesEntree: reponsesInput as any,
        syntheseJson: synthese,
        statut: 'Brouillon_IA',
      },
    });

    await prisma.auditSynthese.create({
      data: {
        idSynthese,
        idPatient,
        modele: CLAUDE_MODEL,
        versionPrompt: 'v1',
        statut: 'OK',
      },
    });

    return NextResponse.json({
      success: true,
      idSynthese: record.idSynthese,
      synthese,
      modele: CLAUDE_MODEL,
      dateGeneration: record.dateGeneration.toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[synthese POST] Exception:', msg);

    if (idSynthese) {
      await prisma.auditSynthese.create({
        data: {
          idSynthese,
          idPatient,
          modele: CLAUDE_MODEL,
          versionPrompt: 'v1',
          statut: 'Erreur',
          erreurCourte: sanitizeAuditError(msg),
        },
      }).catch(() => {});
    }

    return NextResponse.json(
      { error: 'Erreur lors de la génération de la synthèse. Réessayez.' },
      { status: 500 }
    );
  }
}

// PATCH /api/praticien/synthese
// Valider, rejeter ou annoter une synthèse
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

  type PatchBody = {
    idSynthese?: string;
    action?: 'valider' | 'rejeter' | 'annoter';
    notes?: string;
  };

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  const idSynthese = (body.idSynthese ?? '').trim();
  const action = body.action;
  const notes = (body.notes ?? '').trim().slice(0, 2000);

  if (!idSynthese || !action) {
    return NextResponse.json({ error: 'idSynthese et action sont requis.' }, { status: 400 });
  }

  try {
    const existing = await prisma.syntheseIA.findUnique({ where: { idSynthese } });
    if (!existing) {
      return NextResponse.json({ error: 'Synthèse introuvable.' }, { status: 404 });
    }

    let statut = existing.statut;
    if (action === 'valider') {
      statut = 'Validee_Praticien';
    } else if (action === 'rejeter') {
      statut = 'Rejetee';
    } else if (action === 'annoter') {
      statut = existing.statut === 'Validee_Praticien' && notes ? 'Corrigee_Praticien' : existing.statut;
    } else {
      return NextResponse.json({ error: 'Action invalide.' }, { status: 400 });
    }

    await prisma.syntheseIA.update({
      where: { idSynthese },
      data: {
        statut,
        dateValidation: action === 'valider' ? new Date() : existing.dateValidation,
        notesPraticien: action === 'annoter' ? notes : existing.notesPraticien,
      },
    });

    return NextResponse.json({ success: true, statut });
  } catch (err) {
    console.error('[synthese PATCH] Exception:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Erreur technique.' }, { status: 500 });
  }
}
