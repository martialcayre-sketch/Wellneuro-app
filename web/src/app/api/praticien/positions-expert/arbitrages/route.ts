import { NextResponse } from 'next/server';
import { poserArbitrage, revoquerArbitrage } from '@/lib/positions-expert/ecriture';
import { echec, journaliserEchec, lireDemandeEcriture, reponseRefus, type ReponseEchec } from '@/lib/positions-expert/http';
import { CLAIM_REF_RE, CONFLIT_ID_RE, FICHE_ID_RE, ID_LIGNE_RE, motifAdmis, SHA256_RE } from '@/lib/positions-expert/vocabulaire';

// Poser ou révoquer l'arbitrage d'un conflit déclaré pour une fiche d'usage
// (D-439 §3, A2, A3). Une tête par couple : une pose remplace la tête vue, une
// révocation la révoque. Aucun pré-remplissage : le corps nomme le retenu. Le
// responsable seul. Aucune donnée patient.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type ArbitrageApiResponse = { ok: true; arbitrage: { id: string; ordre: string; acte: string } } | ReponseEchec;

// POST /api/praticien/positions-expert/arbitrages
//   pose :       { acte: 'pose', conflitId, ficheId, teteVue: string | null, entreeVue, motif,
//                  claimRetenu: string } | { …, idPositionVersion: string }
//                (`entreeVue` : l'empreinte de l'entrée du conflit affichée)
//   révocation : { acte: 'revocation', conflitId, ficheId, teteVue: string, motif }
export async function POST(req: Request): Promise<NextResponse<ArbitrageApiResponse>> {
  try {
    const lue = await lireDemandeEcriture(req);
    if ('echec' in lue) return lue.echec;
    const c = lue.corps;
    if (c.acte !== 'pose' && c.acte !== 'revocation') return echec('acte_invalide', 'Acte inconnu.', 400);
    if (typeof c.conflitId !== 'string' || !CONFLIT_ID_RE.test(c.conflitId) || c.conflitId.length > 64) {
      return echec('conflit_invalide', 'Identifiant de conflit invalide (CS-…).', 400);
    }
    if (typeof c.ficheId !== 'string' || !FICHE_ID_RE.test(c.ficheId) || c.ficheId.length > 128) {
      return echec('fiche_invalide', 'Identifiant de fiche invalide (FU_…).', 400);
    }
    const teteVue = c.teteVue ?? null;
    if (teteVue !== null && !(typeof teteVue === 'string' && ID_LIGNE_RE.test(teteVue))) {
      return echec('jeton_invalide', 'Tête vue invalide.', 400);
    }
    // Le motif est obligatoire, pose comme révocation (D-439 §3).
    const motif = motifAdmis(c.motif);
    if (motif === null) return reponseRefus('motif_requis');

    if (c.acte === 'revocation') {
      if (teteVue === null) return echec('jeton_invalide', 'Une révocation désigne la tête qu’elle révoque.', 400);
      const issue = await revoquerArbitrage({ conflitId: c.conflitId, ficheId: c.ficheId, teteVue: teteVue as string, motif, auteur: lue.auteur });
      if (issue.issue === 'refusee') return reponseRefus(issue.raison, issue.claims);
      return NextResponse.json({ ok: true, arbitrage: issue.arbitrage });
    }

    // L'entrée du conflit que l'écran a affichée (renvoi CodeRabbit de #1908).
    if (typeof c.entreeVue !== 'string' || !SHA256_RE.test(c.entreeVue)) {
      return echec('jeton_invalide', 'Empreinte de l’entrée du conflit affichée invalide.', 400);
    }

    // UNE POSE RETIENT UNE CHOSE, UNE SEULE : un claim du conflit, ou une version de position.
    const aClaim = c.claimRetenu !== undefined && c.claimRetenu !== null;
    const aPosition = c.idPositionVersion !== undefined && c.idPositionVersion !== null;
    if (aClaim === aPosition) {
      return echec('retenu_invalide', 'Une pose retient soit un claim du conflit, soit une position d’expert — une seule.', 400);
    }
    if (aClaim && !(typeof c.claimRetenu === 'string' && CLAIM_REF_RE.test(c.claimRetenu))) {
      return echec('retenu_invalide', 'Claim retenu invalide (identifiant@version).', 400);
    }
    if (aPosition && !(typeof c.idPositionVersion === 'string' && ID_LIGNE_RE.test(c.idPositionVersion))) {
      return echec('retenu_invalide', 'Version de position retenue invalide.', 400);
    }
    const issue = await poserArbitrage({
      conflitId: c.conflitId,
      ficheId: c.ficheId,
      teteVue: teteVue as string | null,
      entreeVue: c.entreeVue,
      retenu: aClaim ? { claim: c.claimRetenu as string } : { idPositionVersion: c.idPositionVersion as string },
      motif,
      auteur: lue.auteur,
    });
    if (issue.issue === 'refusee') return reponseRefus(issue.raison, issue.claims);
    return NextResponse.json({ ok: true, arbitrage: issue.arbitrage });
  } catch (err) {
    return journaliserEchec('praticien/positions-expert/arbitrages POST', err);
  }
}
