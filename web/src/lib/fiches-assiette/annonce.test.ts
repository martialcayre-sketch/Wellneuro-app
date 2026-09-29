import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// L'e-mail neutre ([[D-251]] §9, lot 11) : quand il est dû, sa trace réservée
// dans la transaction du clic, et ce qu'un échec rend. L'envoi lui-même a son
// banc (`consultation/email.test.ts`). Données synthétiques seulement.

const { prisma, envoyer } = vi.hoisted(() => ({
  prisma: {
    patient: { findUniqueOrThrow: vi.fn() },
    correspondancePatient: { create: vi.fn(), update: vi.fn() },
  },
  envoyer: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/consultation/email', () => ({ sendDocumentRemisEmail: envoyer }));

import { annonceDue, annoncerDocumentRemis, reserverAnnonce } from './annonce';

const DOSSIER = { email: 'patient@example.com', prenom: 'Sophie', actif: true, accessTokenRevoked: false };

/** Les mises à jour de la trace réservée : `[statut, erreurCourte]`. */
const traces = () => prisma.correspondancePatient.update.mock.calls.map(([arg]) => {
  const { where, data } = arg as { where: { id: string }; data: { statut: string; erreurCourte: string | null } };
  expect(where).toEqual({ id: 'trace_1' });
  return [data.statut, data.erreurCourte];
});

beforeEach(() => {
  prisma.patient.findUniqueOrThrow.mockReset().mockResolvedValue(DOSSIER);
  prisma.correspondancePatient.create.mockReset().mockResolvedValue({ id: 'trace_1' });
  prisma.correspondancePatient.update.mockReset().mockResolvedValue({});
  envoyer.mockReset().mockResolvedValue('Envoye');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('annonceDue — un par clic qui remet, espace de lecture ouvert', () => {
  it.each([
    ['lecture ouverte, une fiche remise', 'true', 1, true],
    ['lecture ouverte, trois fiches remises', 'true', 3, true],
    ['lecture ouverte, AUCUNE fiche remise (double clic, rien de neuf)', 'true', 0, false],
    ['lecture FERMÉE, une fiche remise', undefined, 1, false],
    ['lecture « TRUE » (convention : la chaîne exacte)', 'TRUE', 1, false],
  ])('%s', (_cas, drapeau, remises, attendu) => {
    vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', drapeau as string);
    expect(annonceDue(remises as number)).toBe(attendu);
  });

  it('le drapeau d’ÉMISSION seul n’annonce rien', () => {
    vi.stubEnv('WN_FICHES_ASSIETTE', 'true');
    vi.stubEnv('WN_FICHES_ASSIETTE_LECTURE', undefined as unknown as string);
    expect(annonceDue(2)).toBe(false);
  });
});

describe('reserverAnnonce — la trace naît dans la transaction du clic', () => {
  it('« Non_envoye », de type « document_remis », sous un objet qui ne nomme rien', async () => {
    const tx = { correspondancePatient: { create: vi.fn().mockResolvedValue({ id: 'trace_tx' }) } };
    await expect(reserverAnnonce(tx as never, 'PAT_TEST')).resolves.toBe('trace_tx');
    const { data } = tx.correspondancePatient.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).toMatchObject({ idPatient: 'PAT_TEST', type: 'document_remis', statut: 'Non_envoye', canal: 'email', sens: 'sortant' });
    expect(String(data.objet)).not.toMatch(/assiette|fiche/i);
    // Écrite par le client de la TRANSACTION, jamais par le client global.
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
  });
});

describe('annoncerDocumentRemis — envoie, puis met SA trace à jour', () => {
  it('envoie au dossier visé, avec son prénom, et marque la trace « Envoye »', async () => {
    await expect(annoncerDocumentRemis('PAT_TEST', 'trace_1')).resolves.toBe('envoye');
    expect(prisma.patient.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({ where: { idPatient: 'PAT_TEST' } }));
    expect(envoyer).toHaveBeenCalledWith('patient@example.com', 'Sophie');
    expect(traces()).toEqual([['Envoye', null]]);
    // Une seule trace par clic : la réservée, mise à jour — jamais une seconde.
    expect(prisma.correspondancePatient.create).not.toHaveBeenCalled();
  });

  it('sans messagerie configurée : « non_configure », trace laissée « Non_envoye » avec son motif', async () => {
    envoyer.mockResolvedValue('Non_envoye');
    await expect(annoncerDocumentRemis('PAT_TEST', 'trace_1')).resolves.toBe('non_configure');
    expect(traces()).toEqual([['Non_envoye', 'messagerie non configurée']]);
  });

  it.each([
    ['accès révoqué', { accessTokenRevoked: true }],
    ['compte désactivé', { actif: false }],
  ])('%s : le portail est fermé, rien ne part, et la trace le dit', async (_cas, dossier) => {
    prisma.patient.findUniqueOrThrow.mockResolvedValue({ ...DOSSIER, ...dossier });
    await expect(annoncerDocumentRemis('PAT_TEST', 'trace_1')).resolves.toBe('portail_ferme');
    expect(envoyer).not.toHaveBeenCalled();
    expect(traces()).toEqual([['Non_envoye', 'portail fermé à ce patient']]);
  });

  it('échec SMTP : « echoue », sans lever, trace « Erreur », message jamais au journal applicatif', async () => {
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    envoyer.mockRejectedValue(new Error('SMTP-SENTINELLE'));
    await expect(annoncerDocumentRemis('PAT_TEST', 'trace_1')).resolves.toBe('echoue');
    expect(traces().map(([statut]) => statut)).toEqual(['Erreur']);
    expect(avertir.mock.calls.flat().join(' ')).not.toContain('SMTP-SENTINELLE');
    avertir.mockRestore();
  });

  it('panne de lecture du dossier : « echoue », sans lever, et tracée', async () => {
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    prisma.patient.findUniqueOrThrow.mockRejectedValue(new Error('BASE-SENTINELLE'));
    await expect(annoncerDocumentRemis('PAT_TEST', 'trace_1')).resolves.toBe('echoue');
    expect(envoyer).not.toHaveBeenCalled();
    expect(traces().map(([statut]) => statut)).toEqual(['Erreur']);
    expect(avertir.mock.calls.flat().join(' ')).not.toContain('BASE-SENTINELLE');
    avertir.mockRestore();
  });

  it('une mise à jour de trace qui échoue ne lève pas : le clic reste réussi', async () => {
    prisma.correspondancePatient.update.mockRejectedValue(new Error('registre'));
    await expect(annoncerDocumentRemis('PAT_TEST', 'trace_1')).resolves.toBe('envoye');
  });
});
