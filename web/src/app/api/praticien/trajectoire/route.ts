import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { construireTrajectoire, type Trajectoire, type TrajectoireEpisode } from '@/lib/protocol/trajectoire';
import { construireReperes, resoudreAsOf } from '@/lib/praticien/lectureAsOf';
import { construireModeVieDate, type ModeVieDate } from '@/lib/equilibre/modeVie';
import type { JalonMomentum } from '@/lib/equilibre/types';

// Fiche-trajectoire praticien (C2B LOT-09, registre A8) — LECTURE SEULE.
// Spirale-index des jalons confirmés du patient + comparateur multi-épisodes,
// sous garde versionScore (A8-3) et avec « jalon non mesuré » (A8-2). Les
// lectures viennent de momentum.ts / depuisPrisma, ancrées au T0 de chaque
// épisode (LOT-08) ; jamais un score réimplémenté, jamais une écriture.
// Hypothèse mono-praticien (§8.8) : garde de session sans scope par identité,
// cohérent avec les autres routes praticien.

const MILESTONES: readonly JalonMomentum[] = ['T0', 'J21', 'J42', 'J90'];

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/trajectoire';

// État daté « mode de vie » (SP-TRAJ LOT-02) : rejoué depuis les réponses
// brutes tronquées à un repère réel (mécanique SP-TT), jamais un snapshot.
export type EtatDateTrajectoire = {
  date: string; // ISO du repère résolu
  modeVie: ModeVieDate | null; // null = non mesuré à cette date (A8-2)
  modeVieT0: ModeVieDate | null; // fantôme au T0 du cycle couvrant la date
};

export type TrajectoireApiResponse =
  | {
      ok: true;
      trajectoire: Trajectoire;
      // Additifs LOT-02 — les consommateurs antérieurs les ignorent :
      modeViePresent: ModeVieDate | null;
      modeVieT0CycleCourant: ModeVieDate | null;
      etatDate?: EtatDateTrajectoire;
    }
  | { ok: false; reason: 'unauthenticated' | 'invalid' | 'patient_not_found' | 'forbidden' | 'exception'; error: string };

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
    // Garde d'appartenance (alignée sur boussole / protocoles / ja) : absence
    // et appartenance restent deux échecs distincts, chaque code HTTP déjà
    // exposé par cette route étant conservé.
    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') {
      return NextResponse.json({ ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
    }
    if (appartenance === 'autre_praticien') {
      return NextResponse.json({ ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' }, { status: 403 });
    }

    const episodesDb = await prisma.assessmentEpisode.findMany({
      where: { idPatient },
      select: { id: true, milestone: true, confirmedAt: true, cycleId: true, versionScore: true },
      orderBy: { confirmedAt: 'asc' },
    });
    const episodes: TrajectoireEpisode[] = episodesDb
      .filter((e) => (MILESTONES as readonly string[]).includes(e.milestone))
      .map((e) => ({
        id: e.id,
        milestone: e.milestone as JalonMomentum,
        confirmedAt: e.confirmedAt,
        // Identité de cycle STOCKÉE (gate G2) : la version de score est celle
        // figée à la confirmation, jamais la constante courante.
        cycleId: e.cycleId,
        versionScore: e.versionScore,
      }));

    const reponsesDb = await prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idQuestionnaire: true, dateReponse: true, scoresJson: true },
      orderBy: { dateReponse: 'asc' },
    });

    const trajectoire = construireTrajectoire({ episodes, reponses: reponsesDb });

    // Mode de vie au présent + fantôme T0 du cycle courant (LOT-02).
    const cycleCourant = trajectoire.cycles.length > 0 ? trajectoire.cycles[trajectoire.cycles.length - 1] : null;
    const modeViePresent = construireModeVieDate(reponsesDb);
    const modeVieT0CycleCourant = cycleCourant
      ? construireModeVieDate(reponsesDb, new Date(cycleCourant.dateT0))
      : null;

    // Lecture datée optionnelle `etatAu` : même doctrine que SP-TT — la date
    // doit être un repère réel du patient (épisode confirmé ou réponse reçue),
    // jamais un curseur libre. Hors repère → 400, rien n'est renvoyé.
    const etatAuParam = searchParams.get('etatAu');
    let etatDate: EtatDateTrajectoire | undefined;
    if (etatAuParam !== null && etatAuParam !== '') {
      const reperes = construireReperes({ episodes: episodesDb, reponses: reponsesDb });
      const resolution = resoudreAsOf(etatAuParam, reperes);
      if (resolution.mode === 'refus') {
        return NextResponse.json(
          { ok: false, reason: 'invalid', error: 'Date demandée hors des repères du patient.' },
          { status: 400 },
        );
      }
      if (resolution.mode === 'passe') {
        // Fantôme T0 : le cycle couvrant la date lue (dernier T0 ≤ date). Si
        // la date lue EST ce T0, pas de fantôme — un seul point, comme la
        // maquette.
        const instant = resolution.date.getTime();
        const cycleCouvrant = [...trajectoire.cycles]
          .filter((cycle) => new Date(cycle.dateT0).getTime() <= instant)
          .pop();
        const t0Distinct =
          cycleCouvrant && Math.abs(new Date(cycleCouvrant.dateT0).getTime() - instant) > 1000
            ? new Date(cycleCouvrant.dateT0)
            : null;
        etatDate = {
          date: resolution.date.toISOString(),
          modeVie: construireModeVieDate(reponsesDb, resolution.date),
          modeVieT0: t0Distinct ? construireModeVieDate(reponsesDb, t0Distinct) : null,
        };
      }
    }

    return NextResponse.json({ ok: true, trajectoire, modeViePresent, modeVieT0CycleCourant, etatDate });
  } catch (err) {
    console.error('[praticien/trajectoire GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
