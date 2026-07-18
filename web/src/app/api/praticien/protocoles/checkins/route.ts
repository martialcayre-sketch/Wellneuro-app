import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { construireHistoriqueEquilibre, resoudreDateT0 } from '@/lib/equilibre/depuisPrisma';
import { listCheckins, type CheckinRow } from '@/lib/protocol/checkins';
import { buildResumeJ21, type ResumeJ21 } from '@/lib/protocol/resumeJ21';

// Lecture praticien des check-ins J7/J14/J21 + résumé J21 « point de jonction »
// (C2A LOT-04). Le praticien distingue adhésion et effet à partir des réponses ;
// le résumé croise l'action tenue/tolérée (check-ins) et le mouvement du score via
// `momentum.ts` (jalons de mesure, propriété exclusive de momentum.ts).
// C2B LOT-07 : le momentum réel est branché (historique d'équilibre daté du
// patient), donc le volet score cesse d'être null dès qu'un cycle T0+J21 mesuré
// existe ; sans cycle mesurable il reste null (jamais un 0 inventé), le résumé
// demeurant honnête. Ancrage T0 global (resoudreDateT0), identique à
// api/praticien/equilibre ; l'ancrage par épisode relève de C2B LOT-08.
// Hypothèse mono-praticien (§8.8) : garde de session sans scope par identité,
// cohérent avec les routes /versions et /diffusion.

const ID_PATTERN = /^[A-Za-z0-9_:.#-]+$/;

type GetResponse =
  | { ok: true; checkins: CheckinRow[]; resume: ResumeJ21 }
  | { ok: false; reason: string; error: string };

// GET ?idPatient=&decisionCardId= — check-ins du fil + résumé J21.
export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
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
    const decisionCardId = (searchParams.get('decisionCardId') ?? '').trim();
    if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }
    if (!decisionCardId || !ID_PATTERN.test(decisionCardId) || decisionCardId.length > 200) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant de carte de décision invalide.' },
        { status: 400 },
      );
    }

    // Versions du fil (protocole logique) → borne les check-ins à ce protocole.
    const versions = await prisma.protocolDraft.findMany({
      where: { idPatient, decisionCardId },
      select: { id: true },
    });
    const filIds = new Set(versions.map((v) => v.id));

    const all = await listCheckins(idPatient);
    const checkins = all.filter((c) => filIds.has(c.protocolDraftId));

    // C2B LOT-07 : brancher le momentum réel du patient (jalons de mesure lus via
    // l'API publique de momentum.ts, jamais réimplémentés). Un jalon sans
    // couverture est omis par construireHistoriqueEquilibre (jamais un 0) ; sans
    // T0, momentum = null et le résumé conserve un score null honnête.
    const reponsesDb = await prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idQuestionnaire: true, dateReponse: true, scoresJson: true },
      orderBy: { dateReponse: 'asc' },
    });
    const dateT0 = resoudreDateT0(reponsesDb);
    const momentum = dateT0
      ? { dateT0, lectures: construireHistoriqueEquilibre(reponsesDb) }
      : null;

    const resume = buildResumeJ21({ checkins, momentum });

    return NextResponse.json({ ok: true, checkins, resume });
  } catch (err) {
    console.error('[praticien/protocoles/checkins GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
