// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FichePatientPanel } from './FichePatientPanel';
import { estOngletFiche } from '@/lib/praticien/ongletsFiche';
import { C5FeatureProvider } from './patient-cockpit/C5FeatureProvider';
import type { DecisionCard } from '@/lib/clinical-engine/types';

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

// DecisionCard complète et actionnable (mêmes conventions que ProtocolMiniBuilder.test).
function decisionCard(surcharges: Partial<DecisionCard> = {}): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{ candidateId: 'p1', origin: 'engine', label: 'Priorité', rank: 1, confidence: 'à_documenter', ruleId: 'R', rationale: 'Fixture.', provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [] }],
    proposedMainPriorityId: 'p1', selectedMainPriority: { candidateId: 'p1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Fixture.' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['R'], limitations: [] }, limitations: [], inputHash: 'hash',
    ...surcharges,
  };
}

type Options = {
  runtime?: 'ready' | 'proposal' | 'unauthenticated' | 'unavailable';
  assignationsModif?: boolean;
  // Comportement de `GET /api/praticien/patients` :
  // - `erreur` : charge d'indisponibilité (session expirée) ;
  // - `tronque` : le serveur a honoré les filtres mais compte plus de lignes
  //   en base qu'il n'en rend ;
  // - `filtresIgnores` : serveur antérieur aux paramètres — il rend la ligne
  //   d'un AUTRE dossier et n'écho aucun filtre.
  patients?: 'defaut' | 'erreur' | 'tronque' | 'filtresIgnores';
  trajectoire?: 'ok' | '401' | 'cycleT0Seul' | 'cycleJ21Mesure' | 'enVol';
  // `GET /api/praticien/orientation` (LOT-06). `actif` sert la seule branche
  // où un bouton d'assignation peut exister — donc la seule où le garde
  // d'identité du destinataire est observable.
  orientation?: 'inactif' | 'actif';
  // « bloquee » = abstention clinique non levée : aucun protocole proposable.
  decision?: 'actionnable' | 'bloquee';
  reponses?:
    | 'defaut'
    | 'dimensions'
    | 'dimensions-degradees'
    | 'non-interpretable'
    | 'subscores-detail'
    | 'certification';
};

// Passation dont le résultat enregistré n'est pas une mesure (réservoir
// `Q_SOM_07`). Telle que la route la sert DÉSORMAIS : score, interprétation et
// bornes déjà retirés côté serveur, motif joint. Sans les deux tests plus bas,
// supprimer l'explication et le badge laissait la suite entièrement verte —
// mesuré en revue le 2026-07-27 — et la ligne redevenait « — / — /
// Historique », indiscernable d'un vieux questionnaire sans score.
const MOTIF_TEST = 'Motif de test : l’instrument servi ne correspond pas à sa source publiée.';
const REPONSES_NON_INTERPRETABLE = {
  reponses: [
    {
      idReponse: 'REP_SOM07',
      idAssignation: 'ASG001',
      idQuestionnaire: 'Q_SOM_07',
      titre: 'MFI-20 — Échelle multidimensionnelle de fatigue',
      dateSoumission: '2026-07-21T10:00:00.000Z',
      scorePrincipal: null,
      interpretation: '',
      scoresParsed: { rawAnswers: { M1: 2 } },
      subScoreRanges: null,
      nonInterpretable: MOTIF_TEST,
    },
  ],
};

// Colonne « Qualité » — les trois libellés de vérification de scoring que la
// fiche peut rendre (D-036, LOT-02). La fixture par défaut porte
// `scoresParsed: null`, donc « Historique » : sans ces trois lignes, le
// renommage de « Certifié Drive » en « Scoring vérifié (Drive) » n'était asséré
// par AUCUN rendu — seulement par le mapper, qui ne prouve pas que l'écran
// l'emploie.
const REPONSES_CERTIFICATION = {
  reponses: [
    {
      idReponse: 'REP_CERT_DRIVE',
      idAssignation: 'ASG001',
      idQuestionnaire: 'Q_SOM_01',
      titre: 'Instrument scoré sur grille Drive',
      dateSoumission: '2026-07-03T10:00:00.000Z',
      scorePrincipal: 9,
      interpretation: 'Vigilance modérée',
      scoresParsed: { type: 'sum', total: 9, certification: { source: 'drive', status: 'certifie' } },
      subScoreRanges: null,
    },
    {
      idReponse: 'REP_CERT_EORTC',
      idAssignation: 'ASG001',
      idQuestionnaire: 'Q_ONC_01',
      titre: 'Instrument scoré sur le manuel officiel',
      dateSoumission: '2026-07-04T10:00:00.000Z',
      scorePrincipal: 70,
      interpretation: 'Fonctionnement conservé',
      scoresParsed: {
        type: 'subscore',
        total: 70,
        certification: { source: 'manuel_eortc', status: 'certifie' },
      },
      subScoreRanges: null,
    },
    {
      idReponse: 'REP_CERT_INCONNU',
      idAssignation: 'ASG001',
      idQuestionnaire: 'Q_TEST_C',
      titre: 'Instrument dont la règle scorée n’est pas vérifiée',
      dateSoumission: '2026-07-05T10:00:00.000Z',
      scorePrincipal: 4,
      interpretation: 'Sans particularité',
      // `historique` est un membre DÉCLARÉ de `CertificationSource`
      // (`lib/scoring/types.ts:5`) qu'aucun moteur n'écrit — la vraie forme
      // d'une passation ancienne est l'absence de clé `certification`, qui rend
      // « Historique » et non ce badge. Une première rédaction employait
      // `source: 'cabinet'`, qui n'appartient même pas à l'union : le contrôle
      // négatif prouvait alors le défaut sur une entrée impossible.
      scoresParsed: { type: 'sum', total: 4, certification: { source: 'historique' } },
      subScoreRanges: null,
    },
  ],
};

// Réponse portant un découpage DESCRIPTIF (scoring `sum` + `dimensions`) : le
// total et son interprétation restent la mesure, les dimensions la détaillent.
// Calquée sur le MMSE (Q_GEO_04), premier instrument à en déclarer.
const REPONSES_A_DIMENSIONS = {
  reponses: [
    {
      idReponse: 'REP002',
      idAssignation: 'ASG001',
      idQuestionnaire: 'Q_GEO_04',
      titre: 'MMSE GRECO',
      dateSoumission: '2026-07-02T10:00:00.000Z',
      scorePrincipal: 18,
      interpretation: 'Démence modérée',
      scoresParsed: {
        type: 'sum',
        total: 18,
        maxTotal: 30,
        interpretation: { label: 'Démence modérée', color: 'warning' },
        dimensions: [
          { id: 'ORI', label: 'Orientation', total: 6, max: 10, interpretation: null },
          { id: 'RAP', label: 'Rappel', total: 0, max: 3, interpretation: null },
        ],
      },
      subScoreRanges: null,
    },
  ],
};

