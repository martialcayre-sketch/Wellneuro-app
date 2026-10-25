import { NextResponse } from 'next/server';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { courrierComplementOuvert } from '@/lib/correspondance/courrierComplementRemise';
import {
  aUnCourrierComplementRemis,
  courrierComplementRemisAuPatient,
  type CourrierComplementServi,
} from '@/lib/correspondance/courrierComplementServicePatient';
import { classeEtCode } from '@/lib/observability/classeEtCode';

/*
 * /api/portail/courrier-complement — le courrier au médecin avant un complément
 * ciblé, remis au patient au clic « Valider pour diffusion » ([[D-345]] §4-§7,
 * J3-12h lot 4 ; patron `api/portail/lettre-adressage`).
 *
 * DRAPEAU D'ABORD, fail-closed (`WN_COURRIER_COMPLEMENT`, un seul drapeau,
 * D-358 §4) : une surface fermée ne fait travailler ni la session, ni la base.
 * 503 et non 404 : le chemin existe, il n'est pas ouvert.
 *
 * `authentifierPatientPortail` et NON `authorizePortail` : un patient dont le
 * suivi est terminé garde le droit de relire ce qui lui a été remis.
 *
 * CE QUI SORT : la remise en cours, son état, sa date, et le texte et le
 * destinataire seulement quand elle est servie
 * (`courrierComplementServicePatient.ts`). `?interrupteur=1` : le lien de
 * l'accueil sait s'il doit paraître, sans qu'aucun texte ne voyage.
 */

export type PortailCourrierComplementResponse =
  | { ok: true; courrier: CourrierComplementServi | null }
  | { ok: true; ouvert: true; courrierRemis: boolean }
  | { ok: false; reason: 'feature_disabled' | 'unauthenticated' | 'forbidden' | 'exception'; error: string };

export async function GET(req: Request): Promise<NextResponse<PortailCourrierComplementResponse>> {
  if (!courrierComplementOuvert()) {
    return NextResponse.json(
      { ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' },
      { status: 503 },
    );
  }

  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailCourrierComplementResponse>;

    if (new URL(req.url).searchParams.get('interrupteur') === '1') {
      return NextResponse.json({
        ok: true,
        ouvert: true,
        courrierRemis: await aUnCourrierComplementRemis(auth.patient.idPatient),
      });
    }

    return NextResponse.json({ ok: true, courrier: await courrierComplementRemisAuPatient(auth.patient.idPatient) });
  } catch (err) {
    // La classe et le code seulement : un message Prisma recopie les arguments
    // de la requête, donc potentiellement le texte du courrier.
    console.error('[portail/courrier-complement GET]', ...classeEtCode(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
