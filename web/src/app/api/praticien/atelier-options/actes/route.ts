import { NextResponse } from 'next/server';
import { poserActeTexte } from '@/lib/atelier-bibliotheque-options/ecriture';
import type { ActeSerialise } from '@/lib/fiches-usage/etat';
import { echec, journaliserEchec, lireDemandeEcriture, reponseRefus, type ReponseEchec } from '@/lib/atelier-bibliotheque-options/http';
import { ID_LIGNE_RE, JETON_RE, motifAdmis, SHA256_RE } from '@/lib/positions-expert/vocabulaire';

// Valider ou retirer la dernière version du texte d'une rubrique d'une option
// ([[D-480]] §3) : l'acte daté du responsable porte sur l'empreinte du texte vu
// et le dernier acte vu. Valider exige la relecture intégrale, strictement
// `true` ; retirer exige un motif. Le responsable seul.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type ActeOptionApiResponse = { ok: true; acte: ActeSerialise } | ReponseEchec;

// POST /api/praticien/atelier-options/actes
//   { idTexte, acte: 'validee' | 'retiree', empreinteVue, dernierActeVu: string | null,
//     relectureIntegrale?: true, motif?: string }
export async function POST(req: Request): Promise<NextResponse<ActeOptionApiResponse>> {
  try {
    const lue = await lireDemandeEcriture(req);
    if ('echec' in lue) return lue.echec;
    const c = lue.corps;
    if (typeof c.idTexte !== 'string' || !ID_LIGNE_RE.test(c.idTexte)) {
      return echec('id_invalide', 'Identifiant de version invalide.', 400);
    }
    if (c.acte !== 'validee' && c.acte !== 'retiree') return echec('acte_invalide', 'Acte inconnu.', 400);
    if (typeof c.empreinteVue !== 'string' || !SHA256_RE.test(c.empreinteVue)) {
      return echec('empreinte_invalide', 'Empreinte du texte vu invalide.', 400);
    }
    const jeton = c.dernierActeVu ?? null;
    if (jeton !== null && !(typeof jeton === 'string' && JETON_RE.test(jeton))) {
      return echec('jeton_invalide', 'Jeton du dernier acte vu invalide.', 400);
    }
    const issue = await poserActeTexte({
      idTexte: c.idTexte,
      acte: c.acte,
      empreinteVue: c.empreinteVue,
      dernierActeVu: jeton as string | null,
      relectureIntegrale: c.relectureIntegrale,
      motif: motifAdmis(c.motif),
      validateur: lue.auteur,
    });
    if (issue.issue === 'refusee') return reponseRefus(issue.raison);
    return NextResponse.json({ ok: true, acte: issue.acte });
  } catch (err) {
    return journaliserEchec('praticien/atelier-options/actes POST', err);
  }
}
