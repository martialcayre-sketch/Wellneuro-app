import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, mockMeta, mockRegles } = vi.hoisted(() => ({
  prisma: {
    questionnaireReponse: { findMany: vi.fn() },
    assignation: { findMany: vi.fn() },
    pack: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
  },
  mockMeta: {
    version: 'orientation-nnpp2-v1',
    validationExterne: false,
    dateValidation: null as string | null,
    claimsSource: [] as unknown[],
  },
  mockRegles: [] as unknown[],
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/clinical/orientationRulesV1', () => ({
  ORIENTATION_METADATA: mockMeta,
  ORIENTATION_RULES_V1: mockRegles,
  ORIENTATION_RULES_SHA256: 'sha-test',
}));

import { evaluerOrientationPourPatient, orientationActive } from './orientationService';

function signerLaTable() {
  mockMeta.validationExterne = true;
  mockMeta.dateValidation = '2026-08-03';
  mockMeta.claimsSource = ['WN-CLM-0001'];
}

function lecturesVides() {
  prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  prisma.assignation.findMany.mockResolvedValue([]);
  prisma.pack.findMany.mockResolvedValue([]);
  prisma.consultation.findFirst.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMeta.validationExterne = false;
  mockMeta.dateValidation = null;
  mockMeta.claimsSource = [];
  mockRegles.length = 0;
  vi.stubEnv('WN_ENABLE_ORIENTATION_NNPP2', '1');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('orientationActive — le double verrou', () => {
  it('est fermé sans le drapeau, table signée ou non', () => {
    signerLaTable();
    vi.stubEnv('WN_ENABLE_ORIENTATION_NNPP2', '');
    expect(orientationActive()).toBe(false);
  });

  it('est fermé quand la table n’est pas signée', () => {
    expect(orientationActive()).toBe(false);
  });

  it('reste fermé sur une validation sans date — le verrou est auto-portant', () => {
    mockMeta.validationExterne = true;
    mockMeta.claimsSource = ['WN-CLM-0001'];
    expect(orientationActive()).toBe(false);
  });

  it('reste fermé sur une validation sans claim source', () => {
    mockMeta.validationExterne = true;
    mockMeta.dateValidation = '2026-08-03';
    expect(orientationActive()).toBe(false);
  });

  it('n’est ouvert que sur les trois conditions réunies', () => {
    signerLaTable();
    expect(orientationActive()).toBe(true);
  });
});

describe('evaluerOrientationPourPatient', () => {
  it('rend actif:false SANS aucune lecture du dossier quand le verrou est fermé', async () => {
    const resultat = await evaluerOrientationPourPatient('PAT_SEED_03');

    expect(resultat.actif).toBe(false);
    // Le cœur du fail-closed : ce n'est pas seulement la réponse qui est vide,
    // c'est que le dossier n'a pas été ouvert. Une route qui journalise l'accès
    // s'appuie sur cette propriété pour ne pas consigner un accès fictif.
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
    expect(prisma.pack.findMany).not.toHaveBeenCalled();
    expect(prisma.consultation.findFirst).not.toHaveBeenCalled();
  });

  it('porte le message français de constitution, jamais une erreur', async () => {
    const resultat = await evaluerOrientationPourPatient('PAT_SEED_03');
    expect(resultat.actif === false && resultat.message).toContain('en cours de constitution');
  });

  it('lit le dossier et rend une liste vide quand la table signée ne déclenche rien', async () => {
    signerLaTable();
    lecturesVides();

    const resultat = await evaluerOrientationPourPatient('PAT_SEED_03');

    expect(resultat.actif).toBe(true);
    expect(resultat.actif === true && resultat.recommandations).toEqual([]);
    expect(resultat.actif === true && resultat.sha256).toBe('sha-test');
    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalledOnce();
  });

  it('ne lit que les consultations PORTANT une anamnèse', async () => {
    signerLaTable();
    lecturesVides();

    await evaluerOrientationPourPatient('PAT_SEED_03');

    // Une consultation naît sans anamnèse : prendre la plus récente tout court
    // ferait taire les règles de drapeau dans la fenêtre exacte où le praticien
    // regarde l'orientation.
    const argument = prisma.consultation.findFirst.mock.calls[0][0];
    expect(argument.where.NOT).toBeTruthy();
    expect(argument.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('ne considère que les packs actifs', async () => {
    signerLaTable();
    lecturesVides();

    await evaluerOrientationPourPatient('PAT_SEED_03');

    expect(prisma.pack.findMany.mock.calls[0][0].where).toEqual({ actif: true });
  });
});
