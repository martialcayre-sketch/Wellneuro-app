import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { agregerComptesCabinet, compterCabinet, type ComptesCabinet } from '@/lib/praticien/comptesCabinet';

// Les comptes du cabinet ([[D-385]], J3-cabinet PR 3) — LECTURE SEULE, en
// session. La route ne rend que l'AGRÉGAT, masqué côté serveur ([[D-298]]) :
// aucune ligne par dossier ne quitte le serveur, sans quoi le client pourrait
// recompter ce que le masquage cache. Le cabinet entier, pas un dossier
// nommé : aucun journal d'accès par dossier (même doctrine que
// `GET /api/praticien/trajectoires`).

export type ComptesCabinetApiResponse =
  | { ok: true; comptes: ComptesCabinet }
  | { ok: false; reason: 'unauthenticated' | 'exception'; error: string };

// GET /api/praticien/comptes-cabinet
export async function GET(): Promise<NextResponse<ComptesCabinetApiResponse>> {
  const session = await getServerSession(authOptions);
  const email = session ? emailPraticien(session) : null;
  if (!session || !email) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' }, { status: 401 });
  }

  try {
    // L'horloge se lit ICI, une fois, et descend en paramètre.
    const lignes = await compterCabinet(email, new Date());
    return NextResponse.json({ ok: true, comptes: agregerComptesCabinet(lignes) });
  } catch (err) {
    console.error('[praticien/comptes-cabinet GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
