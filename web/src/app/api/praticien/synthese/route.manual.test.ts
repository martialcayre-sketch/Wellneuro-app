import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, journaliserAccesDossier } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  journaliserAccesDossier: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    syntheseIA: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    auditSynthese: { create: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/ids', () => ({ createPublicId: () => 'SYN_MANUEL_1' }));
vi.mock('@/lib/praticien/journalAcces', () => ({ journaliserAccesDossier }));
vi.mock('@/generated/prisma', () => ({ Prisma: { DbNull: {} } }));
vi.mock('@/lib/anthropic', () => ({
  anthropic: {},
  CLAUDE_MODEL: 'claude-test',
  SYSTEM_PROMPT_SYNTHESE: '',
  VERSION_CORPUS_SYNTHESE: 'v-test',
  VERSION_PROMPT_SYNTHESE: 'v-test',
  VERSION_SCHEMA_SYNTHESE: 'v-test',
  validateSyntheseSchema: (value: unknown) => value,
  sanitizeAuditError: (message: string) => message,
  CORPUS_CLINIQUE_ACTIF: '',
}));
vi.mock('@/lib/clinical/corpusSyntheseV1', () => ({
  CORPUS_CLINIQUE_METADATA: {},
  CORPUS_CLINIQUE_SHA256: 'sha-test',
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), security: vi.fn() },
}));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_context: unknown, value: unknown) => value,
  withCorrelationHeader: (response: unknown) => response,
}));

import { PATCH, PUT } from './route';
import {
  MODELE_REDACTION_PRATICIEN,
  VERSION_SYNTHESE_PRATICIEN,
  nouveauBrouillonPraticien,
} from '@/lib/synthese-praticien';

const brouillon = {
  ...nouveauBrouillonPraticien(),
  resume_praticien: 'Résumé clinique interne',
  narratif_patient: 'Texte clair destiné au patient.',
};

function requete(method: 'PUT' | 'PATCH', body: unknown): Request {
  return new Request('http://localhost/api/praticien/synthese', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function ligneSynthese() {
  return {
    idSynthese: 'SYN_MANUEL_1',
    idPatient: 'PAT_SEED_01',
    emailPatient: 'sophie.nicola@example.test',
    dateGeneration: new Date('2026-07-25T10:00:00.000Z'),
    modele: MODELE_REDACTION_PRATICIEN,
    versionPrompt: VERSION_SYNTHESE_PRATICIEN,
    donneesEntree: {},
    syntheseJson: brouillon,
    statut: 'Brouillon_Praticien',
    dateValidation: null,
    notesPraticien: null,
  };
}

describe('brouillon praticien /api/praticien/synthese', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findFirst.mockResolvedValue({
      idPatient: 'PAT_SEED_01',
      email: 'sophie.nicola@example.test',
    });
    prisma.syntheseIA.create.mockResolvedValue(ligneSynthese());
    prisma.syntheseIA.findFirst.mockResolvedValue(ligneSynthese());
    prisma.syntheseIA.update.mockResolvedValue(ligneSynthese());
    prisma.auditSynthese.create.mockResolvedValue({});
    journaliserAccesDossier.mockResolvedValue(undefined);
  });

  it('crée une rédaction praticien sans dépendre de la configuration Anthropic', async () => {
    const response = await PUT(requete('PUT', { idPatient: 'PAT_SEED_01', synthese: brouillon }));
    expect(response.status).toBe(200);
    expect(prisma.patient.findFirst).toHaveBeenCalledWith({
      where: {
        idPatient: 'PAT_SEED_01',
        praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' },
      },
    });
    expect(prisma.syntheseIA.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        modele: MODELE_REDACTION_PRATICIEN,
        versionPrompt: VERSION_SYNTHESE_PRATICIEN,
        statut: 'Brouillon_Praticien',
      }),
    });
    expect((await response.json()).success).toBe(true);
  });

  it('masque comme introuvable le patient d’un autre praticien', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    const response = await PUT(requete('PUT', { idPatient: 'PAT_AUTRE', synthese: brouillon }));
    expect(response.status).toBe(404);
    expect(prisma.syntheseIA.create).not.toHaveBeenCalled();
  });

  it('enregistre uniquement après avoir scopé la synthèse par son patient', async () => {
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_MANUEL_1',
      action: 'enregistrer',
      synthese: { ...brouillon, narratif_patient: 'Texte patient corrigé.' },
    }));
    expect(response.status).toBe(200);
    expect(prisma.syntheseIA.findFirst).toHaveBeenCalledWith({
      where: {
        idSynthese: 'SYN_MANUEL_1',
        patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      },
    });
    expect(prisma.syntheseIA.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        statut: 'Brouillon_Praticien',
        syntheseJson: expect.objectContaining({ narratif_patient: 'Texte patient corrigé.' }),
      }),
    }));
  });

  it('refuse la mise à jour d’une synthèse hors périmètre', async () => {
    prisma.syntheseIA.findFirst.mockResolvedValue(null);
    const response = await PATCH(requete('PATCH', {
      idSynthese: 'SYN_AUTRE',
      action: 'valider',
    }));
    expect(response.status).toBe(404);
    expect(prisma.syntheseIA.update).not.toHaveBeenCalled();
  });
});
