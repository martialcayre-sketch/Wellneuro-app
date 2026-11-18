// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CopiloteConsultation } from './CopiloteConsultation';
import { reinitialiserRepliContexteCopilote } from './repliContexteCopilote';
import { construireCloture } from '@/lib/copilote/minuteApres';

// P34 (PRA-5 PR 2 ; [[D-481]] complément DOC-15, Q1 à Q3, amendement B) :
// titres en cascade, repli du contexte par T-15, rien de critique dans le
// panneau replié. jsdom n'applique pas Tailwind : la largeur se lit sur les
// classes, comme pour la fiche.

const fetchMock = vi.fn();

const prevol = { ancre: { type: 'aucune' }, faits: [], questionsSuggerees: [] };

const bloquee = construireCloture({
  versionActive: {
    inputHash: 'hash-v2',
    selectedPriorityId: 'PRIO_SOMMEIL',
    status: 'draft',
    reviewedAt: null,
    createdAt: new Date('2026-07-01T09:00:00.000Z'),
  },
  approbationActive: null,
  syntheses: [],
});

function servir({ clotureEnEchec = false }: { clotureEnEchec?: boolean } = {}) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.startsWith('/api/praticien/copilote/prevol')) {
      return { ok: true, json: async () => ({ ok: true, prevol }) };
    }
    if (url.startsWith('/api/praticien/copilote/cloture')) {
      return clotureEnEchec
        ? { ok: false, json: async () => ({ ok: false, error: 'Lecture impossible.' }) }
        : { ok: true, json: async () => ({ ok: true, cloture: bloquee }) };
    }
    return { ok: true, json: async () => ({ ok: true, reperes: [] }) };
  });
}

function appels(prefixe: string): number {
  return fetchMock.mock.calls.filter(([url]) => String(url).startsWith(prefixe)).length;
}

