import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { peutDeciderFichesUsage } from '@/lib/fiches-usage/responsable';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { positionsExpertActif } from './drapeau';

// LA VOIE HTTP DE L'ATELIER DES POSITIONS D'EXPERT (D-439 §5, §6).
//
// Dans l'ordre : le DRAPEAU (`WN_POSITIONS_EXPERT` éteint ⇒ 404, la surface
// n'existe pas), la SESSION (401), puis pour une écriture la GARDE DU
// RESPONSABLE, la même que celle des actes des fiches d'usage
// (`peutDeciderFichesUsage`, 403), avant même de lire le corps. L'auteur est
// l'e-mail de la session, jamais une valeur du corps.
//
// AUCUN TEXTE NE VA AU JOURNAL ([[D-251]] §4) : le nom et le code d'une erreur
// seulement.

export type ReponseEchec = { ok: false; reason: string; error: string; claims?: string[] };

export function echec(reason: string, error: string, status: number, claims?: string[]) {
  return NextResponse.json<ReponseEchec>(claims ? { ok: false, reason, error, claims } : { ok: false, reason, error }, { status });
}

const introuvable = () => echec('introuvable', 'Introuvable.', 404);

/** Drapeau et session. Rend l'e-mail de la session, ou la réponse d'échec. */
export async function lireSession(): Promise<{ email: string } | { echec: NextResponse<ReponseEchec> }> {
  if (!positionsExpertActif()) return { echec: introuvable() };
  const session = await getServerSession(authOptions);
  const email = session ? emailPraticien(session) : null;
  if (!email) return { echec: echec('unauthenticated', 'Authentification requise.', 401) };
  return { email };
}

/** Drapeau, session, garde du responsable, puis le corps en objet. */
export async function lireDemandeEcriture(
  req: Request,
): Promise<{ auteur: string; corps: Record<string, unknown> } | { echec: NextResponse<ReponseEchec> }> {
  const lue = await lireSession();
  if ('echec' in lue) return lue;
  if (!peutDeciderFichesUsage(lue.email)) {
    return { echec: echec('reserve_au_responsable', 'Verser, signer, retirer et arbitrer sont réservés au responsable.', 403) };
  }
  let brut: unknown;
  try {
    brut = await req.json();
  } catch {
    return { echec: echec('invalid', 'Corps de requête illisible.', 400) };
  }
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) {
    return { echec: echec('invalid', 'Corps de requête illisible.', 400) };
  }
  return { auteur: lue.email, corps: brut as Record<string, unknown> };
}

/** Les refus métier, en message et statut. Chaque raison d'un module d'écriture y figure (banc de la route). */
export const MESSAGES_REFUS: Record<string, { message: string; status: number }> = {
  // Versions
  fiche_hors_structure: { message: 'Cette fiche n’est pas dans la structure signée des fiches d’usage.', status: 422 },
  appui_non_frais: { message: 'Un claim cité n’est plus frais au corpus (absent, rejeté, remplacé ou supplanté).', status: 422 },
  etat_divergent: { message: 'L’état a changé depuis l’affichage — rechargez l’atelier.', status: 409 },
  version_ne_suit_pas: { message: 'Le numéro de version doit suivre strictement celui de la version courante.', status: 422 },
  dossier_different: { message: 'Une révision reste dans le dossier de preuve de la position.', status: 422 },
  fiche_deja_fondee: { message: 'Cette fiche est déjà fondée par une autre position non retirée.', status: 409 },
  // Actes
  relecture_requise: { message: 'Signer exige de déclarer la relecture intégrale de la position.', status: 422 },
  motif_requis: { message: 'Un motif est requis.', status: 422 },
  introuvable: { message: 'Version introuvable.', status: 404 },
  version_depassee: { message: 'Cette version a été révisée : seule la version courante reçoit un acte.', status: 409 },
  contenu_illisible: { message: 'Le contenu rangé de cette version est illisible — aucun acte n’est posé.', status: 409 },
  empreinte_divergente: { message: 'Le texte n’est plus celui affiché — rechargez la relecture.', status: 409 },
  deja_signee: { message: 'Cette version est déjà signée.', status: 409 },
  jamais_signee: { message: 'Cette version n’a jamais été signée : il n’y a rien à retirer.', status: 409 },
  deja_retiree: { message: 'Cette version est déjà retirée.', status: 409 },
  etat_illisible: { message: 'L’état de cette version est illisible — aucun acte n’est posé.', status: 409 },
  // Arbitrages
  conflit_inconnu: { message: 'Ce conflit n’est pas publié au registre signé.', status: 404 },
  structure_non_signee: { message: 'La structure des fiches d’usage n’est pas signée : aucun arbitrage avant elle.', status: 409 },
  fiche_hors_liste: { message: 'Cette fiche n’est pas dans la liste curée du conflit.', status: 422 },
  claim_hors_conflit: { message: 'Le claim retenu n’est pas l’un des deux claims du conflit.', status: 422 },
  claim_non_frais: { message: 'Le claim retenu n’est plus frais au corpus.', status: 422 },
  position_introuvable: { message: 'Version de position introuvable.', status: 404 },
  position_autre_fiche: { message: 'La position retenue doit fonder la fiche de l’arbitrage.', status: 422 },
  position_a_relire: { message: 'La position retenue est à relire : un de ses claims d’appui n’est plus frais.', status: 422 },
  position_hors_vigueur: { message: 'La position retenue n’est pas en vigueur (non signée, retirée ou remplacée).', status: 409 },
};

export function reponseRefus(raison: string, claims?: string[]) {
  const refus = MESSAGES_REFUS[raison] ?? { message: 'Refusé.', status: 409 };
  return echec(raison, refus.message, refus.status, claims);
}

export function journaliserEchec(route: string, err: unknown) {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
  console.error(`[${route}]`, err instanceof Error ? err.name : typeof err, code);
  return echec('exception', 'Erreur technique.', 500);
}
