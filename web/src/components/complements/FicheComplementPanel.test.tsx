// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { FicheComplementPanel } from './FicheComplementPanel';
import type { FicheComplement } from '@/lib/supplement-library/catalogue';

const fetchMock = vi.fn();
const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const FICHE: FicheComplement = {
  produitId: 'prod_mag',
  nomCommercial: 'Magnésium Plus',
  marque: 'MarqueA',
  marche: 'FR',
  statutFiche: 'importee',
  statutLabel: 'Fiche importée — non vérifiée',
  composition: [
    { ingredientCode: 'magnesium', ingredientNomFr: 'Magnésium', formeCode: 'bisglycinate', formeLabelFr: 'Bisglycinate', doseParPortion: 200, unite: 'mg' },
  ],
  dimensions: {
    qualiteFormulation: { valeur: 'bien_documentee', justification: 'Qualité lue du niveau de complétude.' },
    biodisponibiliteForme: {
      valeurs: [{ ingredientCode: 'magnesium', valeur: 'forme_preferee', formeFiche: 'bisglycinate', formePreferee: 'bisglycinate' }],
      valeursPresentes: ['forme_preferee'],
      justification: 'Comparaison ingrédient par ingrédient — jamais fondue en une note unique.',
    },
    gradePreuveParIntention: {
      valeurs: [{ intentionCode: 'sommeil_fragmente', intentionLabelFr: 'Sommeil fragmenté', ingredientCode: 'magnesium', grade: 'modere', gradeLabel: 'Modéré' }],
      justification: 'Grade GRADE listé par intention, jamais moyenné.',
    },
    compatibiliteProtocole: { valeur: 'non_evaluee', justification: 'Aucune sélection ouverte.' },
    interactionsSignalees: {
      valeur: 'signalees',
      signalements: [{ code: 'mag_diarrhee', messageFr: 'Doses élevées : risque digestif.', niveauAlerte: 'orange', ingredientCode: 'magnesium' }],
      mentionMedecin: 'À discuter avec le médecin traitant — signalement, jamais une décision automatique.',
      justification: '1 signalement d’interaction.',
    },
    cumulVsSeuils: { valeur: 'non_evaluee', signaux: [], justification: 'Aucune sélection d’intentions.' },
    donneesManquantes: { valeur: 'aucune', elements: [], justification: 'Aucune donnée manquante déclarée.' },
    fraicheurProvenance: {
      provenance: 'dgccrf', identifiantSource: 'DGCCRF-001', urlSource: null,
      dateDerniereVerification: '2026-06-01T00:00:00.000Z', versionFormulation: 1,
      statutFiche: 'importee', statutLabel: 'Fiche importée — non vérifiée',
      justification: 'Provenance et fraîcheur affichées sans fard.',
    },
  },
  reglesCorrespondantes: 1,
  referencesScientifiques: [{ id: 'src_1', citation: 'Revue Micronutrition, 2024', lienUrl: null }],
};

const CORPUS_VIDE = {
  ok: true, contractVersion: 'c4-rayon-corpus-v1', rayon: 'micronutrition',
  disponible: true, corpusVide: true, claims: [],
  message: 'Corpus en cours de constitution — aucun claim validé pour ce rayon.',
};

const CORPUS_PLEIN = {
  ok: true, contractVersion: 'c4-rayon-corpus-v1', rayon: 'micronutrition',
  disponible: true, corpusVide: false,
  claims: [{
    claimId: 'WN-CLAIM-0001', versionClaim: 'v1',
    texteNormalise: 'Le magnésium bisglycinate soutient le sommeil.',
    classeAutorite: 'revue_systematique', niveauPreuve: 'modere',
    typologieLecture: 'mecanistique', prescriptif: false,
    validateur: 'praticien@wellneuro.fr', valideAt: '2026-07-20T00:00:00.000Z',
    rayon: 'micronutrition', similarity: 0.82,
  }],
  message: '',
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FicheComplementPanel (fiche justificative multi-dimensions)', () => {
  it('affiche les dimensions nommées avec leur justification TOUJOURS visible, et jamais un score global', async () => {
    fetchMock.mockResolvedValue(json(CORPUS_VIDE));
    render(<FicheComplementPanel fiche={FICHE} intentionLabel="Sommeil fragmenté" />);

    expect(screen.getByText('Magnésium Plus')).toBeTruthy();
    expect(screen.getAllByText('Fiche importée — non vérifiée').length).toBeGreaterThan(0);

    // Les dimensions sont nommées (titres uniques).
    expect(screen.getByText('Qualité de formulation')).toBeTruthy();
    expect(screen.getByText('Biodisponibilité de la forme')).toBeTruthy();
    expect(screen.getByText('Grade de preuve par intention')).toBeTruthy();
    expect(screen.getByText('Compatibilité protocole')).toBeTruthy();
    expect(screen.getAllByText(/Interactions signalées/).length).toBeGreaterThan(0);
    expect(screen.getByText('Cumul vs seuils')).toBeTruthy();
    expect(screen.getByText('Données manquantes')).toBeTruthy();
    expect(screen.getByText('Fraîcheur / provenance')).toBeTruthy();

    // Justification visible + garde-fou « jamais une note unique ».
    expect(screen.getAllByText(/jamais fondue en une note unique/).length).toBeGreaterThan(0);
    expect(screen.getByText(/jamais moyenné/)).toBeTruthy();

    // Le grade est étiqueté « preuve scientifique » (échelle GRADE), jamais un A/B/C/D nu.
    expect(screen.getByText(/preuve scientifique — Modéré/)).toBeTruthy();

    // Signalement d'interaction + mention médecin traitant.
    expect(screen.getByText(/risque digestif/i)).toBeTruthy();
    expect(screen.getByText(/médecin traitant/i)).toBeTruthy();

    // Référence scientifique visible.
    expect(screen.getByText('Revue Micronutrition, 2024')).toBeTruthy();
  });

  it('gère un corpus vide : « en cours de constitution », jamais une erreur', async () => {
    fetchMock.mockResolvedValue(json(CORPUS_VIDE));
    render(<FicheComplementPanel fiche={FICHE} />);
    await waitFor(() =>
      expect(screen.getByText(/Corpus en cours de constitution/)).toBeTruthy(),
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('affiche les claims validés du corpus quand ils existent', async () => {
    fetchMock.mockResolvedValue(json(CORPUS_PLEIN));
    render(<FicheComplementPanel fiche={FICHE} />);
    await waitFor(() =>
      expect(screen.getByText(/Le magnésium bisglycinate soutient le sommeil/)).toBeTruthy(),
    );
    expect(screen.getByText(/validé par praticien@wellneuro.fr/)).toBeTruthy();
  });

  it('interroge la route corpus avec le rayon et une requête dérivée de la fiche', async () => {
    fetchMock.mockResolvedValue(json(CORPUS_VIDE));
    render(<FicheComplementPanel fiche={FICHE} rayon="micronutrition" intentionLabel="Sommeil fragmenté" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/praticien/complements/corpus?rayon=micronutrition');
    expect(String(url)).toContain('requete=');
  });
});
