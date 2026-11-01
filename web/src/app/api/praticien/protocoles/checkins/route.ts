import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculerMomentumDuCycle } from '@/lib/equilibre/momentumDuCycle';
import { ancreCourante, lireAncresPersistees } from '@/lib/protocol/ancresPersistees';
import type { AncreCycle } from '@/lib/protocol/cycles';
import { listCheckins, type CheckinRow } from '@/lib/protocol/checkins';
import { buildResumeJ21, type ResumeJ21 } from '@/lib/protocol/resumeJ21';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { lireCalendriersSuivi } from '@/lib/protocol/calendriersPersistes';

// Lecture praticien des check-ins J7/J14/J21 + résumé J21 « point de jonction »
// (C2A LOT-04). Le praticien distingue adhésion et effet à partir des réponses ;
// le résumé croise l'action tenue/tolérée (check-ins) et le mouvement du score via
// `momentum.ts` (jalons de mesure, propriété exclusive de momentum.ts).
// C2B LOT-07 : le momentum réel est branché (historique d'équilibre daté du
// patient), donc le volet score cesse d'être null dès qu'un cycle T0+J21 mesuré
// existe ; sans cycle mesurable il reste null (jamais un 0 inventé), le résumé
// demeurant honnête.
// C2B LOT-08 (registre A8-1) : côté praticien, l'ancrage T0 est celui de
// l'épisode confirmé (jalon T0 de `assessment_episodes`, `confirmedAt` le plus
// récent) plutôt que le T0 global (première réponse). Sans épisode T0 confirmé,
// repli sur le T0 global (resoudreDateT0), identique à api/praticien/equilibre.
// La fiche patient « Mon équilibre » conserve, elle, le T0 global (inchangé).
// Garde d'appartenance appliquée, comme /versions et /diffusion : l'hypothèse
// mono-praticien qui justifiait son absence n'est plus un motif suffisant.

const ID_PATTERN = /^[A-Za-z0-9_:.#-]+$/;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/protocoles/checkins';

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

    // Garde d'appartenance : le patient d'un autre praticien est traité comme
    // introuvable — un code distinct confirmerait son existence.
    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance !== 'accessible') {
      return NextResponse.json(
        { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }

    // [[D-397]] : le score du résumé est le momentum du cycle courant, le même
    // calcul qu'au portail, à l'onglet Équilibre et au fil (contre-revue Codex
    // P1-2) — ancre du cycle, dernière remesure, rien sans jour 0. Il ne
    // reconstruit plus sa propre paire ancre → J21.
    const reponsesDb = await prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idQuestionnaire: true, dateReponse: true, scoresJson: true, statutValidite: true },
      orderBy: { dateReponse: 'asc' },
    });
    // LOT-08 : l'ancre est celle du CYCLE COURANT — le rang le plus haut, et
    // non plus « le T0 confirmé le plus récent » (`D-113`). Sans ancre
    // confirmée, le cycle n'est pas ouvert : aucun momentum.
    const ancres = await lireAncresPersistees(idPatient);
    const ancre = ancreCourante(ancres);
    // Le calendrier de suivi du cycle courant ([[D-255]]) : son jour 0 date les
    // jalons ; sans diffusion sur ce cycle, aucun momentum ([[D-397]] §2).
    const calendrier = ancre
      ? (await lireCalendriersSuivi(idPatient, null, ancres)).parCycle.get(ancre.cycleId ?? ancre.id) ?? null
      : null;
    const jourZero = calendrier?.jourZero ?? null;

    // LES CHECK-INS SE LISENT SUR LES VERSIONS DU CALENDRIER ([[D-255]], lot 4),
    // comme au portail : une rediffusion sans pivot peut porter une version
    // d'une AUTRE carte (après un J21), et un point rendu sous elle reste rendu.
    // Le rail « Suivi » en dépend. Sans calendrier, repli sur les versions du
    // fil de la carte (protocole logique), la lecture d'avant.
    const bornes = calendrier
      ? new Set(calendrier.versionIds)
      : new Set(
          (await prisma.protocolDraft.findMany({ where: { idPatient, decisionCardId }, select: { id: true } }))
            .map((v) => v.id),
        );
    const checkins = (await listCheckins(idPatient)).filter((c) => bornes.has(c.protocolDraftId));
    const momentum = calculerMomentumDuCycle({
      reponses: reponsesDb,
      ancre: ancre ? { ancre: ancre.milestone as AncreCycle, date: ancre.confirmedAt } : null,
      jourZero,
    });

    // J2-jourN (H52) : le jour du cycle et les marques E4 partent du MÊME
    // jour 0 que le momentum ci-dessus — une seule date de départ.
    const resume = buildResumeJ21({ checkins, momentum, jourZero });

    return NextResponse.json({ ok: true, checkins, resume });
  } catch (err) {
    console.error('[praticien/protocoles/checkins GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
