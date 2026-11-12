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
import {
  DECLARATION_SUICIDE_EFFACEE,
  declarationRequiseAvantEnvoi,
  declarationSuicideCabinetActive,
  lireDeclarationSuicide,
} from '@/lib/securite/declarationSuicideCabinet';

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
  /**
   * NF-7, P2-1 (arbitrage du 2026-11-12) : présent seulement drapeau allumé,
   * sur un instrument publié sans déclaration. Il reste visible mais ne part
   * plus ; l'écran affiche le motif et le geste « Déclarer ».
   */
  declarationRequise?: true;
};

export type InstrumentCabinetDetailDto = InstrumentCabinetDto & {
  description: string | null;
  definition: DefinitionCabinet;
  scoring: ScoringCabinet;
  /**
   * NF-7 ([[D-303]] §2) : présent, et vrai, seulement drapeau
   * `WN_ENABLE_DECLARATION_SUICIDE_CAB` allumé — la publication exige alors la
   * déclaration « question sur le suicide ». Absent, l'écran reste celui
   * d'avant NF-7.
   */
  declarationSuicideRequise?: true;
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
    ...(declarationRequiseAvantEnvoi(row) ? { declarationRequise: true as const } : {}),
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
          ...(declarationSuicideCabinetActive() ? { declarationSuicideRequise: true as const } : {}),
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
      poseQuestionSuicide?: unknown;
      questionSuicideId?: unknown;
      questionSuicideOptionNon?: unknown;
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
      // NF-7 ([[D-303]] §2, [[D-493]] §3) : drapeau allumé, la déclaration
      // « question sur le suicide » est exigée à CHAQUE publication, et sa
      // désignation vérifiée contre la définition relue. C'est le seul
      // passage vers `valide` (banc `declarationSuicideCabinet.guard.test.ts`).
      // Drapeau éteint : la publication d'avant NF-7, inchangée.
      const declarationExigee = declarationSuicideCabinetActive();
      let declaration = {};
      if (declarationExigee) {
        const lue = lireDeclarationSuicide(body, instrument.definitionJson);
        if (!lue.ok) {
          return NextResponse.json<MutateInstrumentResponse>(
            { success: false, reason: 'invalid_payload', error: lue.erreur, erreurs: [lue.erreur] },
            { status: 400 },
          );
        }
        declaration = lue.declaration;
      }
      const data = { statutRelecture: 'valide', ...declaration };
      if (declarationExigee) {
        // La désignation a été vérifiée contre la définition LUE ci-dessus :
        // l'écriture n'a lieu que si l'instrument n'a pas bougé depuis. Une
        // modification concurrente le repasse en brouillon et touche
        // `updatedAt` — la publication échoue alors en 409 au lieu de valider
        // une déclaration contre d'anciennes questions (revue CodeRabbit de
        // #2010 ; `wn-reviewer`, P2-3). Drapeau éteint : l'écriture d'avant.
        const ecrit = await prisma.cabinetInstrument.updateMany({
          where: { idInstrument, statutRelecture: 'grille_a_relire', updatedAt: instrument.updatedAt },
          data,
        });
        if (ecrit.count === 0) {
          return NextResponse.json<MutateInstrumentResponse>(
            {
              success: false,
              reason: 'conflit_statut',
              error: 'L’instrument a été modifié pendant la relecture : rouvrez « Relire la grille ».',
            },
            { status: 409 },
          );
        }
      } else {
        await prisma.cabinetInstrument.update({ where: { idInstrument }, data });
      }
      return NextResponse.json<MutateInstrumentResponse>({ success: true, idInstrument });
    }

    if (action === 'declarer' && declarationSuicideCabinetActive()) {
      // NF-7, P2-1 (arbitrage du 2026-11-12) : le geste « Déclarer » recueille
      // la déclaration d'un instrument PUBLIÉ qui n'en a pas (publié drapeau
      // éteint), sans toucher aux questions ni au statut. Sans migration ni
      // reprise en base ; seule la déclaration est enregistrée par
      // l'application. Même validation que `publier`, contre la définition
      // relue ; même écriture gardée. Drapeau éteint : l'action n'existe pas
      // (« Action inconnue »), comme avant ce lot.
      if (!declarationRequiseAvantEnvoi(instrument)) {
        return NextResponse.json<MutateInstrumentResponse>(
          { success: false, reason: 'conflit_statut', error: 'Cet instrument n’attend aucune déclaration.' },
          { status: 409 },
        );
      }
      const lue = lireDeclarationSuicide(body, instrument.definitionJson);
      if (!lue.ok) {
        return NextResponse.json<MutateInstrumentResponse>(
          { success: false, reason: 'invalid_payload', error: lue.erreur, erreurs: [lue.erreur] },
          { status: 400 },
        );
      }
      // Gardée sur ce qui a été relu : toujours publié, toujours non déclaré,
      // inchangé depuis. Une modification concurrente des questions repasse
      // l'instrument en brouillon et touche `updatedAt` ; une autre
      // déclaration le rend non NULL. Dans les deux cas : 409, rien d'écrit.
      // `data` ne porte QUE la déclaration — jamais le statut (banc
      // `declarationSuicideCabinet.guard.test.ts`).
      const ecrit = await prisma.cabinetInstrument.updateMany({
        where: {
          idInstrument,
          actif: true,
          statutRelecture: 'valide',
          poseQuestionSuicide: null,
          updatedAt: instrument.updatedAt,
        },
        data: lue.declaration,
      });
      if (ecrit.count === 0) {
        return NextResponse.json<MutateInstrumentResponse>(
          {
            success: false,
            reason: 'conflit_statut',
            error: 'L’instrument a été modifié entre-temps : rouvrez « Déclarer ».',
          },
          { status: 409 },
        );
      }
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

    const edition = {
      where: { idInstrument },
      data: {
        titre,
        categorie,
        description: description || null,
        // NF-7, P2-3 (passe Codex du lot 3, P1-1) : drapeau allumé, une
        // édition des métadonnées seules ne réécrit PAS le contenu. Elle
        // échappe au verrou et au recomptage ; réécrire la définition et la
        // grille qu'elle a lues pourrait réinstaller, après une modification,
        // une publication et un envoi concurrents, l'ancien contenu sous la
        // nouvelle déclaration. Drapeau éteint : l'écriture d'avant.
        ...(contenuChange || !declarationSuicideCabinetActive()
          ? {
              definitionJson: definition as unknown as Prisma.InputJsonValue,
              scoringJson: { ...scoring, maxTotal: verdict.scoreMax } as unknown as Prisma.InputJsonValue,
            }
          : {}),
        ...(contenuChange ? { statutRelecture: 'brouillon' } : {}),
        // NF-7 ([[D-303]] §2) : une modification des questions redemande la
        // déclaration — l'ancienne est effacée (NULL = non déclaré), la
        // prochaine publication la recueille de nouveau. Drapeau éteint : rien.
        ...(contenuChange && declarationSuicideCabinetActive() ? DECLARATION_SUICIDE_EFFACEE : {}),
      },
    };
    if (contenuChange && declarationSuicideCabinetActive()) {
      // NF-7, P2-3 (revue `wn-reviewer` du lot 3, P1) : le gel du contenu
      // comptait les envois HORS de tout verrou. Un envoi pouvait se glisser
      // entre ce comptage et l'écriture, et l'assignation garder la copie de
      // la déclaration d'avant des questions nouvelles. Drapeau allumé, la
      // ligne est verrouillée `FOR UPDATE` (en conflit avec le `FOR SHARE`
      // de l'envoi), les envois recomptés sous ce verrou, puis l'écriture :
      // soit l'envoi a commité avant et il est compté (refus), soit
      // l'écriture passe avant et l'envoi, sous son verrou, voit un brouillon
      // et l'écarte. Drapeau éteint : l'écriture d'avant.
      const envoisSousVerrou = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id_instrument FROM cabinet_instruments WHERE id_instrument = ${idInstrument} FOR UPDATE`;
        const envois = await tx.assignation.count({
          where: { idQuestionnaire: idInstrument, statutReponses: { not: 'verrouille' } },
        });
        if (envois > 0) return envois;
        await tx.cabinetInstrument.update(edition);
        return 0;
      });
      if (envoisSousVerrou > 0) {
        return refusEnvoisEnCours(envoisSousVerrou);
      }
    } else {
      await prisma.cabinetInstrument.update(edition);
    }
    return NextResponse.json<MutateInstrumentResponse>({ success: true, idInstrument });
  } catch {
    return NextResponse.json<MutateInstrumentResponse>(
      { success: false, reason: 'exception', error: 'Erreur inattendue.' },
      { status: 500 },
    );
  }
}
