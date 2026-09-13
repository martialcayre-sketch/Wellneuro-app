// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FichePatientPanel } from './FichePatientPanel';
import { estOngletFiche, estPhaseFiche, type PhaseFiche } from '@/lib/praticien/ongletsFiche';
import { C5FeatureProvider } from './patient-cockpit/C5FeatureProvider';
import type { DecisionCard } from '@/lib/clinical-engine/types';

// La fiche MÉMORISE l'onglet et la phase en localStorage (par patient) : sans
// purge entre les cas, un test qui navigue vers « Trajectoire » ferait
// restaurer cet onglet au cas suivant, avec des fixtures qui ne le
// provisionnent pas — fuite d'état inter-tests, pas un comportement produit.
afterEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    // jsdom sans stockage : rien à purger.
  }
});

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
    priorityCandidates: [{ candidateId: 'p1', origin: 'engine', label: 'Priorité', rank: 1, confidence: 'à_documenter', ruleId: 'R', rationale: 'Fixture.', provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitationsRegleSignee: [], limitations: [] }],
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
  /** Le dossier porte un questionnaire JAMAIS REMPLI dont l'échéance est passée. */
  assignationEchue?: boolean;
  // Les ENVOIS du dossier, pour le compte « rendus sur assignés » de la phase 2.
  // - `defaut` : rideau T0 complet, un envoi hors rideau en attente ;
  // - `rideauIncomplet` : `Q_ALI_01` du rideau jamais rendu — le seul cas qui
  //   empêche de confirmer l'ancre, et celui qui a motivé ce compte ;
  // - `tronque` : la route plafonne, le dossier porte plus de lignes ;
  // - `filtreIgnore` : serveur qui n'écho pas l'absence de filtre.
  envois?: 'defaut' | 'rideauIncomplet' | 'tronque' | 'filtreIgnore' | 'peremption' | 'aucun';
  // Verdict du rideau T0 servi par la checklist du cockpit, branche
  // `proposal_required` seulement. ABSENT par défaut : la route ne le
  // calcule qu'en visant une ancre, et son absence doit rester testable.
  rideau?: 'satisfait' | 'incomplet';
  trajectoire?: 'ok' | '401' | 'cycleT0Seul' | 'cycleJ21Mesure' | 'discordant' | 'enVol';
  // `GET /api/praticien/orientation` (LOT-06). `actif` sert la seule branche
  // où un bouton d'assignation peut exister — donc la seule où le garde
  // d'identité du destinataire est observable.
  orientation?: 'inactif' | 'actif';
  // « bloquee » = abstention clinique non levée : aucun protocole proposable.
  decision?: 'actionnable' | 'bloquee';
  /** L'état de la phase 3 servi par `objectifs/etat-phase` (`D-161` §10). */
  phase3?: 'complete' | 'vide' | 'sans-synthese' | 'erreur' | 'demande-en-attente';
  reponses?:
    | 'defaut'
    /** Aucune passation rendue : la seule branche où « Données fiables » est en attente. */
    | 'aucune'
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
    ancre: 'T0',
    dateAncre: '2026-06-01T00:00:00.000Z',
    versionScore: 'v1',
    jalons: [
      { jalon: 'T0', mesure: true, valeur: 40, date: '2026-06-01T00:00:00.000Z' },
      { jalon: 'J21', mesure: j21Mesure, valeur: j21Mesure ? 55 : null, date: j21Mesure ? '2026-06-22T00:00:00.000Z' : null },
      { jalon: 'J42', mesure: false, valeur: null, date: null },
      { jalon: 'J90', mesure: false, valeur: null, date: null },
    ],
    momentum: null,
    momentumParBesoin: [],
  };
}

// Demande de correction du patient fictif Sophie Nicola. `idPatient` est la clé
// sur laquelle la fiche restreint désormais — côté serveur, et en défense côté
// client : sans lui, la ligne d'un autre dossier passerait.
// Jamais remplie, échéance passée : le portail refuse la saisie, et aucune
// demande de correction n'existe — le patient n'a rien demandé, il a trouvé
// porte close. C'est le cas que l'écran ne voyait pas.
const ASSIGNATION_ECHUE = {
  idAssignation: 'ASG_ECHUE',
  idPatient: 'PAT001',
  emailPatient: 'sophie.nicola@example.test',
  statutReponses: 'non_rempli',
  titre: 'Échelle de Bristol — Type de selles',
  idQuestionnaire: 'Q_GAS_03',
  dateLimite: '2026-08-01',
  correctionCommentaire: null,
};

const ASSIGNATION_MODIF = {
  idAssignation: 'ASG001',
  idPatient: 'PAT001',
  emailPatient: 'sophie.nicola@example.test',
  statutReponses: 'modification_demandee',
  titre: 'Questionnaire sommeil',
  idQuestionnaire: 'NEU_03',
  correctionCommentaire: 'Je me suis trompée sur une question.',
};

/**
 * Un envoi du dossier, tel que `GET /api/praticien/patients` le sert.
 *
 * La DATE est calculée depuis maintenant, et non écrite en dur : le compte de
 * jours affiché par l'écran est relatif, et une date fixe rendrait l'assertion
 * fausse dès le lendemain de l'écriture du banc.
 */
function envoi(
  idQuestionnaire: string,
  statut: 'Complété' | 'En attente' | 'Annulée',
  joursDepuisPose: number,
  titre: string,
  // `aPassation` et `dateLimite` décident du bouton d'annulation et de la
  // péremption : ils sont surchargeables cas par cas, jamais devinés.
  surcharges: { aPassation?: boolean; dateLimite?: string | null } = {},
) {
  return {
    idAssignation: `ASG_${idQuestionnaire}_${statut}`,
    idPatient: 'PAT001',
    emailPatient: 'sophie.nicola@example.test',
    statut,
    statutReponses: statut === 'Complété' ? 'verrouille' : 'non_rempli',
    titre,
    idQuestionnaire,
    dateAssignation: new Date(Date.now() - joursDepuisPose * 86_400_000).toISOString(),
    correctionCommentaire: null,
    // Défauts de l'envoi ORDINAIRE en attente : aucune passation, aucune
    // échéance — c'est ce que porte le second rideau en production, drapeau
    // `WN_ECHEANCE_OBLIGATOIRE` éteint.
    aPassation: false,
    dateLimite: null as string | null,
    nbJourneesAgenda: null as number | null,
    ...surcharges,
  };
}

/** Rideau T0 complet, et un envoi hors rideau qui attend : rien ne bloque l'ancre. */
const ENVOIS_RIDEAU_COMPLET = [
  envoi('Q_MOD_03', 'Complété', 4, 'Mes plaintes actuelles'),
  envoi('Q_MOD_01', 'Complété', 4, 'Questionnaire contextuel de mode de vie SIIN'),
  envoi('Q_INF_03', 'Complété', 4, 'DNST SIIN'),
  envoi('Q_ALI_01', 'Complété', 4, 'Enquête alimentaire SIIN'),
  envoi('Q_SOM_09', 'En attente', 4, 'Agenda du sommeil — 21 nuits'),
];

/** `Q_ALI_01` du rideau jamais rendu : l'ancre T0 est inconfirmable. */
const ENVOIS_RIDEAU_INCOMPLET = [
  envoi('Q_MOD_03', 'Complété', 4, 'Mes plaintes actuelles'),
  envoi('Q_MOD_01', 'Complété', 4, 'Questionnaire contextuel de mode de vie SIIN'),
  envoi('Q_INF_03', 'Complété', 4, 'DNST SIIN'),
  envoi('Q_ALI_01', 'En attente', 4, 'Enquête alimentaire SIIN'),
  envoi('Q_STR_05', 'Annulée', 2, 'BMS-10'),
];

