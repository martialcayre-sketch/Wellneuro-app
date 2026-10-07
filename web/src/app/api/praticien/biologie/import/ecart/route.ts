import { NextResponse } from 'next/server';
import { garderImport } from '@/lib/biology-library/import/garde';
import { ecarterCompteRendu, estMotifEcartDocument, MESSAGES_ECART } from '@/lib/biology-library/import/ecart';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// « Écarter ce document » ([[D-269]] §3, BIO-INGEST LOT-04) : le praticien
// écarte un compte rendu TRANSMIS PAR LE PATIENT, motif fermé (`illisible` |
// `document_non_conforme`), sans texte libre. Le contenu est purgé aussitôt.
// Corps : `{ idPatient, idCompteRendu, motif }`.
//
// SOUS `WN_BIO_INGEST_ENABLED` SEUL, pas sous `WN_BIO_PORTAIL_ENABLED` : le
// geste vise un document déjà transmis, qu'un drapeau du portail rééteint ne
// doit pas laisser sans recours (`isBioPortailEnabled`).
//
// PERMIS SUR UN DOSSIER CLOS, comme le retrait : écarter n'ajoute rien au
// dossier, cela en retire un document qui n'avait pas à y être.
//
// PAS de journal d'accès : dispense d'écriture GD-1 ([[D-118]]) — `ecarte_par`
// et la date posée par la base attribuent l'écriture.

export const runtime = 'nodejs';

const ID = /^[A-Za-z0-9_-]{1,64}$/;

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

export async function POST(req: Request) {
  try {
    let body: { idPatient?: unknown; idCompteRendu?: unknown; motif?: unknown };
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

    const idCompteRendu = typeof body.idCompteRendu === 'string' ? body.idCompteRendu.trim() : '';
    if (!ID.test(idCompteRendu)) return echec('invalid', 'Compte rendu mal désigné.', 400);
    if (!estMotifEcartDocument(body.motif)) return echec('motif_invalide', 'Choisissez un motif : illisible, ou document non conforme.', 400);

    const issue = await ecarterCompteRendu({ idPatient, idCompteRendu, motif: body.motif, ecartePar: garde.email });
    if (!issue.ok) {
      const status = issue.reason === 'compte_rendu_introuvable' ? 404 : 409;
      return echec(issue.reason, MESSAGES_ECART[issue.reason], status);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[praticien/biologie/import/ecart POST] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
