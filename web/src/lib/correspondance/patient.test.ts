import { beforeEach, describe, expect, it, vi } from 'vitest';

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  prisma: { correspondancePatient: { create } },
}));

vi.mock('@/lib/anthropic', () => ({
  sanitizeAuditError: (erreur: unknown) => String(erreur),
}));

import {
  journaliserCorrespondancePatient,
  TYPES_CORRESPONDANCE_PATIENT,
} from './patient';

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({});
});

describe('journaliserCorrespondancePatient', () => {
  it('ne persiste ni adresse ni corps de message', async () => {
    await journaliserCorrespondancePatient({
      idPatient: 'PAT_TEST',
      type: TYPES_CORRESPONDANCE_PATIENT.booklet,
      objet: 'Envoi du bilan neuronutritionnel',
      statut: 'Envoye',
      referenceType: 'synthese',
      referenceId: 'SYN_TEST',
    });

    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      idPatient: 'PAT_TEST',
      canal: 'email',
      sens: 'sortant',
      type: 'booklet',
      statut: 'Envoye',
    });
    expect(data).not.toHaveProperty('email');
    expect(data).not.toHaveProperty('texte');
    expect(data).not.toHaveProperty('contenu');
  });

  it('reste best-effort si le journal est indisponible', async () => {
    create.mockRejectedValue(new Error('base indisponible'));
    await expect(
      journaliserCorrespondancePatient({
        idPatient: 'PAT_TEST',
        type: TYPES_CORRESPONDANCE_PATIENT.questionnaire,
        objet: 'Invitation à compléter un questionnaire',
        statut: 'Erreur',
        erreur: 'SMTP indisponible',
      }),
    ).resolves.toBeUndefined();
  });
});
