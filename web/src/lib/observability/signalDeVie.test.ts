import { describe, expect, it, vi } from 'vitest';
import { signalerVie } from './signalDeVie';

describe('signalerVie', () => {
  it('sans adresse, n’appelle rien', async () => {
    const envoyer = vi.fn();
    expect(await signalerVie(undefined, envoyer)).toBe(false);
    expect(await signalerVie('', envoyer)).toBe(false);
    expect(envoyer).not.toHaveBeenCalled();
  });

  it('appelle l’adresse, borné par un signal d’abandon', async () => {
    const envoyer = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    expect(await signalerVie('https://surveillance.test/x', envoyer)).toBe(true);
    expect(envoyer).toHaveBeenCalledWith('https://surveillance.test/x', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('une surveillance en erreur ou injoignable ne lève pas, et l’adresse n’est pas journalisée', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await signalerVie('https://surveillance.test/jeton', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))).toBe(false);
    expect(await signalerVie('https://surveillance.test/jeton', vi.fn().mockRejectedValue(new TypeError('https://surveillance.test/jeton')))).toBe(false);
    expect(JSON.stringify(erreur.mock.calls)).not.toContain('jeton');
    erreur.mockRestore();
  });
});
