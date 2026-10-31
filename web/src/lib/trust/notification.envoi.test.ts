import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// L'E-MAIL DE SIGNALEMENT AU PRATICIEN, TRACÉ AU DOSSIER ([[D-398]] §1, Q4).
// Le journal réel écrit par le client Prisma mocké : c'est la ligne que le
// praticien lit dans le panneau du dossier qui est observée, pas un appel.
const { prisma, createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn();
  return {
    sendMail,
    createTransport: vi.fn(() => ({ sendMail })),
    prisma: {
      correspondancePatient: { create: vi.fn() },
      trustAdverseEffectReport: { count: vi.fn() },
      trustPrivacyIncident: { count: vi.fn() },
      trustRightsRequest: { count: vi.fn() },
    },
  };
});
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/email/transportSmtp', () => ({ creerTransportSmtp: () => createTransport() }));

import { TYPES_CORRESPONDANCE_PATIENT } from '@/lib/correspondance/patient';
import { OBJET_JOURNAL_SIGNALEMENT, notifierPraticienSignalement } from './notification';

const ADRESSE_PRATICIEN = 'praticien@wellneuro.fr';
const ENTREE = {
  idPatient: 'PAT_TEST',
  praticienEmail: ADRESSE_PRATICIEN,
  signalement: { categorie: 'effet_indesirable', id: 'signalement-1' },
} as const;

function lignes(): Array<Record<string, unknown>> {
  return prisma.correspondancePatient.create.mock.calls.map(([arg]) => (arg as { data: Record<string, unknown> }).data);
}

describe('e-mail de signalement au praticien : tracé au dossier (D-398)', () => {
  const smtpOrigine = process.env.SMTP_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_URL = 'smtp://test';
    sendMail.mockResolvedValue({});
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    if (smtpOrigine === undefined) delete process.env.SMTP_URL; else process.env.SMTP_URL = smtpOrigine;
    vi.restoreAllMocks();
  });

  it('le type est au registre des correspondances', () => {
    expect(TYPES_CORRESPONDANCE_PATIENT.signalementPraticien).toBe('signalement_praticien');
  });

  it('envoyé : une ligne « Envoyé » au dossier, qui nomme la sorte et le signalement', async () => {
    await notifierPraticienSignalement(ENTREE);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: ADRESSE_PRATICIEN }));
    expect(lignes()).toEqual([
      expect.objectContaining({
        idPatient: 'PAT_TEST',
        type: 'signalement_praticien',
        objet: OBJET_JOURNAL_SIGNALEMENT,
        statut: 'Envoye',
        referenceType: 'effet_indesirable',
        referenceId: 'signalement-1',
      }),
    ]);
  });

  it('l’objet nomme son destinataire, comme celui de l’alerte de sécurité', () => {
    expect(OBJET_JOURNAL_SIGNALEMENT).toMatch(/— courriel au praticien$/);
  });

  it('refus SMTP : une ligne « Erreur » avec son motif, sans l’adresse du praticien', async () => {
    sendMail.mockRejectedValueOnce(new Error(`550 destinataire refusé <${ADRESSE_PRATICIEN}>`));
    await notifierPraticienSignalement(ENTREE);
    const [ligne] = lignes();
    expect(lignes()).toHaveLength(1);
    expect(ligne).toMatchObject({ type: 'signalement_praticien', statut: 'Erreur' });
    expect(String(ligne.erreurCourte)).toContain('550');
    expect(JSON.stringify(ligne)).not.toContain(ADRESSE_PRATICIEN);
    // Le log d'exploitation est masqué lui aussi.
    expect(vi.mocked(console.error)).toHaveBeenCalled();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(ADRESSE_PRATICIEN);
  });

  it('transport qui lève à sa préparation : une ligne « Erreur » avec son motif', async () => {
    createTransport.mockImplementationOnce(() => {
      throw new Error('transport indisponible');
    });
    await notifierPraticienSignalement(ENTREE);
    expect(sendMail).not.toHaveBeenCalled();
    expect(lignes()).toEqual([
      expect.objectContaining({ statut: 'Erreur', erreurCourte: expect.stringContaining('transport indisponible') }),
    ]);
  });

  it.each([
    ['sans SMTP', () => { delete process.env.SMTP_URL; }, ADRESSE_PRATICIEN],
    ['sans adresse du praticien', () => undefined, null],
  ])('%s : rien ne part, une ligne « Non envoyé »', async (_, preparer, praticienEmail) => {
    preparer();
    await notifierPraticienSignalement({ ...ENTREE, praticienEmail });
    expect(sendMail).not.toHaveBeenCalled();
    expect(lignes()).toEqual([expect.objectContaining({ type: 'signalement_praticien', statut: 'Non_envoye' })]);
  });

  it('aucune ligne ne porte l’adresse du praticien, quel que soit le chemin', async () => {
    await notifierPraticienSignalement(ENTREE);
    sendMail.mockRejectedValueOnce(new Error(`refus pour ${ADRESSE_PRATICIEN}`));
    await notifierPraticienSignalement(ENTREE);
    expect(lignes()).toHaveLength(2);
    for (const ligne of lignes()) expect(JSON.stringify(ligne)).not.toContain(ADRESSE_PRATICIEN);
  });
});
