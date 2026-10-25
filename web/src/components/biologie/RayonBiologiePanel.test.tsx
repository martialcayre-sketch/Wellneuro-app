// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
      nonIndiques: [],
      // F79 (D-351) : un lien non gradé — le nul de la base — et un lien
      // gradé, de fixture, pour éprouver les deux branches de l'affichage.
      liensAxe: [
        {
          axe: 'stress_oxydant',
          sens: 'bas_evocateur',
          claimId: 'WN-CL-0999-002',
          versionClaim: 'v1.0',
          niveauPreuve: { statut: 'gradé', lettre: 'B' },
        },
        {
          axe: 'inflammation',
          sens: 'haut_evocateur',
          claimId: 'WN-CL-0999-001',
          versionClaim: 'v1.0',
          niveauPreuve: { statut: 'non_gradé' },
        },
      ],
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
      nonIndiques: [],
      liensAxe: [],
    },
    {
      code: 'BIO_MAGNESIUM_ERYTHROCYTAIRE',
      libelle: 'Magnésium érythrocytaire',
      libellePatient: null,
      unite: 'mmol/L',
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
      plagesFonctionnelles: [],
      remboursement: { statut: 'non_evalue', conditions: [], codesActesRetenus: [] },
      preanalytiques: [],
      // La donnée RÉELLE de la table signée porte ce verbatim de claim
      // (BIO-NIA-01) : l'écran rend la source telle quelle, et le banc de
      // vocabulaire ne doit PAS l'interdire — « dosage » cité par un claim
      // n'est pas un terme d'acte de l'outil.
      nonIndiques: [
        {
          exploration: 'Magnésium plasmatique',
          motif:
            'Le dosage plasmatique du magnésium circulant n’est pas recommandé en première intention : seulement 1 % du pool magnésien se trouve sous cette forme. L’exploration pertinente est le magnésium érythrocytaire.',
          claimId: 'WN-CL-0242-007',
        },
      ],
      liensAxe: [],
    },
  ],
  millesimeNabm: { versionSource: 'V105', nombreEntrees: 987, importeLe: '2026-07-26T00:00:00.000Z' },
};

