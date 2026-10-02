import { NextResponse } from 'next/server';
import { garderImport } from '@/lib/biology-library/import/garde';
import { listerComptesRendus } from '@/lib/biology-library/import/lecture';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// Liste des comptes rendus déposés dans un dossier (BIO-INGEST LOT-02). Lecture
// d'un dossier patient : l'accès est journalisé (GD-1) par la garde. Le contenu
// des documents n'est jamais rendu.

export const runtime = 'nodejs';

const ROUTE_JOURNAL = '/api/praticien/biologie/import';

export async function GET(req: Request) {
  try {
    const idPatient = new URL(req.url).searchParams.get('idPatient')?.trim() ?? '';
    const garde = await garderImport(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) {
      return NextResponse.json({ ok: false, reason: garde.reason, error: garde.error }, { status: garde.status });
    }
    return NextResponse.json({ ok: true, comptesRendus: await listerComptesRendus(idPatient) });
  } catch (err) {
    console.error('[praticien/biologie/import GET] refus :', ...classeEtCode(err));
    return NextResponse.json({ ok: false, reason: 'server_error', error: 'Erreur technique.' }, { status: 500 });
  }
}
