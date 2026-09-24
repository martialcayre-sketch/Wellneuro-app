// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortesBiologiquesSection } from './PortesBiologiquesSection';

// [[D-245]] — la section pose côte à côte les sources et le dossier. Ces bancs
// gardent ce qu'elle MONTRE, et surtout ce qu'elle TAIT.

const ACTIF = {
  ok: true,
  actif: true,
  shaPerimetre: '56575ab47a40bbaebcca5c2523db7f9c60479bb0c856a4f2820c4c955139149c',
  corpusLu: true,
  retireesFauteDeClaim: 0,
  portes: [
    {
      ligneId: 'PB-METHYLATION',
      plateCode: 'ASSIETTE_METHYLATION',
      libelle: 'Assiette de méthylation',
      claims: [
        {
          claimId: 'WN-CL-0043-014',
          versionClaim: 'v1.0',
          // UN TEXTE DE SOURCE QUI PORTE DES MOTS DE VERDICT — c'est le cas réel :
          // la sentinelle ne doit pas le censurer, elle doit vérifier que la
          // MACHINE n'en ajoute aucun.
          texte: 'Une méthylation insuffisante correspond à une homocystéine supérieure à 8 à 10 μmol/l, un déficit élevé.',
        },
      ],
      marqueurs: [
        {
          analyteCode: 'BIO_HOMOCYSTEINE',
          libelle: 'Homocystéine',
          dernier: { valeur: '12.40', unite: 'µmol/L', preleveLe: '2026-09-01T00:00:00.000Z', source: 'saisie_praticien' },
        },
      ],
    },
    {
      ligneId: 'PB-OMEGA-3',
      plateCode: 'ASSIETTE_OMEGA_3',
      libelle: 'Assiette oméga 3',
      claims: [{ claimId: 'WN-CL-0294-004', versionClaim: 'v1.0', texte: 'Texte de la source oméga 3.' }],
      marqueurs: [
        { analyteCode: 'BIO_RATIO_AA_EPA', libelle: 'Rapport AA / EPA', dernier: { valeur: '3.5', unite: 'ratio', preleveLe: '2026-08-15T00:00:00.000Z', source: 'import_labo' } },
        { analyteCode: 'BIO_INDEX_OMEGA3', libelle: 'Index oméga 3', dernier: null },
      ],
    },
  ],
};

function monter(reponse: unknown, idPatient = 'PAT1') {
  vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => reponse })));
  return render(<PortesBiologiquesSection idPatient={idPatient} />);
}

/** Le texte que la MACHINE écrit : tout, sauf les citations de sources. */
function texteHorsCitations(): string {
  const racine = screen.getByRole('heading', { name: /ce que disent les sources/i }).parentElement!;
  const copie = racine.cloneNode(true) as HTMLElement;
  copie.querySelectorAll('blockquote').forEach(b => b.remove());
  return copie.textContent ?? '';
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PortesBiologiquesSection', () => {
  it('cite la source ENTIÈRE et pose le dernier résultat à côté, virgule décimale, sans arrondi', async () => {
    monter(ACTIF);
    await waitFor(() => expect(screen.getByText('Assiette de méthylation')).toBeTruthy());
    expect(screen.getByText(ACTIF.portes[0].claims[0].texte)).toBeTruthy();
    expect(screen.getByText(/12,40 µmol\/L — prélevé le 01\/09\/2026, saisi au dossier/)).toBeTruthy();
  });

  it('un ratio s’affiche sans unité, et la provenance laboratoire est dite', async () => {
    monter(ACTIF);
    await waitFor(() => expect(screen.getByText('Assiette oméga 3')).toBeTruthy());
    expect(screen.getByText(/3,5 — prélevé le 15\/08\/2026, importé du laboratoire/)).toBeTruthy();
  });

  it('« aucun résultat au dossier » — jamais une valeur par défaut (`DC-24`)', async () => {
    monter(ACTIF);
    await waitFor(() => expect(screen.getByText('Index oméga 3')).toBeTruthy());
    expect(screen.getByText(/Index oméga 3/).closest('li')?.textContent).toBe('Index oméga 3 : aucun résultat au dossier');
  });

  // LA SENTINELLE DE VOCABULAIRE, hors citations. La frontière entre juxtaposer
  // et interpréter tient aux MOTS que la machine affiche ([[D-157]]).
  it('aucun vocabulaire de verdict écrit par la machine', async () => {
    monter(ACTIF);
    await waitFor(() => expect(screen.getByText('Assiette de méthylation')).toBeTruthy());
    const texte = texteHorsCitations();
    for (const mot of [
      /hors\s+plage/i,
      /\banormal/i,
      /\bélevée?\b/i,
      /\bbasse?\b/i,
      /\bdéficit/i,
      /\bcarence/i,
      /\bexcès\b/i,
      /\bnormal/i,
      /\bau-dessus\b/i,
      /\bdépass/i,
      /\bindiquée?\b/i,
    ]) {
      expect(mot.test(texte), `vocabulaire de verdict trouvé : ${mot}`).toBe(false);
    }
    // Et le garde mord : la citation, elle, porte bien « élevé » — c'est la source.
    expect(screen.getByText(/un déficit élevé/)).toBeTruthy();
  });

  it('aucune couleur de statut sur une valeur', async () => {
    const { container } = monter(ACTIF);
    await waitFor(() => expect(screen.getByText('Homocystéine')).toBeTruthy());
    const valeur = screen.getByText(/12,40 µmol\/L/);
    expect(valeur.className).not.toMatch(/status-|danger|warning|success/);
    expect(container.querySelectorAll('[class*="status-danger"], [class*="status-success"]').length).toBe(0);
  });

  it('verrou fermé : la section n’existe pas', async () => {
    const { container } = monter({ ok: true, actif: false, message: 'non activée' });
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('corpus illisible : dit, et rien n’est cité', async () => {
    monter({ ...ACTIF, corpusLu: false, portes: [] });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/corpus n’a pas pu être interrogé/));
    expect(screen.queryByRole('blockquote')).toBeNull();
  });

  it('une porte retirée faute de source valide est comptée, pas tue', async () => {
    monter({ ...ACTIF, retireesFauteDeClaim: 1 });
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('1 assiette n’est pas affichée : une de ses sources n’est plus valide au corpus.'),
    );
  });

  it('une réponse ACTIVE sans `portes` est dite illisible — la section ne lève pas', async () => {
    monter({ ok: true, actif: true, shaPerimetre: 'x', corpusLu: true, retireesFauteDeClaim: 0 });
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Réponse illisible de la biologie des assiettes.'),
    );
  });

  it('une erreur de la route est dite', async () => {
    monter({ ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' });
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Patient non accessible pour ce praticien.'));
  });

  it('la section est une RÉGION nommée pour un lecteur d’écran', async () => {
    monter(ACTIF);
    expect(await screen.findByRole('region', { name: /ce que disent les sources, ce que mesure le dossier/i })).toBeTruthy();
  });

  it('interroge la route du dossier courant, encodé', async () => {
    monter(ACTIF, 'PAT 2');
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith('/api/praticien/assiettes-indiquees/portes-biologiques?idPatient=PAT%202'),
    );
  });
});
