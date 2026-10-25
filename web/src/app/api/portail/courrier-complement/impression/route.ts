import { NextResponse } from 'next/server';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { courrierComplementOuvert } from '@/lib/correspondance/courrierComplementRemise';
import { courrierComplementImprimable } from '@/lib/correspondance/courrierComplementServicePatient';
import { classeEtCode } from '@/lib/observability/classeEtCode';

/*
 * /api/portail/courrier-complement/impression?remise=<id> — UN courrier remis,
 * en page HTML autonome à imprimer ([[D-345]], J3-12h lot 4 ; patron
 * `api/portail/lettre-adressage/impression`). Le dossier pouvant porter
 * plusieurs remises ([[D-362]] §2), la remise se désigne ; elle est cherchée
 * dans le dossier de la SESSION, jamais ailleurs. Même feuille que le courrier
 * que le praticien prépare : rendu `medecin`, en-tête, nom du patient, date.
 * Le texte est l'instantané de la remise.
 *
 * Mêmes gardes que la route de lecture : drapeau d'abord (503), session portail
 * ensuite (401/403). Identifiant absent ou mal formé : 400. Rien de servi : 404,
 * sans dire pourquoi. Jamais mis en cache : la page porte un document de santé.
 */

const ID_REMISE = /^[A-Za-z0-9_-]{1,64}$/;

export async function GET(req: Request): Promise<Response> {
  if (!courrierComplementOuvert()) {
    return NextResponse.json(
      { ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' },
      { status: 503 },
    );
  }
  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur;

    const idRemise = new URL(req.url).searchParams.get('remise') ?? '';
    if (!ID_REMISE.test(idRemise)) {
      return NextResponse.json({ ok: false, reason: 'corps_invalide', error: 'Courrier non désigné.' }, { status: 400 });
    }

    const html = await courrierComplementImprimable(auth.patient.idPatient, idRemise);
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
    console.error('[portail/courrier-complement/impression GET]', ...classeEtCode(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
