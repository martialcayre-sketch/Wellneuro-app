import { NextResponse } from 'next/server';
import { verserTexte } from '@/lib/atelier-bibliotheque-options/ecriture';
import { echec, journaliserEchec, lireDemandeEcriture, reponseRefus, type ReponseEchec } from '@/lib/atelier-bibliotheque-options/http';
import { estIdentifiantOption, estRubriqueOption } from '@/lib/atelier-bibliotheque-options/structure';
import { estTexteVisible, ID_LIGNE_RE, RUBRIQUE_MAX } from '@/lib/positions-expert/vocabulaire';

// Saisir le texte d'une rubrique d'une option ([[D-480]] §3) : une version
// neuve du couple option × rubrique, sur l'empreinte de la structure du jour.
// Le responsable seul. Le texte n'est jamais journalisé ([[D-251]] §4).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type VersionOptionApiResponse =
  | { ok: true; version: { id: string; optionId: string; rubrique: string; numero: number } }
  | ReponseEchec;

// POST /api/praticien/atelier-options/versions
//   { optionId, rubrique, texte, derniereVersionVue: string | null }
export async function POST(req: Request): Promise<NextResponse<VersionOptionApiResponse>> {
  try {
    const lue = await lireDemandeEcriture(req);
    if ('echec' in lue) return lue.echec;
    const c = lue.corps;
    if (!estIdentifiantOption(c.optionId)) return echec('option_invalide', 'Identifiant d’option invalide (OPT_…).', 400);
    if (typeof c.rubrique !== 'string' || !estRubriqueOption(c.rubrique)) {
      return echec('rubrique_invalide', 'Rubrique hors de la liste fermée.', 400);
    }
    if (!estTexteVisible(c.texte) || c.texte.length > RUBRIQUE_MAX) {
      return echec('texte_invalide', 'Le texte est requis, visible et borné.', 400);
    }
    const vue = c.derniereVersionVue ?? null;
    if (vue !== null && !(typeof vue === 'string' && ID_LIGNE_RE.test(vue))) {
      return echec('jeton_invalide', 'Dernière version vue invalide.', 400);
    }
    const issue = await verserTexte({
      optionId: c.optionId,
      rubrique: c.rubrique,
      texte: c.texte,
      derniereVersionVue: vue as string | null,
      auteur: lue.auteur,
    });
    if (issue.issue === 'refusee') return reponseRefus(issue.raison);
    return NextResponse.json({ ok: true, version: issue.version });
  } catch (err) {
    return journaliserEchec('praticien/atelier-options/versions POST', err);
  }
}
