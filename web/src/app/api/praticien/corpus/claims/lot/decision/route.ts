import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import {
  basculerLot,
  cloreTirageCaduc,
  deciderLot,
  type QuestionRestitution,
  type VerdictEchantillon,
} from '@/lib/rag/claims/revue';

// Voie rapide de l'Atelier corpus — ISSUE d'un tirage : signature de lot, ou
// bascule de la source en revue individuelle.
//
// Signature (issue = 'valider') : tous les verdicts d'échantillon ET tout le
// questionnaire de restitution doivent être « conforme » — alors TOUS les
// claims éligibles de la source passent VALIDE, dans une même transaction que
// la ligne de journal qui en porte les preuves. Un seul défaut → l'issue est
// 'basculer' (motif obligatoire) : rien ne change d'état, la source part en
// revue individuelle. Un tirage a UNE issue — jamais deux.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_RE = /^WN-SRC-\d{4}$/;

export type CorpusLotDecisionApiResponse =
  | { ok: true; issue: 'valider'; valides: number }
  | { ok: true; issue: 'basculer' }
  | { ok: true; issue: 'clore_caduc' }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<string, { message: string; status: number }> = {
  tirage_introuvable: {
    message: 'Tirage introuvable pour cette source.',
    status: 404,
  },
  tirage_deja_conclu: {
    message: 'Ce tirage a déjà son issue — refaites un tirage.',
    status: 409,
  },
  payload_invalide: {
    message: 'Verdicts ou questionnaire malformés — corps de requête refusé.',
    status: 400,
  },
  questionnaire_couverture: {
    message:
      'Le questionnaire ne couvre pas chaque chunk actif de la source (via les claims cités) — la signature de lot exige la couverture complète.',
    status: 422,
  },
  echantillon_non_conforme: {
    message:
      'L’échantillon n’est pas intégralement conforme — la signature de lot est impossible, basculez la source en revue individuelle.',
    status: 422,
  },
  questionnaire_non_conforme: {
    message:
      'Le questionnaire de restitution n’est pas intégralement conforme — la signature de lot est impossible, basculez la source en revue individuelle.',
    status: 422,
  },
  etat_divergent: {
    message: 'Le lot a changé depuis le tirage — refaites un tirage.',
    status: 409,
  },
  sources_absentes: {
    message: 'Un claim du lot ne cite aucun verbatim source — signature impossible.',
    status: 409,
  },
  source_derivee: {
    message:
      'Un verbatim cité par le lot a été modifié depuis son rattachement — signature refusée tant que la dérive n’est pas instruite.',
    status: 409,
  },
  motif_requis: { message: 'Une bascule exige un motif.', status: 422 },
  tirage_encore_vivant: {
    message:
      'Ce tirage est encore vivant (son lot n’a pas changé) — il ne se clôture pas pour caducité, signez-le ou basculez la source.',
    status: 409,
  },
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorpusLotDecisionApiResponse>({ ok: false, reason, error }, { status });
}

type PostBody = {
  sourceId?: string;
  tirageId?: number;
  issue?: string;
  verdicts?: VerdictEchantillon[];
  questionnaire?: { questions: QuestionRestitution[] };
  motif?: string;
};

// POST /api/praticien/corpus/claims/lot/decision —
//   { sourceId, tirageId, issue: 'valider', verdicts, questionnaire }
//   { sourceId, tirageId, issue: 'basculer', motif, verdicts?, questionnaire? }
export async function POST(req: Request): Promise<NextResponse<CorpusLotDecisionApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    const validateur = emailPraticien(session);
    if (!validateur) return echec('unauthenticated', 'Session praticien sans e-mail.', 401);

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const sourceId = (body.sourceId ?? '').trim();
    if (!SOURCE_RE.test(sourceId)) {
      return echec('source_invalide', 'Identifiant de source invalide.', 400);
    }
    const tirageId = body.tirageId;
    if (!Number.isInteger(tirageId) || (tirageId as number) < 1) {
      return echec('tirage_invalide', 'Identifiant de tirage invalide.', 400);
    }

    if (body.issue === 'valider') {
      const resultat = await deciderLot({
        sourceId,
        tirageId: tirageId as number,
        verdicts: body.verdicts,
        questionnaire: body.questionnaire,
        validateur,
      });
      if (!resultat.ok) {
        const refus = MESSAGES_REFUS[resultat.raison];
        return echec(resultat.raison, refus.message, refus.status);
      }
      return NextResponse.json({ ok: true, issue: 'valider', valides: resultat.valides });
    }

    if (body.issue === 'basculer') {
      const resultat = await basculerLot({
        sourceId,
        tirageId: tirageId as number,
        motif: body.motif ?? '',
        validateur,
        verdicts: body.verdicts,
        questionnaire: body.questionnaire,
      });
      if (!resultat.ok) {
        const refus = MESSAGES_REFUS[resultat.raison];
        return echec(resultat.raison, refus.message, refus.status);
      }
      return NextResponse.json({ ok: true, issue: 'basculer' });
    }

    if (body.issue === 'clore_caduc') {
      const resultat = await cloreTirageCaduc({
        sourceId,
        tirageId: tirageId as number,
        validateur,
      });
      if (!resultat.ok) {
        const refus = MESSAGES_REFUS[resultat.raison];
        return echec(resultat.raison, refus.message, refus.status);
      }
      return NextResponse.json({ ok: true, issue: 'clore_caduc' });
    }

    return echec('issue_invalide', "L'issue doit être 'valider', 'basculer' ou 'clore_caduc'.", 400);
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/lot/decision POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
