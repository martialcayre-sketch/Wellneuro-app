// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RayonBiologiePanel } from './RayonBiologiePanel';

// Catalogue minimal mais réaliste : l'état LIVRÉ du catalogue niveau 1 —
// plages laboratoire absentes partout, une seule plage fonctionnelle,
// appariement NABM à zéro ligne (remboursement non évalué partout).
const CATALOGUE = {
  ok: true,
  analytes: [
    {
      code: 'BIO_FERRITINE',
      libelle: 'Ferritine',
      libellePatient: 'Réserves en fer',
      unite: 'ng/mL',
      typePrelevement: 'sang_veineux',
      delaiRenduIndicatif: null,
      sourceProvenance: 'saisie_praticien',
      statutFiche: 'importee',
      niveauCompletude: 'partielle',
      donneesManquantes: [],
      incertitudes: null,
      verifieLe: null,
      validationMedicaleRequise: false,
      plagesLaboratoire: [],
      plagesFonctionnelles: [
        {
          borneMin: 50,
          borneMax: 80,
          unite: 'ng/mL',
          population: 'adulte_tout_venant',
          claimId: 'WN-CL-0044-003',
          versionClaim: '1',
          niveauPreuve: 'mecanisme',
        },
      ],
      remboursement: { statut: 'non_evalue', conditions: [], codesActesRetenus: [] },
      preanalytiques: [],
      panels: [{ code: 'PANEL_FATIGUE_1', libelle: 'Fatigue', niveau: 'socle' }],
    },
    {
      code: 'BIO_INSULINEMIE',
      libelle: 'Insulinémie à jeun',
      libellePatient: null,
      unite: 'µUI/mL',
      typePrelevement: 'sang_veineux',
      delaiRenduIndicatif: null,
      sourceProvenance: 'saisie_praticien',
      statutFiche: 'importee',
      niveauCompletude: 'partielle',
      donneesManquantes: [],
      incertitudes: null,
      verifieLe: null,
      validationMedicaleRequise: true,
      plagesLaboratoire: [],
      plagesFonctionnelles: [],
      remboursement: { statut: 'non_evalue', conditions: [], codesActesRetenus: [] },
      preanalytiques: [],
      panels: [],
    },
  ],
  panels: [
    {
      code: 'PANEL_FATIGUE_1',
      libelle: 'Fatigue',
      niveau: 'socle',
      objectif: 'Explorer une fatigue persistante.',
      items: [{ type: 'analyte', code: 'BIO_FERRITINE', libelle: 'Ferritine' }],
    },
    {
      // La donnée RÉELLE du catalogue niveau 1 contient ce verbatim de claim
      // (PANEL_MG_PLASMATIQUE) : l'écran rend la source telle quelle, et le
      // banc de vocabulaire ne doit PAS l'interdire — « dosage » cité par un
      // claim n'est pas un terme d'acte de l'outil.
      code: 'PANEL_MG_PLASMATIQUE',
      libelle: 'Magnésium plasmatique',
      niveau: 'specialise',
      objectif:
        'Le dosage plasmatique du magnésium circulant n’est pas recommandé comme dépistage (verbatim du claim source).',
      items: [],
    },
  ],
  millesimeNabm: { versionSource: 'V105', nombreEntrees: 987, importeLe: '2026-07-26T00:00:00.000Z' },
};

function mockFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: async () => payload,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RayonBiologiePanel — consultation documentaire', () => {
  it('charge le catalogue et affiche bilans puis analytes, sans score global ni vocabulaire interdit', async () => {
    mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);

    await waitFor(() => expect(screen.getByText('Fatigue')).toBeTruthy());
    expect(screen.getByText('Socle')).toBeTruthy();
    // « Ferritine » apparaît deux fois : puce du bilan et ligne d'analyte.
    expect(screen.getAllByText('Ferritine').length).toBeGreaterThan(0);
    expect(screen.getByText('Insulinémie à jeun')).toBeTruthy();
    // L'état livré se dit : remboursement non évalué sur chaque ligne.
    expect(screen.getAllByText('Non évalué').length).toBeGreaterThan(0);
    // Le millésime s'affiche sans tarif.
    expect(screen.getByText(/millésime V105/)).toBeTruthy();
    expect(document.body.textContent).not.toContain('€');

    // Vocabulaire imposé de la campagne CB : jamais « prescription »,
    // « ordonnance » ni « diagnostic » sur cette surface praticien (la garde
    // codée ne couvre que le registre médecin — l'écran porte donc son propre
    // banc). « dosage » n'en fait PAS partie : la donnée réelle du catalogue
    // le porte en verbatim de claim (PANEL_MG_PLASMATIQUE, présent dans la
    // fixture), et une citation de source n'est pas un terme de l'outil.
    expect(document.body.textContent).not.toMatch(/prescri|ordonnance|diagnosti/i);
    expect(screen.getByText(/Le dosage plasmatique du magnésium/)).toBeTruthy();
    // Jamais de score global (décision figée C4, reprise par CB-08).
    expect(document.body.textContent).not.toMatch(/score global/i);
  });

  it('ouvre la fiche en tiroir : deux référentiels côte à côte, chaque absence est dite', async () => {
    mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);
    await waitFor(() => expect(screen.getAllByText('Ferritine').length).toBeGreaterThan(0));

    // Nom exact : la puce du bilan s'appelle « Ferritine », la ligne d'analyte
    // porte un nom accessible plus long (prélèvement, badges).
    fireEvent.click(screen.getByRole('button', { name: 'Ferritine' }));

    await waitFor(() => expect(screen.getByText('Fiche analyte')).toBeTruthy());
    // Les deux colonnes existent toutes les deux.
    expect(screen.getByText('Laboratoire')).toBeTruthy();
    expect(screen.getByText('Fonctionnel')).toBeTruthy();
    // La colonne laboratoire vide se dit, jamais comblée par l'autre.
    expect(screen.getByText(/Aucune plage laboratoire renseignée/)).toBeTruthy();
    // La plage fonctionnelle cite son claim et son niveau de preuve.
    expect(screen.getByText(/WN-CL-0044-003/)).toBeTruthy();
    // « Non évalué » n'est jamais écrit « non remboursé » — l'écran explique.
    expect(screen.getByText(/ne veut pas dire\s*« non remboursé »/)).toBeTruthy();

    // Le banc de vocabulaire se rejoue TIROIR OUVERT : la fiche porte les
    // textes les plus riches (remboursement, préanalytique, provenance), les
    // juger tiroir fermé ne verrouillerait que la liste.
    expect(document.body.textContent).not.toMatch(/prescri|ordonnance|diagnosti/i);
    expect(document.body.textContent).not.toContain('€');
    expect(document.body.textContent).not.toMatch(/score global/i);
  });

  it('la validation médicale requise est un badge visible en liste', async () => {
    mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);
    await waitFor(() => expect(screen.getByText('Insulinémie à jeun')).toBeTruthy());

    expect(screen.getByText('Validation médicale')).toBeTruthy();
  });

  it('drapeau éteint côté serveur : le message de la route est rendu, rien d’autre', async () => {
    mockFetch(
      { ok: false, reason: 'flag_eteint', error: 'Le rayon biologie fonctionnelle n’est pas encore ouvert sur cet environnement.' },
      404,
    );
    render(<RayonBiologiePanel />);

    await waitFor(() =>
      expect(screen.getByText(/n’est pas encore ouvert sur cet environnement/)).toBeTruthy(),
    );
    expect(screen.queryByText(/Bilans \(/)).toBeNull();
  });

  it('échec technique : message d’erreur générique, pas de catalogue fantôme', async () => {
    mockFetch({ ok: false, reason: 'exception', error: 'Erreur technique.' }, 500);
    render(<RayonBiologiePanel />);

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Erreur technique.'));
    expect(screen.queryByText(/Analytes \(/)).toBeNull();
  });
});
