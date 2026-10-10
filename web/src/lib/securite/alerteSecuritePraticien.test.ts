import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, journaliser, prisma } = vi.hoisted(() => ({
  sendMail: vi.fn(),
  journaliser: vi.fn(),
  prisma: { correspondancePatient: { create: vi.fn(), update: vi.fn() } },
}));
vi.mock('@/lib/email/transportSmtp', () => ({ creerTransportSmtp: () => ({ sendMail }) }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/correspondance/patient', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/correspondance/patient')>();
  return { ...actual, journaliserCorrespondancePatient: journaliser };
});

import { COURRIEL_SIGNAL_SECURITE, notifierPraticienSignalSecurite } from './alerteSecuritePraticien';

// [[D-277]] §2 et §3. Identité de fixture uniquement.
const ENTREE = {
  idPatient: 'PAT_SEED_01',
  praticienEmail: 'praticien@wellneuro.fr',
  source: { type: 'reponse_questionnaire', id: 'REP_TEST_1' },
} as const;

describe('courriel au praticien sur une réponse suicidaire', () => {
  const envOrigine = { ...process.env };
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.correspondancePatient.create.mockResolvedValue({ id: 'RES_1' });
    prisma.correspondancePatient.update.mockResolvedValue({});
    process.env.SMTP_URL = 'smtp://test';
    process.env.NEXTAUTH_URL = 'https://app.exemple.test/';
  });
  afterEach(() => { process.env = { ...envOrigine }; });

  it('le texte signé est tenu mot pour mot', () => {
    expect(COURRIEL_SIGNAL_SECURITE.sujet).toBe('Signal de sécurité à évaluer — Wellneuro');
    expect(COURRIEL_SIGNAL_SECURITE.corps('LIEN')).toBe(
      'Bonjour,\n\n'
      + 'Un patient vient de transmettre une réponse qui appelle une évaluation de sécurité. '
      + 'Elle figure en tête de votre Fil du jour, sous « Signal de sécurité à évaluer ».\n\n'
      + 'Connectez-vous à Wellneuro pour la consulter : LIEN\n\n'
      + 'Cet e-mail ne contient volontairement aucun détail.\n',
    );
  });

  it('envoie au praticien un courriel sans rien du dossier, lien vers le Fil, et le trace « Envoyé »', async () => {
    sendMail.mockResolvedValue({});
    await expect(notifierPraticienSignalSecurite(ENTREE)).resolves.toEqual({ statut: 'Envoye' });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];
    expect(message.to).toBe('praticien@wellneuro.fr');
    expect(message.text).toContain('https://app.exemple.test/dashboard');
    for (const fuite of ['PAT_SEED_01', 'REP_TEST_1', 'BDI', 'suicid']) {
      expect(`${message.subject}\n${message.text}`, fuite).not.toContain(fuite);
    }
    // La ligne est réservée AVANT l'envoi, puis passée « Envoyé ».
    expect(prisma.correspondancePatient.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        idPatient: 'PAT_SEED_01',
        type: 'alerte_securite_praticien',
        statut: 'Non_envoye',
        sourceType: 'alerte_securite_praticien',
        sourceId: 'reponse_questionnaire:REP_TEST_1',
      }),
    }));
    expect(prisma.correspondancePatient.create.mock.invocationCallOrder[0]).toBeLessThan(sendMail.mock.invocationCallOrder[0]);
    expect(prisma.correspondancePatient.update).toHaveBeenCalledWith({ where: { id: 'RES_1' }, data: { statut: 'Envoye', erreurCourte: undefined } });
    expect(journaliser).not.toHaveBeenCalled();
  });

  it('revue Copilot #1393 : deux transmissions concurrentes, un seul courriel — la réservation déjà prise n’envoie rien', async () => {
    sendMail.mockResolvedValue({});
    // La contrainte d'unicité `(sourceType, sourceId)`, simulée.
    const prises = new Set<string>();
    prisma.correspondancePatient.create.mockImplementation(async ({ data }: { data: { sourceType: string; sourceId: string } }) => {
      const cle = `${data.sourceType}|${data.sourceId}`;
      if (prises.has(cle)) throw Object.assign(new Error('unique'), { code: 'P2002' });
      prises.add(cle);
      return { id: 'RES_1' };
    });
    const [premier, second] = await Promise.all([
      notifierPraticienSignalSecurite(ENTREE),
      notifierPraticienSignalSecurite(ENTREE),
    ]);
    expect(premier).toEqual({ statut: 'Envoye' });
    expect(second).toEqual({ statut: 'Non_envoye', dejaReserve: true });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('registre en panne : le courriel part quand même, et la trace est retentée au journal', async () => {
    sendMail.mockResolvedValue({});
    prisma.correspondancePatient.create.mockRejectedValue(new Error('P1001'));
    await expect(notifierPraticienSignalSecurite(ENTREE)).resolves.toEqual({ statut: 'Envoye' });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(journaliser).toHaveBeenCalledWith(expect.objectContaining({ statut: 'Envoye' }));
  });

  it('un échec d’envoi est tracé « Erreur » et ne lève pas — aucune nouvelle tentative', async () => {
    sendMail.mockRejectedValue(new Error('SMTP indisponible'));
    await expect(notifierPraticienSignalSecurite(ENTREE)).resolves.toMatchObject({ statut: 'Erreur' });
    expect(sendMail).toHaveBeenCalledTimes(1);
    // La réservation reste, passée « Erreur » : aucune nouvelle tentative.
    expect(prisma.correspondancePatient.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'RES_1' },
      data: expect.objectContaining({ statut: 'Erreur' }),
    }));
  });

  it('sans configuration d’envoi ou sans adresse, rien ne part et c’est tracé « Non envoyé »', async () => {
    delete process.env.SMTP_URL;
    await notifierPraticienSignalSecurite(ENTREE);
    process.env.SMTP_URL = 'smtp://test';
    await notifierPraticienSignalSecurite({ ...ENTREE, praticienEmail: '  ' });
    expect(sendMail).not.toHaveBeenCalled();
    // La réservation porte déjà « Non envoyé » : rien d'autre à écrire.
    expect(prisma.correspondancePatient.create).toHaveBeenCalledTimes(2);
    for (const appel of prisma.correspondancePatient.create.mock.calls) expect(appel[0].data.statut).toBe('Non_envoye');
    expect(prisma.correspondancePatient.update).not.toHaveBeenCalled();
  });
});
