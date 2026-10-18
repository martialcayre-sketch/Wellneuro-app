import { NextResponse } from 'next/server';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { documentDisponible, documentMedecinPatientOuvert } from '@/lib/documents/documentMedecinImprime';
import { classeEtCode } from '@/lib/observability/classeEtCode';

/*
 * /api/portail/document-medecin — « Pour votre médecin » ([[D-307]] §3, F38) :
 * le patient sait s'il a un document à remettre, et de quand il date. Le
 * contenu ne voyage que par `…/telechargement`, qui journalise.
 *
 * DRAPEAU D'ABORD, fail-closed (`WN_DOCUMENT_MEDECIN_PATIENT`), 503 : même
 * idiome que `api/portail/lettre-adressage`. `authentifierPatientPortail` et
 * non `authorizePortail` : un suivi terminé garde la relecture.
 *
 * RIEN À REMETTRE : aucune impression, OU un partage avec le médecin traitant
 * refusé, retiré ou jamais exprimé (arbitrage du 2026-10-18). Le portail ne
 * distingue pas les deux. `?interrupteur=1` : le lien de l'accueil sait s'il
 * doit paraître.
 */

export type PortailDocumentMedecinResponse =
  | { ok: true; document: { imprimeLe: string } | null }
  | { ok: true; ouvert: true; disponible: boolean }
  | { ok: false; reason: 'feature_disabled' | 'unauthenticated' | 'forbidden' | 'exception'; error: string };

export async function GET(req: Request): Promise<NextResponse<PortailDocumentMedecinResponse>> {
  if (!documentMedecinPatientOuvert()) {
    return NextResponse.json(
      { ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' },
      { status: 503 },
    );
  }

  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailDocumentMedecinResponse>;

    const disponible = await documentDisponible(auth.patient.idPatient);
    if (new URL(req.url).searchParams.get('interrupteur') === '1') {
      return NextResponse.json({ ok: true, ouvert: true, disponible: disponible !== null });
    }
    return NextResponse.json({
      ok: true,
      document: disponible ? { imprimeLe: disponible.imprimeLe.toISOString() } : null,
    });
  } catch (err) {
    console.error('[portail/document-medecin GET]', ...classeEtCode(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
