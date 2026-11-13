import { NextResponse } from 'next/server';
import { peutDeciderFichesUsage } from '@/lib/fiches-usage/responsable';
import { journaliserEchec, lireSession, type ReponseEchec } from '@/lib/atelier-bibliotheque-options/http';
import { lireAtelierOptions, type AtelierOptions } from '@/lib/atelier-bibliotheque-options/lecture';

// L'atelier de la bibliothèque des options ([[D-480]] §3) : la structure de
// références, et pour chaque rubrique de chaque option la dernière version de
// son texte et son état dérivé. Lecture praticien ; le responsable seul écrit.
// Drapeau `WN_BIBLIOTHEQUE_OPTIONS_ATELIER` éteint ⇒ 404.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type AtelierOptionsApiResponse = { ok: true; atelier: AtelierOptions; peutDecider: boolean } | ReponseEchec;

export async function GET(): Promise<NextResponse<AtelierOptionsApiResponse>> {
  try {
    const lue = await lireSession();
    if ('echec' in lue) return lue.echec;
    return NextResponse.json({ ok: true, atelier: await lireAtelierOptions(), peutDecider: peutDeciderFichesUsage(lue.email) });
  } catch (err) {
    return journaliserEchec('praticien/atelier-options GET', err);
  }
}
