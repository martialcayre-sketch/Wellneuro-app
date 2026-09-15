import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deriveProtocolDraftId } from '@/lib/protocol/versioning';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';
import { EXCLURE_INSTANTANES_JA } from '@/lib/food-observation/contract';

// LE POST DE CETTE ROUTE A ÉTÉ RETIRÉ LE 2026-09-16 (contre-revue adverse de la
// campagne « 5. Actions »). Il persistait `{ episode, decisionCard, draft }`
// depuis le contrat C2A et n'avait **aucun appelant applicatif** — l'état
// machine du dépôt le notait déjà : « le seul point de persistance vivant est
// `/versions` ». Ce n'était pas une dette inerte : authentifié, sans drapeau,
// il acceptait un `ProtocolDraft` ENTIER fabriqué par le client avec son propre
// `inputHash`, sans garde de registre anxiogène et sans reconstruction serveur
// — donc un second chemin d'écriture vers ce que le patient lit, qui
// contournait les gardes posées sur le premier.
//
// Le GET reste : il liste les protocoles persistés d'un patient, borné par la
// relation praticien.

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/protocoles';

// Persistance minimale C2A (LOT-02). Le praticien authentifié persiste un
// épisode CONFIRMÉ et un protocole RELU (practitioner_reviewed). Le snapshot,
// la review et la decision-card ne sont PAS persistés (recalculables) : seules
// leurs empreintes servent d'ancrage de provenance (spec §8.0/§8.2). Écritures
// idempotentes par identifiant de contrat (§8.6) ; corrections = nouvelle
// version (append-only, §8.5). Aucun accès inter-patient : la lecture est
// bornée à l'idPatient demandé, toujours derrière une session NextAuth.

type ListItem = {
  versionId: string;
  protocolDraftId: string;
  status: string;
  milestone: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

type ListResponse =
  | { ok: true; protocoles: ListItem[] }
  | { ok: false; reason: string; error: string };

// GET /api/praticien/protocoles?idPatient=... — protocoles persistés d'un patient.
export async function GET(req: Request): Promise<NextResponse<ListResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    const emailSession = emailPraticien(session);
    if (!emailSession) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }

    // Scope par la relation patient : les protocoles d'un patient d'un autre
    // praticien ne remontent pas — la liste est vide, comme pour un patient
    // sans protocole, sans révéler que celui-ci existe.
    const drafts = await prisma.protocolDraft.findMany({
      where: { idPatient, patient: filtrePatientsDuPraticien(emailSession), ...EXCLURE_INSTANTANES_JA },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        decisionCardId: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        episode: { select: { milestone: true } },
      },
    });

    if (drafts.length > 0) {
      // Liste non vide = appartenance prouvée par la relation. Liste vide =
      // rien (anti-oracle) — limite assumée (LOT-00) : dossier possédé sans
      // protocole non journalisé.
      await journaliserAccesDossier({ idPatient, praticienEmail: emailSession, route: ROUTE_JOURNAL, methode: 'GET' });
    }

    return NextResponse.json({
      ok: true,
      protocoles: drafts.map((d) => ({
        versionId: d.id,
        protocolDraftId: deriveProtocolDraftId(d.decisionCardId),
        status: d.status,
        milestone: d.episode?.milestone ?? null,
        createdAt: d.createdAt.toISOString(),
        reviewedAt: d.reviewedAt ? d.reviewedAt.toISOString() : null,
      })),
    });
  } catch (err) {
    console.error('[praticien/protocoles GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
