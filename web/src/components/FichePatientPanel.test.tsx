// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FichePatientPanel } from './FichePatientPanel';

// Patient fictif autorisé (CLAUDE.md) — aucune donnée réelle.
const EQUILIBRE = {
  patient: { idPatient: 'PAT001', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@example.test' },
  objetsCliniques: {
    indiceGlobal: 62,
    stabiliteMetabolique: null,
    reserveAdaptation: 48,
    clarte: null,
    momentum: null,
  },
  priorites: [
    { besoin: 1, libellePraticien: 'Sommeil réparateur', strate: 'CORPS', couverture: 40, niveauPreuve: 'A' },
    { besoin: 2, libellePraticien: 'Ancrage du matin', strate: 'ANCRAGE', couverture: null, niveauPreuve: 'D' },
  ],
};

const REPONSES = {
  reponses: [
    {
      idReponse: 'REP001',
      idAssignation: 'ASG001',
      idQuestionnaire: 'NEU_03',
      titre: 'Questionnaire sommeil',
      dateSoumission: '2026-07-01T10:00:00.000Z',
      scorePrincipal: 18,
      interpretation: 'Vigilance modérée',
      scoresParsed: null,
      subScoreRanges: null,
    },
  ],
};

function stubFetch() {
  const fetchMock = vi.fn((input: unknown) => {
    const url = String(input);
    const json = (payload: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(payload) });
    if (url.includes('/api/praticien/equilibre')) return json(EQUILIBRE);
    if (url.includes('/api/praticien/reponses')) return json(REPONSES);
    if (url.includes('/api/praticien/patients')) return json({ assignations: [] });
    if (url.includes('/api/praticien/trajectoire')) return json({ ok: true, trajectoire: null });
    // Runtime clinique : indisponible dans ce test d'ossature.
    return json({ status: 'unavailable', reason: 'exception' });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function rendreFiche() {
  stubFetch();
  render(<FichePatientPanel idPatient="PAT001" />);
  await waitFor(() => expect(screen.getAllByText('Sophie Nicola').length).toBeGreaterThan(0));
}

describe('FichePatientPanel — poste de pilotage (A6-R1)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('rend le rail des 7 phases du cycle clinique, phase « Décision 21 j » sélectionnée', async () => {
    await rendreFiche();

    const rail = screen.getByRole('tablist', { name: 'Cycle clinique' });
    expect(rail.getAttribute('aria-orientation')).toBe('vertical');

    const phases = ['Patient', 'Données fiables', 'Compréhension', 'Décision 21 j', 'Actions', 'Suivi', 'Réévaluation'];
    for (const libelle of phases) {
      expect(screen.getByRole('tab', { name: new RegExp(libelle, 'i') })).toBeTruthy();
    }

    const decision = screen.getByRole('tab', { name: /Décision 21 j/i });
    expect(decision.getAttribute('aria-selected')).toBe('true');
    // Statut jamais porté par la seule couleur : un libellé texte accompagne l'icône.
    expect(decision.textContent).toContain('à ouvrir');
  });

  it('navigue de phase en phase au clic et au clavier, sans quitter la page', async () => {
    await rendreFiche();

    fireEvent.click(screen.getByRole('tab', { name: /Patient/i }));
    const patient = screen.getByRole('tab', { name: /Patient/i });
    expect(patient.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText(/Dernière réponse reçue le/i)).toBeTruthy();

    // Flèche bas → phase suivante du cycle.
    fireEvent.keyDown(patient, { key: 'ArrowDown' });
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Données fiables/i }).getAttribute('aria-selected')).toBe('true'),
    );
    expect(screen.getByText(/1 questionnaire\(s\) reçu\(s\)/i)).toBeTruthy();
  });

  it('ouvre puis referme un instrument à tiroir (au clic, jamais au survol)', async () => {
    await rendreFiche();

    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Les 12 besoins/i }));
    const tiroir = await screen.findByRole('dialog');
    expect(tiroir.textContent).toContain('Sommeil réparateur');

    fireEvent.click(screen.getByRole('button', { name: /Fermer l’instrument Les 12 besoins/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('expose les onglets in-fiche et bascule vers la trajectoire', async () => {
    await rendreFiche();

    const onglets = screen.getByRole('tablist', { name: 'Vues de la fiche patient' });
    expect(onglets.textContent).toContain('Poste de pilotage');
    expect(onglets.textContent).toContain('Les 12 besoins');
    expect(onglets.textContent).toContain('Alimentation');
    expect(onglets.textContent).toContain('Trajectoire');

    fireEvent.click(screen.getByRole('tab', { name: 'Trajectoire' }));
    await waitFor(() => expect(screen.getByText(/Fiche-trajectoire/i)).toBeTruthy());
    // Le poste de pilotage est masqué, jamais démonté d'un scroll de page.
    expect(document.getElementById('panneau-cockpit')?.hasAttribute('hidden')).toBe(true);
  });
});
