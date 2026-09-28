import { NextResponse } from 'next/server';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { lectureFichesOuverte } from '@/lib/fiches-assiette/drapeau';
import type { FicheRemiseServie } from '@/lib/fiches-assiette/ficheServie';
import { fichesRemisesAuPatient } from '@/lib/fiches-assiette/servicePatient';

/*
 * /api/portail/fiches-assiette — les fiches d'assiette remises au patient par
 * son praticien ([[D-251]] §7-§8, lot 9). L'espace de lecture qui les affiche
 * est le lot 10.
 *
 * DRAPEAU D'ABORD, fail-closed (`WN_FICHES_ASSIETTE_LECTURE`) : une surface
 * fermée ne fait travailler ni la vérification de session, ni la base. 503 et
 * non 404 : le chemin existe, il n'est pas ouvert. Même idiome
 * qu'`api/portail/comprehension`.
 *
 * `authentifierPatientPortail` et NON `authorizePortail` : celui-ci exige une
 * assignation, et un patient dont le suivi est terminé garde le droit de relire
 * ce qui lui a été remis (précédent `api/portail/bilan`).
 *
 * CE QUI SORT : pour chaque fiche, la remise en cours, son état, sa place dans
 * le protocole servi, et le texte seulement quand elle est servie. Jamais le
 * motif d'un retrait, le validateur, les claims ou le texte source.
 */

export type PortailFichesAssietteResponse =
  | { ok: true; fiches: FicheRemiseServie[] }
  | { ok: false; reason: 'feature_disabled' | 'unauthenticated' | 'forbidden' | 'exception'; error: string };

export async function GET(req: Request): Promise<NextResponse<PortailFichesAssietteResponse>> {
  if (!lectureFichesOuverte()) {
    return NextResponse.json(
      { ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' },
      { status: 503 },
    );
  }

  const auth = await authentifierPatientPortail(req);
  if (auth.erreur) return auth.erreur as NextResponse<PortailFichesAssietteResponse>;

  try {
    const fiches = await fichesRemisesAuPatient(auth.patient.idPatient);
    return NextResponse.json({ ok: true, fiches });
  } catch (err) {
    // La CLASSE seulement : un message Prisma recopie les arguments de la
    // requête, donc potentiellement un texte de fiche.
    console.error('[portail/fiches-assiette GET]', err instanceof Error ? err.name : 'inconnu');
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
