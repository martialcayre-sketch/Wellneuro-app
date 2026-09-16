import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    // Préconditions de confirmation T0 (D-052) : lues APRÈS la garde
    // d'appartenance, avant toute écriture.
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
    syntheseIA: { findFirst: vi.fn() },
    // Second rideau ([[D-158]]) : assignations du dossier, et ancre déjà
    // posée s'il y en a une (la borne haute de ce rideau).
    assignation: { findMany: vi.fn() },
    assessmentEpisode: { upsert: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    protocolDraft: { upsert: vi.fn(), findMany: vi.fn() },
    // Sélection praticien d'une priorité (`D-127`) : relue par le recalcul
    // serveur, qui ne réinjecte plus la valeur soumise.
    decisionPrioritySelection: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { VERSION_SCORE_EQUILIBRE } from '@/lib/equilibre/constants';
import { SECOND_RIDEAU_RENDU_FIXTURE, SYNTHESE_VALIDEE_FIXTURE } from '@/lib/clinical-engine/dossierT0Fixture';
import {
  ANAMNESE_C1_FIXTURE,
  ANAMNESE_C1_FIXTURE_AVEC_SIGNAL,
  CANDIDAT_RANG_1,
  chaineC1DeReference,
  ligneSelectionDeFixture,
  HORODATAGE_C1_FIXTURE,
  passationsC1Fixture,
  retablirTablePriorites,
  signerTablePriorites,
} from '@/lib/clinical-engine/chaineC1Fixture';
import type { ConfirmedAssessmentEpisode, DecisionCard } from '@/lib/clinical-engine/types';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { GET } from './route';

// UNE CHAÎNE C1 RÉELLE, ET PLUS UNE CARTE FORGÉE ([[D-054]], arbitrage 5).
//
// Ce banc postait `{decisionCardId: 'DEC_1', inputHash: 'HASH_DEC'}` : une carte
// que rien ne rattachait au dossier, et qui passait. C'est le trou que le
// recalcul serveur referme, sur CETTE route aussi — un fail-closed écrit dans
// une seule des deux routes est un fail-closed qu'on peut oublier de corriger
// dans l'autre.
signerTablePriorites();
const reference = chaineC1DeReference({ selection: CANDIDAT_RANG_1 });
retablirTablePriorites();

const episode = reference.episode;
const decisionCard = reference.decisionCard;

/**
 * Un constat de contradiction MINIMAL MAIS SINCÈRE sur les champs que la
 * checklist recopie (`D-119` : `description` + `passations`). L'ancien
 * `[{ id: 'C-STR' }] as never` mentait au type — et le chargeur des
 * préconditions, qui recopie désormais les constats au lieu de les compter,
 * plantait sur `passations.map` d'un objet qui n'en avait pas.
 */
const CONSTAT_C_STR = {
  id: 'C-STR',
  description: 'Stress déclaré discordant entre instruments.',
  passations: [{ idQuestionnaire: 'Q_MOD_01', date: '2026-03-12', dateLisible: '12/03/2026' }],
} as never;

/**
 * Le protocole relu qui accompagne une carte.
 *
 * Objet littéral, comme avant : cette route ne CONSTRUIT pas le protocole, elle
 * en vérifie l'ancrage (`decisionCardId` et `decisionCardInputHash`). Le dériver
 * de la carte est ce qui garde la fixture cohérente quand la carte change.
 */
function draftPour(carte: DecisionCard) {
  return {
    protocolDraftId: 'DRA_1',
    decisionCardId: carte.decisionCardId,
    decisionCardInputHash: carte.inputHash,
    selectedPriorityId: carte.selectedMainPriority?.candidateId ?? CANDIDAT_RANG_1,
    status: 'practitioner_reviewed',
    version: 'c1-protocol-draft-v1',
    inputHash: 'HASH_DRAFT',
    updatedAt: '2026-01-03T00:00:00.000Z',
  };
}

/**
 * La chaîne complète pour un épisode VARIANT (contournement tracé, jalon de
 * suivi). L'épisode entre dans les trois empreintes : le retoucher sans
 * reconstruire la carte produirait un 409 — ce que la garde doit faire, mais pas
 * ce que ces cas-là décrivent.
 */
function chainePour(episodeVariant: ConfirmedAssessmentEpisode) {
  const chaine = chaineC1DeReference({ selection: CANDIDAT_RANG_1, episode: episodeVariant });
  return { episode: episodeVariant, decisionCard: chaine.decisionCard, draft: draftPour(chaine.decisionCard) };
}

const draft = draftPour(decisionCard);

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/protocoles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/praticien/protocoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    // Dossier qui PASSE les préconditions T0 (D-052) : les cas de refus les
    // posent explicitement.
    prisma.questionnaireReponse.findMany.mockResolvedValue(passationsC1Fixture());
    prisma.consultation.findFirst.mockResolvedValue(ANAMNESE_C1_FIXTURE);
    prisma.syntheseIA.findFirst.mockResolvedValue(SYNTHESE_VALIDEE_FIXTURE);
  });

  it('refuse un praticien non authentifié (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles?idPatient=PAT_1'));
    expect(res.status).toBe(401);
  });

  it('liste les protocoles persistés, bornés à l’idPatient demandé', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([
      {
        id: 'DRA_1',
        decisionCardId: 'DEC_1',
        status: 'practitioner_reviewed',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        reviewedAt: new Date('2026-01-03T00:00:00.000Z'),
        episode: { milestone: 'T0' },
      },
    ]);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles?idPatient=PAT_1'));
    const json = (await res.json()) as {
      ok: boolean;
      protocoles: Array<{ versionId: string; protocolDraftId: string; milestone: string }>;
    };
    expect(res.status).toBe(200);
    expect(json.protocoles[0]).toMatchObject({
      versionId: 'DRA_1',
      protocolDraftId: 'proto_DEC_1',
      milestone: 'T0',
    });
    // La requête est bornée à l'idPatient ET scopée au praticien en session.
    // Elle exclut aussi les instantanés du carnet alimentaire : ils partagent
    // `protocol_drafts` sans être des versions de protocole, et le patient en
    // écrit lui-même depuis le lot 2.
    expect(prisma.protocolDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          idPatient: 'PAT_1',
          patient: { praticienEmail: { equals: 'praticien@wellneuro.fr', mode: 'insensitive' } },
          contractVersion: { not: 'ja-food-observation-v1' },
        },
      }),
    );
    // Liste non vide = appartenance prouvée : lecture journalisée (G-TRUST-04).
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'praticien@wellneuro.fr',
        route: '/api/praticien/protocoles',
        methode: 'GET',
      },
    });
  });

  it('ne remonte rien pour le patient d’un autre praticien', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'autre@wellneuro.fr' } });
    // Le scope est porté par la requête : la base ne rend aucune ligne.
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles?idPatient=PAT_1'));
    const json = (await res.json()) as { ok: boolean; protocoles: unknown[] };
    expect(res.status).toBe(200);
    expect(json.protocoles).toEqual([]);
    expect(prisma.protocolDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patient: { praticienEmail: { equals: 'autre@wellneuro.fr', mode: 'insensitive' } },
        }),
      }),
    );
    // Liste vide : dossier non prouvé accessible → pas de journalisation
    // (limite assumée, LOT-00).
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});
