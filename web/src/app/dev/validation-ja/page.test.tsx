import { afterEach, describe, expect, it, vi } from 'vitest';

// D-JA-02 : la page du harnais JA, et pas seulement son verrou pur, rend
// notFound() hors développement local. Le harnais est simulé : il a son banc.

const NON_TROUVE = new Error('notFound');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NON_TROUVE;
  },
}));
vi.mock('@/components/patient-food-observation/ValidationJaHarness', () => ({ ValidationJaHarness: () => null }));

import ValidationJaPage from './page';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('la page du harnais JA', () => {
  it.each(['production', 'test', undefined])('NODE_ENV %s : la page rend notFound()', valeur => {
    vi.stubEnv('NODE_ENV', valeur as string);
    expect(() => ValidationJaPage()).toThrow(NON_TROUVE);
  });

  it('NODE_ENV development : la page rend le harnais', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(ValidationJaPage()).toBeTruthy();
  });
});
