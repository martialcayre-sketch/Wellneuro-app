import { NextResponse } from 'next/server';
import { verserVersion } from '@/lib/positions-expert/ecriture';
import { echec, journaliserEchec, lireDemandeEcriture, reponseRefus, type ReponseEchec } from '@/lib/positions-expert/http';
import {
  appuisAdmis,
  contenuAdmis,
  estDossierPosition,
  FICHE_ID_RE,
  ID_LIGNE_RE,
  POSITION_ID_RE,
  VERSION_POSITION_RE,
} from '@/lib/positions-expert/vocabulaire';

// Verser une version de position d'expert (D-439 §2, §5) : une première
// version, ou la révision de la version courante vue. Le responsable seul.
// Le texte n'est jamais journalisé ([[D-251]] §4).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type VersionPositionApiResponse = { ok: true; version: { id: string; positionId: string; version: string } } | ReponseEchec;

// POST /api/praticien/positions-expert/versions
//   { positionId, version, dossier, ficheId: string | null, contenu: { enonce, perimetre, population, limites },
//     claimsAppui: string[], idVersionCouranteVue: string | null }
export async function POST(req: Request): Promise<NextResponse<VersionPositionApiResponse>> {
  try {
    const lue = await lireDemandeEcriture(req);
    if ('echec' in lue) return lue.echec;
    const c = lue.corps;
    if (typeof c.positionId !== 'string' || !POSITION_ID_RE.test(c.positionId)) {
      return echec('position_invalide', 'Identifiant de position invalide (WN-PE-NNNN).', 400);
    }
    if (typeof c.version !== 'string' || !VERSION_POSITION_RE.test(c.version)) {
      return echec('version_invalide', 'Numéro de version invalide (vN.M).', 400);
    }
    if (!estDossierPosition(c.dossier)) return echec('dossier_invalide', 'Dossier de preuve hors de la liste fermée.', 400);
    const ficheId = c.ficheId ?? null;
    if (ficheId !== null && !(typeof ficheId === 'string' && FICHE_ID_RE.test(ficheId) && ficheId.length <= 128)) {
      return echec('fiche_invalide', 'Identifiant de fiche invalide (FU_…).', 400);
    }
    const contenu = contenuAdmis(c.contenu);
    if (!contenu) {
      return echec('contenu_invalide', 'Énoncé, périmètre, population et limites sont tous requis, en texte visible.', 400);
    }
    const claimsAppui = appuisAdmis(c.claimsAppui);
    if (!claimsAppui) {
      return echec('appuis_invalides', 'Au moins un claim d’appui, au format identifiant@version, sans doublon.', 400);
    }
    const vue = c.idVersionCouranteVue ?? null;
    if (vue !== null && !(typeof vue === 'string' && ID_LIGNE_RE.test(vue))) {
      return echec('jeton_invalide', 'Version courante vue invalide.', 400);
    }
    const issue = await verserVersion({
      positionId: c.positionId,
      version: c.version,
      dossier: c.dossier,
      ficheId: ficheId as string | null,
      contenu,
      claimsAppui,
      idVersionCouranteVue: vue as string | null,
      auteur: lue.auteur,
    });
    if (issue.issue === 'refusee') return reponseRefus(issue.raison, issue.claims);
    return NextResponse.json({ ok: true, version: issue.version });
  } catch (err) {
    return journaliserEchec('praticien/positions-expert/versions POST', err);
  }
}
