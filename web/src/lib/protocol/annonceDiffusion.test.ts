import { afterEach, describe, expect, it, vi } from 'vitest';

// `WN_ANNONCE_PROTOCOLE` ([[D-317]], PA-2) : trois conditions, et aucune ne
// suffit seule. Le gabarit est simulé pour éprouver la condition de validation
// sans toucher le registre, qui a son banc (`registreGabarits.test.ts`).

const valideLe = vi.hoisted(() => ({ valeur: '2026-10-17' as string | null }));
vi.mock('@/lib/correspondance/registreGabarits', () => ({
  getGabarit: (key: string) => {
    expect(key).toBe('protocole_diffuse');
    return { key, valideLe: valideLe.valeur };
  },
}));

import { annonceProtocoleOuverte } from './annonceDiffusion';

afterEach(() => {
  vi.unstubAllEnvs();
  valideLe.valeur = '2026-10-17';
});

describe('annonceProtocoleOuverte — drapeau, gabarit validé, chemin des fiches', () => {
  it.each([
    ['les trois réunies', 'true', 'true', '2026-10-17', true],
    ['drapeau absent', undefined, 'true', '2026-10-17', false],
    ['drapeau « TRUE » (convention : la chaîne exacte)', 'TRUE', 'true', '2026-10-17', false],
    ['gabarit NON validé, drapeau posé', 'true', 'true', null, false],
    ['fiches fermées : pas de transaction où réserver l’annonce', 'true', undefined, '2026-10-17', false],
  ])('%s', (_cas, drapeau, fiches, validation, attendu) => {
    vi.stubEnv('WN_ANNONCE_PROTOCOLE', drapeau as string);
    vi.stubEnv('WN_FICHES_ASSIETTE', fiches as string);
    valideLe.valeur = validation;
    expect(annonceProtocoleOuverte()).toBe(attendu);
  });
});
