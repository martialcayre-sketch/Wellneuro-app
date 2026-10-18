import { NextResponse } from 'next/server';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { documentMedecinPatientOuvert, telechargerDocument } from '@/lib/documents/documentMedecinImprime';
import { classeEtCode } from '@/lib/observability/classeEtCode';

/*
 * /api/portail/document-medecin/telechargement — le patient télécharge « Pour
 * votre médecin » pour le remettre lui-même ([[D-307]] §3, F38). Il reçoit
 * l'instantané FIGÉ de la dernière impression, et CHAQUE téléchargement est une
 * ligne datée par la base (arbitrages du 2026-10-18).
 *
 * Mêmes gardes que la route d'état ; le partage est relu sous verrou au moment
 * d'écrire le journal (`telechargerDocument`). Rien à remettre : 404, sans dire
 * pourquoi. Jamais mis en cache : le fichier porte un document de santé.
 */
export async function GET(req: Request): Promise<Response> {
  if (!documentMedecinPatientOuvert()) {
    return NextResponse.json(
      { ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' },
      { status: 503 },
    );
  }
  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur;

    const document = await telechargerDocument(auth.patient.idPatient);
    if (!document) {
      return NextResponse.json(
        { ok: false, reason: 'introuvable', error: 'Aucun document à remettre.' },
        { status: 404 },
      );
    }
    return new Response(document.html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pour-votre-medecin.html"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    // La classe et le code seulement : un message Prisma recopie les arguments.
    console.error('[portail/document-medecin/telechargement GET]', ...classeEtCode(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
