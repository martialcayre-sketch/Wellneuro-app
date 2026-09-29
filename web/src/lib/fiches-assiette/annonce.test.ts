import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// L'e-mail neutre ([[D-251]] §9, lot 11) : quand il est dû, et ce qu'un échec
// rend. L'envoi lui-même a son banc (`consultation/email.test.ts`). Données
// synthétiques seulement.

const { prisma, envoyer, journaliser } = vi.hoisted(() => ({
  prisma: { patient: { findUniqueOrThrow: vi.fn() } },
  envoyer: vi.fn(),
  journaliser: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/consultation/email', () => ({ sendDocumentRemisEmail: envoyer }));
vi.mock('@/lib/correspondance/patient', async orig => ({
  ...(await orig<typeof import('@/lib/correspondance/patient')>()),
  journaliserCorrespondancePatient: journaliser,
}));

import { annonceDue, annoncerDocumentRemis } from './annonce';

const DOSSIER = { email: 'patient@example.com', prenom: 'Sophie', actif: true, accessTokenRevoked: false };

beforeEach(() => {
  prisma.patient.findUniqueOrThrow.mockReset().mockResolvedValue(DOSSIER);
  envoyer.mockReset().mockResolvedValue('Envoye');
  journaliser.mockReset();
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

describe('annoncerDocumentRemis', () => {
  it('envoie au dossier visé, avec son prénom', async () => {
    await expect(annoncerDocumentRemis('PAT_TEST')).resolves.toBe('envoye');
    expect(prisma.patient.findUniqueOrThrow).toHaveBeenCalledWith(expect.objectContaining({ where: { idPatient: 'PAT_TEST' } }));
    expect(envoyer).toHaveBeenCalledWith('patient@example.com', 'Sophie', 'PAT_TEST');
  });

  it('sans messagerie configurée : « non_configure »', async () => {
    envoyer.mockResolvedValue('Non_envoye');
    await expect(annoncerDocumentRemis('PAT_TEST')).resolves.toBe('non_configure');
  });

  it.each([
    ['accès révoqué', { accessTokenRevoked: true }],
    ['compte désactivé', { actif: false }],
  ])('%s : le portail est fermé, rien ne part, et la fiche du dossier le dit', async (_cas, dossier) => {
    prisma.patient.findUniqueOrThrow.mockResolvedValue({ ...DOSSIER, ...dossier });
    await expect(annoncerDocumentRemis('PAT_TEST')).resolves.toBe('portail_ferme');
    expect(envoyer).not.toHaveBeenCalled();
    expect(journaliser).toHaveBeenCalledTimes(1);
    expect(journaliser).toHaveBeenCalledWith(
      expect.objectContaining({ idPatient: 'PAT_TEST', type: 'document_remis', statut: 'Non_envoye' }),
    );
  });

  it('un journal qui lève sur un portail fermé ne lève pas plus loin', async () => {
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    prisma.patient.findUniqueOrThrow.mockResolvedValue({ ...DOSSIER, accessTokenRevoked: true });
    journaliser.mockRejectedValue(new Error('registre'));
    await expect(annoncerDocumentRemis('PAT_TEST')).resolves.toBe('echoue');
    avertir.mockRestore();
  });

  it('échec SMTP : « echoue », sans lever — et sans seconde trace, l’envoi a déjà journalisé', async () => {
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    envoyer.mockRejectedValue(new Error('SMTP-SENTINELLE'));
    await expect(annoncerDocumentRemis('PAT_TEST')).resolves.toBe('echoue');
    expect(journaliser).not.toHaveBeenCalled();
    expect(avertir.mock.calls.flat().join(' ')).not.toContain('SMTP-SENTINELLE');
    avertir.mockRestore();
  });

  it('panne de lecture du dossier : « echoue », sans lever, et tracée — sinon rien ne le dirait', async () => {
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    prisma.patient.findUniqueOrThrow.mockRejectedValue(new Error('BASE-SENTINELLE'));
    await expect(annoncerDocumentRemis('PAT_TEST')).resolves.toBe('echoue');
    expect(envoyer).not.toHaveBeenCalled();
    expect(journaliser).toHaveBeenCalledWith(
      expect.objectContaining({ idPatient: 'PAT_TEST', type: 'document_remis', statut: 'Erreur' }),
    );
    expect(avertir.mock.calls.flat().join(' ')).not.toContain('BASE-SENTINELLE');
    avertir.mockRestore();
  });
});
