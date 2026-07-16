import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import type { TrustDocumentKey, TypeAccuse } from '@/lib/trust/types';

export type TrustLectureResponse = { ok: true } | { ok: false; reason: string; error: string };

type Payload = { token?: string; documentKey?: string; type?: string };

const CLES_VALIDES: TrustDocumentKey[] = [
  'cadre_accompagnement',
  'limites_securite',
  'donnees_confidentialite',
  'usage_ia',
  'droits_patient',
  'consentement_suivi',
];
const TYPES_VALIDES: TypeAccuse[] = ['presente', 'pris_connaissance'];

// POST /api/portail/trust/lecture — accusé de lecture de la version COURANTE
// d'un document (version + hash résolus côté serveur : le client ne choisit
// jamais ce qui est réputé lu). Idempotent : un accusé existant pour le même
// (patient, document, version, type) n'est ni dupliqué ni modifié.
export async function POST(req: Request): Promise<NextResponse<TrustLectureResponse>> {
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const documentKey = payload.documentKey as TrustDocumentKey;
  const type = payload.type as TypeAccuse;
  if (!CLES_VALIDES.includes(documentKey) || !TYPES_VALIDES.includes(type)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Document ou type inconnu.' }, { status: 400 });
  }

  const auth = await authentifierPatientPortail(req, payload.token ?? null);
  if (auth.erreur) return auth.erreur as NextResponse<TrustLectureResponse>;
  const { patient } = auth;

  try {
    const version = getDocumentCourant(documentKey);
    await prisma.trustAcknowledgement.create({
      data: {
        idPatient: patient.idPatient,
        documentKey,
        documentVersion: version.version,
        contentHash: version.hash,
        type,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Contrainte unique = accusé déjà enregistré : idempotence, pas une erreur
    // (duck-typing P2002, même convention que api/praticien/patients).
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ ok: true });
    }
    console.error('[trust/lecture POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
