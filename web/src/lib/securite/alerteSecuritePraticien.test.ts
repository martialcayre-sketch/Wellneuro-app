import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMail, journaliser } = vi.hoisted(() => ({ sendMail: vi.fn(), journaliser: vi.fn() }));
vi.mock('@/lib/email/transportSmtp', () => ({ creerTransportSmtp: () => ({ sendMail }) }));
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
    vi.clearAllMocks();
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
    expect(journaliser).toHaveBeenCalledWith(expect.objectContaining({
      idPatient: 'PAT_SEED_01',
      type: 'alerte_securite_praticien',
      statut: 'Envoye',
      sourceType: 'alerte_securite_praticien',
      sourceId: 'reponse_questionnaire:REP_TEST_1',
    }));
  });

  it('un échec d’envoi est tracé « Erreur » et ne lève pas — aucune nouvelle tentative', async () => {
    sendMail.mockRejectedValue(new Error('SMTP indisponible'));
    await expect(notifierPraticienSignalSecurite(ENTREE)).resolves.toMatchObject({ statut: 'Erreur' });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(journaliser).toHaveBeenCalledWith(expect.objectContaining({ statut: 'Erreur' }));
  });

  it('sans configuration d’envoi ou sans adresse, rien ne part et c’est tracé « Non envoyé »', async () => {
    delete process.env.SMTP_URL;
    await notifierPraticienSignalSecurite(ENTREE);
    process.env.SMTP_URL = 'smtp://test';
    await notifierPraticienSignalSecurite({ ...ENTREE, praticienEmail: '  ' });
    expect(sendMail).not.toHaveBeenCalled();
    expect(journaliser).toHaveBeenCalledTimes(2);
    for (const appel of journaliser.mock.calls) expect(appel[0].statut).toBe('Non_envoye');
  });
});