// Deux formes qu'AUCUN instrument n'émet aujourd'hui — vérifié sur les 64 —
// mais que rien n'interdit à un futur moteur : des dimensions accompagnées de
// sous-scores, et des dimensions sans score principal. Avant correction, la
// cellule perdait le profil dans les deux cas, silencieusement. C'est la même
// classe de défaut que celle qui a effacé le total du MMSE, déplacée d'un cran.
const REPONSES_A_DIMENSIONS_DEGRADEES = {
  reponses: [
    {
      idReponse: 'REP003',
      idAssignation: 'ASG001',
      idQuestionnaire: 'Q_TEST_A',
      titre: 'Instrument à sous-scores ET dimensions',
      dateSoumission: '2026-07-03T10:00:00.000Z',
      scorePrincipal: 12,
      interpretation: 'Modéré',
      scoresParsed: {
        type: 'subscore',
        total: 12,
        subScores: [{ id: 'S1', label: 'Sous-échelle', total: 12, max: 20, interpretation: { label: 'Modéré', color: 'warning' } }],
        dimensions: [{ id: 'DIM_A', label: 'Dimension A', total: 5, max: 8, interpretation: null }],
      },
      subScoreRanges: null,
    },
    {
      idReponse: 'REP004',
      idAssignation: 'ASG001',
      idQuestionnaire: 'Q_TEST_B',
      titre: 'Instrument à dimensions sans total',
      dateSoumission: '2026-07-04T10:00:00.000Z',
      scorePrincipal: null,
      interpretation: null,
      scoresParsed: {
        type: 'sum',
        total: null,
        dimensions: [{ id: 'DIM_B', label: 'Dimension B', total: 3, max: 4, interpretation: null }],
      },
      subScoreRanges: null,
    },
  ],
};

const REPONSES_A_SUBSCORES_AVEC_DETAIL = {
  reponses: [
    {
      idReponse: 'REP005',
      idAssignation: 'ASG001',
      idQuestionnaire: 'Q_TEST_C',
      titre: 'Instrument à sous-scores avec détail global',
      dateSoumission: '2026-07-05T10:00:00.000Z',
      scorePrincipal: 14,
      interpretation: 'Perturbation modérée',
      scoresParsed: {
        type: 'subscore',
        interpretation: { label: 'Perturbation modérée', color: 'warning' },
        subScores: [
          { id: 'S1', label: 'Axe 1', total: 8, max: 10, interpretation: { label: 'Perturbation modérée', color: 'warning' } },
          { id: 'S2', label: 'Axe 2', total: 6, max: 10, interpretation: { label: 'Perturbation légère', color: 'warning' } },
        ],
      },
      subScoreRanges: null,
    },
    {
      idReponse: 'REP006',
      idAssignation: 'ASG001',
      idQuestionnaire: 'Q_TEST_D',
      titre: 'Instrument à sous-scores avec rubriques à noter',
      dateSoumission: '2026-07-06T10:00:00.000Z',
      scorePrincipal: 16,
      interpretation: 'Perturbation modérée',
      scoresParsed: {
        type: 'subscore',
        interpretation: { label: 'Perturbation modérée', color: 'warning' },
        subScores: [
          { id: 'S1', label: 'Axe alpha', total: 9, max: 10, interpretation: { label: 'Perturbation majeure', color: 'danger' } },
          { id: 'S2', label: 'Axe beta', total: 7, max: 10, interpretation: { label: 'Perturbation légère', color: 'warning' } },
        ],
      },
      subScoreRanges: null,
    },
  ],
};

// Cycle de trajectoire : T0 toujours mesuré (l'ancre), J21 selon le scénario.
// Un T0 confirmé seul ne constitue PAS une réévaluation (A8-2).
function cycleTrajectoire(j21Mesure: boolean) {
  return {
    cycleId: 'ep_T0',
    dateT0: '2026-06-01T00:00:00.000Z',
    versionScore: 'v1',
    jalons: [
      { jalon: 'T0', mesure: true, valeur: 40, date: '2026-06-01T00:00:00.000Z' },
      { jalon: 'J21', mesure: j21Mesure, valeur: j21Mesure ? 55 : null, date: j21Mesure ? '2026-06-22T00:00:00.000Z' : null },
      { jalon: 'J42', mesure: false, valeur: null, date: null },
      { jalon: 'J90', mesure: false, valeur: null, date: null },
    ],
    momentum: null,
  };
}

// Demande de correction du patient fictif Sophie Nicola. `idPatient` est la clé
// sur laquelle la fiche restreint désormais — côté serveur, et en défense côté
// client : sans lui, la ligne d'un autre dossier passerait.
const ASSIGNATION_MODIF = {
  idAssignation: 'ASG001',
  idPatient: 'PAT001',
  emailPatient: 'sophie.nicola@example.test',
  statutReponses: 'modification_demandee',
  titre: 'Questionnaire sommeil',
  idQuestionnaire: 'NEU_03',
  correctionCommentaire: 'Je me suis trompée sur une question.',
};