/**
 * Les quatre cas de la péremption, dans un seul dossier.
 *
 * Chaque ligne existe pour prouver un terme du prédicat, et l'écart de jours
 * est choisi de part et d'autre du seuil — 24 et 30 contre 21 : un banc qui
 * n'éprouverait que le franchissement laisserait passer une règle qui signale
 * tout.
 */
const ENVOIS_PEREMPTION = [
  // Sans échéance, 24 jours : périmé. Le cas que la règle existe pour voir.
  envoi('Q_NEU_11', 'En attente', 24, 'HAD — Anxiété et dépression'),
  // Sans échéance, 5 jours : trop tôt.
  envoi('Q_STR_03', 'En attente', 5, 'Questionnaire de stress de Cungi'),
  // AVEC échéance, 30 jours : le Fil du jour en fait déjà une carte de retard
  // et le portail a fermé la saisie. Deux horloges diraient deux nombres.
  envoi('Q_GAS_03', 'En attente', 30, 'Échelle de Bristol', { dateLimite: '2026-08-01' }),
  // Agenda, 30 jours : sa fenêtre EST de 21 jours. Le signaler périmé le
  // marquerait pile à sa clôture normale.
  envoi('Q_SOM_09', 'En attente', 30, 'Agenda du sommeil — 21 nuits'),
  // Une passation existe déjà : l'envoi ne s'annule plus (`estAnnulable`).
  envoi('Q_SOM_02', 'En attente', 24, 'Échelle de somnolence d’Epworth', { aPassation: true }),
];

