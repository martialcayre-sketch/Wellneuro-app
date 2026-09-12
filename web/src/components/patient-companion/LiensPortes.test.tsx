// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { LienCeQuiCompte } from './LienCeQuiCompte';
import { LienComprehension } from './LienComprehension';

// Les DEUX PORTES qui manquaient à l'accueil du portail (campagne « la vie du
// portail patient », LOT-05).
//
// Un seul comportement compte, et il est fail-closed : SANS un « oui » franc de
// la route, le lien n'existe pas. Le défaut inverse — un lien vers un écran qui
// rendra `notFound()` — est pire que l'absence de lien : le patient clique et
// tombe sur une page morte.

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stub(payload: unknown, ok = true) {
  fetchMock.mockResolvedValue({ ok, json: async () => payload } as unknown as Response);
}

const CAS = [
  {
    nom: 'Ce qui compte',
    Composant: LienCeQuiCompte,
    sonde: '/api/portail/ce-qui-compte',
    libelle: 'Dire ce qui compte pour moi',
    href: '/portail/JETON/ce-qui-compte',
  },
  {
    nom: 'Ce que j’ai compris',
    Composant: LienComprehension,
    sonde: '/api/portail/comprehension?interrupteur=1',
    libelle: 'Lire ce que mon praticien a compris',
    href: '/portail/JETON/comprehension',
  },
] as const;

for (const { nom, Composant, sonde, libelle, href } of CAS) {
  describe(`porte « ${nom} »`, () => {
    it('paraît quand la route dit « ouvert », et mène à son écran', async () => {
      stub({ ok: true, ouvert: true });
      render(<Composant token="JETON" />);
      const lien = await screen.findByRole('link', { name: libelle });
      expect(lien.getAttribute('href')).toBe(href);
      expect(fetchMock.mock.calls[0][0]).toBe(sonde);
    });

    it('LA SONDE NE TRANSPORTE RIEN — un GET nu, aucun corps, aucune méthode', async () => {
      // Lire l'écran pour savoir s'il faut l'annoncer transporterait un texte
      // clinique pour le jeter, et émettrait un événement « un texte a été
      // SERVI » pour une page que personne n'a ouverte.
      stub({ ok: true, ouvert: true });
      render(<Composant token="JETON" />);
      await screen.findByRole('link', { name: libelle });
      expect(fetchMock.mock.calls).toHaveLength(1);
      expect(fetchMock.mock.calls[0][1]).toBeUndefined();
    });

    it('FAIL-CLOSED : surface fermée, réponse ambiguë, échec réseau — aucun lien', async () => {
      for (const [etiquette, payload, ok] of [
        ['503 surface fermée', { ok: false, reason: 'ferme' }, false],
        ['ok sans `ouvert`', { ok: true }, true],
        ['`ouvert` faux', { ok: true, ouvert: false }, true],
        ['`ouvert` vrai mais `ok` faux', { ok: false, ouvert: true }, true],
        ['réponse illisible', null, true],
      ] as const) {
        cleanup();
        vi.clearAllMocks();
        stub(payload, ok);
        render(<Composant token="JETON" />);
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        expect(screen.queryByRole('link', { name: libelle }), etiquette).toBeNull();
      }
    });

    it('un échec réseau ne dit rien à l’écran', async () => {
      fetchMock.mockRejectedValue(new Error('réseau'));
      const { container } = render(<Composant token="JETON" />);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(container.innerHTML).toBe('');
    });
  });
}
