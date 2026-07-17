import { NextResponse } from 'next/server';
import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import { buildValidationErgoC1Fixture } from '@/lib/clinical-engine/validationErgoFixture';
import type { ProtocolAction, TherapeuticLoad } from '@/lib/clinical-engine/types';

// Route du harnais de validation ergonomique C1 — développement uniquement.
//
// Construit le ProtocolDraft « relu » via le moteur clinique réel (mêmes
// validations, mêmes hashes) à partir du contenu saisi dans le
// ProtocolMiniBuilder. Le moteur (canonical.ts → node:crypto) ne peut pas
// tourner dans le navigateur, d'où ce détour serveur. La DecisionCard n'est
// pas transmise par le client : la fixture est déterministe, la reconstruire
// ici produit exactement les mêmes hashes que ceux affichés dans la fiche.
//
// Aucune lecture ni écriture de données : entrée fictive, sortie fictive,
// rien n'est persisté. En production la route répond 404 (le harnais y est
// interdit, même verrou que buildValidationErgoC1Fixture) — c'est aussi la
// raison pour laquelle elle ne porte pas le contrôle de session praticien
// des routes métier.

type SoumissionBody = {
  purpose?: unknown;
  followUpCriterion?: unknown;
  actions?: unknown;
  therapeuticLoad?: unknown;
};

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Introuvable.' }, { status: 404 });
  }

  let body: SoumissionBody;
  try {
    body = (await req.json()) as SoumissionBody;
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 });
  }

  if (
    typeof body.purpose !== 'string'
    || typeof body.followUpCriterion !== 'string'
    || !Array.isArray(body.actions)
    || typeof body.therapeuticLoad !== 'object' || body.therapeuticLoad === null
  ) {
    return NextResponse.json({ error: 'Soumission de relecture incomplète.' }, { status: 400 });
  }

  try {
    const { decisionCard } = buildValidationErgoC1Fixture();
    // Même horodatage pour createdAt/updatedAt/reviewedAt : satisfait la
    // contrainte reviewedAt >= updatedAt du moteur.
    const now = new Date().toISOString();
    const protocolDraft = buildProtocolDraft({
      protocolDraftId: 'ergo-protocol-relu',
      decisionCard,
      createdAt: now,
      updatedAt: now,
      purpose: body.purpose,
      followUpCriterion: body.followUpCriterion,
      actions: body.actions as ProtocolAction[],
      therapeuticLoad: body.therapeuticLoad as TherapeuticLoad,
      review: { reviewedAt: now, reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
    });
    return NextResponse.json({ protocolDraft });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Impossible de construire le brouillon relu.' },
      { status: 400 },
    );
  }
}