function stubFetch(options: Options = {}) {
  const runtime = options.runtime ?? 'unavailable';
  const assignationsModif = options.assignationsModif ?? false;
  const assignationEchue = options.assignationEchue ?? false;
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
    // L'ÉTAT DE LA PHASE 3 (`D-161` §10). Par défaut : un objectif actif et une
    // synthèse publiée — la phase est faite. `options.phase3` permet de dire le
    // contraire, et l'ABSENCE de réponse fait rendre « indéterminée » au rail,
    // ce qu'un banc éprouve pour lui-même.
    if (url.includes('/api/praticien/objectifs/etat-phase')) {
      if (options.phase3 === 'erreur') return ok({ ok: false, reason: 'server_error', error: 'x' }, 500);
      if (options.phase3 === 'vide') {
        return ok({ ok: true, etat: { objectifsActifs: 0, synthesePubliee: false, demandesCorrectionEnAttente: 0 } });
      }
      if (options.phase3 === 'sans-synthese') {
        return ok({ ok: true, etat: { objectifsActifs: 1, synthesePubliee: false, demandesCorrectionEnAttente: 0 } });
      }
      // TOUT EST FAIT, SAUF QU'UNE DEMANDE ATTEND : c'est le seul état où les
      // deux premières conditions passent et la troisième non.
      if (options.phase3 === 'demande-en-attente') {
        return ok({ ok: true, etat: { objectifsActifs: 1, synthesePubliee: true, demandesCorrectionEnAttente: 1 } });
      }
      return ok({ ok: true, etat: { objectifsActifs: 1, synthesePubliee: true, demandesCorrectionEnAttente: 0 } });
    }
    if (url.includes('/api/praticien/besoins')) {
      return ok({
        patient: EQUILIBRE.patient,
        besoins: EQUILIBRE.priorites.map(p => ({ ...p, id: p.besoin, sources: [] })),
      });
    }
    if (url.includes('/api/praticien/reponses')) {
      if (options.reponses === 'aucune') return ok({ reponses: [] });
      if (options.reponses === 'dimensions') return ok(REPONSES_A_DIMENSIONS);
      if (options.reponses === 'dimensions-degradees') return ok(REPONSES_A_DIMENSIONS_DEGRADEES);
      if (options.reponses === 'non-interpretable') return ok(REPONSES_NON_INTERPRETABLE);
      if (options.reponses === 'subscores-detail') return ok(REPONSES_A_SUBSCORES_AVEC_DETAIL);
      if (options.reponses === 'certification') return ok(REPONSES_CERTIFICATION);
      return ok(REPONSES);
    }
    // La route d'annulation, sans laquelle une réponse vide se lirait comme un
    // refus — et la relecture qui suit n'aurait jamais lieu.
    if (url.includes('/api/praticien/assignations/annulation')) {
      return ok({ ok: true });
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
      // Deux lectures passent par ce point d'entrée, et elles se distinguent
      // par leurs paramètres — jamais par leur ordre d'arrivée.
      const recherche = new URL(url, 'http://test.local').searchParams;
      if (recherche.get('echeanceDepassee') === '1') {
        const echues = assignationEchue ? [ASSIGNATION_ECHUE] : [];
        return ok({
          assignations: echues,
          assignationsMeta: {
            total: echues.length,
            plafond: 40,
            statut: null,
            statutReponses: 'non_rempli',
            echeanceDepassee: true,
            idPatient: 'PAT001',
          },
        });
      }
      // LA LECTURE DES ENVOIS : la seule des trois qui ne porte AUCUN filtre.
      // C'est cette absence qui l'identifie, jamais son rang d'arrivée.
      if (recherche.get('statutReponses') === null && recherche.get('echeanceDepassee') === null) {
        const scenarioEnvois = options.envois ?? 'defaut';
        const liste = scenarioEnvois === 'rideauIncomplet'
          ? ENVOIS_RIDEAU_INCOMPLET
          : scenarioEnvois === 'peremption'
            ? ENVOIS_PEREMPTION
            : scenarioEnvois === 'aucun'
              ? []
              : ENVOIS_RIDEAU_COMPLET;
        return ok({
          assignations: liste,
          assignationsMeta: {
            total: scenarioEnvois === 'tronque' ? liste.length + 3 : liste.length,
            plafond: 40,
            statut: null,
            // Serveur qui n'écho pas l'absence de filtre : il prétend avoir
            // restreint sur un statut de réponse que personne n'a demandé.
            statutReponses: scenarioEnvois === 'filtreIgnore' ? 'modification_demandee' : null,
            echeanceDepassee: false,
            idPatient: 'PAT001',
          },
        });
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
          : trajectoire === 'cycleJ21Mesure' || trajectoire === 'discordant'
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
          // `DC-30` : la discordance rang↔dates est un SIGNAL servi par la
          // route — le résumé de Réévaluation doit le rendre, pas le trancher.
          discordanceOrdreCycles: trajectoire === 'discordant',
        },
      });
    }
    // Runtime clinique C1.
    if (url.includes('/api/praticien/cockpit')) {
      if (runtime === 'ready') return ok({ status: 'ready', snapshot: {}, review: { missingData: null, discordances: null }, decisionCard: carte });
      if (runtime === 'proposal') {
        const rideau = options.rideau;
        return ok({
          status: 'proposal_required',
          proposal: { assessmentEpisodeId: 'ep1', milestone: 'T0', inWindowResponseIds: [], candidateResponses: [] },
          proposalHash: 'h',
          // La checklist n'est servie que si le scénario la demande : son
          // ABSENCE est un état à part entière, que le statut doit rendre
          // « indéterminée » plutôt que d'affirmer.
          ...(rideau
            ? {
                preconditions: {
                  dures: [
                    {
                      id: 'rideau_t0',
                      libelle: 'Premier rideau renseigné et cotable',
                      satisfaite: rideau === 'satisfait',
                      detail: rideau === 'satisfait' ? null : 'Premier rideau incomplet — non renseigné : Q_ALI_01.',
                    },
                  ],
                  souples: [],
                  bloquant: rideau !== 'satisfait',
                  contournementsRequis: [],
                },
              }
            : {}),
        });
      }
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
    // Déblocage d'une assignation (`PATCH`). Sans cette branche, la réponse
    // par défaut ne porte pas `success` et l'écran ne retire jamais la ligne :
    // le test du geste ne prouverait rien.
    if (url.includes('/api/praticien/assignations')) return ok({ success: true });
    return ok({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function rendreFiche(options: Options & { phaseDemandee?: PhaseFiche } = {}) {
  const fetchMock = stubFetch(options);
  render(
    <C5FeatureProvider enabled={false}>
      <FichePatientPanel idPatient="PAT001" phaseDemandee={options.phaseDemandee} />
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

  it('rend le rail des 7 phases numérotées, ouvert sur la PREMIÈRE étape', async () => {
    await rendreFiche();

    const rail = screen.getByRole('tablist', { name: 'Cycle clinique' });
    expect(rail.getAttribute('aria-orientation')).toBe('vertical');

    const phases = ['Patient', 'Données fiables', 'Compréhension', 'Décision 21 j', 'Actions', 'Suivi', 'Réévaluation'];
    for (const libelle of phases) {
      expect(screen.getByRole('tab', { name: new RegExp(`^\\d\\. ${libelle}`, 'i') })).toBeTruthy();
    }
    // Le rang rend la séquence visible (audit du cockpit 2026-09-02).
    expect(screen.getByRole('tab', { name: /1\. Patient/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /7\. Réévaluation/i })).toBeTruthy();

    // Le cockpit s'ouvre sur la PREMIÈRE étape annoncée, plus jamais au
    // milieu de sa propre séquence (audit 2026-09-02) — ici le runtime est
    // indisponible, donc la règle D5 ne corrige rien : 'patient' reste.
    const patient = screen.getByRole('tab', { name: /1\. Patient/i });
    expect(patient.getAttribute('aria-selected')).toBe('true');

    const decision = screen.getByRole('tab', { name: /Décision 21 j/i });
    expect(decision.getAttribute('aria-selected')).toBe('false');
    // Statut jamais porté par la seule couleur : un libellé texte accompagne
    // l'icône. Runtime indisponible ici → l'état réel n'est pas établi, donc
    // « indéterminée » (jamais une affirmation par défaut « à ouvrir »).
    expect(decision.textContent).toContain('indéterminée');
    expect(decision.textContent).not.toContain('à ouvrir');
  });

  // ── Fil conducteur « Prochaine étape » (audit du cockpit 2026-09-02) ─────

  it('un fil « Prochaine étape » désigne la phase due quand elle n’est pas affichée', async () => {
    // runtime 'proposal' : aucun épisode confirmé → décision exigible (D5).
    // La fiche s'ouvre donc sur Décision ; on navigue ailleurs pour vérifier
    // que le fil apparaît et ramène à la phase due.
    await rendreFiche({ runtime: 'proposal' });

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Décision 21 j/i }).getAttribute('aria-selected')).toBe('true'),
    );
    // Phase due affichée → le fil se tait (le rail la montre déjà).
    expect(screen.queryByText(/Prochaine étape/)).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /Suivi/i }));
    await waitFor(() => expect(screen.getByText(/Prochaine étape : Décision 21 j/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Y aller' }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Décision 21 j/i }).getAttribute('aria-selected')).toBe('true'),
    );
    expect(screen.queryByText(/Prochaine étape/)).toBeNull();
  });

  it('le fil se tait quand le runtime n’est pas établi — jamais une étape inventée', async () => {
    await rendreFiche();
    expect(screen.queryByText(/Prochaine étape/)).toBeNull();
  });

  it('navigue de phase en phase au clic et au clavier, sans quitter la page', async () => {
    await rendreFiche();

    fireEvent.click(screen.getByRole('tab', { name: /^1\. Patient/i }));
    const patient = screen.getByRole('tab', { name: /^1\. Patient/i });
    expect(patient.getAttribute('aria-selected')).toBe('true');
    // La carte d'identité de la phase Patient : e-mail visible ici seulement.
    // La date de dernière réponse vit dans le bandeau permanent, plus ici
    // (dédoublonnage, audit 2026-09-02).
    expect(screen.getAllByText('sophie.nicola@example.test').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Dernière réponse reçue le/i)).toBeNull();

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
  it('LE RAIL NE DIT PLUS « renseignée » SUR UN DOSSIER SANS OBJECTIF (D-161 §10)', async () => {
    // Il ne lisait que les couvertures des douze besoins — un objet du cercle,
    // affiché en tête de phase, qui ne dit RIEN de l'objectif ni de la
    // compréhension. La fixture porte des couvertures ; sans objectif, la phase
    // doit pourtant rester en attente.
    await rendreFiche({ phase3: 'vide' });
    const onglet = screen.getByRole('tab', { name: /Compréhension/i });
    expect(onglet.textContent).not.toMatch(/renseignée/i);
    // Le mot est « à traiter » depuis le 2026-09-10, et non plus « en attente
    // du patient » : ce banc disait `/en attente/` quand la phase était encore
    // rangée du côté patient. Voir le banc d'acteur ci-dessous.
    expect(onglet.textContent).toMatch(/à traiter/i);
  });

  // LE LIBELLÉ NOMME LE PRATICIEN, PAS LE PATIENT — et rien ne l'épinglait
  // jusqu'ici, ce qui est la raison pour laquelle la suite est restée verte
  // quand `D-161` §10 a changé l'acteur sous le mot. La qualification (2026-09-02)
  // rangeait « Compréhension » du côté patient parce que le statut lisait alors
  // les couvertures des douze besoins ; il lit désormais un objectif ACTIF et
  // une synthèse PUBLIÉE, deux actes du praticien. Sur un dossier vierge, dire
  // « en attente du patient » désigne l'acteur opposé.
  it('LE RAIL NE MET JAMAIS L’ATTENTE DE LA PHASE 3 SUR LE DOS DU PATIENT', async () => {
    await rendreFiche({ phase3: 'vide' });
    const onglet = screen.getByRole('tab', { name: /Compréhension/i });
    expect(onglet.textContent).not.toMatch(/en attente du patient/i);
  });

  it('UN OBJECTIF POSÉ SANS SYNTHÈSE N’EST PAS DAVANTAGE UNE ATTENTE DU PATIENT', async () => {
    // La seconde branche d'attente : la ratification n'entre pas dans le
    // statut, donc rien ici ne dépend d'un geste du patient non plus.
    await rendreFiche({ phase3: 'sans-synthese' });
    const onglet = screen.getByRole('tab', { name: /Compréhension/i });
    expect(onglet.textContent).not.toMatch(/en attente du patient/i);
    expect(onglet.textContent).toMatch(/à traiter/i);
  });

  // La contrepartie : « Données fiables » attend BIEN une matière du patient,
  // et la qualification doit y survivre. Sans ce banc, supprimer la fonction
  // entière passerait au vert sur le seul banc ci-dessus.
  it('« Données fiables » garde « en attente du patient » — la qualification n’est pas retirée', async () => {
    // Le critère a changé le 2026-09-13 (rideau T0 complet et cotable, et non
    // plus « au moins une passation ») ; la QUALIFICATION, elle, doit survivre.
    // C'est bien cette phase qui attend une matière du patient.
    await rendreFiche({ runtime: 'proposal', rideau: 'incomplet' });
    const onglet = screen.getByRole('tab', { name: /Données fiables/i });
    expect(onglet.textContent).toMatch(/en attente du patient/i);
  });

  it('UNE SYNTHÈSE MANQUANTE SUFFIT À TENIR LA PHASE EN ATTENTE — elle porte les deux', async () => {
    // Un objectif posé sans qu'on ait dit au patient ce qu'on a compris de lui
    // n'est pas une phase faite : la phase a deux sous-vues, son statut a deux
    // conditions.
    await rendreFiche({ phase3: 'sans-synthese' });
    const onglet = screen.getByRole('tab', { name: /Compréhension/i });
    expect(onglet.textContent).not.toMatch(/renseignée/i);
  });

  it('avec un objectif actif ET une synthèse publiée, la phase est renseignée', async () => {
    await rendreFiche({ phase3: 'complete' });
    const onglet = screen.getByRole('tab', { name: /Compréhension/i });
    expect(onglet.textContent).toMatch(/renseignée/i);
  });

  it('UNE LECTURE EN ÉCHEC REND « indéterminée », jamais un état par défaut', async () => {
    // Même discipline que les phases du runtime : un échec de lecture ne vaut
    // pas « rien en attente », et surtout pas « fait ».
    await rendreFiche({ phase3: 'erreur' });
    const onglet = screen.getByRole('tab', { name: /Compréhension/i });
    expect(onglet.textContent).toMatch(/indéterminée/i);
  });

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

    // SOUS-VUES (audit 2026-09-02) : les deux panneaux sont MONTÉS (leurs GET
    // journalisent une seule fois), un seul est EXPOSÉ à la fois — bascule par
    // `hidden`, jamais par démontage. `getByRole` par défaut ne voit pas un
    // sous-arbre hidden ; `hidden: true` prouve le montage.
    expect(screen.queryByRole('heading', { name: 'Ce que j’ai compris de vous' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Ce que j’ai compris de vous', hidden: true })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ce que j’ai compris' }));
    expect(screen.getByRole('heading', { name: 'Ce que j’ai compris de vous' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Objectif négocié' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Objectif négocié', hidden: true })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Objectif négocié' }));
    expect(screen.getByRole('heading', { name: 'Objectif négocié' })).toBeTruthy();
  });

  it('ouvre puis referme un instrument à tiroir (au clic, jamais au survol)', async () => {
    await rendreFiche();

    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Les 12 besoins/i }));
    const tiroir = await screen.findByRole('dialog');
    expect(tiroir.textContent).toContain('Sommeil réparateur');

    fireEvent.click(screen.getByRole('button', { name: /Fermer Les 12 besoins/i }));
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
      expect(screen.getByRole('tab', { name: /^1\. Patient/i }).getAttribute('aria-selected')).toBe('true'),
    );
    // Le signal B2 reste hissé au niveau fiche, visible quelle que soit la vue.
    await waitFor(() => expect(screen.getByText(/1 demande de correction de questionnaire en attente/i)).toBeTruthy());
    // Et le rail signale la phase Patient « à traiter » — c'est au praticien
    // d'agir (débloquer), jamais « renseignée » ni un « en attente » ambigu
    // qui laisserait croire qu'on attend le patient (audit 2026-09-02).
    expect(screen.getByRole('tab', { name: /^1\. Patient/i }).textContent).toContain('à traiter');
    expect(screen.getByRole('tab', { name: /^1\. Patient/i }).textContent).not.toContain('renseignée');
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

  // ── Le résumé de la phase Réévaluation (audit 2026-09-02, lot 3) ─────────

  it('résumé de Réévaluation : un jalon non mesuré se dit « non mesuré » — jamais zéro, jamais une date', async () => {
    await rendreFiche({ runtime: 'ready', trajectoire: 'cycleT0Seul' });

    fireEvent.click(screen.getByRole('tab', { name: /Réévaluation/i }));
    const resume = await screen.findByRole('region', { name: 'Réévaluation — résumé du cycle' });
    expect(resume.textContent).toContain('Cycle T0');
    expect(resume.textContent).toContain('J21 — non mesuré');
    expect(resume.textContent).toContain('J42 — non mesuré');
    // DC-24 : l'absence n'est ni un zéro ni une valeur — et AUCUNE tendance
    // du momentum n'est restituée ici (le mot n'apparaît que dans le renvoi
    // vers l'onglet ; une surface qui restituerait la tendance devrait se
    // déclarer au garde D-106, elle n'a pas à exister).
    expect(resume.textContent).not.toMatch(/momentum (en )?(hausse|baisse|stable)/i);
    expect(resume.textContent).not.toMatch(/J21 — 0/);
    // Le renvoi vers le détail existe et ramène à l'onglet Trajectoire.
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir l’onglet Trajectoire' }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Trajectoire' }).getAttribute('aria-selected')).toBe('true'),
    );
  });

  it('résumé de Réévaluation : un jalon mesuré porte sa date, la discordance d’ordre se dit (DC-30)', async () => {
    await rendreFiche({ runtime: 'ready', trajectoire: 'discordant' });

    fireEvent.click(screen.getByRole('tab', { name: /Réévaluation/i }));
    const resume = await screen.findByRole('region', { name: 'Réévaluation — résumé du cycle' });
    expect(resume.textContent).toContain('J21 — mesuré le 22/06/2026');
    // Le doute se dit, il ne se tranche pas : la bannière DC-30 est rendue
    // mot pour mot comme dans TrajectoirePanel.
    expect(resume.textContent).toContain('Ordre des cycles à vérifier');
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
    await waitFor(() => expect(screen.getByText(/1 demande de correction de questionnaire en attente/i)).toBeTruthy());

    // …et TOUJOURS visible une fois basculé sur « Les 12 besoins » (cockpit masqué).
    fireEvent.click(screen.getByRole('tab', { name: 'Les 12 besoins' }));
    await waitFor(() => expect(document.getElementById('panneau-cockpit')?.hasAttribute('hidden')).toBe(true));
    expect(screen.getByText(/1 demande de correction de questionnaire en attente/i)).toBeTruthy();

    // Le raccourci ramène au cockpit sur la phase Patient.
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la phase Patient' }));
    await waitFor(() => expect(document.getElementById('panneau-cockpit')?.hasAttribute('hidden')).toBe(false));
    expect(screen.getByRole('tab', { name: /^1\. Patient/i }).getAttribute('aria-selected')).toBe('true');
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
    // Et le retour suit le point d'entrée : entré par la porte trajectoire,
    // on repart vers elle — plus jamais vers la liste héritage (audit
    // 2026-09-02).
    expect(screen.getByRole('link', { name: /Retour aux fiches-trajectoires/ })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Retour aux patients/ })).toBeNull();
  });

  it('l’onglet consulté se mémorise par patient et se restaure sans deep-link', async () => {
    stubFetch();
    const { unmount } = render(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient="PAT001" />
      </C5FeatureProvider>,
    );
    await waitFor(() => expect(screen.getAllByText('Sophie Nicola').length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('tab', { name: 'Correspondance' }));
    unmount();

    render(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient="PAT001" />
      </C5FeatureProvider>,
    );
    await waitFor(() => expect(screen.getAllByText('Sophie Nicola').length).toBeGreaterThan(0));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Correspondance' }).getAttribute('aria-selected')).toBe('true'),
    );
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
    expect(ligneDetail.textContent).toContain('Résumé du score : Perturbation modérée');
    expect(ligneDetail.textContent).not.toContain('Détail —');
    expect(within(ligneDetail).getByText('Axe 1')).toBeTruthy();
    expect(within(ligneDetail).getByText('8/10')).toBeTruthy();

    const ligneRubriques = (await screen.findByText('Instrument à sous-scores avec rubriques à noter')).closest('tr')!;
    expect(ligneRubriques.textContent).toContain('Résumé du score : Perturbation modérée');
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

  it('estPhaseFiche : même garde stricte pour `?phase=`', () => {
    for (const valide of ['patient', 'donnees', 'comprehension', 'decision', 'actions', 'suivi', 'reevaluation']) {
      expect(estPhaseFiche(valide)).toBe(true);
    }
    expect(estPhaseFiche('cockpit')).toBe(false); // un onglet n'est pas une phase
    expect(estPhaseFiche(undefined)).toBe(false);
    expect(estPhaseFiche(42)).toBe(false);
  });
});

