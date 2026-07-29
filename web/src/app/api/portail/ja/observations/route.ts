import { NextResponse } from 'next/server';
import {
  listJaObservationSnapshots,
  saveJaObservationSnapshot,
  type JaObservationSnapshot,
  type JaObservationSnapshotInput,
} from '@/lib/food-observation/persistence';
import {
  episodeIdCalibrage,
  episodeIdDepuisCycle,
} from '@/lib/food-observation/episodeDepuisProtocole';
import { isSessionValideForPatient, readPatientSession } from '@/lib/patient-session';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import { prisma } from '@/lib/prisma';

// Miroir de la troncature de `GET /api/portail/protocole`, dont le client tire
// l'identité du cycle.
const LONGUEUR_CYCLE_REF = 16;

type ErrorResponse = { ok: false; reason: string; error: string };
type ListResponse = { ok: true; snapshots: JaObservationSnapshot[] } | ErrorResponse;
type SaveResponse = { ok: true; snapshot: JaObservationSnapshot } | ErrorResponse;

function isPayload(value: unknown): value is Omit<JaObservationSnapshotInput, 'idPatient' | 'actor'> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.episode === 'object'
    && Array.isArray(v.traces)
    && Array.isArray(v.pauses)
    && Array.isArray(v.plans)
    && Array.isArray(v.solutions)
    && Array.isArray(v.actionCareer)
    // `journees` est FACULTATIF : un carnet en régime essai n'en produit
    // aucune, et un client antérieur au lot 3 ne l'envoie pas. Présent, il doit
    // être un tableau — un objet passerait la garde d'épisode puis échouerait
    // plus loin, sans message utile.
    && (v.journees === undefined || Array.isArray(v.journees))
  );
}

/**
 * Identité du bilan de calibrage attendue pour ce patient : ancrée sur son
 * assignation la plus récente, comme la sert `GET /api/portail/protocole`. Rend
 * `null` si aucune assignation — sans suivi, pas d'épisode.
 */
async function episodeCalibrageAttendu(idPatient: string): Promise<string | null> {
  const assignation = await prisma.assignation.findFirst({
    where: { idPatient },
    orderBy: { dateAssignation: 'desc' },
    select: { idAssignation: true },
  });
  if (!assignation) return null;
  return episodeIdCalibrage(idPatient, assignation.idAssignation.replace(/[^A-Za-z0-9_-]/g, ''));
}

async function resolveAuthorizedSession(req: Request): Promise<{ idPatient: string } | null> {
  const session = readPatientSession(req);
  if (!session) return null;

  const patient = await prisma.patient.findUnique({
    where: { idPatient: session.idPatient },
    select: {
      idPatient: true,
      actif: true,
      accessTokenRevoked: true,
      email: true,
      sessionsInvalidesAvant: true,
    },
  });

  if (!patient || !isSessionValideForPatient(session, patient)) return null;

  return { idPatient: session.idPatient };
}

export async function GET(req: Request): Promise<NextResponse<ListResponse>> {
  try {
    const auth = await resolveAuthorizedSession(req);
    if (!auth) {
      return NextResponse.json(
        { ok: false, reason: 'unauthorized', error: 'Session portail invalide ou expirée.' },
        { status: 401 },
      );
    }

    // Le patient ne chaîne que sur ses propres transmissions : le filtre est
    // posé en base, une fenêtre tous acteurs pouvant les masquer entièrement.
    const snapshots = await listJaObservationSnapshots(auth.idPatient, 10, 'patient');
    return NextResponse.json({ ok: true, snapshots });
  } catch (error) {
    console.error('[portail/ja/observations GET]', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request): Promise<NextResponse<SaveResponse>> {
  try {
    const auth = await resolveAuthorizedSession(req);
    if (!auth) {
      return NextResponse.json(
        { ok: false, reason: 'unauthorized', error: 'Session portail invalide ou expirée.' },
        { status: 401 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'JSON invalide.' },
        { status: 400 },
      );
    }

    if (!isPayload(body)) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Corps de requête incomplet.' },
        { status: 400 },
      );
    }

    // Autorité serveur sur l'identité du cycle. Sans elle, la cohérence
    // vérifiée par le domaine reste interne au corps reçu : un onglet resté
    // ouvert au travers d'une nouvelle diffusion transmettrait un instantané
    // parfaitement cohérent avec lui-même, et rattaché au cycle périmé.
    // Deux identités légitimes, jamais les deux à la fois : le cycle diffusé
    // quand il existe, le bilan de calibrage tant qu'il n'existe pas. Le client
    // ne choisit pas — le serveur recalcule celle qui vaut à cet instant.
    const diffuse = await resolveProtocoleDiffuse(auth.idPatient);
    const episodeAttendu = diffuse
      ? episodeIdDepuisCycle(auth.idPatient, diffuse.protocolDraftInputHash.slice(0, LONGUEUR_CYCLE_REF))
      : await episodeCalibrageAttendu(auth.idPatient);
    const episodeRecu = (body.episode as { episodeId?: unknown }).episodeId;
    if (!episodeAttendu || episodeRecu !== episodeAttendu) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'cycle_perime',
          error: 'Votre carnet a changé de période. Rechargez la page avant de transmettre.',
        },
        { status: 409 },
      );
    }

    const snapshot = await saveJaObservationSnapshot({
      idPatient: auth.idPatient,
      episode: body.episode,
      traces: body.traces,
      pauses: body.pauses,
      plans: body.plans,
      solutions: body.solutions,
      actionCareer: body.actionCareer,
      journees: body.journees,
      supersedesDraftId: typeof body.supersedesDraftId === 'string' ? body.supersedesDraftId : undefined,
      actor: 'patient',
    });

    return NextResponse.json({ ok: true, snapshot }, { status: 201 });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: error.message },
        { status: 400 },
      );
    }

    console.error('[portail/ja/observations POST]', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
