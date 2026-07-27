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

  it('pointe la page de connexion, jamais un lien permanent secret (LOT-04)', async () => {
    process.env.SMTP_URL = 'smtp://localhost:1025';
    process.env.NEXTAUTH_URL = 'https://app.wellneuro.fr';

    await sendPortailLinkEmail('patient@example.com', 'Michel', 'PAT_TEST');

    expect(sendMail).toHaveBeenCalledOnce();
    const { text } = sendMail.mock.calls[0][0];
    expect(text).toContain('https://app.wellneuro.fr/portail/connexion');
    // Plus de jeton secret ni de promesse de permanence dans le corps.
    expect(text).not.toContain('/portail/TOK');
    expect(text).not.toContain('personnel et permanent');
    // Les deux voies d'entrée restantes sont annoncées.
    expect(text).toContain('Google');
    // Audit HDS : aucune donnée clinique dans le corps.
    expect(text).not.toContain('Motif');
  });

  it("n'envoie rien sans SMTP_URL configuré", async () => {
    delete process.env.SMTP_URL;

    await sendPortailLinkEmail('patient@example.com', 'Michel', 'PAT_TEST');

    expect(sendMail).not.toHaveBeenCalled();
  });
});
