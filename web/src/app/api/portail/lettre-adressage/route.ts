import { NextResponse } from 'next/server';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { lettreAdressagePatientOuverte } from '@/lib/correspondance/lettreAdressageRemise';
import { aUneLettreRemise, lettreRemiseAuPatient, type LettreAdressageServie } from '@/lib/correspondance/lettreServicePatient';
import { classeEtCode } from '@/lib/observability/classeEtCode';

/*
 * /api/portail/lettre-adressage — le courrier pour le médecin traitant, remis au
 * patient au clic « Valider pour diffusion » ([[D-262]], LOT-03a).
 *
 * DRAPEAU D'ABORD, fail-closed (`WN_LETTRE_ADRESSAGE_PATIENT`) : une surface
 * fermée ne fait travailler ni la session, ni la base. 503 et non 404 : le
 * chemin existe, il n'est pas ouvert. Même idiome qu'`api/portail/fiches-assiette`.
 *
 * `authentifierPatientPortail` et NON `authorizePortail` : un patient dont le
 * suivi est terminé garde le droit de relire ce qui lui a été remis.
 *
 * CE QUI SORT : la remise en cours, son état, sa date, et le texte seulement
 * quand elle est servie (`lettreServicePatient.ts`). `?interrupteur=1` : le lien
 * de l'accueil sait s'il doit paraître, sans qu'aucun texte ne voyage.
 */

export type PortailLettreAdressageResponse =
  | { ok: true; lettre: LettreAdressageServie | null }
  | { ok: true; ouvert: true; lettreRemise: boolean }
  | { ok: false; reason: 'feature_disabled' | 'unauthenticated' | 'forbidden' | 'exception'; error: string };

export async function GET(req: Request): Promise<NextResponse<PortailLettreAdressageResponse>> {
  if (!lettreAdressagePatientOuverte()) {
    return NextResponse.json(
      { ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' },
      { status: 503 },
    );
  }

  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailLettreAdressageResponse>;

    if (new URL(req.url).searchParams.get('interrupteur') === '1') {
      return NextResponse.json({ ok: true, ouvert: true, lettreRemise: await aUneLettreRemise(auth.patient.idPatient) });
    }

    return NextResponse.json({ ok: true, lettre: await lettreRemiseAuPatient(auth.patient.idPatient) });
  } catch (err) {
    // La classe et le code seulement : un message Prisma recopie les arguments
    // de la requête, donc potentiellement le texte de la lettre.
    console.error('[portail/lettre-adressage GET]', ...classeEtCode(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
