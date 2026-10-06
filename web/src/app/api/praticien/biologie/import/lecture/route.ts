import { NextResponse } from 'next/server';
import { isBioLectureEnabled } from '@/lib/biology-library/featureFlag';
import { garderImport } from '@/lib/biology-library/import/garde';
import { lireDemandeActe, poserActeLecture } from '@/lib/biology-library/import/acteLecture';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// L'ACTE DE LECTURE CLINIQUE d'un import biologique validé ([[D-268]],
// BIO-PARCOURS BP-10), et sa révocation. Corps :
//   `{ idPatient, idImport, acte: 'lecture' }`
//   `{ idPatient, idImport, acte: 'revocation', idLecture, code }`
// où `code` est pris dans la liste fermée (`CODES_REVOCATION`).
//
// LE DRAPEAU D'ABORD (`WN_BIO_LECTURE_ENABLED`, éteint = comportement actuel),
// puis la garde de l'import : session, identifiant, et APPARTENANCE du dossier
// au praticien en session (`verifierAppartenancePatient`) — seul le praticien
// du dossier pose ou révoque un acte (§5). La base le refuse aussi.
//
// AUCUN REFUS DE DOSSIER CLOS : l'acte se pose même sur un suivi clôturé
// (précision du 2026-10-06). Il ne bloque ni ne débloque aucun geste (§3).
//
// PAS de journal d'accès : dispense d'écriture GD-1 ([[D-118]]) — l'acte
// porte déjà son auteur et son instant.

export const runtime = 'nodejs';

const ID = /^[A-Za-z0-9_-]{1,64}$/;

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

export async function POST(req: Request) {
  try {
    if (!isBioLectureEnabled()) {
      return echec('bio_lecture_desactivee', 'L’acte de lecture n’est pas activé sur cet environnement.', 503);
    }
    let body: { idPatient?: unknown; idImport?: unknown; acte?: unknown; idLecture?: unknown; code?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    const garde = await garderImport(idPatient);
    if (!garde.ok) return echec(garde.reason, garde.error, garde.status);

    const idImport = typeof body.idImport === 'string' ? body.idImport.trim() : '';
    if (!ID.test(idImport)) return echec('invalid', 'Import mal désigné.', 400);
    const demande = lireDemandeActe(body);
    if (!demande) return echec('invalid', 'Acte mal formé.', 400);

    const issue = await poserActeLecture({ idPatient, idImport, praticienEmail: garde.email, demande });
    if (!issue.ok) return echec(issue.reason, issue.error, issue.status);
    return NextResponse.json(issue, { status: 201 });
  } catch (err) {
    console.error('[praticien/biologie/import/lecture POST] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
