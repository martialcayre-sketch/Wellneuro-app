import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findFirst: vi.fn(), update: vi.fn() },
    pack: { findFirst: vi.fn() },
    assignation: { create: vi.fn() },
    // Interrogé par le vrai `resolvePackQuestionnaireIds` : `null` fait
    // retomber la résolution sur `pack.qids` (source « legacy »), c'est-à-dire
    // exactement la liste que le cas de test pose.
    questionnairePack: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { warn: vi.fn(), security: vi.fn(), error: vi.fn() },
}));

import { signPatientSession } from '@/lib/patient-session';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { POST } from './route';

// `assignBasePack` et `packRegistry` sont VOLONTAIREMENT réels : c'est le
// câblage qu'on veut prouver ici, pas la fonction en isolation (déjà couverte
// par `lib/consultation/assignBasePack.test.ts`). Mocker l'assignation
// laisserait passer une route qui journalise l'écart sans jamais l'appliquer —
// ou l'inverse.

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

const compte = {
  idPatient: PATIENT.idPatient,
  actif: true,
  email: PATIENT.email,
  accessToken: 'TOK',
  accessTokenRevoked: false,
  sessionsInvalidesAvant: null,
};

const consultation = {
  idConsultation: 'CONS_TEST',
  idPatient: PATIENT.idPatient,
  statut: 'en_cours',
  consentement: 'donne',
  consentementVersion: 'v1',
  finaliteConsentement: 'soin',
  ficheSignaletique: { ok: true },
  motif: 'Fatigue',
};

function post(qidsDuPack: string[]): Request {
  prisma.pack.findFirst.mockResolvedValue({
    idPack: 'PACK_BASE',
    nom: 'BASE DE CONSULTATION',
    qids: qidsDuPack,
    parDefaut: true,
    actif: true,
  });
  return new Request('http://localhost/api/portail/valider', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: `wn_portail=${encodeURIComponent(signPatientSession(PATIENT))}`,
    },
    body: JSON.stringify({ anamnese: { motif_principal: 'Fatigue persistante depuis six mois.' } }),
  });
}

describe('POST /api/portail/valider — instruments suspendus dans le pack de base', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(compte);
    prisma.consultation.findFirst.mockResolvedValue(consultation);
    prisma.consultation.update.mockResolvedValue({});
    prisma.assignation.create.mockResolvedValue({});
    prisma.questionnairePack.findUnique.mockResolvedValue(null);
  });

  it('assigne tout le pack lorsque aucun instrument n’est suspendu', async () => {
    const response = await POST(post(['Q_NEU_03', 'Q_SOM_06']));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, count: 2 });
    expect(prisma.assignation.create).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  // Cas réel : le pack « Florence 1 » enregistré en production contient encore
  // `Q_SOM_07`. Rien ne retire le qid de `pack.qids` — la garde doit donc agir
  // à la validation, sur un chemin où le patient est seul.
  it('écarte l’instrument suspendu et n’en assigne pas l’assignation', async () => {
    const response = await POST(post(['Q_NEU_03', 'Q_SOM_07']));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, count: 1 });
    expect(prisma.assignation.create).toHaveBeenCalledOnce();
    const arg = prisma.assignation.create.mock.calls[0][0] as { data: { idQuestionnaire: string } };
    expect(arg.data.idQuestionnaire).toBe('Q_NEU_03');
  });

  // Sans cette assertion, retirer les lignes de trace de la route laisserait
  // toute la suite verte : l'amputation du pack de base redeviendrait
  // invisible sur le seul chemin qui n'a aucun praticien pour lire un écart
  // de comptage.
  it('journalise le qid écarté, sous son propre code d’événement', async () => {
    await POST(post(['Q_NEU_03', 'Q_SOM_07']));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: EVENT_CODES.ASSIGNATION_PACK_INSTRUMENT_SUSPENDU,
        domain: 'ASSIGNATION',
        message: expect.stringContaining('Q_SOM_07'),
      })
    );
  });

  // La consultation est validée même si le pack part amputé : le patient a
  // rempli son anamnèse, la lui refaire refaire pour un défaut de catalogue
  // serait le punir d'une décision clinique qui n'est pas la sienne.
  it('valide quand même la consultation', async () => {
    await POST(post(['Q_NEU_03', 'Q_SOM_07']));
    expect(prisma.consultation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idConsultation: 'CONS_TEST' },
        data: expect.objectContaining({ statut: 'validee' }),
      })
    );
  });
});
