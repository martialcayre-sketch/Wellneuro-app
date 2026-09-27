import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { AnomalieVersion } from '@/lib/fiches-assiette/controle';
import { poserActeFiche, type RaisonRefusActe } from '@/lib/fiches-assiette/decision';
import { estActeFiche, type ActeSerialise, type EtatVersion } from '@/lib/fiches-assiette/etat';
import { emailPraticien } from '@/lib/praticien/appartenance';

// L'acte du responsable sur une version de fiche d'assiette ([[D-251]] §5 à §7,
// lot 6) : la valider, ou la retirer.
//
// C'est LA route qui pose un acte. La voie d'ingestion
// (/api/internal/fiches-assiette/ingest) ne peut pas en poser, et celle-ci ne
// peut pas créer de version : deux chemins disjoints (`DC-16`).
//
// L'acte porte sur ce que l'écran a montré : l'empreinte du contenu vu et le
// jeton du dernier acte vu. S'ils ont bougé, rien n'est écrit (409). Valider
// exige la déclaration de relecture intégrale, strictement `true` (422), et
// rejoue tous les contrôles (422 avec les anomalies). Retirer exige un motif.
//
// Le validateur est l'e-mail de la SESSION, jamais une valeur du corps.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ID_VERSION_RE = /^[a-z0-9]{8,64}$/i;
const SHA256_RE = /^[0-9a-f]{64}$/;
const JETON_RE = /^\d{1,19}$/;

export type ActeFicheApiResponse =
  | { ok: true; acte: ActeSerialise; etat: EtatVersion }
  | { ok: false; reason: string; error: string; anomalies?: AnomalieVersion[] };

const MESSAGES_REFUS: Record<RaisonRefusActe, { message: string; status: number }> = {
  relecture_requise: {
    message: 'Valider exige de déclarer la relecture intégrale, source et adaptation côte à côte.',
    status: 422,
  },
  motif_requis: { message: 'Un retrait exige un motif.', status: 422 },
  version_introuvable: { message: 'Version introuvable.', status: 404 },
  empreinte_divergente: {
    message: 'Le texte de cette version n’est plus celui affiché — rechargez la relecture.',
    status: 409,
  },
  etat_illisible: {
    message: 'L’état de cette version est illisible — aucun acte n’est posé.',
    status: 409,
  },
  etat_divergent: {
    message: 'L’état de cette version a changé depuis l’affichage — rechargez la relecture.',
    status: 409,
  },
  deja_dans_cet_etat: { message: 'La version est déjà dans cet état.', status: 409 },
  version_depassee: {
    message: 'Une version plus récente de cette fiche est déjà validée.',
    status: 409,
  },
  controle: {
    message: 'Les contrôles de la fiche ne passent pas — validation refusée.',
    status: 422,
  },
};

function echec(reason: string, error: string, status: number, anomalies?: AnomalieVersion[]) {
  return NextResponse.json<ActeFicheApiResponse>(
    anomalies ? { ok: false, reason, error, anomalies } : { ok: false, reason, error },
    { status },
  );
}

type PostBody = {
  idVersion?: unknown;
  acte?: unknown;
  contenuSha256Vu?: unknown;
  dernierActeVu?: unknown;
  relectureIntegrale?: unknown;
  motif?: unknown;
};

// POST /api/praticien/fiches-assiette/actes
//   { idVersion, acte: 'validee' | 'retiree', contenuSha256Vu, dernierActeVu: string | null,
//     relectureIntegrale?: true, motif?: string }
export async function POST(req: Request): Promise<NextResponse<ActeFicheApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    // Un acte exige une identité : jamais de validateur vide en base.
    const validateur = emailPraticien(session);
    if (!validateur) return echec('unauthenticated', 'Session praticien sans e-mail.', 401);

    let brut: unknown;
    try {
      brut = await req.json();
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    // `null`, un tableau ou un scalaire sont du JSON valide, pas un corps
    // (constat de revue : `null` sortait en 500).
    if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    const body = brut as PostBody;

    const idVersion = typeof body.idVersion === 'string' ? body.idVersion : '';
    if (!ID_VERSION_RE.test(idVersion)) return echec('id_invalide', 'Identifiant de version invalide.', 400);
    const acte = typeof body.acte === 'string' ? body.acte : '';
    if (!estActeFiche(acte)) return echec('acte_invalide', 'Acte inconnu.', 400);
    const contenuSha256Vu = typeof body.contenuSha256Vu === 'string' ? body.contenuSha256Vu : '';
    if (!SHA256_RE.test(contenuSha256Vu)) return echec('empreinte_invalide', 'Empreinte du contenu vu invalide.', 400);
    const dernierActeVu = body.dernierActeVu;
    if (dernierActeVu !== null && !(typeof dernierActeVu === 'string' && JETON_RE.test(dernierActeVu))) {
      return echec('jeton_invalide', 'Jeton du dernier acte vu invalide.', 400);
    }

    const issue = await poserActeFiche({
      idVersion,
      acte,
      contenuSha256Vu,
      dernierActeVu,
      relectureIntegrale: body.relectureIntegrale,
      motif: typeof body.motif === 'string' ? body.motif : undefined,
      validateur,
    });
    if (issue.issue === 'refusee') {
      const refus = MESSAGES_REFUS[issue.raison];
      return echec(issue.raison, refus.message, refus.status, issue.raison === 'controle' ? issue.anomalies : undefined);
    }
    return NextResponse.json({ ok: true, acte: issue.acte, etat: issue.etat });
  } catch (err) {
    // Le nom et le code seulement : le message d'une erreur Prisma peut
    // recopier la version lue, donc le texte d'une fiche (§4).
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
    console.error('[praticien/fiches-assiette/actes POST]', err instanceof Error ? err.name : typeof err, code);
    return echec('exception', 'Erreur technique.', 500);
  }
}
