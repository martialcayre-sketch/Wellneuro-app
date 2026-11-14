import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { peutDeciderFichesUsage } from '@/lib/fiches-usage/responsable';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { atelierOptionsActif } from './drapeau';

// LA VOIE HTTP DE L'ATELIER DE LA BIBLIOTHÈQUE DES OPTIONS ([[D-480]] §3, §7),
// sur le patron de l'atelier des positions d'expert.
//
// Dans l'ordre : le DRAPEAU (`WN_BIBLIOTHEQUE_OPTIONS_ATELIER` éteint ⇒ 404, la
// surface n'existe pas), la SESSION (401), puis pour une écriture la GARDE DU
// RESPONSABLE, la même que celle des fiches d'usage et des positions
// (`peutDeciderFichesUsage`, 403), avant même de lire le corps. Saisir,
// valider et retirer sont des actes du responsable (D-480 §3) ; les autres
// praticiens lisent. L'auteur est l'e-mail de la session, jamais une valeur
// du corps.
//
// AUCUN TEXTE NE VA AU JOURNAL ([[D-251]] §4) : le nom et le code d'une erreur
// seulement.

export type ReponseEchec = { ok: false; reason: string; error: string };

export function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ReponseEchec>({ ok: false, reason, error }, { status });
}

/** Drapeau et session. Rend l'e-mail de la session, ou la réponse d'échec. */
export async function lireSession(): Promise<{ email: string } | { echec: NextResponse<ReponseEchec> }> {
  if (!atelierOptionsActif()) return { echec: echec('introuvable', 'Introuvable.', 404) };
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
    return { echec: echec('reserve_au_responsable', 'Saisir, valider et retirer sont réservés au responsable.', 403) };
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

/** Les refus métier, en message et statut. Chaque raison du module d'écriture y figure (banc des routes). */
export const MESSAGES_REFUS: Record<string, { message: string; status: number }> = {
  // Versions
  option_hors_structure: { message: 'Cette option n’est pas déclarée par la structure de la bibliothèque.', status: 422 },
  // L'écran relit l'atelier après chaque geste : le message dit ce qui s'affiche
  // déjà, il ne demande pas de recharger (P3 de `wn-reviewer` sur #2082).
  etat_divergent: {
    message: 'L’état a changé depuis l’affichage : l’atelier a été relu, et la version la plus récente s’affiche au-dessus de votre brouillon. Relisez-la avant un nouvel envoi.',
    status: 409,
  },
  texte_inchange: { message: 'Ce texte est déjà celui de la dernière version, sur la structure du jour.', status: 409 },
  // Actes
  relecture_requise: { message: 'Valider exige de déclarer la relecture intégrale du texte.', status: 422 },
  motif_requis: { message: 'Un motif est requis.', status: 422 },
  introuvable: { message: 'Version introuvable.', status: 404 },
  version_depassee: { message: 'Une version plus récente a été saisie : seule la dernière reçoit un acte.', status: 409 },
  empreinte_divergente: { message: 'Le texte n’est plus celui affiché — rechargez la relecture.', status: 409 },
  etat_illisible: { message: 'L’état de ce texte est illisible — aucun acte n’est posé.', status: 409 },
  deja_dans_cet_etat: { message: 'Ce texte est déjà dans cet état.', status: 409 },
  structure_non_signee: { message: 'La structure de la bibliothèque n’est pas signée : aucune validation avant sa signature.', status: 409 },
  structure_a_relire: {
    message: 'La structure de la bibliothèque est à relire : les fiches d’usage ne sont plus celles de sa signature. Aucune validation avant sa re-signature.',
    status: 409,
  },
  texte_a_relire: { message: 'Ce texte accompagne une structure qui n’est plus celle du jour : saisissez-en une version neuve.', status: 409 },
};

export function reponseRefus(raison: string) {
  const refus = MESSAGES_REFUS[raison] ?? { message: 'Refusé.', status: 409 };
  return echec(raison, refus.message, refus.status);
}

export function journaliserEchec(route: string, err: unknown) {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
  console.error(`[${route}]`, err instanceof Error ? err.name : typeof err, code);
  return echec('exception', 'Erreur technique.', 500);
}
