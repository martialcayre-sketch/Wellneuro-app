import { NextResponse } from 'next/server';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { lettreAdressagePatientOuverte } from '@/lib/correspondance/lettreAdressageRemise';
import { lettreImprimable } from '@/lib/correspondance/lettreServicePatient';
import { classeEtCode } from '@/lib/observability/classeEtCode';

/*
 * /api/portail/lettre-adressage/impression — le courrier remis, en page HTML
 * autonome à imprimer ([[D-262]], LOT-03b ; cadrage §3.2). Même feuille que la
 * lettre que le praticien imprime : rendu `medecin`, en-tête, nom du patient,
 * date, cadre interprofessionnel. Le texte est l'instantané de la remise.
 *
 * Mêmes gardes que la route de lecture : drapeau d'abord (503), session portail
 * ensuite (401/403). Rien de servi : 404, sans dire pourquoi. Jamais mis en
 * cache : la page porte un document de santé.
 */
export async function GET(req: Request): Promise<Response> {
  if (!lettreAdressagePatientOuverte()) {
    return NextResponse.json(
      { ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' },
      { status: 503 },
    );
  }
  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur;

    const html = await lettreImprimable(auth.patient.idPatient);
    if (!html) {
      return NextResponse.json(
        { ok: false, reason: 'introuvable', error: 'Aucun courrier à imprimer.' },
        { status: 404 },
      );
    }
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[portail/lettre-adressage/impression GET]', ...classeEtCode(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
