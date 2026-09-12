// @vitest-environment jsdom

import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';

// Bancs de l'ATTERRISSAGE — le moment où la carte du Fil a fini son travail.
//
// Ce composant ne rend rien. Tout ce qu'il fait est un effet de bord, et c'est
// exactement pourquoi il a besoin de bancs : une régression ici ne se voit pas
// à l'écran. Elle se voit demain, quand la carte est encore là — ou pire, quand
// elle a disparu d'un dossier qu'on n'a jamais ouvert par le Fil.

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));

import { ConsignerLectureFil } from './ConsignerLectureFil';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ConsignerLectureFil', () => {
  it('consigne la lecture du type, pour ce dossier, à l’atterrissage', async () => {
    render(
      <ConsignerLectureFil
        idPatient="PAT_SEED_01"
        typeCarte="geste_objectif"
        urlPropre="/dashboard/patients/PAT_SEED_01?onglet=cockpit&phase=comprehension"
      />,
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/praticien/fil/lecture');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      idPatient: 'PAT_SEED_01',
      typeCarte: 'geste_objectif',
      lue: true,
    });
  });

  it('N’ÉCRIT RIEN À L’ÉCRAN — la fiche est ce que le praticien est venu voir', () => {
    const { container } = render(
      <ConsignerLectureFil idPatient="PAT_SEED_01" typeCarte="geste_objectif" urlPropre="/x" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('RETIRE LE MARQUEUR DE L’URL une fois la lecture partie', async () => {
    // Sans ce nettoyage, un F5 — ou un onglet rouvert le lendemain — écrirait
    // une seconde lecture pour un seul atterrissage. La table est chaînée, rien
    // ne casserait ; mais la trace d'audit raconterait des lectures qui n'ont
    // pas eu lieu.
    render(
      <ConsignerLectureFil
        idPatient="PAT_SEED_01"
        typeCarte="geste_objectif"
        urlPropre="/dashboard/patients/PAT_SEED_01?onglet=cockpit"
      />,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith('/dashboard/patients/PAT_SEED_01?onglet=cockpit', {
      scroll: false,
    });
  });

  it('UNE SEULE LECTURE PAR ATTERRISSAGE, même si React remonte l’effet', async () => {
    // Le mode strict de développement monte deux fois. Deux lignes pour un seul
    // clic feraient dire au dossier qu'on l'a lu deux fois.
    render(
      <StrictMode>
        <ConsignerLectureFil idPatient="PAT_SEED_01" typeCarte="geste_objectif" urlPropre="/x" />
      </StrictMode>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('UN ÉCHEC RÉSEAU NE DIT RIEN, et c’est le bon sens de l’échec', async () => {
    // Lecture non consignée = carte encore au Fil demain : l'état d'avant ce
    // lot, pas une perte. Une bannière rouge sur la fiche ferait du bruit pour
    // une régression invisible. L'URL se nettoie quand même — le Fil est juste.
    fetchMock.mockRejectedValue(new Error('réseau'));
    const { container } = render(
      <ConsignerLectureFil idPatient="PAT_SEED_01" typeCarte="geste_objectif" urlPropre="/x" />,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(container.innerHTML).toBe('');
  });
});
