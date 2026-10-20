import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { estTypeCompteRendu } from '@/lib/biology-library/publie';
import { consulterDocument } from '@/lib/collecte/documentsDeposesServeur';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// UN DOCUMENT DÉPOSÉ PAR LE PATIENT, OUVERT PAR LE PRATICIEN DU DOSSIER
// ([[D-330]], J3-collecte). Paramètres : `idPatient`, `idDocument`.
//
// LA PREMIÈRE OUVERTURE EST TRACÉE, ELLE SEULE, avant que le document ne soit
// servi (`consulterDocument`, écriture conditionnelle) ; l'accès au dossier est
// journalisé (GD-1) par la garde d'appartenance. Un document retiré n'existe
// plus : 410.
//
// UN FICHIER VENU DE L'EXTÉRIEUR, rendu au navigateur du praticien — mêmes
// en-têtes que le compte rendu (`api/praticien/biologie/import/document`) :
// le type servi est celui CONSIGNÉ (liste fermée, signature vérifiée au dépôt),
// `nosniff` ; une image (réencodée) sous `sandbox` ; un PDF sans, le lecteur du
// navigateur refusant de s'ouvrir sandboxé ; aucun nom de fichier, aucun cache,
// aucun référent.

export const runtime = 'nodejs';

const ROUTE_JOURNAL = '/api/praticien/documents-deposes/contenu';
const ID = /^[A-Za-z0-9_-]{1,64}$/;

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    const params = new URL(req.url).searchParams;
    const idPatient = params.get('idPatient')?.trim() ?? '';
    const idDocument = params.get('idDocument')?.trim() ?? '';
    if (!ID.test(idPatient)) return echec('invalid', 'Identifiant patient invalide.', 400);
    if (!ID.test(idDocument)) return echec('invalid', 'Document mal désigné.', 400);

    const email = emailPraticien(session);
    const verdict = await verifierAppartenancePatient(idPatient, email, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (verdict === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (verdict === 'autre_praticien' || !email) {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    const issue = await consulterDocument(idPatient, idDocument, email);
    if (!issue.ok) {
      return issue.reason === 'document_retire'
        ? echec('document_retire', 'Ce document a été retiré : il ne peut plus être affiché.', 410)
        : echec('document_introuvable', 'Ce document est introuvable dans ce dossier.', 404);
    }
    if (!estTypeCompteRendu(issue.typeMime)) return echec('server_error', 'Erreur technique.', 500);

    const enTetes = new Headers({
      'Content-Type': issue.typeMime,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, private',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
    if (issue.typeMime !== 'application/pdf') enTetes.set('Content-Security-Policy', 'sandbox');
    return new Response(new Uint8Array(issue.contenu), { status: 200, headers: enTetes });
  } catch (err) {
    console.error('[praticien/documents-deposes/contenu GET] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
