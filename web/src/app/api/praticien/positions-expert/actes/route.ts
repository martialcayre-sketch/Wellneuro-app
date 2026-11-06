import { NextResponse } from 'next/server';
import { poserActePosition } from '@/lib/positions-expert/ecriture';
import { echec, journaliserEchec, lireDemandeEcriture, reponseRefus, type ReponseEchec } from '@/lib/positions-expert/http';
import { ID_LIGNE_RE, JETON_RE, motifAdmis, SHA256_RE } from '@/lib/positions-expert/vocabulaire';

// Signer ou retirer la version courante d'une position (D-439 §2) : l'acte
// porte sur l'empreinte du texte vu et le dernier acte vu. Signer exige la
// relecture intégrale, strictement `true` ; retirer exige un motif. Les actes
// alternent (arbitrage du 2026-11-06). Le responsable seul.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type ActePositionApiResponse = { ok: true; acte: { id: string; ordre: string; acte: string } } | ReponseEchec;

// POST /api/praticien/positions-expert/actes
//   { idVersion, acte: 'signee' | 'retiree', empreinteVue, dernierActeVu: string | null,
//     relectureIntegrale?: true, motif?: string }
export async function POST(req: Request): Promise<NextResponse<ActePositionApiResponse>> {
  try {
    const lue = await lireDemandeEcriture(req);
    if ('echec' in lue) return lue.echec;
    const c = lue.corps;
    if (typeof c.idVersion !== 'string' || !ID_LIGNE_RE.test(c.idVersion)) {
      return echec('id_invalide', 'Identifiant de version invalide.', 400);
    }
    if (c.acte !== 'signee' && c.acte !== 'retiree') return echec('acte_invalide', 'Acte inconnu.', 400);
    if (typeof c.empreinteVue !== 'string' || !SHA256_RE.test(c.empreinteVue)) {
      return echec('empreinte_invalide', 'Empreinte du texte vu invalide.', 400);
    }
    const jeton = c.dernierActeVu ?? null;
    if (jeton !== null && !(typeof jeton === 'string' && JETON_RE.test(jeton))) {
      return echec('jeton_invalide', 'Jeton du dernier acte vu invalide.', 400);
    }
    const issue = await poserActePosition({
      idVersion: c.idVersion,
      acte: c.acte,
      empreinteVue: c.empreinteVue,
      dernierActeVu: jeton as string | null,
      relectureIntegrale: c.relectureIntegrale,
      motif: motifAdmis(c.motif),
      auteur: lue.auteur,
    });
    if (issue.issue === 'refusee') return reponseRefus(issue.raison, issue.claims);
    return NextResponse.json({ ok: true, acte: issue.acte });
  } catch (err) {
    return journaliserEchec('praticien/positions-expert/actes POST', err);
  }
}
