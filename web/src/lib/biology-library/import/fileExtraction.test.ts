import { afterEach, describe, expect, it, vi } from 'vitest';

// Les branches que le banc à deux sessions (`scripts/banc-file-extraction-
// deux-sessions.test.ts`) ne force pas : l'unicité partielle levée par la base,
// et une lecture qui LÈVE. Le reste se joue contre PostgreSQL.

const { prisma } = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn(), $queryRaw: vi.fn(), $executeRaw: vi.fn() },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('./lancerExtraction', () => ({ ouvrirExtractionDans: vi.fn(), poursuivreExtraction: vi.fn() }));

import { demanderExtraction, traiterProchainTravail } from './fileExtraction';

afterEach(() => vi.clearAllMocks());

describe('demanderExtraction', () => {
  it('un travail ouvert né entre-temps (P2002, unicité partielle) se dit `lecture_demandee`', async () => {
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await demanderExtraction({ idPatient: 'pat_sophie', idCompteRendu: 'cr_1', demandePar: 'praticien@wellneuro.fr' }))
      .toEqual({ ok: false, reason: 'lecture_demandee' });
  });

  it('un dossier clos entre la route et la demande refuse `dossier_clos`, avant tout verrou du compte rendu (D-282 §9)', async () => {
    prisma.$transaction.mockImplementationOnce(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
    prisma.$queryRaw.mockResolvedValueOnce([{ actif: true, suivi_cloture_le: new Date('2026-10-13T10:00:00Z') }]);
    expect(await demanderExtraction({ idPatient: 'pat_sophie', idCompteRendu: 'cr_1', demandePar: 'praticien@wellneuro.fr' }))
      .toEqual({ ok: false, reason: 'dossier_clos' });
    const sql = (prisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
    expect(sql).toContain('FOR KEY SHARE');
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('un dossier désactivé, ou effacé, refuse de même', async () => {
    for (const lignes of [[{ actif: false, suivi_cloture_le: null }], []]) {
      prisma.$transaction.mockImplementationOnce(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
      prisma.$queryRaw.mockResolvedValueOnce(lignes);
      expect(await demanderExtraction({ idPatient: 'pat_sophie', idCompteRendu: 'cr_1', demandePar: 'praticien@wellneuro.fr' }))
        .toEqual({ ok: false, reason: 'dossier_clos' });
    }
  });

  it('toute autre erreur remonte — jamais un refus inventé', async () => {
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('coupure'), { code: 'P1001' }));
    await expect(demanderExtraction({ idPatient: 'pat_sophie', idCompteRendu: 'cr_1', demandePar: 'praticien@wellneuro.fr' }))
      .rejects.toThrow('coupure');
  });
});

describe('traiterProchainTravail', () => {
  const reclamation = {
    type: 'lecture', idTravail: 'trv_1', idPatient: 'pat_sophie', idCompteRendu: 'cr_1', idImport: 'imp_1', tentative: 1,
  };

  it('une lecture qui LÈVE laisse le travail en cours : la reprise le relancera', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'trv_1', id_patient: 'pat_sophie', id_compte_rendu: 'cr_1' }]);
    prisma.$transaction.mockResolvedValueOnce(reclamation);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const issue = await traiterProchainTravail(async () => {
      throw new Error('processus');
    });
    expect(issue).toEqual({ issue: 'interrompu' });
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('une réclamation qui lève n’arrête pas la file : le candidat suivant est essayé', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      { id: 'trv_0', id_patient: 'pat_sophie', id_compte_rendu: 'cr_0' },
      { id: 'trv_1', id_patient: 'pat_sophie', id_compte_rendu: 'cr_1' },
    ]);
    prisma.$transaction.mockRejectedValueOnce(new Error('verrou')).mockResolvedValueOnce(reclamation);
    prisma.$executeRaw.mockResolvedValueOnce(1);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const issue = await traiterProchainTravail(async ({ idImport }) => ({ ok: true, idImport, statut: 'extrait', lignes: 2 }));
    expect(issue).toEqual({ issue: 'lu', tentative: 1, statut: 'extrait', termine: true });
  });
});
