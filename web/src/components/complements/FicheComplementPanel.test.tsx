// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { FicheComplementPanel, REQUETE_CORPUS_MAX_ECRAN } from './FicheComplementPanel';
import { REQUETE_CORPUS_MAX } from '@/lib/supplement-library/config';
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
    { ingredientCode: 'magnesium', ingredientNomFr: 'Magnésium', formeCode: 'bisglycinate', formeLabelFr: 'Bisglycinate', doseParDjr: 200, unite: 'mg' },
  ],
  completudeComposition: 'integre',
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
  ok: true, contractVersion: 'c4-rayon-corpus-v2', rayon: 'micronutrition',
  disponible: true, corpusVide: true, claims: [],
  message: 'Corpus en cours de constitution — aucun claim validé pour ce rayon.',
};

const CORPUS_PLEIN = {
  ok: true, contractVersion: 'c4-rayon-corpus-v2', rayon: 'micronutrition',
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

  it('affiche le message métier renvoyé par l’API quand le corpus est indisponible', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        reason: 'flag_eteint',
        error: 'Le rayon compléments n’est pas encore ouvert sur cet environnement.',
      }),
    });
    render(<FicheComplementPanel fiche={FICHE} />);
    await waitFor(() =>
      expect(screen.getByText(/Le rayon compléments n’est pas encore ouvert/i)).toBeTruthy(),
    );
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('affiche les claims validés du corpus quand ils existent', async () => {
    fetchMock.mockResolvedValue(json(CORPUS_PLEIN));
    render(<FicheComplementPanel fiche={FICHE} />);
    await waitFor(() =>
      expect(screen.getByText(/Le magnésium bisglycinate soutient le sommeil/)).toBeTruthy(),
    );
    expect(screen.getByText(/validé par praticien@wellneuro.fr/)).toBeTruthy();
  });

  it('balise les claims prescriptifs par un badge (le clinicien voit, cure ensuite)', async () => {
    fetchMock.mockResolvedValue(json({
      ...CORPUS_PLEIN,
      claims: [{
        ...CORPUS_PLEIN.claims[0],
        claimId: 'WN-CLAIM-0009',
        texteNormalise: 'Magnésium : 300 mg par jour au coucher.',
        prescriptif: true,
      }],
    }));
    render(<FicheComplementPanel fiche={FICHE} />);
    await waitFor(() =>
      expect(screen.getByText(/300 mg par jour/)).toBeTruthy(),
    );
    expect(screen.getByText('prescriptif')).toBeTruthy();
  });

  it('interroge la route corpus avec le rayon et une requête dérivée de la fiche', async () => {
    fetchMock.mockResolvedValue(json(CORPUS_VIDE));
    render(<FicheComplementPanel fiche={FICHE} rayon="micronutrition" intentionLabel="Sommeil fragmenté" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/praticien/complements/corpus?rayon=micronutrition');
    expect(String(url)).toContain('requete=');
  });

  // ─── Complétude de composition ────────────────────────────────────────────

  it('annonce qu’une composition partielle est incomplète, sous la liste', () => {
    // Sans cette mention, la liste se lit comme la composition ENTIÈRE : un
    // ingrédient non résolu passerait pour un ingrédient absent du produit.
    fetchMock.mockResolvedValue(json(CORPUS_VIDE));
    render(<FicheComplementPanel fiche={{ ...FICHE, completudeComposition: 'partielle' }} />);
    expect(screen.getByText(/Composition partiellement résolue/i)).toBeTruthy();
    expect(screen.getByText(/absence de signal ne vaut pas absence de risque/i)).toBeTruthy();
  });

  it.each(['integre', 'absente'] as const)(
    'n’affiche AUCUNE mention de partialité sur une composition « %s »',
    (completude) => {
      fetchMock.mockResolvedValue(json(CORPUS_VIDE));
      render(<FicheComplementPanel fiche={{ ...FICHE, completudeComposition: completude }} />);
      expect(screen.queryByText(/Composition partiellement résolue/i)).toBeNull();
    },
  );

  // ─── La dose : un silence n'est pas une information ────────────────────────

  // La source ne dose JAMAIS les nutriments (301 428 lignes de chaînes nues).
  // Sur un complexe multivitaminé, l'ancien affichage rendait quinze lignes
  // sans un chiffre ni un mot : rien ne distinguait « la fiche ignore la dose »
  // de « le produit n'en déclare pas ».
  it('une ligne sans dose le DIT, au lieu de se taire', () => {
    render(
      <FicheComplementPanel
        fiche={{
          ...FICHE,
          composition: [
            {
              ingredientCode: 'vitamine-b12',
              ingredientNomFr: 'Vitamine B12',
              formeCode: 'cyanocobalamine',
              formeLabelFr: 'Cyanocobalamine',
              doseParDjr: null,
              unite: null,
            },
          ],
        }}
      />,
    );
    expect(screen.getAllByText(/dose non renseignée/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, el) => /pas une dose nulle/i.test(el?.textContent ?? '')).length,
    ).toBeGreaterThan(0);
  });

  // L'écran était le dernier maillon resté muet après le renommage de la
  // colonne : une dose « 200 mg » nue laisse croire à une dose par prise, quand
  // la source déclare une quantité par dose journalière recommandée.
  it('nomme la grandeur : « par DJR », jamais une dose nue', () => {
    render(<FicheComplementPanel fiche={FICHE} />);
    expect(screen.getByTitle('dose journalière recommandée')).toBeTruthy();
  });

  // Fige le `!= null` contre une régression en `!c.doseParDjr` : un zéro
  // déclaré est une déclaration, pas une absence.
  it('une dose de zéro s’affiche, et ne se confond pas avec l’absence', () => {
    render(
      <FicheComplementPanel
        fiche={{ ...FICHE, composition: [{ ...FICHE.composition[0], doseParDjr: 0, unite: 'mg' }] }}
      />,
    );
    expect(screen.queryAllByText(/dose non renseignée/i)).toHaveLength(0);
  });

  // ─── La requête corpus ne peut plus déborder ───────────────────────────────

  // La borne vit dans `lib/supplement-library/config.ts`, module de constantes
  // sans Prisma : ce test l'IMPORTE, là où il en relisait le texte source dans
  // la route. Une garde par expression régulière ne tient qu'au format de la
  // ligne — renommer la constante ou la passer sur deux lignes la rendait
  // muette, et une recopie sans garde diverge en silence : l'écran laisserait
  // alors partir une requête que le serveur refuse.
  //
  // L'ÉCRAN, lui, continue de recopier la valeur : il est un composant client,
  // et n'a rien à faire d'un module qui lit un secret d'environnement.
  it('la borne de l’écran est celle du serveur', () => {
    expect(REQUETE_CORPUS_MAX_ECRAN).toBe(REQUETE_CORPUS_MAX);
  });

  function compositionLongue(n: number) {
    return Array.from({ length: n }, (_, i) => ({
      ingredientCode: `ing-${i}`,
      ingredientNomFr: `Ingrédient au nom délibérément long numéro ${i}`,
      formeCode: null,
      formeLabelFr: null,
      doseParDjr: null,
      unite: null,
    }));
  }

  // Sans borne, une fiche à une vingtaine de composants franchissait les 500
  // caractères, le serveur rendait 400, et l'écran affichait un bandeau rouge à
  // la place des claims sourcés — la fiche perdait sa partie sourcée.
  it('une fiche à 30 ingrédients ne construit jamais une requête hors borne', async () => {
    render(<FicheComplementPanel fiche={{ ...FICHE, composition: compositionLongue(30) }} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'https://x');
    expect((url.searchParams.get('requete') ?? '').length).toBeLessThanOrEqual(REQUETE_CORPUS_MAX_ECRAN);
  });

  // Tronquer la CHAÎNE couperait « Vitamine B12 » en « Vitamine B1 » et
  // enverrait à l'embedding un AUTRE nutriment — pire qu'une omission. On borne
  // donc le nombre d'ingrédients cités, et chaque nom cité reste entier.
  it('ne coupe jamais un nom d’ingrédient en deux', async () => {
    const composition = compositionLongue(30);
    render(<FicheComplementPanel fiche={{ ...FICHE, composition }} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'https://x');
    const requete = url.searchParams.get('requete') ?? '';
    const noms = composition.map((c) => c.ingredientNomFr);
    const cites = requete.split(' · ').slice(-1)[0].split(', ');
    for (const segment of cites) expect(noms).toContain(segment);
  });

  // LE FILET MORD. Borner à 8 ingrédients ne suffit pas : `nom_commercial` est
  // un TEXT non borné en base, sans validation de longueur à l'ingestion, et
  // les libellés commerciaux à rallonge sont courants dans la source. Un nom de
  // 470 caractères suffisait à ce que le `slice(500)` final coupe le premier
  // ingrédient — exactement le défaut que la borne par nombre devait écarter.
  // La construction est donc À BUDGET : un nom n'est ajouté que s'il tient
  // entier.
  it('un nom commercial à rallonge ne fait couper aucun ingrédient', async () => {
    // 400 caractères : il reste de la place pour quelques noms, pas pour huit.
    // C'est le cas intéressant — la coupe tombe AU MILIEU de la liste, là où
    // l'ancien `slice` final tranchait dans un nom.
    const composition = compositionLongue(8);
    const entete = 'X'.repeat(400);
    render(<FicheComplementPanel fiche={{ ...FICHE, nomCommercial: entete, composition }} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = new URL(String(fetchMock.mock.calls[0][0]), 'https://x');
    const requete = url.searchParams.get('requete') ?? '';

    expect(requete.length).toBeLessThanOrEqual(REQUETE_CORPUS_MAX_ECRAN);
    expect(requete.startsWith(entete)).toBe(true);
    // La coupe a bien eu lieu : tout n'a pas tenu.
    const cites = requete.slice(entete.length).replace(/^ · /, '').split(', ').filter(Boolean);
    expect(cites.length).toBeGreaterThan(0);
    expect(cites.length).toBeLessThan(composition.length);
    // Et chaque nom cité est ENTIER — aucun « Vitamine B12 » devenu « B1 ».
    const noms = composition.map((c) => c.ingredientNomFr);
    for (const segment of cites) expect(noms).toContain(segment);
  });

  it('annonce les ingrédients qu’elle n’a pas interrogés', () => {
    render(<FicheComplementPanel fiche={{ ...FICHE, composition: compositionLongue(12) }} />);
    expect(
      screen.getAllByText((_, el) =>
        /les 4 suivants n['’]entrent pas dans la recherche/i.test(el?.textContent ?? ''),
      ).length,
    ).toBeGreaterThan(0);
  });
});
