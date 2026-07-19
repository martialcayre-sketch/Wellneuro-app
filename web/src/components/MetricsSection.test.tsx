// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MetricsSection } from './MetricsSection';

describe('MetricsSection — métriques actives', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('rend chaque métrique comme point d’accès vers sa page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        patients: 3,
        questionnairesEnCours: 5,
        synthesiesIA: 2,
        bookletsEnvoyes: 1,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MetricsSection />);

    await waitFor(() => expect(screen.getByText('Patients')).not.toBeNull());

    const hrefFor = (label: string) => screen.getByText(label).closest('a')?.getAttribute('href');
    expect(hrefFor('Patients')).toBe('/dashboard/patients');
    expect(hrefFor('Questionnaires en cours')).toBe('/dashboard/patients');
    expect(hrefFor('Synthèses IA')).toBe('/dashboard/synthese');
    expect(hrefFor('Booklets envoyés')).toBe('/dashboard/synthese');
    // libellé d'accès visible sur chaque carte
    expect(screen.getAllByText('Voir →')).toHaveLength(4);
  });
});
