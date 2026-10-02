import { NextResponse } from 'next/server';
import { garderImport } from '@/lib/biology-library/import/garde';
import { lireCompteRendu } from '@/lib/biology-library/import/lecture';
import { MESSAGES_RETRAIT, retirerCompteRendu } from '@/lib/biology-library/import/retrait';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// Un compte rendu déposé (BIO-INGEST LOT-02) :
// - GET : ses extractions et leurs lignes candidates, avec le pré-marquage des
//   écarts — jamais le document. Lecture d'un dossier : accès journalisé (GD-1) ;
// - DELETE : retrait d'un dépôt erroné, tant qu'aucune ligne n'est validée
//   (arbitrage du 2026-10-01). Dispense d'écriture GD-1, comme les POST.
// Paramètres de requête : `idPatient`, `idCompteRendu`.

export const runtime = 'nodejs';

const ROUTE_JOURNAL = '/api/praticien/biologie/import/compte-rendu';
const ID = /^[A-Za-z0-9_-]{1,64}$/;

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

function parametres(req: Request) {
  const params = new URL(req.url).searchParams;
  return {
    idPatient: params.get('idPatient')?.trim() ?? '',
    idCompteRendu: params.get('idCompteRendu')?.trim() ?? '',
  };
}

export async function GET(req: Request) {
  try {
    const { idPatient, idCompteRendu } = parametres(req);
    const garde = await garderImport(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) return echec(garde.reason, garde.error, garde.status);
    if (!ID.test(idCompteRendu)) return echec('invalid', 'Compte rendu mal désigné.', 400);
    const compteRendu = await lireCompteRendu(idPatient, idCompteRendu);
    if (!compteRendu) return echec('compte_rendu_introuvable', MESSAGES_RETRAIT.compte_rendu_introuvable, 404);
    return NextResponse.json({ ok: true, compteRendu });
  } catch (err) {
    console.error('[praticien/biologie/import/compte-rendu GET] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const { idPatient, idCompteRendu } = parametres(req);
    const garde = await garderImport(idPatient);
    if (!garde.ok) return echec(garde.reason, garde.error, garde.status);
    if (!ID.test(idCompteRendu)) return echec('invalid', 'Compte rendu mal désigné.', 400);
    const issue = await retirerCompteRendu({ idPatient, idCompteRendu });
    if (!issue.ok) {
      const status = issue.reason === 'compte_rendu_introuvable' ? 404 : 409;
      return echec(issue.reason, MESSAGES_RETRAIT[issue.reason], status);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[praticien/biologie/import/compte-rendu DELETE] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