// Deep-link `?phase=` — un lien partageable vers une phase précise du rail.
// UNE OUVERTURE DE DOSSIER = UNE LECTURE DE TRAJECTOIRE. Les GET journalisent
// l'accès (`G-TRUST-04`) : deux lectures pour une ouverture inscrivaient deux
// accès au journal du dossier, là où le praticien n'a ouvert qu'une fois.
describe('FichePatientPanel — la trajectoire n’est lue qu’une fois', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each(['proposal', 'ready'] as const)(
    'la fiche lit la trajectoire une fois quand le runtime répond %s',
    async runtime => {
      const fetchMock = await rendreFiche({ runtime });

      if (runtime === 'proposal') {
        await screen.findByRole('heading', { name: 'Confirmation de l’épisode T0' });
      } else {
        // La route versions est appelée par le même effet que les ressources
        // annexes d'une carte `ready`. L'attendre prouve que cet effet a tourné,
        // sans temporisation arbitraire.
        await waitFor(() => expect(fetchMock.mock.calls.some(
          appel => String(appel[0]).includes('/api/praticien/protocoles/versions'),
        )).toBe(true));
      }

      const lectures = fetchMock.mock.calls
        .map(appel => String(appel[0]))
        .filter(url => url.includes('/api/praticien/trajectoire'));
      expect(lectures).toHaveLength(1);
    },
  );
});

