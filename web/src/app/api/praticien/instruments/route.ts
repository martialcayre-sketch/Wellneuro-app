import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { emailPraticien } from '@/lib/praticien/appartenance';
import {
  listeInstrumentsCabinet,
  normaliserDefinitionCabinet,
  normaliserScoringCabinet,
  resumeInstrumentCabinet,
  validerInstrumentCabinet,
  type DefinitionCabinet,
  type ScoringCabinet,
} from '@/lib/instruments';

// Instruments du cabinet (décision utilisateur du 2026-07-23) : le praticien
// crée, édite, fait relire puis publie ses propres questionnaires. Rien ici
// n'est certifié automatiquement : la publication (`statutRelecture: 'valide'`)
// exige une demande de relecture explicite, et toute modification de la
// définition ou de la grille repasse l'instrument en brouillon.

export type InstrumentCabinetDto = {
  idInstrument: string;
  titre: string;
  categorie: string;
  statutRelecture: string;
  nbQuestions: number | null;
  scoreMax: number | null;
  updatedAt: string;
};

export type InstrumentCabinetDetailDto = InstrumentCabinetDto & {
  description: string | null;
  definition: DefinitionCabinet;
  scoring: ScoringCabinet;
};

export type InstrumentsApiResponse = {
  instruments: InstrumentCabinetDto[];
  /** Détail complet quand la requête porte `?id=CAB_...` (édition, relecture). */
  instrument?: InstrumentCabinetDetailDto | null;
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'not_found' | 'exception';
};

export type MutateInstrumentResponse = {
  success: boolean;
  idInstrument?: string;
  erreurs?: string[];
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'invalid_payload'
    | 'not_found'
    | 'conflit_statut'
    | 'envoi_en_cours'
    | 'doublon_titre'
    | 'exception';
};

// Gel du contenu : tant qu'un envoi est en cours, la définition et la grille
// ne bougent pas — le patient doit répondre à la grille qui lui a été envoyée
// et être scoré par elle. « En cours » = toute assignation non verrouillée :
// `verrouille` est le seul état terminal côté données (`non_rempli`,
// `en_cours`, `deverrouille` acceptent une soumission, et
// `modification_demandee` peut redevenir soumissible par déverrouillage).
async function nbEnvoisEnCours(idInstrument: string): Promise<number> {
  return prisma.assignation.count({
    where: { idQuestionnaire: idInstrument, statutReponses: { not: 'verrouille' } },
  });
}

function refusEnvoisEnCours(envois: number) {
  return NextResponse.json<MutateInstrumentResponse>(
    {
      success: false,
      reason: 'envoi_en_cours',
      error: `Impossible de modifier : ${envois} envoi(s) en cours pour cet instrument.`,
    },
    { status: 409 },
  );
}

