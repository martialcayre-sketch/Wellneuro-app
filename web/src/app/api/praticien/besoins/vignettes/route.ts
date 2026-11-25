import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dateJourParis } from '@/lib/dateParis';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { isCbResultsEnabled } from '@/lib/biology-library/publie';
import { besoinsConstatablesAvecScore } from '@/lib/constats-besoin/besoins';
import { garderConstatsBesoin } from '@/lib/constats-besoin/garde';
import { lireConstatsBesoinDuDossier } from '@/lib/constats-besoin/lecture';
import { MESSAGES_REFUS_CONSTAT_BESOIN } from '@/lib/constats-besoin/messages';
import { vignettesDesConstats, type VignetteConstat } from '@/lib/constats-besoin/vignette';

// LA VIGNETTE DU CONSTAT SUR UN BESOIN SANS SCORE ([[D-551]], J3-12f). GET
// seulement : pour chaque besoin constatable (2, 6, 7, 11) qui a un constat en
// vigueur, son verdict en mots et s'il est « à relire » — rien d'autre. Ni le
// motif, ni la note, ni une pièce ne sortent d'ici : ils restent dans le
// panneau du constat (`/api/praticien/besoins/constats`).
//
// Premier consommateur d'un constat déclaré par [[D-551]] §1 : la fiche du
// besoin et la vue d'équilibre du praticien, rien d'autre. Même garde que le
// panneau du constat : le drapeau `WN_CONSTAT_BESOIN` passe avant la session,
// éteint il répond 503 sans rien lire ; puis la session, l'appartenance du
// dossier au praticien, et le journal d'accès (GD-1) — la lecture d'un constat
// est une lecture de données de santé nommées.
//
// JOURNAL : la classe et le code d'une erreur (`classeEtCode`), JAMAIS
// `err.message`.

const ROUTE_JOURNAL = '/api/praticien/besoins/vignettes';

export type VignettesBesoinResponse =
  | { ok: true; vignettes: Record<number, VignetteConstat> }
  | { ok: false; reason: string; error: string };

function echec(reason: string, status: number, error = MESSAGES_REFUS_CONSTAT_BESOIN[reason] ?? 'Erreur technique.') {
  return NextResponse.json<VignettesBesoinResponse>({ ok: false, reason, error }, { status });
}

export async function GET(req: Request) {
  try {
    const idPatient = new URL(req.url).searchParams.get('idPatient')?.trim() ?? '';
    const garde = await garderConstatsBesoin(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) return echec(garde.reason, garde.status, garde.error);

    const avecScore = besoinsConstatablesAvecScore();
    const constats = await lireConstatsBesoinDuDossier(prisma, idPatient, {
      besoinsAvecScore: avecScore,
      aujourdhui: dateJourParis(),
      biologieCitable: isCbResultsEnabled(),
    });
    return NextResponse.json<VignettesBesoinResponse>({
      ok: true,
      vignettes: vignettesDesConstats(constats.besoins, avecScore),
    });
  } catch (err) {
    console.error('[praticien/besoins/vignettes GET] échec :', ...classeEtCode(err));
    return echec('server_error', 500, 'Erreur technique.');
  }
}