describe('FichePatientPanel — phase demandée par lien', () => {
  // `cleanup` est enregistré PAR BLOC dans ce fichier, pas globalement (seul le
  // vidage de `localStorage` l'est) : sans ce rappel, la fiche du cas précédent
  // reste montée et `getByRole('tab')` en trouve deux.
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('la phase demandée PRIME sur la règle D5, qui en aurait choisi une autre', async () => {
    // `runtime: 'proposal'` = aucun épisode confirmé, donc décision exigible :
    // D5 ouvrirait la fiche sur « Décision 21 j ». Le lien demande « Suivi ».
    // Sans priorité, la phase demandée s'afficherait puis serait écrasée une
    // seconde plus tard, à l'établissement de l'état runtime — un lien partagé
    // montrerait alors autre chose que ce qu'il désigne.
    await rendreFiche({ runtime: 'proposal', phaseDemandee: 'suivi' });

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Décision 21 j/i }).getAttribute('aria-selected')).toBe('false'),
    );
    expect(screen.getByRole('tab', { name: /Suivi/i }).getAttribute('aria-selected')).toBe('true');
  });

  it('la phase demandée n’est PAS mémorisée — un lien reçu ne réécrit pas l’habitude', async () => {
    // `choisirPhase` mémorise ; l'arrivée par lien, non. Un lien envoyé par un
    // confrère ouvre une vue, il ne change pas la phase par défaut du
    // destinataire sur ce dossier.
    await rendreFiche({ runtime: 'proposal', phaseDemandee: 'suivi' });
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Suivi/i }).getAttribute('aria-selected')).toBe('true'),
    );

    expect(window.localStorage.getItem('wn.fiche.derniere-phase.PAT001')).toBeNull();
  });

  it('une phase inconnue est ignorée : la règle D5 reprend la main', async () => {
    // La garde serveur ne passe jamais une valeur hors liste ; ce cas vérifie
    // le comportement du composant quand rien ne lui est demandé.
    await rendreFiche({ runtime: 'proposal' });

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Décision 21 j/i }).getAttribute('aria-selected')).toBe('true'),
    );
  });
});

// Les demandes de correction étaient filtrées EN MÉMOIRE (dossier + statut de
// réponse) après la troncature à 40 de `GET /api/praticien/patients`, sur les
// assignations de tous les patients. Une demande hors des 40 assignations les
// plus récentes du cabinet n'apparaissait nulle part et n'était donc jamais
// débloquée — le questionnaire restait verrouillé côté patient, sans signal.
describe('FichePatientPanel — la demande de correction de l’OBJECTIF (2026-09-11)', () => {
  // `cleanup` PAR BLOC, convention de ce fichier : sans ce rappel, la fiche du
  // cas précédent reste montée et `getByRole('tab')` en trouve deux. Oublié à
  // l'écriture, retrouvé par neuf rouges d'un coup.
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const BANDEAU = /demande une correction de son objectif négocié/i;

  it('LE BANDEAU EST LÀ quand une demande attend', async () => {
    await rendreFiche({ phase3: 'demande-en-attente' });
    expect(await screen.findByText(BANDEAU)).toBeTruthy();
  });

  it('IL EST ABSENT quand rien n’attend — un cadre vide se lirait comme un signal', async () => {
    await rendreFiche({ phase3: 'complete' });
    await waitFor(() => expect(screen.getByRole('tab', { name: /^3\. Compréhension/i })).toBeTruthy());
    expect(screen.queryByText(BANDEAU)).toBeNull();
  });

  it('IL RESTE VISIBLE DEPUIS UN AUTRE ONGLET — sinon il n’est qu’un encart de plus', async () => {
    // C'est TOUT le point du bandeau hissé au niveau de la fiche : un praticien
    // qui travaille dans « Les 12 besoins » ne verrait jamais une demande
    // rangée dans la seule phase Compréhension.
    await rendreFiche({ phase3: 'demande-en-attente' });
    expect(await screen.findByText(BANDEAU)).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: /^1\. Patient/i }));
    expect(screen.getByText(BANDEAU)).toBeTruthy();
  });

  it('IL MÈNE À LA PHASE COMPRÉHENSION, pas à la phase Patient', async () => {
    // L'homonyme du dessus — les réponses de questionnaire — mène à la phase
    // Patient et se règle par un DÉBLOCAGE. Confondre les deux enverrait le
    // praticien au mauvais endroit faire le mauvais geste.
    await rendreFiche({ phase3: 'demande-en-attente', phaseDemandee: 'patient' });
    expect(await screen.findByText(BANDEAU)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir la phase Compréhension' }));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /^3\. Compréhension/i }).getAttribute('aria-selected')).toBe('true'),
    );
  });

  it('SON LIBELLÉ EST DISTINCT DE L’HOMONYME — deux bandeaux jumeaux égareraient', async () => {
    await rendreFiche({ phase3: 'demande-en-attente', assignationsModif: true });
    expect(await screen.findByText(BANDEAU)).toBeTruthy();
    // Celui des questionnaires parle de DÉBLOCAGE ; celui-ci n'en parle pas.
    expect(screen.getByText(/en attente de déblocage/i)).toBeTruthy();
    const bandeau = screen.getByText(BANDEAU).textContent ?? '';
    expect(bandeau).not.toMatch(/déblocage/i);
  });

  it('AUCUN NOMBRE : une parole ne se compte pas', async () => {
    await rendreFiche({ phase3: 'demande-en-attente' });
    const bandeau = (await screen.findByText(BANDEAU)).textContent ?? '';
    for (const interdit of ['1 demande', '2 demandes', '(1)']) {
      expect(bandeau).not.toContain(interdit);
    }
  });

  it('LE RAIL NE DIT PLUS « renseignée » tant qu’une demande attend', async () => {
    await rendreFiche({ phase3: 'demande-en-attente' });
    const phase = await screen.findByRole('tab', { name: /^3\. Compréhension/i });
    expect(phase.textContent).not.toMatch(/renseignée/i);
  });

  it('et il la dit de nouveau dès que la demande est refermée', async () => {
    await rendreFiche({ phase3: 'complete' });
    const phase = await screen.findByRole('tab', { name: /^3\. Compréhension/i });
    await waitFor(() => expect(phase.textContent).toMatch(/renseignée/i));
  });

  it('UNE LECTURE EN ÉCHEC NE VAUT PAS « AUCUNE DEMANDE » — elle le dit', async () => {
    // Sans cette branche, l'absence de signal serait indiscernable d'une
    // absence de demande, et un patient attendrait une reformulation que
    // personne ne sait lui devoir.
    await rendreFiche({ phase3: 'erreur' });
    expect(await screen.findByText(/n’a pas pu être lu/i)).toBeTruthy();
    // Et le rail n'affirme rien.
    const phase = screen.getByRole('tab', { name: /^3\. Compréhension/i });
    expect(phase.textContent).toContain('indéterminée');
  });
});

