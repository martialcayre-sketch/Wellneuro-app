import { NextResponse } from 'next/server';
import { peutDeciderFichesUsage } from '@/lib/fiches-usage/responsable';
import { journaliserEchec, lireSession, type ReponseEchec } from '@/lib/positions-expert/http';
import { lireAtelierPositions, type AtelierPositions } from '@/lib/positions-expert/lecture';

// L'atelier des positions d'expert (D-439 §2, §3, §5) : positions, versions,
// actes, arbitrages par couple et leurs états dérivés. Lecture praticien ; le
// responsable seul écrit. Drapeau `WN_POSITIONS_EXPERT` éteint ⇒ 404.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type AtelierPositionsApiResponse = { ok: true; atelier: AtelierPositions; peutDecider: boolean } | ReponseEchec;

export async function GET(): Promise<NextResponse<AtelierPositionsApiResponse>> {
  try {
    const lue = await lireSession();
    if ('echec' in lue) return lue.echec;
    return NextResponse.json({ ok: true, atelier: await lireAtelierPositions(), peutDecider: peutDeciderFichesUsage(lue.email) });
  } catch (err) {
    return journaliserEchec('praticien/positions-expert GET', err);
  }
}
