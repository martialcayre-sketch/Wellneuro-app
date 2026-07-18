import { NextResponse } from 'next/server';
import { authorizePortail, resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import {
  ensurePointEtape,
  ensureReponses,
  listCheckins,
  pointEtapeCourant,
  POINTS_ETAPE,
  resolveActiveCheckin,
  saveCheckin,
  type CheckinRow,
  type PointEtape,
} from '@/lib/protocol/checkins';

// Check-in patient d'un « rendez-vous de suivi » J7/J14/J21 (C2A LOT-04).
// Écriture UNIQUEMENT via session portail (`readPatientSession` +
// `isSessionAuthorizedForAssignment`) : le chemin legacy email-gate est exclu
// (§8.4). Le portail est token-based : l'assignation d'ancrage R8-lite est donc
// résolue CÔTÉ SERVEUR depuis la session (jamais imposée par le client), puis
// re-vérifiée par `isSessionAuthorizedForAssignment`. Le check-in est rattaché
// au protocole DIFFUSÉ actif du patient (approbation « pour diffusion » LOT-03) ;
// le point d'étape ouvert est dérivé de la date de diffusion (fenêtre ±3 j).
// Append-only : une correction chaîne la ligne précédente via
// `supersedesCheckinId`. Aucun score, aucun pourcentage d'observance.

type ErrorResponse = { ok: false; reason: string; error: string };

type PostResponse =
  | { ok: true; checkinId: string; pointEtape: PointEtape }
  | ErrorResponse;

type PointEtat = { pointEtape: PointEtape; renseigne: boolean; reponses: CheckinRow['reponses'] | null };

type GetResponse =
  | {
      ok: true;
      protocoleDiffuse: boolean;
      pointEtapeOuvert: PointEtape | null;
      points: PointEtat[];
    }
  | ErrorResponse;

// (Auth portail + résolution du protocole diffusé factorisés dans
// `@/lib/protocol/portailProtocol`, partagés avec la route de vue LOT-05.)

// POST — soumet (ou corrige) le check-in du point d'étape ouvert.
export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Corps de requête illisible.' },
        { status: 400 },
      );
    }

    const auth = await authorizePortail(req);
    if ('ok' in auth) {
      const status = auth.reason === 'unauthenticated' ? 401 : 404;
      return NextResponse.json(auth, { status });
    }

    const diffuse = await resolveProtocoleDiffuse(auth.idPatient);
    if (!diffuse) {
      return NextResponse.json(
        { ok: false, reason: 'no_protocol', error: 'Aucun protocole diffusé pour le moment.' },
        { status: 409 },
      );
    }

    const pointOuvert = pointEtapeCourant(diffuse.approvedAt, new Date());
    if (!pointOuvert) {
      return NextResponse.json(
        { ok: false, reason: 'no_step_open', error: 'Aucun rendez-vous de suivi ouvert actuellement.' },
        { status: 409 },
      );
    }

    // Le point d'étape est imposé par le calendrier : si le client en propose un,
    // il doit correspondre au point ouvert (jamais un point arbitraire).
    if (body.pointEtape !== undefined && ensurePointEtape(body.pointEtape) !== pointOuvert) {
      return NextResponse.json(
        { ok: false, reason: 'step_mismatch', error: 'Ce rendez-vous de suivi n’est pas ouvert.' },
        { status: 409 },
      );
    }

    const reponses = ensureReponses(body.reponses);
    const supersedesCheckinId =
      typeof body.supersedesCheckinId === 'string' ? body.supersedesCheckinId : undefined;

    const created = await saveCheckin({
      idPatient: auth.idPatient,
      idAssignation: auth.idAssignation,
      protocolDraftId: diffuse.protocolDraftId,
      pointEtape: pointOuvert,
      reponses,
      supersedesCheckinId,
    });

    return NextResponse.json({ ok: true, checkinId: created.id, pointEtape: pointOuvert }, { status: 201 });
  } catch (err) {
    if (err instanceof TypeError) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: err.message }, { status: 400 });
    }
    console.error('[portail/protocole/checkin POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

// GET — état des rendez-vous de suivi du protocole diffusé actif.
export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  try {
    const auth = await authorizePortail(req);
    if ('ok' in auth) {
      const status = auth.reason === 'unauthenticated' ? 401 : 404;
      return NextResponse.json(auth, { status });
    }

    const diffuse = await resolveProtocoleDiffuse(auth.idPatient);
    if (!diffuse) {
      return NextResponse.json({
        ok: true,
        protocoleDiffuse: false,
        pointEtapeOuvert: null,
        points: [],
      });
    }

    const checkins = await listCheckins(auth.idPatient, diffuse.protocolDraftId);
    const points: PointEtat[] = POINTS_ETAPE.map((pointEtape) => {
      const actif = resolveActiveCheckin(checkins, pointEtape);
      return { pointEtape, renseigne: actif !== null, reponses: actif?.reponses ?? null };
    });

    return NextResponse.json({
      ok: true,
      protocoleDiffuse: true,
      pointEtapeOuvert: pointEtapeCourant(diffuse.approvedAt, new Date()),
      points,
    });
  } catch (err) {
    console.error('[portail/protocole/checkin GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
