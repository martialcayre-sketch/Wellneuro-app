import { describe, expect, it, vi } from 'vitest';
import {
  FENETRE_CADENCE_MS,
  MESSAGE_CADENCE_PATIENT,
  PLAFONDS_ECRITURES_PAR_HEURE,
  cadenceAtteinte,
  debutFenetreCadence,
} from './cadenceEcritures';

describe('cadence des écritures par dossier (D-326, t08)', () => {
  it('les plafonds arbitrés le 2026-10-18', () => {
    expect(PLAFONDS_ECRITURES_PAR_HEURE).toEqual({
      agenda: 60,
      portail: 20,
      praticienObjectifs: 30,
      propositionPrioriteIa: 10,
    });
    expect(MESSAGE_CADENCE_PATIENT).toBe('Vous avez fait beaucoup d’envois en peu de temps. Réessayez dans une heure.');
  });

  it('la fenêtre est l’heure glissante qui précède', () => {
    const maintenant = new Date('2026-10-18T12:00:00.000Z');
    expect(debutFenetreCadence(maintenant).toISOString()).toBe('2026-10-18T11:00:00.000Z');
    expect(FENETRE_CADENCE_MS).toBe(3_600_000);
  });

  it('atteint AU plafond, pas avant : la ligne suivante le franchirait', async () => {
    const maintenant = new Date('2026-10-18T12:00:00.000Z');
    const compter = vi.fn(async () => 19);
    expect(await cadenceAtteinte('portail', compter, maintenant)).toBe(false);
    expect(compter).toHaveBeenCalledWith(new Date('2026-10-18T11:00:00.000Z'));
    expect(await cadenceAtteinte('portail', async () => 20, maintenant)).toBe(true);
    expect(await cadenceAtteinte('agenda', async () => 59, maintenant)).toBe(false);
    expect(await cadenceAtteinte('propositionPrioriteIa', async () => 10, maintenant)).toBe(true);
  });
});
