import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import type { FinaliteChoix, StatutChoix } from '@/lib/trust/types';

export type TrustChoixResponse = { ok: true } | { ok: false; reason: string; error: string };

type Payload = { token?: string; finalite?: string; statut?: string };

const FINALITES_VALIDES: FinaliteChoix[] = [
  'partage_medecin_traitant',
  'communications_non_essentielles',
];
const STATUTS_VALIDES: StatutChoix[] = ['accorde', 'refuse', 'retire'];

// POST /api/portail/trust/choix — enregistre un événement de choix facultatif.
// Append-only : le nouvel événement supplante le précédent (supersedesEventId)
// sans jamais l'écraser. Le retrait est aussi simple que l'accord.
export async function POST(req: Request): Promise<NextResponse<TrustChoixResponse>> {
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const finalite = payload.finalite as FinaliteChoix;
  const statut = payload.statut as StatutChoix;
  if (!FINALITES_VALIDES.includes(finalite) || !STATUTS_VALIDES.includes(statut)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Choix inconnu.' }, { status: 400 });
  }

  const auth = await authentifierPatientPortail(req, payload.token ?? null);
  if (auth.erreur) return auth.erreur as NextResponse<TrustChoixResponse>;
  const { patient } = auth;

  try {
    const precedent = await prisma.trustChoiceEvent.findFirst({
      where: { idPatient: patient.idPatient, finalite },
      orderBy: { enregistreLe: 'desc' },
      select: { id: true, statut: true },
    });
    // Retirer un choix jamais accordé n'a pas de sens ; on répond ok sans écrire.
    if (statut === 'retire' && (!precedent || precedent.statut !== 'accorde')) {
      return NextResponse.json({ ok: true });
    }
    await prisma.trustChoiceEvent.create({
      data: {
        idPatient: patient.idPatient,
        finalite,
        statut,
        documentVersion: getDocumentCourant('droits_patient').version,
        supersedesEventId: precedent?.id ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[trust/choix POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