describe('FichePatientPanel — demandes de correction (filtre serveur)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('les deux filtres partent au serveur, jamais après la troncature', async () => {
    const fetchMock = await rendreFiche({ assignationsModif: true });
    await waitFor(() => expect(screen.getByText(/1 demande de correction de questionnaire en attente/i)).toBeTruthy());

    const urls = urlsPatients(fetchMock);
    expect(urls.length).toBeGreaterThan(0);
    // La fiche lit DEUX listes par ce même point d'entrée : les demandes de
    // correction, et les questionnaires jamais remplis dont l'échéance est
    // passée. Les deux sont filtrées au serveur — c'est ce que ce test tient.
    const parStatut = new Map<string, URLSearchParams>();
    for (const url of urls) {
      const params = new URL(url, 'http://test.local').searchParams;
      expect(params.get('idPatient')).toBe('PAT001');
      parStatut.set(params.get('statutReponses') ?? '', params);
    }
    expect(parStatut.has('modification_demandee')).toBe(true);
    const echues = parStatut.get('non_rempli');
    expect(echues).toBeDefined();
    // L'échéance ne se recalcule pas dans l'écran : le filtre part au serveur.
    expect(echues!.get('echeanceDepassee')).toBe('1');
  });

  it('un échec de lecture n’est pas « aucune demande » — il le dit, et le rail n’affirme rien', async () => {
    await rendreFiche({ patients: 'erreur' });

    expect(await screen.findByText(/n’ont pas pu être lues/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Réessayer la lecture des corrections de questionnaire' })).toBeTruthy();
    // Sans cette discipline, le rail afficherait « renseignée » : une affirmation
    // d'absence alors que l'état réel n'a pas pu être établi.
    const patient = screen.getByRole('tab', { name: /^1\. Patient/i });
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

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer la lecture des corrections de questionnaire' }));
    await waitFor(() => expect(screen.getByText(/1 demande de correction de questionnaire en attente/i)).toBeTruthy());
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
        const recherche = new URL(url, 'http://test.local').searchParams;
        // La fiche lit aussi les questionnaires échus par ce point d'entrée.
        // Ce test porte sur la garde de fraîcheur des CORRECTIONS : on ne
        // compte et ne retient que celles-là, sinon le compteur mesurerait les
        // deux lectures et le blocage tomberait sur la mauvaise.
        if (recherche.get('statutReponses') !== 'modification_demandee') return base(input);
        appels += 1;
        if (appels === 1) await new Promise<void>(resolve => { libererPremiere = resolve; });
        const cible = recherche.get('idPatient');
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
    expect(screen.queryByText(/demande de correction de questionnaire en attente/i)).toBeNull();

    // …puis la réponse du premier dossier arrive. Elle ne doit rien afficher :
    // ce serait la demande de correction d'un patient sur la fiche d'un autre,
    // avec son bouton « Débloquer ».
    await act(async () => {
      libererPremiere!();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByText(/demande de correction de questionnaire en attente/i)).toBeNull();
  });

  it('la troncature est dite au lieu d’être tue', async () => {
    await rendreFiche({ assignationsModif: true, patients: 'tronque' });

    await waitFor(() => expect(screen.getByText(/1 demande de correction de questionnaire en attente/i)).toBeTruthy());
    expect(screen.getByText(/Liste tronquée/i)).toBeTruthy();
  });

  it('contrôle négatif — rien n’est dit d’une troncature quand le compte correspond', async () => {
    // Sans lui, afficher la mention inconditionnellement passerait au vert.
    await rendreFiche({ assignationsModif: true });

    await waitFor(() => expect(screen.getByText(/1 demande de correction de questionnaire en attente/i)).toBeTruthy());
    expect(screen.queryByText(/Liste tronquée/i)).toBeNull();
  });

  it('serveur qui ignore les paramètres : la ligne d’un autre dossier n’atteint pas l’écran', async () => {
    await rendreFiche({ assignationsModif: true, patients: 'filtresIgnores' });

    await waitFor(() => expect(screen.getByRole('tablist', { name: 'Cycle clinique' })).toBeTruthy());
    expect(screen.queryByText(/demande de correction de questionnaire en attente/i)).toBeNull();
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

describe('FichePatientPanel — jamais rempli, échéance dépassée', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  /*
   * L'ANGLE MORT QUE CE LOT FERME. Le portail refuse la saisie dès l'échéance
   * passée, et n'en exempte que trois statuts dont `deverrouille`. Le geste de
   * déblocage existait déjà côté API ; l'écran ne l'offrait qu'aux demandes de
   * CORRECTION. Un questionnaire simplement jamais rempli et échu n'entrait
   * dans aucune liste : aucun bouton nulle part, et un patient bloqué sans que
   * rien ne le signale. Constaté en production le 2026-09-12.
   */
  it('le questionnaire échu apparaît, avec sa date et son bouton', async () => {
    await rendreFiche({ assignationEchue: true, phaseDemandee: 'patient' });

    const ligne = await screen.findByText(/Jamais rempli, échéance dépassée/i);
    expect(ligne.textContent).toContain('Échelle de Bristol');
    // La date est ÉCRITE, pas recalculée : c'est le serveur qui a jugé.
    expect(screen.getByText(/À rendre avant le 2026-08-01/i)).toBeTruthy();
    const section = screen.getByRole('region', {
      name: /Questionnaires jamais remplis dont l’échéance est dépassée/i,
    });
    expect(within(section).getByRole('button', { name: 'Débloquer' })).toBeTruthy();
  });

  it('débloquer retire la ligne — le même geste que pour une correction', async () => {
    await rendreFiche({ assignationEchue: true, phaseDemandee: 'patient' });
    const section = await screen.findByRole('region', {
      name: /Questionnaires jamais remplis dont l’échéance est dépassée/i,
    });

    fireEvent.click(within(section).getByRole('button', { name: 'Débloquer' }));
    await waitFor(() =>
      expect(screen.queryByText(/Jamais rempli, échéance dépassée/i)).toBeNull(),
    );
  });

  it('contrôle négatif — rien ne s’affiche quand le dossier n’a aucun échu', async () => {
    // Sans lui, afficher le bloc inconditionnellement passerait au vert.
    await rendreFiche({ phaseDemandee: 'patient' });
    await waitFor(() => expect(screen.getAllByText('Sophie Nicola').length).toBeGreaterThan(0));
    expect(screen.queryByText(/Jamais rempli, échéance dépassée/i)).toBeNull();
  });

  it('un serveur qui n’écho PAS le filtre : on n’affiche rien, et on le dit', async () => {
    // LE cas dangereux. Sans écho, la réponse porte TOUTES les assignations non
    // remplies du dossier, échues ou non — offrir « Débloquer » dessus
    // rouvrirait des questionnaires dont l'échéance court encore. L'écran ne
    // peut pas trancher lui-même : `isDeadlineExpired` lit une date sans
    // fuseau, donc à l'heure du NAVIGATEUR, et le serveur a déjà tranché
    // autrement. On préfère ne rien afficher.
    // `stubFetch` pose LUI-MÊME le global : l'appeler dans le repli le
    // réinstallerait au premier appel non intercepté, et cette surcharge
    // disparaîtrait avant d'avoir servi. On le construit une fois, avant.
    const base = stubFetch();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: unknown) => {
        const url = String(input);
        if (url.includes('/api/praticien/patients') && url.includes('echeanceDepassee=1')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                assignations: [ASSIGNATION_ECHUE],
                // Serveur antérieur au SEUL paramètre d'échéance : il écho
                // bien le dossier et le statut — c'est `echeanceDepassee` qui
                // manque, et lui seul. Un stub qui n'échoerait RIEN laisserait
                // passer une régression sur cette vérification-là : les autres
                // clés suffiraient à faire échouer le contrôle.
                assignationsMeta: {
                  total: 1,
                  plafond: 40,
                  statut: null,
                  statutReponses: 'non_rempli',
                  idPatient: 'PAT001',
                },
              }),
          });
        }
        return base(input);
      }),
    );
    render(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient="PAT001" phaseDemandee="patient" />
      </C5FeatureProvider>,
    );

    expect(await screen.findByText(/n’ont pas pu être lus/i)).toBeTruthy();
    expect(screen.queryByText(/Jamais rempli, échéance dépassée/i)).toBeNull();
  });

  it('une lecture en échec n’est jamais rendue comme « aucun »', async () => {
    await rendreFiche({ patients: 'erreur', phaseDemandee: 'patient' });
    expect(await screen.findByText(/n’ont pas pu être lus/i)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Réessayer la lecture des questionnaires échus' }),
    ).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LE COMPTE DES ENVOIS EN PHASE « DONNÉES FIABLES » — demande propriétaire du
// 2026-09-12, sur un dossier réel.
//
// L'écran annonçait « 9 questionnaire(s) reçu(s) » et rien d'autre. Neuf sur
// combien ? Un dossier à qui il manquait un questionnaire du rideau T0 — donc
// dont l'ancre était inconfirmable — se lisait exactement comme un dossier
// complet. Les bancs ci-dessous tiennent les quatre états : rideau complet,
// rideau incomplet, liste tronquée, liste absente.
// ─────────────────────────────────────────────────────────────────────────────
describe('FichePatientPanel — le compte des envois', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('compte les rendus sur les assignés, et dit que le rideau T0 est complet', async () => {
    await rendreFiche({ phaseDemandee: 'donnees' });

    expect(await screen.findByText(/4 rendus sur 5/)).toBeTruthy();
    expect(screen.getByText(/1 en attente/)).toBeTruthy();
    // L'inverse se dit AUSSI, et c'est la moitié de la demande : un envoi qui
    // attend sans bloquer l'ancre doit se lire comme tel, sinon le praticien
    // suppose un blocage et attend pour rien.
    expect(screen.getByText(/rideau T0 est complet/)).toBeTruthy();
    expect(screen.queryByText(/ancre T0 ne peut pas être confirmée/)).toBeNull();
  });

  it('nomme l’envoi du rideau T0 qui empêche de confirmer l’ancre, avec son âge', async () => {
    await rendreFiche({ phaseDemandee: 'donnees', envois: 'rideauIncomplet' });

    expect(await screen.findByText(/ancre T0 ne peut pas être confirmée/)).toBeTruthy();
    // L'identifiant et l'âge vivent sur la LIGNE de l'envoi depuis que la liste
    // existe (2026-09-13) : le verdict compte, la liste nomme, et c'est sur
    // cette ligne que se trouve le bouton d'annulation.
    const ligne = screen.getByText('Q_ALI_01').closest('li');
    expect(ligne).not.toBeNull();
    // La date d'abord, le nombre de jours ensuite — et le nombre n'est pas
    // arrondi à zéro : quatre jours d'attente doivent se voir.
    expect(ligne?.textContent).toContain('(4 j)');
    // L'annulée sort du dénominateur — 3 rendus sur 4, pas sur 5 — et elle est
    // dite à part plutôt que passée sous silence.
    expect(screen.getByText(/3 rendus sur 4/)).toBeTruthy();
    expect(screen.getByText(/1 annulé, hors compte/)).toBeTruthy();
  });

  it('une liste tronquée ne produit AUCUN compte, et le dit', async () => {
    // Un compte tiré d'une liste plafonnée serait faux vers le bas : c'est le
    // défaut que les trois filtres serveur de cette route ont déjà corrigé
    // trois fois. On ne le reproduit pas d'un quatrième côté.
    await rendreFiche({ phaseDemandee: 'donnees', envois: 'tronque' });

    expect(await screen.findByText(/plus d’envois que la liste n’en rend/)).toBeTruthy();
    expect(screen.queryByText(/rendus sur/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Réessayer la lecture des envois' })).toBeTruthy();
  });

  it('un serveur qui n’écho pas l’absence de filtre : aucun compte, et on le dit', async () => {
    await rendreFiche({ phaseDemandee: 'donnees', envois: 'filtreIgnore' });

    expect(await screen.findByText(/compte des envois est inconnu/)).toBeTruthy();
    expect(screen.queryByText(/rendus sur/)).toBeNull();
  });

  it('une lecture en échec ne rend jamais un compte de zéro', async () => {
    await rendreFiche({ phaseDemandee: 'donnees', patients: 'erreur' });

    expect(await screen.findByText(/compte des envois est inconnu/)).toBeTruthy();
    expect(screen.queryByText(/rendus sur/)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LE STATUT DE LA PHASE 2 SUIT LE RIDEAU T0 — arbitrage praticien du
// 2026-09-13.
//
// Le rail marquait « renseignée » dès qu'une passation existait. Un dossier à
// qui il manquait un questionnaire du rideau — donc dont l'ancre était
// inconfirmable — portait la même pastille verte qu'un dossier complet, à trois
// centimètres d'un compte qui disait l'inverse. Le critère est désormais celui
// de `preconditionsT0`, remonté du serveur et jamais recalculé ici.
// ─────────────────────────────────────────────────────────────────────────────
describe('FichePatientPanel — le statut de « Données fiables »', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const ongletDonnees = () => screen.getByRole('tab', { name: /Données fiables/i });

  it('rideau complet et cotable : « renseignée »', async () => {
    await rendreFiche({ runtime: 'proposal', rideau: 'satisfait' });
    expect(ongletDonnees().textContent).toMatch(/renseignée/i);
  });

  it('rideau incomplet : « en attente du patient », même avec des passations reçues', async () => {
    // LE CAS QUI A MOTIVÉ L'ARBITRAGE. Les fixtures servent quatre passations
    // rendues : l'ancien critère aurait dit « renseignée ».
    await rendreFiche({ runtime: 'proposal', rideau: 'incomplet' });
    expect(ongletDonnees().textContent).toMatch(/en attente du patient/i);
    expect(ongletDonnees().textContent).not.toMatch(/renseignée/i);
  });

  it('aucun envoi jamais posé : « à ouvrir », et surtout pas « en attente du patient »', async () => {
    // Cinq dossiers sur douze en production au 2026-09-12 : créés, zéro
    // assignation. Le geste attendu est PRATICIEN — reprocher l'attente au
    // patient nommerait l'acteur opposé, le défaut même que la
    // requalification de « Compréhension » a corrigé le 2026-09-10.
    await rendreFiche({ runtime: 'proposal', rideau: 'incomplet', envois: 'aucun' });
    expect(ongletDonnees().textContent).toMatch(/à ouvrir/i);
    expect(ongletDonnees().textContent).not.toMatch(/en attente du patient/i);
  });

  it('checklist absente : « indéterminée », jamais un verdict inventé', async () => {
    // La route ne calcule les préconditions qu'en visant une ancre. Sans
    // elles, le rideau n'est pas incomplet : il est inconnu (`DC-24`).
    await rendreFiche({ runtime: 'proposal' });
    expect(ongletDonnees().textContent).toMatch(/indéterminée/i);
  });

  it('lecture des envois en échec : « indéterminée » plutôt qu’un statut affirmé', async () => {
    await rendreFiche({ runtime: 'proposal', rideau: 'satisfait', patients: 'erreur' });
    expect(ongletDonnees().textContent).toMatch(/indéterminée/i);
  });

  it('épisode confirmé : « renseignée », alors que la route ne sert plus de checklist', async () => {
    // Le rideau complet est une condition DURE de la confirmation : un épisode
    // confirmé ne peut pas coexister avec un rideau incomplet au moment où il a
    // été posé. Sans cette branche, tout dossier ancré retomberait en
    // « indéterminée » — la route cesse de calculer ce qu'elle n'a plus à
    // autoriser.
    await rendreFiche({ runtime: 'ready' });
    expect(ongletDonnees().textContent).toMatch(/renseignée/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ANNULER DEPUIS LA FICHE, ET LA PÉREMPTION À 21 JOURS — arbitrage praticien du
// 2026-09-13.
//
// L'annulation est le seul geste qui arrête une attente : `evaluerSecondRideau`
// lit `Annulée` comme « je ne l'attends plus » et lève sa précondition. Elle
// n'était atteignable que depuis le tableau des patients — onze annulations en
// production au 2026-09-12, toutes sur le rideau, aucune sur la cascade qui
// s'accumule. Le geste manquait là où le praticien constate l'attente.
// ─────────────────────────────────────────────────────────────────────────────
describe('FichePatientPanel — annuler un envoi, et le signaler périmé', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('signale périmé le seul envoi qu’aucune autre horloge ne regarde', async () => {
    await rendreFiche({ phaseDemandee: 'donnees', envois: 'peremption' });

    const badges = await screen.findAllByText(/sans retour au-delà de 21 jours/);
    // UN seul badge sur cinq envois en attente : c'est la valeur du test.
    // Q_STR_03 est trop récent ; Q_GAS_03 porte une échéance, donc le Fil du
    // jour et le portail s'en chargent ; Q_SOM_09 est un agenda, sa fenêtre EST
    // de 21 jours ; Q_SOM_02 est vieux mais porte une passation.
    expect(badges).toHaveLength(1);
    const ligne = badges[0].closest('li');
    expect(ligne?.textContent).toContain('Q_NEU_11');
  });

  it('n’offre le bouton qu’aux envois réellement annulables', async () => {
    await rendreFiche({ phaseDemandee: 'donnees', envois: 'peremption' });

    const boutons = await screen.findAllByRole('button', { name: 'Annuler l’envoi' });
    // Quatre des cinq : `Q_SOM_02` porte une passation, `estAnnulable` la refuse.
    expect(boutons).toHaveLength(4);
    const lignes = boutons.map(b => b.closest('li')?.textContent ?? '');
    expect(lignes.some(t => t.includes('Q_SOM_02'))).toBe(false);
  });

  it('dit ce qu’annuler veut dire, à côté du geste', async () => {
    // Sans cette phrase, « annuler » se lit comme « supprimer ». C'est
    // l'inverse : rien n'est effacé, et c'est ce qui débloque une ancre.
    await rendreFiche({ phaseDemandee: 'donnees', envois: 'peremption' });

    expect(await screen.findByText(/je ne l’attends plus/)).toBeTruthy();
    expect(screen.getByText(/reste réassignable/)).toBeTruthy();
  });

  it('confirme, poste l’annulation, puis relit la liste', async () => {
    const fetchMock = await rendreFiche({ phaseDemandee: 'donnees', envois: 'peremption' });
    const avant = urlsPatients(fetchMock).length;

    const boutons = await screen.findAllByRole('button', { name: 'Annuler l’envoi' });
    fireEvent.click(boutons[0]);
    fireEvent.click(await screen.findByRole('button', { name: /Annuler l’assignation|Confirmer/ }));

    await waitFor(() => {
      const appels = fetchMock.mock.calls.map(c => String(c[0]));
      expect(appels.some(u => u.includes('/api/praticien/assignations/annulation'))).toBe(true);
    });
    // LA RELECTURE EST LE POINT : sans elle, l'envoi annulé resterait « en
    // attente » à l'écran et le dénominateur mentirait dans l'autre sens.
    await waitFor(() => expect(urlsPatients(fetchMock).length).toBeGreaterThan(avant));
  });

  it('un refus de la route s’affiche dans la modale, et n’annule rien à l’écran', async () => {
    const base = stubFetch({ envois: 'peremption' });
    vi.stubGlobal(
      'fetch',
      vi.fn((input: unknown) => {
        const url = String(input);
        if (url.includes('/api/praticien/assignations/annulation')) {
          return Promise.resolve({
            ok: false,
            status: 409,
            json: () => Promise.resolve({ ok: false, reason: 'already_filled', error: 'Déjà remplie.' }),
          });
        }
        return base(input);
      }),
    );
    render(
      <C5FeatureProvider enabled={false}>
        <FichePatientPanel idPatient="PAT001" phaseDemandee="donnees" />
      </C5FeatureProvider>,
    );
    await waitFor(() => expect(screen.getAllByText('Sophie Nicola').length).toBeGreaterThan(0));

    const boutons = await screen.findAllByRole('button', { name: 'Annuler l’envoi' });
    fireEvent.click(boutons[0]);
    fireEvent.click(await screen.findByRole('button', { name: /Annuler l’assignation|Confirmer/ }));

    expect(await screen.findByText(/porte déjà une passation/)).toBeTruthy();
  });
});