function stubFetch(options: Options = {}) {
  const runtime = options.runtime ?? 'unavailable';
  const assignationsModif = options.assignationsModif ?? false;
  const trajectoire = options.trajectoire ?? 'ok';
  const carte =
    options.decision === 'bloquee'
      ? decisionCard({ abstention: { status: 'required', ruleIds: ['R'], limitations: [] } })
      : decisionCard();

  const fetchMock = vi.fn((input: unknown) => {
    const url = String(input);
    const ok = (payload: unknown, status = 200) =>
      Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(payload) });

    if (url.includes('/api/praticien/equilibre')) return ok(EQUILIBRE);
    if (url.includes('/api/praticien/besoins')) {
      return ok({
        patient: EQUILIBRE.patient,
        besoins: EQUILIBRE.priorites.map(p => ({ ...p, id: p.besoin, sources: [] })),
      });
    }
    if (url.includes('/api/praticien/reponses')) {
      if (options.reponses === 'dimensions') return ok(REPONSES_A_DIMENSIONS);
      if (options.reponses === 'dimensions-degradees') return ok(REPONSES_A_DIMENSIONS_DEGRADEES);
      if (options.reponses === 'non-interpretable') return ok(REPONSES_NON_INTERPRETABLE);
      if (options.reponses === 'subscores-detail') return ok(REPONSES_A_SUBSCORES_AVEC_DETAIL);
      if (options.reponses === 'certification') return ok(REPONSES_CERTIFICATION);
      return ok(REPONSES);
    }
    if (url.includes('/api/praticien/patients')) {
      const scenario = options.patients ?? 'defaut';
      if (scenario === 'erreur') {
        return ok({ patients: [], assignations: [], unavailable: true, reason: 'unauthenticated' }, 401);
      }
      // Serveur antérieur aux paramètres : il rend la ligne d'un AUTRE dossier
      // et n'écho aucun filtre. Rien de tout cela ne doit atteindre l'écran.
      if (scenario === 'filtresIgnores') {
        return ok({ assignations: [{ ...ASSIGNATION_MODIF, idPatient: 'PAT999' }] });
      }
      const assignations = assignationsModif ? [ASSIGNATION_MODIF] : [];
      return ok({
        assignations,
        assignationsMeta: {
          // `total` > lignes rendues = plafond atteint, d'autres demandes
          // existent en base pour ce dossier.
          total: scenario === 'tronque' ? assignations.length + 3 : assignations.length,
          plafond: 40,
          statut: null,
          statutReponses: 'modification_demandee',
          idPatient: 'PAT001',
        },
      });
    }
    if (url.includes('/api/praticien/trajectoire')) {
      // Requête volontairement laissée EN VOL : simule la fenêtre transitoire
      // pendant laquelle la lecture n'a pas encore abouti.
      if (trajectoire === 'enVol') return new Promise(() => {});
      if (trajectoire === '401') {
        return ok({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' }, 401);
      }
      const cycles =
        trajectoire === 'cycleT0Seul'
          ? [cycleTrajectoire(false)]
          : trajectoire === 'cycleJ21Mesure'
            ? [cycleTrajectoire(true)]
            : [];
      // Index navigable RÉALISTE : un repère daté par jalon effectivement
      // mesuré (T0 toujours, J21 selon le scénario), à l'image de
      // `construireTrajectoire` qui projette les repères confirmés — jamais
      // un `[]` en dur alors que des cycles existent.
      const index = cycles.flatMap(cycle =>
        cycle.jalons
          .filter(jalon => jalon.mesure && jalon.date)
          .map(jalon => ({ milestone: jalon.jalon, date: jalon.date })),
      );
      return ok({
        ok: true,
        trajectoire: {
          index,
          cycles,
          comparaison: { disponible: false, raison: cycles.length > 0 ? 'un_seul_cycle' : 'aucun_cycle' },
        },
      });
    }
    // Runtime clinique C1.
    if (url.includes('/api/praticien/cockpit')) {
      if (runtime === 'ready') return ok({ status: 'ready', snapshot: {}, review: { missingData: null, discordances: null }, decisionCard: carte });
      if (runtime === 'proposal') return ok({ status: 'proposal_required', proposal: { assessmentEpisodeId: 'ep1', milestone: 'T0', inWindowResponseIds: [], candidateResponses: [] }, proposalHash: 'h' });
      if (runtime === 'unauthenticated') return ok({ status: 'unavailable', reason: 'unauthenticated', error: 'Authentification requise.' }, 401);
      return ok({ status: 'unavailable', reason: 'exception', error: 'Indisponible.' });
    }
    if (url.includes('/api/praticien/orientation')) {
      if ((options.orientation ?? 'inactif') === 'inactif') {
        return ok({ ok: true, actif: false, version: 'v1', message: 'Orientation en cours de constitution.' });
      }
      return ok({
        ok: true,
        actif: true,
        version: 'v1',
        sha256: 'sha-test',
        recommandations: [
          {
            cible: { type: 'questionnaire', questionnaireId: 'Q_SOM_01' },
            idPackBase: null,
            priorite: 1,
            niveau: 'approfondissement',
            objectifs: [],
            needIds: [],
            dejaAssigne: false,
            dejaRepondu: false,
            motifs: [{ regleId: 'R-SOM-01', conditions: ['PSQI élevé'], claims: [] }],
          },
        ],
      });
    }
    if (url.includes('/api/praticien/protocoles/versions')) return ok({ ok: true, active: null, history: [] });
    if (url.includes('/api/praticien/protocoles/diffusion')) return ok({ ok: true, approval: null, stale: false });
    if (url.includes('/api/praticien/protocoles/checkins')) return ok({ ok: true, resume: null });
    if (url.includes('/api/praticien/correspondance-medecin')) {
      return ok({ ok: true, correspondances: [], accepteConsignation: true, partageMedecinTraitant: null });
    }
    // Objectif négocié (Alliance 6.0-A LOT-02) — dossier vierge : aucun
    // objectif posé, aucune consultation validée. C'est l'état de tous les
    // dossiers à l'arrivée du lot.
    if (url.includes('/api/praticien/objectifs')) {
      return ok({
        ok: true,
        objectifs: [],
        trajectoires: [],
        ancrage: {
          consultationValidee: false,
          motifPrincipal: null,
          objectifPrioritaire: null,
          attentes: [],
        },
        ratifications: {},
      });
    }
    return ok({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function rendreFiche(options: Options = {}) {
  const fetchMock = stubFetch(options);
  render(
    <C5FeatureProvider enabled={false}>
      <FichePatientPanel idPatient="PAT001" />
    </C5FeatureProvider>,
  );
  await waitFor(() => expect(screen.getAllByText('Sophie Nicola').length).toBeGreaterThan(0));
  return fetchMock;
}

/** URLs demandées à `GET /api/praticien/patients`, dans l'ordre d'appel. */
function urlsPatients(fetchMock: ReturnType<typeof stubFetch>): string[] {
  return fetchMock.mock.calls
    .map(appel => String(appel[0]))
    .filter(url => url.includes('/api/praticien/patients'));
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
    // Statut jamais porté par la seule couleur : un libellé texte accompagne
    // l'icône. Runtime indisponible ici → l'état réel n'est pas établi, donc
    // « indéterminée » (jamais une affirmation par défaut « à ouvrir »).
    expect(decision.textContent).toContain('indéterminée');
    expect(decision.textContent).not.toContain('à ouvrir');
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

  // Alliance 6.0-A LOT-02 — banc de RENDU, pas de lecture : le panneau des
  // objectifs vit hors du runtime clinique, donc il doit rester visible SANS
  // épisode confirmé (`runtime: 'unavailable'`, le défaut de ce harnais). La
  // lecture du code ne le prouve pas — le montage, si.
  it('la phase « Compréhension » porte l’objectif négocié, même sans épisode confirmé', async () => {
    await rendreFiche();

    fireEvent.click(screen.getByRole('tab', { name: /Compréhension/i }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Compréhension/i }).getAttribute('aria-selected')).toBe('true'),
    );

    // L'ajout est ADDITIF : les cercles concentriques restent en place.
    expect(screen.getByRole('img', { name: /Cercles concentriques des 12 besoins/i })).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Objectif négocié' })).toBeTruthy());
    expect(screen.getByText(/Aucun objectif négocié pour ce dossier/)).toBeTruthy();
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

  it('poste de pilotage : propose les outils de synthèse IA avec le patient présélectionné', async () => {
    await rendreFiche();

    fireEvent.click(screen.getByRole('button', { name: /Synthèse IA & booklet/i }));
    const lien = await screen.findByRole('link', { name: /Ouvrir la synthèse IA/i });
    expect(lien.getAttribute('href')).toBe('/dashboard/synthese?idPatient=PAT001');
  });

  it('onglets in-fiche : navigation clavier (flèches) et bascule vers la trajectoire', async () => {
    await rendreFiche();

    const onglets = screen.getByRole('tablist', { name: 'Vues de la fiche patient' });
    const cockpitTab = within(onglets).getByRole('tab', { name: 'Poste de pilotage' });
    expect(cockpitTab.getAttribute('aria-selected')).toBe('true');

    // B1 : les flèches doivent déplacer la sélection (tabindex roving).
    fireEvent.keyDown(cockpitTab, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(within(onglets).getByRole('tab', { name: 'Les 12 besoins' }).getAttribute('aria-selected')).toBe('true'),
    );

    fireEvent.click(within(onglets).getByRole('tab', { name: 'Trajectoire' }));
    await waitFor(() => expect(screen.getByText(/Fiche-trajectoire/i)).toBeTruthy());
    // Le poste de pilotage est masqué, jamais démonté d'un scroll de page.
    expect(document.getElementById('panneau-cockpit')?.hasAttribute('hidden')).toBe(true);
  });

  it('onglets in-fiche : « Correspondance » existe et monte le fil médecin (C3 LOT-06)', async () => {
    await rendreFiche();

    const onglets = screen.getByRole('tablist', { name: 'Vues de la fiche patient' });
    fireEvent.click(within(onglets).getByRole('tab', { name: 'Correspondance' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Correspondance avec le médecin traitant' })).toBeTruthy(),
    );
  });

  it('onglets in-fiche : le focus suit la sélection, Origine/Fin et le bouclage (B1)', async () => {
    await rendreFiche();

    const onglets = screen.getByRole('tablist', { name: 'Vues de la fiche patient' });
    const cockpit = within(onglets).getByRole('tab', { name: 'Poste de pilotage' });
    const besoins = within(onglets).getByRole('tab', { name: 'Les 12 besoins' });
    // Le DERNIER onglet, quel que soit son nom — c'est la sémantique de Fin et
    // du bouclage que ce test vérifie, pas la composition de la liste.
    const tousLesOnglets = within(onglets).getAllByRole('tab');
    const dernier = tousLesOnglets[tousLesOnglets.length - 1];

    // Seul l'onglet actif est dans l'ordre de tabulation (tabindex roving).
    cockpit.focus();
    expect(document.activeElement).toBe(cockpit);
    expect(cockpit.getAttribute('tabindex')).toBe('0');
    expect(besoins.getAttribute('tabindex')).toBe('-1');

    // Flèche droite : la sélection ET le focus avancent d'un cran.
    fireEvent.keyDown(cockpit, { key: 'ArrowRight' });
    await waitFor(() => expect(document.activeElement).toBe(besoins));
    expect(besoins.getAttribute('aria-selected')).toBe('true');
    expect(besoins.getAttribute('tabindex')).toBe('0');
    expect(cockpit.getAttribute('tabindex')).toBe('-1');

    // Fin → dernier onglet ; Origine → premier onglet.
    fireEvent.keyDown(besoins, { key: 'End' });
    await waitFor(() => expect(document.activeElement).toBe(dernier));
    expect(dernier.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(dernier, { key: 'Home' });
    await waitFor(() => expect(document.activeElement).toBe(cockpit));
    expect(cockpit.getAttribute('aria-selected')).toBe('true');

    // Bouclage : flèche gauche depuis le premier → dernier onglet.
    fireEvent.keyDown(cockpit, { key: 'ArrowLeft' });
    await waitFor(() => expect(document.activeElement).toBe(dernier));
    expect(dernier.getAttribute('aria-selected')).toBe('true');

    // Bouclage : flèche droite depuis le dernier → premier onglet.
    fireEvent.keyDown(dernier, { key: 'ArrowRight' });
    await waitFor(() => expect(document.activeElement).toBe(cockpit));
    expect(cockpit.getAttribute('aria-selected')).toBe('true');
  });

  it('préserve le brouillon de protocole en changeant de phase (hidden, pas démontage)', async () => {
    await rendreFiche({ runtime: 'ready' });

    // Passe en phase Actions et saisit une raison d'être.
    fireEvent.click(screen.getByRole('tab', { name: /Actions/i }));
    const raison = await screen.findByLabelText('Raison d’être');
    fireEvent.change(raison, { target: { value: 'Soutenir le sommeil' } });
    expect((raison as HTMLTextAreaElement).value).toBe('Soutenir le sommeil');

    // Détour par Suivi puis retour : le champ conserve sa valeur.
    fireEvent.click(screen.getByRole('tab', { name: /Suivi/i }));
    fireEvent.click(screen.getByRole('tab', { name: /Actions/i }));
    expect((screen.getByLabelText('Raison d’être') as HTMLTextAreaElement).value).toBe('Soutenir le sommeil');
  });

  it('demande de correction : la fiche s’ouvre sur la phase Patient (D5) et le signal reste visible (B2)', async () => {
    await rendreFiche({ assignationsModif: true });

    // Règle D5 (SP-CONV LOT-02) : une correction en attente est la première
    // action exigible — la fiche atterrit dessus au lieu de l'ignorer. C'était
    // le reproche central de l'audit du 2026-07-22.
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Patient/i }).getAttribute('aria-selected')).toBe('true'),
    );
    // Le signal B2 reste hissé au niveau fiche, visible quelle que soit la vue.
    await waitFor(() => expect(screen.getByText(/1 demande de correction en attente/i)).toBeTruthy());
    // Et le rail signale la phase Patient « en attente », pas « renseignée ».
    expect(screen.getByRole('tab', { name: /Patient/i }).textContent).toContain('en attente');
  });

  it('affiche un état vide explicite en Suivi et Réévaluation sans épisode confirmé (M3)', async () => {
    await rendreFiche({ runtime: 'proposal' });

    fireEvent.click(screen.getByRole('tab', { name: /Suivi/i }));
    await waitFor(() => expect(screen.getByText(/doit d’abord être ouverte pour suivre/i)).toBeTruthy());

    fireEvent.click(screen.getByRole('tab', { name: /Réévaluation/i }));
    await waitFor(() => expect(screen.getByText(/se construit après confirmation d’un épisode/i)).toBeTruthy());
    // Formulation STRUCTURELLE : l'absence de cycle est rattachée à l'absence
    // d'épisode, jamais présentée comme un « résultat de lecture » (la
    // trajectoire n'est pas lue tant qu'aucun épisode n'est confirmé).
    expect(screen.getByText(/pas encore de cycle daté à afficher/i)).toBeTruthy();
    expect(screen.queryByText(/n’est disponible pour l’instant/i)).toBeNull();
  });

  it('affiche l’erreur de session runtime même hors phase Décision (M1)', async () => {
    await rendreFiche({ runtime: 'unauthenticated' });

    fireEvent.click(screen.getByRole('tab', { name: /Actions/i }));
    await waitFor(() => expect(screen.getByText(/Votre session a expiré/i)).toBeTruthy());
  });

  it('n’affiche pas « aucun épisode » quand la trajectoire échoue (M2)', async () => {
    await rendreFiche({ trajectoire: '401' });

    fireEvent.click(screen.getByRole('tab', { name: 'Trajectoire' }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/session a expiré/i)).toBeTruthy();
    expect(screen.queryByText(/Aucun épisode confirmé/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
  });

  it('phase Réévaluation : un échec de lecture de la trajectoire n’est pas « aucun épisode » (M2, chemin cockpit)', async () => {
    await rendreFiche({ runtime: 'ready', trajectoire: '401' });

    fireEvent.click(screen.getByRole('tab', { name: /Réévaluation/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByText(/n'a pas pu être lue/i)).toBeTruthy();
    expect(screen.queryByText(/Aucun épisode confirmé/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    // Le rail ne prétend rien : statut « indéterminée », jamais « à ouvrir ».
    expect(screen.getByRole('tab', { name: /Réévaluation/i }).textContent).toContain('indéterminée');
  });

  it('phase Réévaluation : pendant la lecture de la trajectoire, affiche « chargement » et pas « aucun épisode » (chemin cockpit)', async () => {
    await rendreFiche({ runtime: 'ready', trajectoire: 'enVol' });

    fireEvent.click(screen.getByRole('tab', { name: /Réévaluation/i }));
    // Requête en vol : état « chargement » explicite, jamais une affirmation
    // d'absence d'épisode, et le rail reste « indéterminée », pas « à ouvrir ».
    expect(await screen.findByText(/Chargement de la trajectoire/i)).toBeTruthy();
    expect(screen.queryByText(/Aucun épisode confirmé/i)).toBeNull();
    const onglet = screen.getByRole('tab', { name: /Réévaluation/i });
    expect(onglet.textContent).toContain('indéterminée');
    expect(onglet.textContent).not.toContain('à ouvrir');
  });

  it('statut Réévaluation : un T0 confirmé sans jalon mesuré ne vaut pas « renseignée »', async () => {
    await rendreFiche({ runtime: 'ready', trajectoire: 'cycleT0Seul' });

    const onglet = screen.getByRole('tab', { name: /Réévaluation/i });
    await waitFor(() => expect(onglet.textContent).toContain('à ouvrir'));
    expect(onglet.textContent).not.toContain('renseignée');
  });

  it('statut Réévaluation : « renseignée » quand un jalon post-T0 est réellement mesuré', async () => {
    await rendreFiche({ runtime: 'ready', trajectoire: 'cycleJ21Mesure' });

    const onglet = screen.getByRole('tab', { name: /Réévaluation/i });
    await waitFor(() => expect(onglet.textContent).toContain('renseignée'));
  });

  it('Réévaluation sous erreur runtime : aucun état vide affirmé, l’erreur prime (M3)', async () => {
    await rendreFiche({ runtime: 'unauthenticated' });

    fireEvent.click(screen.getByRole('tab', { name: /Réévaluation/i }));
    // L'erreur de session s'affiche (hors filtre de phase, M1) et l'on n'affirme
    // JAMAIS « pas d'épisode » quand l'état réel n'a pas pu être établi.
    await waitFor(() => expect(screen.getByText(/Votre session a expiré/i)).toBeTruthy());
    expect(screen.queryByText(/se construit après confirmation d’un épisode/i)).toBeNull();
    expect(screen.queryByText(/pas encore de cycle daté à afficher/i)).toBeNull();
    // Rail : statut « indéterminée », jamais « à ouvrir ».
    const onglet = screen.getByRole('tab', { name: /Réévaluation/i });
    expect(onglet.textContent).toContain('indéterminée');
    expect(onglet.textContent).not.toContain('à ouvrir');
  });

  it('demande de correction : le signal reste visible depuis un onglet non-cockpit (B2)', async () => {
    await rendreFiche({ assignationsModif: true });

    // Visible sur l'onglet cockpit par défaut…
    await waitFor(() => expect(screen.getByText(/1 demande de correction en attente/i)).toBeTruthy());

    // …et TOUJOURS visible une fois basculé sur « Les 12 besoins » (cockpit masqué).
    fireEvent.click(screen.getByRole('tab', { name: 'Les 12 besoins' }));
    await waitFor(() => expect(document.getElementById('panneau-cockpit')?.hasAttribute('hidden')).toBe(true));
    expect(screen.getByText(/1 demande de correction en attente/i)).toBeTruthy();

    // Le raccourci ramène au cockpit sur la phase Patient.
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la phase Patient' }));
    await waitFor(() => expect(document.getElementById('panneau-cockpit')?.hasAttribute('hidden')).toBe(false));
    expect(screen.getByRole('tab', { name: /Patient/i }).getAttribute('aria-selected')).toBe('true');
  });

  // Le détail du blocage vit dans ProtocolMiniBuilder, phase Actions — or la
  // fiche s'ouvre sur Décision. Sans ce signal, le praticien ne peut pas savoir
  // qu'il est bloqué sans changer d'onglet au hasard.
  it('bloqueurs décisionnels : la fiche s’ouvre sur Actions (D5, bloqueur de sécurité) et le signal reste', async () => {
    await rendreFiche({ runtime: 'ready', decision: 'bloquee' });

    await waitFor(() => expect(screen.getByText(/Protocole bloqué — bloqueurs décisionnels à revoir/i)).toBeTruthy());
    // Règle D5, rang 1 : un bloqueur de sécurité prime sur tout — la fiche
    // atterrit directement sur la phase Actions qui le détaille.
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Actions/i }).getAttribute('aria-selected')).toBe('true'),
    );
    // Déjà sur place : le raccourci du bandeau n'a plus d'objet, le signal reste.
    expect(screen.queryByRole('button', { name: 'Ouvrir la phase Actions' })).toBeNull();
  });

  it('bloqueurs décisionnels : depuis un autre onglet, le raccourci ramène à la phase Actions', async () => {
    await rendreFiche({ runtime: 'ready', decision: 'bloquee' });
    await waitFor(() => expect(screen.getByText(/Protocole bloqué/i)).toBeTruthy());

    // Le praticien part consulter les besoins : le signal reste, avec son
    // raccourci — puis le raccourci s'efface une fois revenu sur Actions.
    fireEvent.click(screen.getByRole('tab', { name: 'Les 12 besoins' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la phase Actions' }));
    expect(screen.getByRole('tab', { name: /Actions/i }).getAttribute('aria-selected')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Ouvrir la phase Actions' })).toBeNull();
    expect(screen.getByText(/Protocole bloqué/i)).toBeTruthy();
  });

  it('bloqueurs décisionnels : aucun signal quand la décision est actionnable', async () => {
    await rendreFiche({ runtime: 'ready', decision: 'actionnable' });

    await waitFor(() => expect(screen.getByRole('tablist', { name: 'Cycle clinique' })).toBeTruthy());
    expect(screen.queryByText(/Protocole bloqué/i)).toBeNull();
  });

  // Même discipline que le rail des phases : tant que le runtime n'a pas
  // abouti, on n'affirme rien — ni « bloqué », ni « pas bloqué ».
  it('bloqueurs décisionnels : rien n’est affirmé quand le runtime est en erreur', async () => {
    await rendreFiche({ runtime: 'unauthenticated' });

    await waitFor(() => expect(screen.getByText(/Votre session a expiré/i)).toBeTruthy());
    expect(screen.queryByText(/Protocole bloqué/i)).toBeNull();
  });
});

describe('FichePatientPanel — deep-link ?onglet= (Fiche-trajectoire 5.0)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('`ongletInitial="trajectoire"` ouvre la fiche directement sur la trajectoire', async () => {
    stubFetch();
    render(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient="PAT001" ongletInitial="trajectoire" />
      </C5FeatureProvider>,
    );
    await waitFor(() => expect(screen.getAllByText('Sophie Nicola').length).toBeGreaterThan(0));

    const onglets = screen.getByRole('tablist', { name: 'Vues de la fiche patient' });
    expect(within(onglets).getByRole('tab', { name: 'Trajectoire' }).getAttribute('aria-selected')).toBe('true');
    // Le cockpit est masqué, le panneau trajectoire est monté.
    expect(document.getElementById('panneau-cockpit')?.hasAttribute('hidden')).toBe(true);
    await waitFor(() => expect(screen.getByText(/Fiche-trajectoire · identité patient durable/)).toBeTruthy());
  });

  it('dimensions descriptives : le total et son interprétation restent affichés, détaillés et non remplacés', async () => {
    await rendreFiche({ reponses: 'dimensions' });
    fireEvent.click(screen.getByRole('button', { name: /Détail des réponses/i }));

    const ligne = (await screen.findByText('MMSE GRECO')).closest('tr')!;
    // Le total /30 et l'interprétation clinique sont la mesure : les dimensions
    // les détaillent, elles ne prennent jamais leur place. C'est exactement ce
    // que la clé `subScores` aurait cassé — six tirets à la place de
    // « Démence modérée », et plus de total nulle part.
    expect(within(ligne).getByText('18')).toBeTruthy();
    expect(within(ligne).getByText('Démence modérée')).toBeTruthy();
    // Sur la cellule entière, et non par match exact : un `queryByText('—')`
    // ne voit pas le tiret quand il est collé à un maximum (`—/10`).
    const celluleScore = ligne.querySelectorAll('td')[2];
    expect(celluleScore.textContent).toContain('18');
    expect(celluleScore.textContent).not.toContain('—');
    // Et le profil est bien lisible : un 18/30 par effondrement du rappel
    // n'oriente pas vers le même bilan qu'un 18/30 par désorientation.
    expect(within(ligne).getByText('Orientation')).toBeTruthy();
    expect(within(ligne).getByText('6/10')).toBeTruthy();
    expect(within(ligne).getByText('Rappel')).toBeTruthy();
    expect(within(ligne).getByText('0/3')).toBeTruthy();
  });

  it('dimensions : le profil survit aux deux formes dégradées — avec sous-scores, et sans score principal', async () => {
    await rendreFiche({ reponses: 'dimensions-degradees' });
    fireEvent.click(screen.getByRole('button', { name: /Détail des réponses/i }));

    // Co-présence avec des sous-scores : les deux découpages s'affichent.
    const ligneMixte = (await screen.findByText('Instrument à sous-scores ET dimensions')).closest('tr')!;
    expect(within(ligneMixte).getByText('Sous-échelle')).toBeTruthy();
    expect(within(ligneMixte).getByText('Dimension A')).toBeTruthy();
    expect(within(ligneMixte).getByText('5/8')).toBeTruthy();

    // Score principal absent : le tiret reste, les dimensions ne disparaissent pas avec lui.
    const ligneSansTotal = screen.getByText('Instrument à dimensions sans total').closest('tr')!;
    expect(within(ligneSansTotal).getByText('Dimension B')).toBeTruthy();
    expect(within(ligneSansTotal).getByText('3/4')).toBeTruthy();
  });

  it('sous-scores : la synthèse n’affiche pas la clause de détail déjà visible en colonnes', async () => {
    await rendreFiche({ reponses: 'subscores-detail' });
    fireEvent.click(screen.getByRole('button', { name: /Détail des réponses/i }));

    const ligneDetail = (await screen.findByText('Instrument à sous-scores avec détail global')).closest('tr')!;
    expect(ligneDetail.textContent).toContain('Synthèse : Perturbation modérée');
    expect(ligneDetail.textContent).not.toContain('Détail —');
    expect(within(ligneDetail).getByText('Axe 1')).toBeTruthy();
    expect(within(ligneDetail).getByText('8/10')).toBeTruthy();

    const ligneRubriques = (await screen.findByText('Instrument à sous-scores avec rubriques à noter')).closest('tr')!;
    expect(ligneRubriques.textContent).toContain('Synthèse : Perturbation modérée');
    expect(ligneRubriques.textContent).not.toContain('Rubriques à noter —');
    expect(within(ligneRubriques).getByText('Axe alpha')).toBeTruthy();
    expect(within(ligneRubriques).getByText('9/10')).toBeTruthy();
  });

  it('passation non interprétable : la ligne DIT pourquoi, au lieu de trois tirets muets', async () => {
    await rendreFiche({ reponses: 'non-interpretable' });
    fireEvent.click(screen.getByRole('button', { name: /Détail des réponses/i }));

    const ligne = (await screen.findByText('MFI-20 — Échelle multidimensionnelle de fatigue')).closest('tr')!;
    expect(ligne.textContent).toContain('Interprétation retirée');
    expect(ligne.textContent).toContain(MOTIF_TEST);
    // Le badge qualité doit porter la décision, PAS retomber sur « Historique »
    // — c'est le libellé que la ligne prendrait si l'on retirait le marquage,
    // et il ferait passer une passation invalide pour une passation ancienne.
    expect(within(ligne).getByText('Non interprétable')).toBeTruthy();
    expect(ligne.textContent).not.toContain('Historique');
  });

  it('contrôle négatif — un instrument courant ne gagne ni motif ni badge', async () => {
    // Sans lui, marquer inconditionnellement ferait passer le test ci-dessus au
    // vert.
    await rendreFiche({ reponses: 'dimensions' });
    fireEvent.click(screen.getByRole('button', { name: /Détail des réponses/i }));

    const ligne = (await screen.findByText('MMSE GRECO')).closest('tr')!;
    expect(ligne.textContent).not.toContain('Interprétation retirée');
    expect(ligne.textContent).not.toContain('Non interprétable');
    expect(within(ligne).getByText('Démence modérée')).toBeTruthy();
  });

  it('colonne Qualité : le badge dit que le SCORING est vérifié, jamais que l’instrument est validé', async () => {
    // D-036 (LOT-02) : « Certifié » se lisait comme une validation
    // psychométrique, que WellNeuro ne revendique pas (D-034). Le mapper est
    // gardé à part (`lib/certificationLibelles.guard.test.ts`) ; ce test-ci
    // prouve que l'ÉCRAN l'emploie — un mapper renommé qu'un composant
    // n'appellerait pas laisserait l'ancien libellé à l'affichage.
    await rendreFiche({ reponses: 'certification' });
    fireEvent.click(screen.getByRole('button', { name: /Détail des réponses/i }));

    const ligneDrive = (await screen.findByText('Instrument scoré sur grille Drive')).closest('tr')!;
    const badgeDrive = within(ligneDrive).getByText('Scoring vérifié (Drive)');
    expect(badgeDrive).toBeTruthy();
    // La COULEUR autant que le mot : un `variant` codé en dur ferait passer
    // « Scoring non vérifié » en vert sur une fiche patient sans que le libellé
    // change. Relevé en revue adversariale.
    expect(badgeDrive.getAttribute('data-variant')).toBe('success');

    // La source de la règle scorée reste nommée : le moteur EORTC suit le manuel
    // officiel, pas la grille Drive. Les deux libellés doivent différer à
    // l'écran, sinon la fiche cesse de dire d'où vient ce qui a été vérifié.
    const ligneEortc = screen.getByText('Instrument scoré sur le manuel officiel').closest('tr')!;
    expect(within(ligneEortc).getByText('Scoring vérifié (manuel EORTC)')).toBeTruthy();

    // Contrôle négatif : une source sans statut vérifié ne doit PAS hériter du
    // badge vert. Ce qu'il attrape, précisément, c'est un mapper dont la branche
    // par défaut aurait basculé côté `success` — les deux assertions ci-dessus
    // ne le verraient pas, puisqu'elles cherchent un texte exact et le
    // trouveraient encore.
    const ligneInconnu = screen
      .getByText('Instrument dont la règle scorée n’est pas vérifiée')
      .closest('tr')!;
    const badgeInconnu = within(ligneInconnu).getByText('Scoring non vérifié');
    expect(badgeInconnu).toBeTruthy();
    expect(badgeInconnu.getAttribute('data-variant')).toBe('neutral');
    expect(ligneInconnu.textContent).not.toContain('Scoring vérifié');
  });

  it('estOngletFiche : garde stricte du deep-link — toute valeur inconnue est refusée', () => {
    for (const valide of ['cockpit', 'besoins', 'alimentation', 'trajectoire', 'correspondance']) {
      expect(estOngletFiche(valide)).toBe(true);
    }
    expect(estOngletFiche('inconnu')).toBe(false);
    expect(estOngletFiche(undefined)).toBe(false);
    expect(estOngletFiche(42)).toBe(false);
  });
});

// Les demandes de correction étaient filtrées EN MÉMOIRE (dossier + statut de
// réponse) après la troncature à 40 de `GET /api/praticien/patients`, sur les
// assignations de tous les patients. Une demande hors des 40 assignations les
// plus récentes du cabinet n'apparaissait nulle part et n'était donc jamais
// débloquée — le questionnaire restait verrouillé côté patient, sans signal.
describe('FichePatientPanel — demandes de correction (filtre serveur)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('les deux filtres partent au serveur, jamais après la troncature', async () => {
    const fetchMock = await rendreFiche({ assignationsModif: true });
    await waitFor(() => expect(screen.getByText(/1 demande de correction en attente/i)).toBeTruthy());

    const urls = urlsPatients(fetchMock);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const params = new URL(url, 'http://test.local').searchParams;
      expect(params.get('idPatient')).toBe('PAT001');
      expect(params.get('statutReponses')).toBe('modification_demandee');
    }
  });

  it('un échec de lecture n’est pas « aucune demande » — il le dit, et le rail n’affirme rien', async () => {
    await rendreFiche({ patients: 'erreur' });

    expect(await screen.findByText(/n’ont pas pu être lues/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Réessayer la lecture des corrections' })).toBeTruthy();
    // Sans cette discipline, le rail afficherait « renseignée » : une affirmation
    // d'absence alors que l'état réel n'a pas pu être établi.
    const patient = screen.getByRole('tab', { name: /Patient/i });
    expect(patient.textContent).toContain('indéterminée');
    expect(patient.textContent).not.toContain('renseignée');
  });

  it('« Réessayer » relance la lecture et lève le bandeau d’échec', async () => {
    const base = stubFetch({ assignationsModif: true });
    let appels = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: unknown) => {
        const url = String(input);
        if (url.includes('/api/praticien/patients')) {
          appels += 1;
          if (appels === 1) return Promise.reject(new Error('coupure réseau'));
        }
        return base(input);
      }),
    );

    render(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient="PAT001" />
      </C5FeatureProvider>,
    );
    expect(await screen.findByText(/n’ont pas pu être lues/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer la lecture des corrections' }));
    await waitFor(() => expect(screen.getByText(/1 demande de correction en attente/i)).toBeTruthy());
    expect(screen.queryByText(/n’ont pas pu être lues/i)).toBeNull();
  });

  it('une réponse tardive concernant l’autre dossier n’écrase pas celui affiché', async () => {
    // La garde de fraîcheur est seule à couvrir ce cas : le second filtrage
    // client se referme sur l'idPatient de SA requête, donc la réponse périmée
    // passe son propre filtre sans difficulté.
    const base = stubFetch();
    let appels = 0;
    let libererPremiere: (() => void) | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown) => {
        const url = String(input);
        if (!url.includes('/api/praticien/patients')) return base(input);
        appels += 1;
        if (appels === 1) await new Promise<void>(resolve => { libererPremiere = resolve; });
        const cible = new URL(url, 'http://test.local').searchParams.get('idPatient');
        const assignations = cible === 'PAT001' ? [ASSIGNATION_MODIF] : [];
        return {
          ok: true,
          status: 200,
          json: async () => ({
            assignations,
            assignationsMeta: {
              total: assignations.length,
              plafond: 40,
              statut: null,
              statutReponses: 'modification_demandee',
              idPatient: cible,
            },
          }),
        };
      }),
    );

    const { rerender } = render(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient="PAT001" />
      </C5FeatureProvider>,
    );
    await waitFor(() => expect(appels).toBe(1));

    // Le praticien ouvre un autre dossier avant que la première lecture aboutisse.
    rerender(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient="PAT002" />
      </C5FeatureProvider>,
    );
    await waitFor(() => expect(appels).toBe(2));
    expect(screen.queryByText(/demande de correction en attente/i)).toBeNull();

    // …puis la réponse du premier dossier arrive. Elle ne doit rien afficher :
    // ce serait la demande de correction d'un patient sur la fiche d'un autre,
    // avec son bouton « Débloquer ».
    await act(async () => {
      libererPremiere!();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByText(/demande de correction en attente/i)).toBeNull();
  });

  it('la troncature est dite au lieu d’être tue', async () => {
    await rendreFiche({ assignationsModif: true, patients: 'tronque' });

    await waitFor(() => expect(screen.getByText(/1 demande de correction en attente/i)).toBeTruthy());
    expect(screen.getByText(/Liste tronquée/i)).toBeTruthy();
  });

  it('contrôle négatif — rien n’est dit d’une troncature quand le compte correspond', async () => {
    // Sans lui, afficher la mention inconditionnellement passerait au vert.
    await rendreFiche({ assignationsModif: true });

    await waitFor(() => expect(screen.getByText(/1 demande de correction en attente/i)).toBeTruthy());
    expect(screen.queryByText(/Liste tronquée/i)).toBeNull();
  });

  it('serveur qui ignore les paramètres : la ligne d’un autre dossier n’atteint pas l’écran', async () => {
    await rendreFiche({ assignationsModif: true, patients: 'filtresIgnores' });

    await waitFor(() => expect(screen.getByRole('tablist', { name: 'Cycle clinique' })).toBeTruthy());
    expect(screen.queryByText(/demande de correction en attente/i)).toBeNull();
    // Et l'on n'affirme rien sur la troncature : les filtres n'ayant pas été
    // honorés, le `total` rendu ne parle pas du même ensemble que la liste.
    expect(screen.queryByText(/Liste tronquée/i)).toBeNull();
  });
});

// Garde d'identité du destinataire (LOT-06, relevé à la relecture de clôture).
//
// Le panneau d'orientation calcule ses recommandations sur `idPatient` ; le seul
// point d'écriture, lui, identifie le patient par son EMAIL. Les deux
// viennent de deux sources, et rien ne vérifiait qu'elles désignent le même
// dossier. Sur une navigation A→B, une réponse `equilibre` en retard laisse
// `data` sur A pendant que `idPatient` vaut déjà B : le questionnaire serait
// posé dans la file du patient précédent.
//
// LA GARDE RESTE, ET SON ENJEU A BAISSÉ (2026-08-06, LOT-02). Le geste
// n'envoie plus d'e-mail : il pose un brouillon, rattrapable depuis la
// Bibliothèque. Écrire dans le dossier du mauvais patient reste néanmoins une
// écriture dans le mauvais dossier — la garde ne se relâche pas pour autant.
describe('FichePatientPanel — destinataire de l’ajout à la file depuis l’orientation', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('propose l’ajout à la file quand le dossier chargé EST le patient affiché', async () => {
    stubFetch({ orientation: 'actif' });
    render(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient="PAT001" ongletInitial="trajectoire" />
      </C5FeatureProvider>,
    );

    expect(await screen.findByRole('button', { name: /ajouter à la file d’envoi/i })).toBeTruthy();
  });

  it('retire le bouton quand le dossier chargé n’est PAS le patient affiché', async () => {
    // Le stub rend toujours PAT001 : rendre la fiche de PAT002 simule exactement
    // la fenêtre où `data` porte encore le dossier précédent.
    stubFetch({ orientation: 'actif' });
    render(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient="PAT002" ongletInitial="trajectoire" />
      </C5FeatureProvider>,
    );

    // La recommandation s'affiche — elle est en lecture seule et sans danger.
    await screen.findByRole('region', { name: 'Orientation des explorations' });
    // Le geste sortant, lui, disparaît plutôt que de viser le mauvais patient.
    expect(screen.queryByRole('button', { name: /ajouter à la file d’envoi/i })).toBeNull();
  });
});

// LE RENDU, PAS SEULEMENT L'ATTRIBUT — [[D-106]], `DC-22`, LOT-07.
//
// `natureIndiceGlobal.guard.test.ts` garde que la mention est PASSÉE à la jauge
// du total. Il lit du texte : il ne peut pas savoir si `ObjetGauge` la rend.
// Sans les cas ci-dessous, supprimer le `<span>` qui l'affiche laisserait tout
// au vert — la doctrine serait déclarée dans le code et absente de l'écran.
describe('FichePatientPanel — le total dit sa nature à l’écran', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  /** La grille des objets vit dans un tiroir Radix : son contenu n'existe dans
   *  le DOM qu'une fois le déclencheur ouvert. */
  async function ouvrirTiroirObjets() {
    await rendreFiche();
    fireEvent.click(screen.getByRole('button', { name: /Objets cliniques & momentum/i }));
    await screen.findByText('Indice global');
  }

  it('affiche la mention de nature à côté de l’indice global', async () => {
    await ouvrirTiroirObjets();

    // La valeur de la fixture (62) et sa nature coexistent : c'est tout l'objet
    // de l'arbitrage — le chiffre reste, il ne passe plus pour un score.
    expect(screen.getByText('62')).toBeTruthy();
    expect(screen.getAllByText('Repère de suivi, pas un score clinique').length).toBeGreaterThan(0);
  });

  it('ne rend aucune mention sur un objet non mesuré', async () => {
    await ouvrirTiroirObjets();

    // `stabiliteMetabolique` et `clarte` valent `null` dans la fixture : leur
    // tuile dit « Non mesuré » et n'a aucune nature à démentir.
    const nonMesures = screen.getAllByText('Non mesuré');
    expect(nonMesures.length).toBeGreaterThan(0);
    for (const tuile of nonMesures) {
      expect(tuile.parentElement?.textContent).not.toContain('pas un score clinique');
    }
  });
});