function mockFetch(payload: unknown, status = 200) {
  // La fiche ouverte lit aussi ses correspondances NABM (M-3) et sa
  // composition (F80) : ces lectures reçoivent des listes vides, le catalogue
  // reçoit la charge du test.
  const fetchMock = vi.fn().mockImplementation(async (url: string) =>
    String(url).includes('/nabm/')
      ? { ok: true, status: 200, json: async () => ({ ok: true, millesime: 'V105', correspondances: [] }) }
      : String(url).includes('/compositions')
        ? {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              active: null,
              retirees: [],
              preparee: null,
              operandesAbsents: null,
              membreDe: [],
            }),
          }
        : { ok: status < 400, status, json: async () => payload },
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RayonBiologiePanel — consultation documentaire', () => {
  it('charge le catalogue et affiche les analytes — plus aucun bilan (D-320 §2), sans score global ni vocabulaire interdit', async () => {
    mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);

    await waitFor(() => expect(screen.getByText('Ferritine')).toBeTruthy());
    expect(screen.getByText('Insulinémie à jeun')).toBeTruthy();
    // Les bilans ne sont plus une entrée du rayon : ni section, ni niveau.
    expect(screen.queryByText(/Bilans \(/)).toBeNull();
    expect(screen.queryByText('Socle')).toBeNull();
    expect(document.body.textContent).not.toMatch(/bilans hiérarchisés/i);
    // L'état livré se dit : remboursement non évalué sur chaque ligne.
    expect(screen.getAllByText('Non évalué').length).toBeGreaterThan(0);
    // Le millésime s'affiche sans tarif.
    expect(screen.getByText(/millésime V105/)).toBeTruthy();
    expect(document.body.textContent).not.toContain('€');

    // Vocabulaire imposé de la campagne CB : jamais « prescription »,
    // « ordonnance » ni « diagnostic » sur cette surface praticien (la garde
    // codée ne couvre que le registre médecin — l'écran porte donc son propre
    // banc).
    expect(document.body.textContent).not.toMatch(/prescri|ordonnance|diagnosti/i);
    // Jamais de score global (décision figée C4, reprise par CB-08).
    expect(document.body.textContent).not.toMatch(/score global/i);
  });

  it('ouvre la fiche en tiroir : deux référentiels côte à côte, chaque absence est dite', async () => {
    mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);
    await waitFor(() => expect(screen.getByText('Ferritine')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /^Ferritine/ }));

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

  it('la fiche de l’alternative dit l’exploration non indiquée, motif verbatim et claim (D-320 §3)', async () => {
    mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);
    await waitFor(() => expect(screen.getByText('Magnésium érythrocytaire')).toBeTruthy());
    // En liste, rien : la mise en garde est sur la fiche.
    expect(screen.queryByText(/non indiqué actuellement/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^Magnésium érythrocytaire/ }));
    await waitFor(() => expect(screen.getByText('Exploration non indiquée')).toBeTruthy());
    expect(screen.getByText('Magnésium plasmatique : non indiqué actuellement')).toBeTruthy();
    expect(screen.getByText(/Le dosage plasmatique du magnésium circulant/)).toBeTruthy();
    expect(screen.getByText('Source : WN-CL-0242-007')).toBeTruthy();
    expect(screen.queryByText('Présent dans les bilans')).toBeNull();
    // « dosage » cité par le claim n'est pas un terme d'acte de l'outil : le
    // banc de vocabulaire ne l'interdit pas.
    expect(document.body.textContent).not.toMatch(/prescri|ordonnance|diagnosti/i);
  });

  it('une fiche sans exploration non indiquée n’a pas la section', async () => {
    mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);
    await waitFor(() => expect(screen.getByText('Ferritine')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^Ferritine/ }));
    await waitFor(() => expect(screen.getByText('Fiche analyte')).toBeTruthy());
    expect(screen.queryByText('Exploration non indiquée')).toBeNull();
  });

  // F79 (D-351 §4) : un niveau de preuve nul se dit « non gradé », jamais une
  // lettre ; un lien gradé garde sa lettre. Ces liens ne jugent aucun résultat.
  it('la fiche dit ses axes biologiques, « non gradé » quand le niveau est nul', async () => {
    mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);
    await waitFor(() => expect(screen.getByText('Ferritine')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^Ferritine/ }));
    await waitFor(() => expect(screen.getByText('Axes biologiques')).toBeTruthy());

    const section = screen.getByRole('region', { name: 'Axes biologiques' });
    const lignes = within(section).getAllByRole('listitem');
    expect(lignes).toHaveLength(2);
    // L'ordre est celui que le service a servi — l'écran ne retrie pas.
    expect(lignes[0].textContent).toContain('Stress oxydant');
    expect(lignes[0].textContent).toContain('Niveau de preuve : B');
    expect(lignes[1].textContent).toContain('Inflammation');
    expect(lignes[1].textContent).toContain('évocateur quand la valeur est haute');
    expect(lignes[1].textContent).toContain('Claim WN-CL-0999-001 (v1.0)');
    expect(lignes[1].textContent).toContain('Niveau de preuve : non gradé');
    expect(document.body.textContent).not.toMatch(/prescri|ordonnance|diagnosti/i);
  });

  it('sans lien d’axe, la section le dit', async () => {
    mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);
    await waitFor(() => expect(screen.getByText('Insulinémie à jeun')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /^Insulinémie à jeun/ }));
    await waitFor(() => expect(screen.getByText('Axes biologiques')).toBeTruthy());
    expect(screen.getByText(/Aucun lien vers un axe biologique signé/)).toBeTruthy();
    expect(screen.queryByText(/non gradé/)).toBeNull();
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

describe('RayonBiologiePanel — compositions et signature en lot (D-326)', () => {
  it('la fiche d’un constituant dit le groupe dont il tient l’acte', async () => {
    const [ferritine, ...reste] = CATALOGUE.analytes;
    mockFetch({
      ...CATALOGUE,
      analytes: [
        {
          ...ferritine,
          remboursement: {
            statut: 'remboursable_si_groupe',
            conditions: [],
            codesActesRetenus: ['1104'],
            parGroupes: [{ code: 'BIO_NFS', libelle: 'Numération formule sanguine' }],
          },
        },
        ...reste,
      ],
    });
    render(<RayonBiologiePanel />);
    fireEvent.click(await screen.findByRole('button', { name: /^Ferritine/ }));
    await waitFor(() =>
      expect(
        screen.getByText(/Par l’acte de son groupe, dont la composition signée le compte :\s*Numération formule sanguine\./),
      ).toBeTruthy(),
    );
  });

  it('contre-épreuve : sans groupe, aucune mention', async () => {
    mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);
    fireEvent.click(await screen.findByRole('button', { name: /^Ferritine/ }));
    await waitFor(() => expect(screen.getByText('Fiche analyte')).toBeTruthy());
    expect(screen.queryByText(/Par l’acte de son groupe/)).toBeNull();
  });

  it('« Signer en lot » ouvre la liste des correspondances préparées', async () => {
    const fetchMock = mockFetch(CATALOGUE);
    render(<RayonBiologiePanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Signer en lot les correspondances préparées' }));
    await waitFor(() => expect(screen.getByText('Correspondances préparées à signer')).toBeTruthy());
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/nabm/correspondances/lot'))).toBe(true);
  });
});
