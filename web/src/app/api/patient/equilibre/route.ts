import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BESOINS } from '@/lib/equilibre/constants';
import {
  construireHistoriqueEquilibre,
  construireReponsesParQuestionnaire,
  resoudreDateT0,
} from '@/lib/equilibre/depuisPrisma';
import { calculerDeltaMomentum, resoudreLectureJalon } from '@/lib/equilibre/momentum';
import { calculerObjetsCliniques } from '@/lib/equilibre/objetsCliniques';
import type { JalonMomentum, LectureDatee, ResultatMomentum, StrateCode } from '@/lib/equilibre/types';

// Données patient-safe uniquement : jamais les niveaux de preuve A/B/C/D
// (réservés praticien, cf. docs/claude/MON_EQUILIBRE_CONTEXTE.md §3).
export type BesoinPatient = { id: number; libellePatient: string; strate: StrateCode; couverture: number | null };

export type PatientEquilibreResponse =
  | {
      indiceGlobal: number | null; // 0-100
      momentum: ResultatMomentum | null;
      trajectoire: { date: string; valeur: number }[]; // T0 -> J90
      besoins: BesoinPatient[];
    }
  | { ok: false; reason: string; error: string };

function versCent(ratio: number | null): number | null {
  return ratio === null ? null : Math.round(ratio * 100);
}

// GET /api/patient/equilibre?id=ASS...&email=...
export async function GET(req: Request): Promise<NextResponse<PatientEquilibreResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idAssignation = (searchParams.get('id') ?? '').trim();
    const emailRaw = (searchParams.get('email') ?? '').trim().toLowerCase();

    if (!idAssignation || !/^[A-Za-z0-9_-]+$/.test(idAssignation) || idAssignation.length > 64) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant invalide.' }, { status: 400 });
    }
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Email invalide.' }, { status: 400 });
    }

    const ass = await prisma.assignation.findUnique({ where: { idAssignation } });
    if (!ass || ass.emailPatient.toLowerCase() !== emailRaw) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Assignation non reconnue.' }, { status: 404 });
    }

    const reponsesDb = await prisma.questionnaireReponse.findMany({
      where: { idPatient: ass.idPatient },
      select: { idQuestionnaire: true, dateReponse: true, scoresJson: true },
      orderBy: { dateReponse: 'asc' },
    });

    const reponses = construireReponsesParQuestionnaire(reponsesDb);
    const objets = calculerObjetsCliniques(reponses);

    const dateT0 = resoudreDateT0(reponsesDb);
    let momentum: ResultatMomentum | null = null;
    let historique: LectureDatee[] = [];
    if (dateT0) {
      historique = construireHistoriqueEquilibre(reponsesDb);
      const lectureT0 = resoudreLectureJalon(dateT0, 'T0', historique);
      const jalonsDecroissants: JalonMomentum[] = ['J90', 'J42', 'J21'];
      const dernierJalonAtteint = jalonsDecroissants.find(
        jalon => resoudreLectureJalon(dateT0, jalon, historique) !== null
      );
      const lectureRecente = dernierJalonAtteint
        ? resoudreLectureJalon(dateT0, dernierJalonAtteint, historique)
        : null;
      momentum = calculerDeltaMomentum(lectureT0, lectureRecente);
    }

    const couverturesParBesoin = new Map(
      objets.indiceGlobal.strates.flatMap(s => s.besoins).map(b => [b.besoin, b.couverture])
    );

    const besoins: BesoinPatient[] = BESOINS.map(b => ({
      id: b.id,
      libellePatient: b.libellePatient,
      strate: b.strate,
      couverture: versCent(couverturesParBesoin.get(b.id) ?? null),
    }));

    return NextResponse.json({
      indiceGlobal: objets.indiceGlobal.scoreGlobal,
      momentum,
      trajectoire: historique.map(l => ({ date: l.date.toISOString(), valeur: l.valeur })),
      besoins,
    });
  } catch (err) {
    console.error('[patient/equilibre GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
