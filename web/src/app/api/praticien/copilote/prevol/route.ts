import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { construirePreVol, type EntreesPreVol, type PreVol } from '@/lib/copilote/prevol';

// GET /api/praticien/copilote/prevol?idPatient= — pré-vol T-10 min (SP-COP
// LOT-01). LECTURE SEULE : aucune écriture, aucune persistance, aucun snapshot.
// La vue se reconstruit intégralement à chaque appel — c'est le contrat de la
// campagne (refus doctrinal du snapshot persisté, C2A).
// La sélection et les libellés sont dans lib/copilote/prevol.ts (fonctions
// pures, testées) ; cette route ne fait que lire et transmettre.
// Garde d'appartenance appliquée : le patient doit appartenir au praticien
// connecté, comme sur /versions, /diffusion, /boussole et /ja.

export type PreVolApiResponse =
  | { ok: true; prevol: PreVol }
  | { ok: false; reason: string; error: string };

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/copilote/prevol';

// Lecture prudente du JSON de check-in : une valeur absente ou illisible reste
// `null` (aucune question suggérée ne se déclenchera dessus) plutôt que d'être
// devinée.
function lireReponse(reponses: unknown, cle: string): string | null {
  if (!reponses || typeof reponses !== 'object') return null;
  const valeur = (reponses as Record<string, unknown>)[cle];
  return typeof valeur === 'string' ? valeur : null;
}

export async function GET(req: Request): Promise<NextResponse<PreVolApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }

    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') {
      return NextResponse.json(
        { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }
    if (appartenance === 'autre_praticien') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const [consultation, reponses, checkins, episodes, drafts, diffusions, assignations, signalements] =
      await Promise.all([
        // L'ancre : la dernière consultation validée. Sans elle, le pré-vol
        // retient tout l'historique plutôt que de supposer ce qui a été vu.
        prisma.consultation.findFirst({
          where: { idPatient, statut: 'validee', dateValidation: { not: null } },
          orderBy: { dateValidation: 'desc' },
          select: { dateValidation: true },
        }),
        prisma.questionnaireReponse.findMany({
          where: { idPatient },
          select: { idQuestionnaire: true, dateReponse: true },
        }),
        prisma.protocolCheckin.findMany({
          where: { idPatient },
          select: { pointEtape: true, soumisLe: true, reponses: true },
        }),
        prisma.assessmentEpisode.findMany({
          where: { idPatient },
          // `versionScore` est figé à la mesure (A8-3) : le pré-vol le
          // transporte tel quel, `null` compris sur les lignes héritées.
          select: { milestone: true, confirmedAt: true, versionScore: true },
        }),
        prisma.protocolDraft.findMany({
          where: { idPatient, reviewedAt: { not: null } },
          select: { reviewedAt: true },
        }),
        prisma.protocolDiffusionApproval.findMany({
          where: { idPatient },
          select: { approvedAt: true },
        }),
        prisma.assignation.findMany({
          where: { idPatient, correctionDemandeeDate: { not: null } },
          select: { correctionDemandeeDate: true },
        }),
        prisma.trustAdverseEffectReport.findMany({
          where: { idPatient, statutTraitement: { in: ['recu', 'en_cours'] } },
          select: { soumisLe: true },
        }),
      ]);

    const entrees: EntreesPreVol = {
      derniereConsultationValidee: consultation?.dateValidation ?? null,
      reponses,
      pointsEtape: checkins.map((checkin) => ({
        pointEtape: checkin.pointEtape,
        soumisLe: checkin.soumisLe,
        tolerance: lireReponse(checkin.reponses, 'tolerance'),
        adhesion: lireReponse(checkin.reponses, 'adhesion'),
      })),
      episodes,
      protocolesRelus: drafts
        .filter((draft): draft is { reviewedAt: Date } => draft.reviewedAt !== null)
        .map((draft) => ({ reviewedAt: draft.reviewedAt })),
      diffusionsApprouvees: diffusions,
      demandesCorrection: assignations
        .filter((a): a is { correctionDemandeeDate: Date } => a.correctionDemandeeDate !== null)
        .map((a) => ({ demandeeLe: a.correctionDemandeeDate })),
      signalements,
    };

    return NextResponse.json({ ok: true, prevol: construirePreVol(entrees) });
  } catch (err) {
    console.error('[praticien/copilote/prevol GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