function versDto(row: Awaited<ReturnType<typeof listeInstrumentsCabinet>>[number]): InstrumentCabinetDto {
  const resume = resumeInstrumentCabinet(row);
  return {
    idInstrument: row.idInstrument,
    titre: row.titre,
    categorie: row.categorie,
    statutRelecture: row.statutRelecture,
    nbQuestions: resume.nbQuestions,
    scoreMax: resume.scoreMax,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json<InstrumentsApiResponse>(
      { instruments: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 },
    );
  }
  try {
    const id = new URL(request.url).searchParams.get('id')?.trim().slice(0, 50) ?? '';
    if (id) {
      const row = await prisma.cabinetInstrument.findFirst({
        where: {
          idInstrument: id,
          praticienEmail: { equals: emailSession, mode: 'insensitive' },
          actif: true,
        },
      });
      if (!row) {
        return NextResponse.json<InstrumentsApiResponse>(
          { instruments: [], instrument: null, reason: 'not_found' },
          { status: 404 },
        );
      }
      return NextResponse.json<InstrumentsApiResponse>({
        instruments: [],
        instrument: {
          ...versDto(row),
          description: row.description,
          definition: row.definitionJson as unknown as DefinitionCabinet,
          scoring: row.scoringJson as unknown as ScoringCabinet,
        },
      });
    }
    const lignes = await listeInstrumentsCabinet(emailSession);
    return NextResponse.json<InstrumentsApiResponse>({ instruments: lignes.map(versDto) });
  } catch {
    return NextResponse.json<InstrumentsApiResponse>(
      { instruments: [], unavailable: true, reason: 'exception' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json<MutateInstrumentResponse>(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 },
    );
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      titre?: unknown;
      categorie?: unknown;
      description?: unknown;
      definition?: unknown;
      scoring?: unknown;
    };
    const titre = typeof body.titre === 'string' ? body.titre.trim().slice(0, 200) : '';
    const categorie =
      typeof body.categorie === 'string' && body.categorie.trim().length > 0
        ? body.categorie.trim().slice(0, 60)
        : 'Cabinet';
    const description =
      typeof body.description === 'string' ? body.description.trim().slice(0, 500) : '';
    const definition = normaliserDefinitionCabinet(body.definition);
    const scoring = normaliserScoringCabinet(body.scoring);

    const verdict = validerInstrumentCabinet({ titre, definition, scoring });
    if (!verdict.ok) {
      return NextResponse.json<MutateInstrumentResponse>(
        {
          success: false,
          reason: 'invalid_payload',
          error: 'Instrument invalide.',
          erreurs: verdict.erreurs,
        },
        { status: 400 },
      );
    }

    // Anti-doublon : deux instruments actifs du même cabinet ne portent pas
    // exactement le même titre (création répétée par erreur).
    const doublon = await prisma.cabinetInstrument.findFirst({
      where: {
        praticienEmail: { equals: emailSession, mode: 'insensitive' },
        actif: true,
        titre: { equals: titre, mode: 'insensitive' },
      },
      select: { idInstrument: true },
    });
    if (doublon) {
      return NextResponse.json<MutateInstrumentResponse>(
        {
          success: false,
          reason: 'doublon_titre',
          error: 'Un instrument actif du cabinet porte déjà ce titre.',
        },
        { status: 409 },
      );
    }

    const idInstrument = createPublicId('CAB');
    await prisma.cabinetInstrument.create({
      data: {
        idInstrument,
        praticienEmail: emailSession,
        titre,
        categorie,
        description: description || null,
        definitionJson: definition as unknown as Prisma.InputJsonValue,
        // maxTotal dérivé, jamais saisi : borne haute pour l'affichage et le
        // résultat `maxTotal` du moteur de score.
        scoringJson: { ...scoring, maxTotal: verdict.scoreMax } as unknown as Prisma.InputJsonValue,
        statutRelecture: 'brouillon',
      },
    });
    return NextResponse.json<MutateInstrumentResponse>({ success: true, idInstrument });
  } catch {
    return NextResponse.json<MutateInstrumentResponse>(
      { success: false, reason: 'exception', error: 'Erreur inattendue.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json<MutateInstrumentResponse>(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 },
    );
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      idInstrument?: unknown;
      action?: unknown;
      titre?: unknown;
      categorie?: unknown;
      description?: unknown;
      definition?: unknown;
      scoring?: unknown;
    };
    const idInstrument =
      typeof body.idInstrument === 'string' ? body.idInstrument.trim().slice(0, 50) : '';
    if (!idInstrument) {
      return NextResponse.json<MutateInstrumentResponse>(
        { success: false, reason: 'invalid_payload', error: 'Instrument manquant.' },
        { status: 400 },
      );
    }

    // Cloisonnement : un instrument d'un autre praticien est introuvable.
    const instrument = await prisma.cabinetInstrument.findFirst({
      where: {
        idInstrument,
        praticienEmail: { equals: emailSession, mode: 'insensitive' },
        actif: true,
      },
    });
    if (!instrument) {
      return NextResponse.json<MutateInstrumentResponse>(
        { success: false, reason: 'not_found', error: 'Instrument introuvable.' },
        { status: 404 },
      );
    }

    const action = typeof body.action === 'string' ? body.action : null;

    if (action === 'desactiver') {
      await prisma.cabinetInstrument.update({
        where: { idInstrument },
        data: { actif: false },
      });
      return NextResponse.json<MutateInstrumentResponse>({ success: true, idInstrument });
    }

    if (action === 'demander_relecture') {
      // La relecture ne se demande que depuis un brouillon : l'appeler sur un
      // instrument publié le dépublierait silencieusement.
      if (instrument.statutRelecture !== 'brouillon') {
        return NextResponse.json<MutateInstrumentResponse>(
          {
            success: false,
            reason: 'conflit_statut',
            error:
              'La relecture se demande depuis un brouillon — modifiez l’instrument pour le repasser en brouillon d’abord.',
          },
          { status: 409 },
        );
      }
      const envois = await nbEnvoisEnCours(idInstrument);
      if (envois > 0) {
        return refusEnvoisEnCours(envois);
      }
      const verdict = validerInstrumentCabinet({
        titre: instrument.titre,
        definition: instrument.definitionJson,
        scoring: instrument.scoringJson,
      });
      if (!verdict.ok) {
        return NextResponse.json<MutateInstrumentResponse>(
          {
            success: false,
            reason: 'invalid_payload',
            error: 'La grille doit être valide avant la relecture.',
            erreurs: verdict.erreurs,
          },
          { status: 400 },
        );
      }
      await prisma.cabinetInstrument.update({
        where: { idInstrument },
        data: { statutRelecture: 'grille_a_relire' },
      });
      return NextResponse.json<MutateInstrumentResponse>({ success: true, idInstrument });
    }

    if (action === 'publier') {
      // La publication n'existe qu'au bout d'une relecture demandée : jamais
      // depuis le brouillon, jamais automatiquement.
      if (instrument.statutRelecture !== 'grille_a_relire') {
        return NextResponse.json<MutateInstrumentResponse>(
          {
            success: false,
            reason: 'conflit_statut',
            error: 'La grille doit d’abord passer par une demande de relecture.',
          },
          { status: 409 },
        );
      }
      const verdict = validerInstrumentCabinet({
        titre: instrument.titre,
        definition: instrument.definitionJson,
        scoring: instrument.scoringJson,
      });
      if (!verdict.ok) {
        return NextResponse.json<MutateInstrumentResponse>(
          {
            success: false,
            reason: 'invalid_payload',
            error: 'La grille ne peut pas être publiée en l’état.',
            erreurs: verdict.erreurs,
          },
          { status: 400 },
        );
      }
      await prisma.cabinetInstrument.update({
        where: { idInstrument },
        data: { statutRelecture: 'valide' },
      });
      return NextResponse.json<MutateInstrumentResponse>({ success: true, idInstrument });
    }

    if (action !== null) {
      return NextResponse.json<MutateInstrumentResponse>(
        { success: false, reason: 'invalid_payload', error: 'Action inconnue.' },
        { status: 400 },
      );
    }

    // Édition : les champs fournis remplacent l'existant, le reste est
    // conservé. Une définition ou une grille modifiée n'est plus relue :
    // retour OBLIGATOIRE au brouillon. Le contenu est GELÉ tant qu'un envoi
    // est en cours ; les métadonnées (titre, domaine, description) restent
    // éditables — le titre d'une assignation est figé à l'envoi.
    const contenuChange = body.definition !== undefined || body.scoring !== undefined;
    if (contenuChange) {
      const envois = await nbEnvoisEnCours(idInstrument);
      if (envois > 0) {
        return refusEnvoisEnCours(envois);
      }
    }
    const titre =
      body.titre !== undefined
        ? typeof body.titre === 'string'
          ? body.titre.trim().slice(0, 200)
          : ''
        : instrument.titre;
    const categorie =
      body.categorie !== undefined
        ? typeof body.categorie === 'string' && body.categorie.trim().length > 0
          ? body.categorie.trim().slice(0, 60)
          : 'Cabinet'
        : instrument.categorie;
    const description =
      body.description !== undefined
        ? typeof body.description === 'string'
          ? body.description.trim().slice(0, 500)
          : ''
        : (instrument.description ?? '');
    const definition =
      body.definition !== undefined
        ? normaliserDefinitionCabinet(body.definition)
        : (instrument.definitionJson as unknown as DefinitionCabinet);
    const scoring =
      body.scoring !== undefined
        ? normaliserScoringCabinet(body.scoring)
        : (instrument.scoringJson as unknown as ScoringCabinet);

    const verdict = validerInstrumentCabinet({ titre, definition, scoring });
    if (!verdict.ok) {
      return NextResponse.json<MutateInstrumentResponse>(
        {
          success: false,
          reason: 'invalid_payload',
          error: 'Instrument invalide.',
          erreurs: verdict.erreurs,
        },
        { status: 400 },
      );
    }

    await prisma.cabinetInstrument.update({
      where: { idInstrument },
      data: {
        titre,
        categorie,
        description: description || null,
        definitionJson: definition as unknown as Prisma.InputJsonValue,
        scoringJson: { ...scoring, maxTotal: verdict.scoreMax } as unknown as Prisma.InputJsonValue,
        ...(contenuChange ? { statutRelecture: 'brouillon' } : {}),
      },
    });
    return NextResponse.json<MutateInstrumentResponse>({ success: true, idInstrument });
  } catch {
    return NextResponse.json<MutateInstrumentResponse>(
      { success: false, reason: 'exception', error: 'Erreur inattendue.' },
      { status: 500 },
    );
  }
}
