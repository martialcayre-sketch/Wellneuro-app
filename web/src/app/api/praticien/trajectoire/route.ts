import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VERSION_SCORE_EQUILIBRE } from '@/lib/equilibre/constants';
import { construireTrajectoire, type Trajectoire, type TrajectoireEpisode } from '@/lib/protocol/trajectoire';
import type { JalonMomentum } from '@/lib/equilibre/types';

// Fiche-trajectoire praticien (C2B LOT-09, registre A8) — LECTURE SEULE.
// Spirale-index des jalons confirmés du patient + comparateur multi-épisodes,
// sous garde versionScore (A8-3) et avec « jalon non mesuré » (A8-2). Les
// lectures viennent de momentum.ts / depuisPrisma, ancrées au T0 de chaque
// épisode (LOT-08) ; jamais un score réimplémenté, jamais une écriture.
// Hypothèse mono-praticien (§8.8) : garde de session sans scope par identité,
// cohérent avec les autres routes praticien.

const MILESTONES: readonly JalonMomentum[] = ['T0', 'J21', 'J42', 'J90'];

export type TrajectoireApiResponse =
  | { ok: true; trajectoire: Trajectoire }
  | { ok: false; reason: 'unauthenticated' | 'invalid' | 'patient_not_found' | 'exception'; error: string };

// GET /api/praticien/trajectoire?idPatient=PAT001
export async function GET(req: Request): Promise<NextResponse<TrajectoireApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
    return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { idPatient } });
    if (!patient) {
      return NextResponse.json({ ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
    }

    const episodesDb = await prisma.assessmentEpisode.findMany({
      where: { idPatient },
      select: { id: true, milestone: true, confirmedAt: true },
      orderBy: { confirmedAt: 'asc' },
    });
    const episodes: TrajectoireEpisode[] = episodesDb
      .filter((e) => (MILESTONES as readonly string[]).includes(e.milestone))
      .map((e) => ({ id: e.id, milestone: e.milestone as JalonMomentum, confirmedAt: e.confirmedAt }));

    const reponsesDb = await prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idQuestionnaire: true, dateReponse: true, scoresJson: true },
      orderBy: { dateReponse: 'asc' },
    });

    const trajectoire = construireTrajectoire({ episodes, reponses: reponsesDb, versionScore: VERSION_SCORE_EQUILIBRE });
    return NextResponse.json({ ok: true, trajectoire });
  } catch (err) {
    console.error('[praticien/trajectoire GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
