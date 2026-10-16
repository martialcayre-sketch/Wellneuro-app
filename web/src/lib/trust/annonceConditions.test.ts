import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: { correspondancePatient: { create: vi.fn(), update: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { getDocumentCourant } from './contenus/registre';
import { cleAnnonceConditions, reserverAnnonceConditions, solderAnnonceConditions } from './annonceConditions';

// [[D-292]] §3 — « envoi unique » : une réservation par dossier et par version,
// tenue par la clé unique existante `(source_type, source_id)`.

const REF = `conditions_utilisation@${getDocumentCourant('conditions_utilisation').version}`;

beforeEach(() => {
  vi.clearAllMocks();
  prisma.correspondancePatient.create.mockResolvedValue({ id: 'cp_1' });
  prisma.correspondancePatient.update.mockResolvedValue({});
});

describe('reserverAnnonceConditions', () => {
  it('réserve sous la clé du dossier et de la version, au statut « non envoyé »', async () => {
    await expect(reserverAnnonceConditions('PAT_1')).resolves.toBe('cp_1');
    expect(prisma.correspondancePatient.create.mock.calls[0][0].data).toMatchObject({
      idPatient: 'PAT_1',
      type: 'conditions_utilisation',
      statut: 'Non_envoye',
      referenceType: 'trust_document',
      referenceId: REF,
      sourceType: 'conditions_utilisation',
      sourceId: `PAT_1@${REF}`,
    });
    expect(cleAnnonceConditions('PAT_1')).toBe(`PAT_1@${REF}`);
  });

  it('clé déjà prise (envoi concurrent ou déjà fait) : `null`, rien ne part', async () => {
    prisma.correspondancePatient.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    await expect(reserverAnnonceConditions('PAT_1')).resolves.toBeNull();
  });

  it('une autre panne remonte : elle ne se lit pas comme « déjà pris »', async () => {
    prisma.correspondancePatient.create.mockRejectedValue(new Error('base indisponible'));
    await expect(reserverAnnonceConditions('PAT_1')).rejects.toThrow('base indisponible');
  });
});

describe('solderAnnonceConditions', () => {
  it('envoyé : la réservation reste — le dossier ne repartira pas', async () => {
    await solderAnnonceConditions('cp_1', 'Envoye');
    const { data } = prisma.correspondancePatient.update.mock.calls[0][0];
    expect(data).toEqual({ statut: 'Envoye', erreurCourte: null });
  });

  it('en erreur : la réservation est LIBÉRÉE — le dossier revient dans la liste', async () => {
    await solderAnnonceConditions('cp_1', 'Erreur', new Error('smtp down'));
    const { data } = prisma.correspondancePatient.update.mock.calls[0][0];
    expect(data).toMatchObject({ statut: 'Erreur', sourceId: null });
    expect(data.erreurCourte).toContain('smtp down');
  });

  it('une mise à jour perdue ne lève pas : la réservation tient, sens conservateur', async () => {
    prisma.correspondancePatient.update.mockRejectedValue(new Error('base indisponible'));
    await expect(solderAnnonceConditions('cp_1', 'Envoye')).resolves.toBeUndefined();
  });
});