function contexte(): HTMLElement {
  const conteneur = screen.getByRole('button', { name: 'Masquer le contexte' }).parentElement;
  if (!conteneur) throw new Error('contexte introuvable');
  return conteneur;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  reinitialiserRepliContexteCopilote();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CopiloteConsultation', () => {
  it('les panneaux sont en h2 sous le h1 de la page (Q1)', async () => {
    servir();
    render(<CopiloteConsultation idPatient="PAT_SEED_01" />);

    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Ce qui a changé' })).toBeTruthy());
    expect(screen.getByRole('heading', { level: 2, name: 'Questions suggérées' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Discordances et objets cliniques' })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'La minute d’après' })).toBeTruthy());
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull();
  });

  it('sans choix de la session, le contexte est escamoté d’office de 1 024 à 1 279 px (Q3)', async () => {
    servir();
    render(<CopiloteConsultation idPatient="PAT_SEED_01" />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'La minute d’après' })).toBeTruthy());

    expect(contexte().className).toContain('lg:max-xl:hidden');
    expect(screen.getByRole('button', { name: 'Afficher le contexte' }).parentElement?.className).toContain(
      'lg:max-xl:inline-flex',
    );
  });

  it('replier ne démonte ni ne relit rien, et le focus passe à la commande opposée', async () => {
    servir();
    render(<CopiloteConsultation idPatient="PAT_SEED_01" />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'La minute d’après' })).toBeTruthy());
    const lecturesAvant = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole('button', { name: 'Masquer le contexte' }));

    expect(contexte().className).toContain('lg:hidden');
    expect(screen.getByRole('heading', { name: 'La minute d’après' })).toBeTruthy();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Afficher le contexte' })),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Afficher le contexte' }));

    expect(contexte().className).not.toContain('hidden');
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Masquer le contexte' })),
    );
    expect(fetchMock.mock.calls.length).toBe(lecturesAvant);
  });

  it('replié, la zone de travail garde « Rien ne peut être diffusé en l’état. » et ses blocages', async () => {
    servir();
    render(<CopiloteConsultation idPatient="PAT_SEED_01" />);
    await waitFor(() => expect(screen.getAllByText('Rien ne peut être diffusé en l’état.')).toHaveLength(2));

    fireEvent.click(screen.getByRole('button', { name: 'Masquer le contexte' }));

    const [auCentre] = screen
      .getAllByText('Rien ne peut être diffusé en l’état.')
      .filter((element) => !contexte().contains(element));
    const resume = auCentre.parentElement?.parentElement;
    expect(resume?.className).toContain('lg:flex');
    for (const blocage of bloquee.blocages) {
      expect(screen.getAllByText(blocage)).toHaveLength(2);
    }
  });

  it('replié, l’échec de lecture de la minute d’après reste au centre, et « Réessayer » ne relance qu’elle', async () => {
    servir({ clotureEnEchec: true });
    render(<CopiloteConsultation idPatient="PAT_SEED_01" />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Réessayer' })).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Masquer le contexte' }));

    const auCentre = screen
      .getAllByRole('button', { name: 'Réessayer' })
      .find((bouton) => !contexte().contains(bouton));
    expect(auCentre).toBeTruthy();
    const prevolAvant = appels('/api/praticien/copilote/prevol');
    const clotureAvant = appels('/api/praticien/copilote/cloture');

    fireEvent.click(auCentre!);

    await waitFor(() => expect(appels('/api/praticien/copilote/cloture')).toBe(clotureAvant + 1));
    expect(appels('/api/praticien/copilote/prevol')).toBe(prevolAvant);
  });

  // PRA-6h, arbitrage 20261118-2228-d : après un « Réessayer », le focus va au
  // titre du panneau relu s'il réussit, au bouton s'il échoue encore — jamais
  // à `body`.
  function servirEchecPuisSucces(cible: 'prevol' | 'cloture') {
    let echec = true;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith(`/api/praticien/copilote/${cible}`) && echec) {
        echec = false;
        return { ok: false, json: async () => ({ ok: false, error: 'Lecture impossible.' }) };
      }
      if (url.startsWith('/api/praticien/copilote/prevol')) return { ok: true, json: async () => ({ ok: true, prevol }) };
      if (url.startsWith('/api/praticien/copilote/cloture')) return { ok: true, json: async () => ({ ok: true, cloture: bloquee }) };
      return { ok: true, json: async () => ({ ok: true, reperes: [] }) };
    });
  }

  it('pré-vol relu avec succès : le focus va au titre « Ce qui a changé »', async () => {
    servirEchecPuisSucces('prevol');
    render(<CopiloteConsultation idPatient="PAT_SEED_01" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));

    const titre = await screen.findByRole('heading', { name: 'Ce qui a changé' });
    await waitFor(() => expect(document.activeElement).toBe(titre));
    expect(titre.getAttribute('tabindex')).toBe('-1');
  });

  it('minute d’après relue avec succès : le focus va au titre « La minute d’après »', async () => {
    servirEchecPuisSucces('cloture');
    render(<CopiloteConsultation idPatient="PAT_SEED_01" />);
    const bouton = (await screen.findAllByRole('button', { name: 'Réessayer' })).find((b) => contexte().contains(b));
    fireEvent.click(bouton!);

    const titre = await screen.findByRole('heading', { name: 'La minute d’après' });
    await waitFor(() => expect(document.activeElement).toBe(titre));
  });

  it('minute d’après encore en échec : le focus revient au « Réessayer » relu', async () => {
    servir({ clotureEnEchec: true });
    render(<CopiloteConsultation idPatient="PAT_SEED_01" />);
    const bouton = (await screen.findAllByRole('button', { name: 'Réessayer' })).find((b) => contexte().contains(b));
    fireEvent.click(bouton!);

    await waitFor(() => expect(appels('/api/praticien/copilote/cloture')).toBe(2));
    await waitFor(() => {
      const actif = document.activeElement as HTMLElement | null;
      expect(actif?.textContent).toBe('Réessayer');
      expect(contexte().contains(actif)).toBe(true);
    });
  });

  it('replié, une minute d’après encore en échec rend le focus au « Réessayer » du centre', async () => {
    servir({ clotureEnEchec: true });
    render(<CopiloteConsultation idPatient="PAT_SEED_01" />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Réessayer' })).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Masquer le contexte' }));
    const auCentre = screen.getAllByRole('button', { name: 'Réessayer' }).find((b) => !contexte().contains(b));
    fireEvent.click(auCentre!);

    await waitFor(() => expect(appels('/api/praticien/copilote/cloture')).toBe(2));
    await waitFor(() => {
      const actif = document.activeElement as HTMLElement | null;
      expect(actif?.textContent).toBe('Réessayer');
      expect(contexte().contains(actif)).toBe(false);
    });
  });

  it('l’état de repli vaut pour la session : il survit au changement de patient', async () => {
    servir();
    const { unmount } = render(<CopiloteConsultation idPatient="PAT_SEED_01" />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'La minute d’après' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Masquer le contexte' }));
    unmount();

    render(<CopiloteConsultation idPatient="PAT_SEED_02" />);
    await waitFor(() => expect(screen.getByRole('heading', { name: 'La minute d’après' })).toBeTruthy());
    expect(contexte().className).toContain('lg:hidden');
    expect(contexte().className).not.toContain('lg:max-xl:hidden');
  });
});
