import type { NextResponse } from 'next/server';
import {
  echec,
  ID_RE,
  journaliserEchec,
  lireDemandeActe,
  reponseActe,
  type ActeFicheUsageApiResponse,
} from '@/lib/fiches-usage/actesHttp';
import { poserActeRubrique } from '@/lib/fiches-usage/decision';

// L'acte du responsable sur UNE rubrique d'une version de fiche d'usage
// ([[D-314]] §3, arbitrage 5) : la valider, ou la retirer.
//
// C'est LA route qui pose un acte sur une rubrique. La voie d'ingestion
// (/api/internal/fiches-usage/ingest) ne peut pas en poser, et celle-ci ne
// peut pas créer de version : deux chemins disjoints (`DC-16`). Voir
// `actesHttp.ts`.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/praticien/fiches-usage/actes
//   { idVersion, rubrique, acte: 'validee' | 'retiree', empreinteVue, dernierActeVu: string | null,
//     relectureIntegrale?: true, motif?: string }
export async function POST(req: Request): Promise<NextResponse<ActeFicheUsageApiResponse>> {
  try {
    const lue = await lireDemandeActe(req);
    if ('echec' in lue) return lue.echec;
    const idVersion = typeof lue.corps.idVersion === 'string' ? lue.corps.idVersion : '';
    if (!ID_RE.test(idVersion)) return echec('id_invalide', 'Identifiant de version invalide.', 400);
    const rubrique = typeof lue.corps.rubrique === 'string' ? lue.corps.rubrique : '';
    return reponseActe(await poserActeRubrique({ ...lue.commun, idVersion, rubrique, validateur: lue.validateur }));
  } catch (err) {
    return journaliserEchec('praticien/fiches-usage/actes POST', err);
  }
}
