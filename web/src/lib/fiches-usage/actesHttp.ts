import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import type { AnomalieStructure } from './controle';
import type { IssueActe, RaisonRefusActe } from './decision';
import type { ActeSerialise, EtatTexte } from './etat';
import { estActeFicheUsage, type ActeFicheUsage } from './vocabulaire';

// LA VOIE HTTP DES ACTES DU RESPONSABLE ([[D-314]] §3) — partagée par les deux
// routes praticien (rubriques, libellés). Patron :
// /api/praticien/fiches-assiette/actes.
//
// L'acte porte sur ce que l'écran a montré : l'empreinte du texte vu et le
// jeton du dernier acte vu. S'ils ont bougé, rien n'est écrit (409). Valider
// exige la déclaration de relecture intégrale, strictement `true` (422).
// Retirer exige un motif. Le validateur est l'e-mail de la SESSION, jamais une
// valeur du corps.

export const ID_RE = /^[a-z0-9]{8,64}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/;
const JETON_RE = /^\d{1,19}$/;

export type ActeFicheUsageApiResponse =
  | { ok: true; acte: ActeSerialise; etat: EtatTexte }
  | { ok: false; reason: string; error: string; anomalies?: AnomalieStructure[] };

export const MESSAGES_REFUS: Record<RaisonRefusActe, { message: string; status: number }> = {
  relecture_requise: { message: 'Valider exige de déclarer la relecture intégrale du texte.', status: 422 },
  motif_requis: { message: 'Un retrait exige un motif.', status: 422 },
  rubrique_inconnue: { message: 'Rubrique inconnue.', status: 400 },
  introuvable: { message: 'Texte introuvable.', status: 404 },
  rubrique_absente: { message: 'Cette version ne porte pas cette rubrique.', status: 404 },
  contenu_illisible: { message: 'Le contenu rangé de cette version est illisible — aucun acte n’est posé.', status: 409 },
  empreinte_divergente: { message: 'Le texte n’est plus celui affiché — rechargez la relecture.', status: 409 },
  etat_illisible: { message: 'L’état de ce texte est illisible — aucun acte n’est posé.', status: 409 },
  etat_divergent: { message: 'L’état de ce texte a changé depuis l’affichage — rechargez la relecture.', status: 409 },
  deja_dans_cet_etat: { message: 'Le texte est déjà dans cet état.', status: 409 },
  structure_non_signee: {
    message: 'La structure des fiches d’usage n’est pas signée : aucun texte ne se valide avant elle.',
    status: 409,
  },
  version_depassee: { message: 'Une version plus récente est déjà validée.', status: 409 },
  structure: { message: 'Ce texte ne rédige pas la structure signée du jour — validation refusée.', status: 422 },
};

export function echec(reason: string, error: string, status: number, anomalies?: AnomalieStructure[]) {
  return NextResponse.json<ActeFicheUsageApiResponse>(
    anomalies ? { ok: false, reason, error, anomalies } : { ok: false, reason, error },
    { status },
  );
}

export type CorpsActeCommun = {
  acte: ActeFicheUsage;
  empreinteVue: string;
  dernierActeVu: string | null;
  relectureIntegrale: unknown;
  motif: string | undefined;
};

/**
 * Session, corps et champs communs. Rend soit une réponse d'échec, soit le
 * validateur, le corps brut et les champs communs lus.
 */
export async function lireDemandeActe(
  req: Request,
): Promise<
  | { echec: NextResponse<ActeFicheUsageApiResponse> }
  | { validateur: string; corps: Record<string, unknown>; commun: CorpsActeCommun }
> {
  const session = await getServerSession(authOptions);
  if (!session) return { echec: echec('unauthenticated', 'Authentification requise.', 401) };
  // Un acte exige une identité : jamais de validateur vide en base.
  const validateur = emailPraticien(session);
  if (!validateur) return { echec: echec('unauthenticated', 'Session praticien sans e-mail.', 401) };

  let brut: unknown;
  try {
    brut = await req.json();
  } catch {
    return { echec: echec('invalid', 'Corps de requête illisible.', 400) };
  }
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) {
    return { echec: echec('invalid', 'Corps de requête illisible.', 400) };
  }
  const corps = brut as Record<string, unknown>;

  const acte = typeof corps.acte === 'string' ? corps.acte : '';
  if (!estActeFicheUsage(acte)) return { echec: echec('acte_invalide', 'Acte inconnu.', 400) };
  const empreinteVue = typeof corps.empreinteVue === 'string' ? corps.empreinteVue : '';
  if (!SHA256_RE.test(empreinteVue)) return { echec: echec('empreinte_invalide', 'Empreinte du texte vu invalide.', 400) };
  const dernierActeVu = corps.dernierActeVu;
  if (dernierActeVu !== null && !(typeof dernierActeVu === 'string' && JETON_RE.test(dernierActeVu))) {
    return { echec: echec('jeton_invalide', 'Jeton du dernier acte vu invalide.', 400) };
  }
  return {
    validateur,
    corps,
    commun: {
      acte,
      empreinteVue,
      dernierActeVu,
      relectureIntegrale: corps.relectureIntegrale,
      motif: typeof corps.motif === 'string' ? corps.motif : undefined,
    },
  };
}

export function reponseActe(issue: IssueActe): NextResponse<ActeFicheUsageApiResponse> {
  if (issue.issue === 'refusee') {
    const refus = MESSAGES_REFUS[issue.raison];
    return echec(issue.raison, refus.message, refus.status, issue.raison === 'structure' ? issue.anomalies : undefined);
  }
  return NextResponse.json({ ok: true, acte: issue.acte, etat: issue.etat });
}

/** Le nom et le code seulement : le message d'une erreur Prisma peut recopier un texte lu ([[D-251]] §4). */
export function journaliserEchec(route: string, err: unknown): NextResponse<ActeFicheUsageApiResponse> {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
  console.error(`[${route}]`, err instanceof Error ? err.name : typeof err, code);
  return echec('exception', 'Erreur technique.', 500);
}
