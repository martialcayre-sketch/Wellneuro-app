import type { NextResponse } from 'next/server';
import {
  echec,
  ID_RE,
  journaliserEchec,
  lireDemandeActe,
  reponseActe,
  type ActeFicheUsageApiResponse,
} from '@/lib/fiches-usage/actesHttp';
import { poserActeLibelle } from '@/lib/fiches-usage/decision';

// L'acte du responsable sur UN libellé du vocabulaire des fiches d'usage
// ([[D-314]] §3, §8 — hypothèses et populations) : le valider, ou le retirer.
// Deux chemins disjoints avec la voie d'ingestion (`DC-16`). Voir `actesHttp.ts`.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/praticien/fiches-usage/libelles/actes
//   { idLibelle, acte: 'validee' | 'retiree', empreinteVue, dernierActeVu: string | null,
//     relectureIntegrale?: true, motif?: string }
export async function POST(req: Request): Promise<NextResponse<ActeFicheUsageApiResponse>> {
  try {
    const lue = await lireDemandeActe(req);
    if ('echec' in lue) return lue.echec;
    const idLibelle = typeof lue.corps.idLibelle === 'string' ? lue.corps.idLibelle : '';
    if (!ID_RE.test(idLibelle)) return echec('id_invalide', 'Identifiant de libellé invalide.', 400);
    return reponseActe(await poserActeLibelle({ ...lue.commun, idLibelle, validateur: lue.validateur }));
  } catch (err) {
    return journaliserEchec('praticien/fiches-usage/libelles/actes POST', err);
  }
}
