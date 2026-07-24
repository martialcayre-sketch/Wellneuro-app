import { afterEach, describe, expect, it, vi } from 'vitest';

const sendMail = vi.fn().mockResolvedValue({});
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

import { sendPortailLinkEmail } from './email';

describe('sendPortailLinkEmail', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
    sendMail.mockClear();
  });

  it("ne mentionne pas Google quand le drapeau G5 est éteint — texte inchangé", async () => {
    process.env.SMTP_URL = 'smtp://localhost:1025';
    process.env.WN_G5_GOOGLE_PATIENT = 'false';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';

    await sendPortailLinkEmail('patient@example.com', 'Michel', 'https://app.wellneuro.fr/portail/TOK_ABC');

    expect(sendMail).toHaveBeenCalledOnce();
    const { text } = sendMail.mock.calls[0][0];
    expect(text).not.toContain('Google');
    expect(text).not.toContain('/portail/connexion');
    expect(text).toContain('Ce lien est personnel et permanent');
    expect(text).toContain('Accéder à votre espace :\nhttps://app.wellneuro.fr/portail/TOK_ABC');
    // Audit HDS : aucune donnée clinique dans le corps.
    expect(text).not.toContain('Motif');
  });

  it('propose Google avant le lien permanent quand le drapeau G5 est actif, sans retirer le lien', async () => {
    process.env.SMTP_URL = 'smtp://localhost:1025';
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';

    await sendPortailLinkEmail('patient@example.com', 'Michel', 'https://app.wellneuro.fr/portail/TOK_ABC');

    expect(sendMail).toHaveBeenCalledOnce();
    const { text } = sendMail.mock.calls[0][0];
    // Audit HDS : aucune donnée clinique dans le corps, drapeau actif compris.
    expect(text).not.toContain('Motif');
    const positionGoogle = text.indexOf('Continuer avec Google');
    const positionLienPermanent = text.indexOf('https://app.wellneuro.fr/portail/TOK_ABC');
    expect(positionGoogle).toBeGreaterThan(-1);
    expect(positionLienPermanent).toBeGreaterThan(-1);
    expect(positionGoogle).toBeLessThan(positionLienPermanent);
    expect(text).toContain('https://app.wellneuro.fr/portail/connexion');
    // Le lien permanent reste présent tel quel — Google s'ajoute, il ne remplace pas.
    expect(text).toContain(`Ou via ce lien personnel et permanent :\nhttps://app.wellneuro.fr/portail/TOK_ABC`);
  });

  it("n'envoie rien sans SMTP_URL configuré, quel que soit le drapeau", async () => {
    delete process.env.SMTP_URL;
    process.env.WN_G5_GOOGLE_PATIENT = 'true';

    await sendPortailLinkEmail('patient@example.com', 'Michel', 'https://app.wellneuro.fr/portail/TOK_ABC');

    expect(sendMail).not.toHaveBeenCalled();
  });
});
