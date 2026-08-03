// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RechercheCorpusRayonPanel } from './RechercheCorpusRayonPanel';
import type { ClaimRayon } from '@/lib/supplement-library/rayonCorpus';

const fetchMock = vi.fn();
const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

function claim(over: Partial<ClaimRayon> = {}): ClaimRayon {
  return {
    claimId: over.claimId ?? 'WN-CLAIM-0001',
    versionClaim: 'v1',
    texteNormalise: over.texteNormalise ?? 'La cohérence cardiaque améliore la mémoire de travail.',
    classeAutorite: 'revue_systematique',
    niveauPreuve: 'modere',
    typologieLecture: 'mecanistique',
    prescriptif: over.prescriptif ?? false,
    validateur: over.validateur ?? 'praticien@wellneuro.fr',
    valideAt: over.valideAt ?? '2026-07-20T00:00:00.000Z',
    rayon: over.rayon ?? 'cognition',
    similarity: 0.8,
  };
}

function urlsAppelees(): string[] {
  return fetchMock.mock.calls.map(([u]) => String(u));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RechercheCorpusRayonPanel', () => {
  it("n'interroge rien tant qu'aucune recherche n'est saisie", () => {
    render(<RechercheCorpusRayonPanel />);
    expect(screen.getByText(/saisissez une recherche/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('recherche sur le rayon sélectionné et affiche les claims retournés', async () => {
    fetchMock.mockResolvedValue(
      json({
        ok: true,
        contractVersion: 'c4-rayon-corpus-v2',
        rayon: 'cognition',
        disponible: true,
        corpusVide: false,
        claims: [claim()],
        message: '',
      }),
    );
    render(<RechercheCorpusRayonPanel />);
    fireEvent.change(screen.getByLabelText(/recherche dans le rayon/i), {
      target: { value: 'mémoire de travail' },
    });
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }));

    await waitFor(() => {
      expect(screen.getByText(/cohérence cardiaque/i)).toBeTruthy();
    });
    expect(urlsAppelees()[0]).toContain('rayon=cognition');
    expect(urlsAppelees()[0]).toContain('requete=m%C3%A9moire');
  });

  it('bascule le rayon interrogé quand on change la sélection', async () => {
    fetchMock.mockResolvedValue(
      json({
        ok: true,
        contractVersion: 'c4-rayon-corpus-v2',
        rayon: 'intestin',
        disponible: true,
        corpusVide: true,
        claims: [],
        message: 'Corpus en cours de constitution — aucun claim validé pour ce rayon.',
      }),
    );
    render(<RechercheCorpusRayonPanel />);
    fireEvent.change(screen.getByLabelText(/rayon de recherche corpus/i), {
      target: { value: 'intestin' },
    });
    fireEvent.change(screen.getByLabelText(/recherche dans le rayon/i), {
      target: { value: 'microbiote' },
    });
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }));

    await waitFor(() => expect(urlsAppelees()[0]).toContain('rayon=intestin'));
  });

  it('un corpus vide affiche le message du service, jamais une erreur', async () => {
    fetchMock.mockResolvedValue(
      json({
        ok: true,
        contractVersion: 'c4-rayon-corpus-v2',
        rayon: 'cognition',
        disponible: true,
        corpusVide: true,
        claims: [],
        message: 'Corpus en cours de constitution — aucun claim validé pour ce rayon.',
      }),
    );
    render(<RechercheCorpusRayonPanel />);
    fireEvent.change(screen.getByLabelText(/recherche dans le rayon/i), {
      target: { value: 'mémoire' },
    });
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }));

    await waitFor(() => {
      expect(screen.getByText(/en cours de constitution/i)).toBeTruthy();
    });
  });

  it('un échec de chargement propose de réessayer', async () => {
    fetchMock.mockResolvedValue(json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, false));
    render(<RechercheCorpusRayonPanel />);
    fireEvent.change(screen.getByLabelText(/recherche dans le rayon/i), {
      target: { value: 'mémoire' },
    });
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/erreur technique/i);
    });
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeTruthy();
  });

  // Défaut MOYEN trouvé en revue : basculer le rayon après une recherche
  // laissait les anciens claims à l'écran sous un sélecteur qui affiche déjà
  // l'autre rayon — un claim attribué au mauvais rayon sur un instrument de
  // consultation clinique.
  it('changer de rayon après une recherche efface les claims affichés (pas de claim orphelin sous le mauvais rayon)', async () => {
    fetchMock.mockResolvedValue(
      json({
        ok: true,
        contractVersion: 'c4-rayon-corpus-v2',
        rayon: 'cognition',
        disponible: true,
        corpusVide: false,
        claims: [claim()],
        message: '',
      }),
    );
    render(<RechercheCorpusRayonPanel />);
    fireEvent.change(screen.getByLabelText(/recherche dans le rayon/i), {
      target: { value: 'mémoire de travail' },
    });
    fireEvent.click(screen.getByRole('button', { name: /rechercher/i }));
    await waitFor(() => expect(screen.getByText(/cohérence cardiaque/i)).toBeTruthy());

    fireEvent.change(screen.getByLabelText(/rayon de recherche corpus/i), {
      target: { value: 'intestin' },
    });

    expect(screen.queryByText(/cohérence cardiaque/i)).toBeNull();
  });

  // Le jeton de séquence est la seule mécanique non triviale du composant.
  // Le bouton et le champ de recherche sont désactivés pendant `enCours`
  // (protection contre le double-clic — pas de double appel d'embeddings sur
  // la clé OpenAI partagée), donc le SEUL déclencheur qui reste actionnable
  // pendant une recherche en vol est le sélecteur de rayon : basculer de rayon
  // pendant qu'une recherche est en cours ne doit jamais laisser une réponse
  // arrivée en retard, pour le rayon abandonné, repeupler l'écran.
  it('une réponse périmée d’un rayon abandonné (basculé pendant qu’elle était en vol) n’écrase jamais l’écran', async () => {
    let resoudreCognition: (v: unknown) => void = () => {};
    const reponseCognition = new Promise((resolve) => {
      resoudreCognition = resolve;
    });
    fetchMock.mockImplementationOnce(() => reponseCognition);

    render(<RechercheCorpusRayonPanel />);
    const champRecherche = screen.getByLabelText(/recherche dans le rayon/i);
    const selecteurRayon = screen.getByLabelText(/rayon de recherche corpus/i);
    const boutonRechercher = screen.getByRole('button', { name: /rechercher/i });

    fireEvent.change(champRecherche, { target: { value: 'mémoire de travail' } });
    fireEvent.click(boutonRechercher);
    // La recherche « cognition » est en vol (bouton/champ désactivés) ; le
    // sélecteur, lui, reste actionnable : on change d'avis vers « intestin ».
    fireEvent.change(selecteurRayon, { target: { value: 'intestin' } });
    expect((selecteurRayon as HTMLSelectElement).value).toBe('intestin');

    // La réponse « cognition », abandonnée, arrive après coup.
    resoudreCognition(json({
      ok: true,
      contractVersion: 'c4-rayon-corpus-v2',
      rayon: 'cognition',
      disponible: true,
      corpusVide: false,
      claims: [claim({ claimId: 'WN-CLAIM-PERIME', texteNormalise: 'Réponse périmée qui ne doit jamais s’afficher.' })],
      message: '',
    }));

    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText(/réponse périmée/i)).toBeNull();
  });
});
