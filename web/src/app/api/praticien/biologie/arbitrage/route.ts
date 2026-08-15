import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { GabaritAcces } from '@/lib/praticien/journalAcces';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { isCbEnabled } from '@/lib/biology-library/featureFlag';
import { preparerArbitrage } from '@/lib/biology-library/arbitrage';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import { resolveActiveVersion } from '@/lib/protocol/versioning';

// Arbitrage biologique sans valeurs (LOT-06, D-059 §4).
//
// Le praticien consigne sa LECTURE du bilan revenu hors outil : verdict à
// trois états + note courte. AUCUNE valeur d'analyse ne transite ni ne se
// stocke (verrou HDS). `arbitrePar` est l'e-mail de session, `arbitreLe` est
// posé par la base — le client ne fournit ni l'un ni l'autre : un arbitrage
// est structurellement inantidatable et inattribuable à autrui.
//
// L'arbitrage N'OUVRE PAS la révision : il la rend possible (et la carte de
// Fil la réclame). La révision passe par la route de versionnement, où la
// garde `refusResolutionSansArbitrage` impose que la résolution suive le
// verdict.
//
// FAIL-CLOSED sur `WN_CB_ENABLED` (D-059 : rien ne s'allume sans le geste de
// déploiement) — 503 avec motif français, comme les drapeaux frères.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/biologie/arbitrage';

export type ArbitrageExpose = {
  id: string;
  protocolDraftId: string;
  intentionId: string;
  verdict: string;
  noteCourte: string | null;
  arbitreLe: string;
  arbitrePar: string;
};

export type ArbitrageBiologiqueApiResponse =
  | { ok: true; arbitrages: ArbitrageExpose[] }
  | { ok: true; arbitrage: ArbitrageExpose }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<string, string> = {
  verdict_invalide: 'Verdict invalide : confirme, infirme ou sans_objet.',
  note_obligatoire_pour_infirme:
    'Un verdict « infirme » exige une note courte : ce qui a infirmé l’intention doit rester lisible.',
  note_trop_longue: 'La note est trop longue (2 000 caractères maximum).',
  intention_inconnue: 'Intention introuvable dans cette version du protocole.',
  intention_non_conditionnelle:
    'Cette intention n’attend pas de biologie : il n’y a rien à arbitrer.',
};

const SELECTION = {
  id: true,
  protocolDraftId: true,
  intentionId: true,
  verdict: true,
  noteCourte: true,
  arbitreLe: true,
  arbitrePar: true,
} as const;

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ArbitrageBiologiqueApiResponse>(
    { ok: false, reason, error },
    { status },
  );
}

function exposer(ligne: {
  id: string;
  protocolDraftId: string;
  intentionId: string;
  verdict: string;
  noteCourte: string | null;
  arbitreLe: Date;
  arbitrePar: string;
}): ArbitrageExpose {
  return { ...ligne, arbitreLe: ligne.arbitreLe.toISOString() };
}

type Garde =
  | { echec: NextResponse<ArbitrageBiologiqueApiResponse>; email?: undefined }
  | { echec?: undefined; email: string };

async function garder(idPatient: string, acces?: GabaritAcces): Promise<Garde> {
  if (!isCbEnabled()) {
    return {
      echec: echec(
        'cb_desactivee',
        'La voie biologie n’est pas activée sur cet environnement.',
        503,
      ),
    };
  }
  const session = await getServerSession(authOptions);
  if (!session) {
    return { echec: echec('unauthenticated', 'Authentification requise.', 401) };
  }
  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > 64) {
    return { echec: echec('invalid', 'Identifiant patient invalide.', 400) };
  }
  const email = emailPraticien(session);
  const appartenance = await verifierAppartenancePatient(idPatient, email, acces);
  if (appartenance === 'introuvable') {
    return { echec: echec('patient_not_found', 'Patient introuvable.', 404) };
  }
  if (appartenance === 'autre_praticien') {
    return { echec: echec('forbidden', 'Patient non accessible pour ce praticien.', 403) };
  }
  return { email: email ?? '' };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const idPatient = (url.searchParams.get('idPatient') ?? '').trim();
    const garde = await garder(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (garde.echec) return garde.echec;

    const lignes = await prisma.arbitrageBiologique.findMany({
      where: { idPatient },
      orderBy: { arbitreLe: 'desc' },
      select: SELECTION,
    });
    return NextResponse.json<ArbitrageBiologiqueApiResponse>({
      ok: true,
      arbitrages: lignes.map(exposer),
    });
  } catch (err) {
    console.error('[praticien/biologie/arbitrage GET]', err instanceof Error ? err.message : String(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}

type PostBody = {
  idPatient?: string;
  protocolDraftId?: string;
  intentionId?: unknown;
  verdict?: unknown;
  noteCourte?: unknown;
};

export async function POST(req: Request) {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = (body.idPatient ?? '').trim();
    const garde = await garder(idPatient);
    if (garde.echec) return garde.echec;

    // Dossier clos : l'arbitrage est une pièce du dossier, la consignation se
    // refuse dans la route (#181), jamais seulement dans l'écran.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const protocolDraftId = (body.protocolDraftId ?? '').trim();
    if (!protocolDraftId) {
      return echec('invalid', 'Version de protocole requise.', 400);
    }
    const version = await prisma.protocolDraft.findFirst({
      where: { id: protocolDraftId, idPatient },
      select: { id: true, decisionCardId: true, inputHash: true, payload: true },
    });
    if (!version) {
      return echec('version_not_found', 'Version de protocole introuvable pour ce patient.', 404);
    }

    // L'arbitrage s'ancre sur la VERSION ACTIVE du fil : arbitrer une version
    // supplantée écrirait l'histoire à côté de la vérité courante.
    const fil = await prisma.protocolDraft.findMany({
      where: { idPatient, decisionCardId: version.decisionCardId },
      select: { id: true, inputHash: true, supersedesDraftId: true, createdAt: true },
    });
    const active = resolveActiveVersion(fil);
    if (!active || active.id !== version.id) {
      return echec(
        'version_stale',
        'Cette version n’est plus la version active du protocole ; rechargez l’historique.',
        409,
      );
    }

    let actions;
    try {
      actions = reconstructProtocolDraft(version.payload, version.inputHash).actions;
    } catch {
      return echec('protocol_stale', 'Version active du protocole incohérente.', 409);
    }

    const preparation = preparerArbitrage({
      intentionId: body.intentionId,
      verdict: body.verdict,
      noteCourte: body.noteCourte,
      actions,
    });
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 422);
    }

    try {
      const cree = await prisma.arbitrageBiologique.create({
        data: {
          idPatient,
          protocolDraftId: version.id,
          intentionId: preparation.donnees.intentionId,
          verdict: preparation.donnees.verdict,
          noteCourte: preparation.donnees.noteCourte,
          // Auteur = session serveur ; `arbitreLe` = @default(now()) en base.
          arbitrePar: garde.email,
        },
        select: SELECTION,
      });
      return NextResponse.json<ArbitrageBiologiqueApiResponse>(
        { ok: true, arbitrage: exposer(cree) },
        { status: 201 },
      );
    } catch (err) {
      // Unicité (protocol_draft_id, intention_id) : un arbitrage par intention
      // et par version — l'historique vit dans les versions, append-only.
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        return echec(
          'arbitrage_existant',
          'Un arbitrage existe déjà pour cette intention sur cette version de protocole.',
          409,
        );
      }
      throw err;
    }
  } catch (err) {
    console.error('[praticien/biologie/arbitrage POST]', err instanceof Error ? err.message : String(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
