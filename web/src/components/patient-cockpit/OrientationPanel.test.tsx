// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrientationPanel } from './OrientationPanel';
import { MESSAGE_DEJA_ASSIGNE } from '@/lib/assignations/messages';
import { CATALOGUE_DEFINITIONS } from '@/lib/bibliotheque';

// RE-CÂBLÉ LE 2026-08-06 (LOT-02, D-030). Le geste du panneau n'est plus
// `POST /api/praticien/packs/assign` mais `POST /api/praticien/file-envoi`, et
// il n'envoie RIEN : il pose l'instrument dans un brouillon que le praticien
// valide depuis la Bibliothèque. Deux conséquences pour ce banc — la
// confirmation en deux temps disparaît (elle protégeait d'un e-mail sortant qui
// ne part plus d'ici), et l'état « déjà dans la file » ne peut PAS se déduire de
// la réponse du POST : la route déduplique en silence et son `count` est la
// taille totale du brouillon. Il vient d'un `GET`, et ce fichier l'exerce comme tel.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

/** Une réponse de file différée, pour exercer la résolution HORS ORDRE. */
type ReponseFile = { payload: unknown; ok?: boolean; delaiMs?: number };

/**
 * Trois routes stubées, et la file est SERVIE, pas supposée : `fileParAppel`
 * permet de rendre une file différente au second GET — c'est ce qui reproduit
 * la relecture faite après un ajout réussi.
 */
function stubFetch(
  payloadOrientation: unknown,
  payloadAjout?: unknown,
  fileParAppel: Array<unknown | ReponseFile> = [{ brouillons: [] }],
  payloadEnvoi?: unknown,
  // Cinquième argument en OBJET, et non deux positionnels de plus : les quatre
  // premiers sont déjà à la limite du lisible. `orientationParAppel` sert
  // l'écartement ([[D-178]]), où c'est la RELECTURE qui déplace la ligne — un
  // écran qui rendrait deux fois la même charge ne prouverait rien du geste.
  options: { ecartement?: unknown; ecartementOk?: boolean; orientationParAppel?: unknown[] } = {},
) {
  const appels: { url: string; init?: RequestInit }[] = [];
  let lecturesFile = 0;
  let lecturesOrientation = 0;
  const mock = vi.fn((url: string, init?: RequestInit) => {
    appels.push({ url, init });
    // AVANT la route d'orientation : son chemin en est un préfixe, et l'ordre
    // inverse ferait répondre la charge de lecture à un POST d'écartement.
    if (url.startsWith('/api/praticien/orientation/ecartement')) {
      return Promise.resolve(json(
        options.ecartement ?? { ok: true, ecartementId: 'ec_1' },
        options.ecartementOk ?? true,
      ));
    }
    if (url.startsWith('/api/praticien/orientation') && options.orientationParAppel) {
      const index = Math.min(lecturesOrientation++, options.orientationParAppel.length - 1);
      return Promise.resolve(json(options.orientationParAppel[index]));
    }
    if (url.startsWith('/api/praticien/file-envoi/envoyer')) {
      return Promise.resolve(json(payloadEnvoi ?? { success: true, count: 1 }));
    }
    if (url.startsWith('/api/praticien/file-envoi')) {
      if (init?.method === 'POST') {
        return Promise.resolve(json(payloadAjout ?? { success: true, idBrouillon: 'ENV_1', count: 3 }));
      }
      const index = Math.min(lecturesFile++, fileParAppel.length - 1);
      const brut = fileParAppel[index] as ReponseFile;
      const estEnveloppe = Boolean(brut) && typeof brut === 'object' && 'payload' in brut;
      const reponse = estEnveloppe ? brut : ({ payload: fileParAppel[index] } as ReponseFile);
      const rendu = json(reponse.payload, reponse.ok ?? true);
      return reponse.delaiMs
        ? new Promise(resoudre => setTimeout(() => resoudre(rendu), reponse.delaiMs))
        : Promise.resolve(rendu);
    }
    return Promise.resolve(json(payloadOrientation));
  });
  vi.stubGlobal('fetch', mock);
  return { mock, appels };
}

const brouillonAvec = (idPatient: string, qids: string[]) => ({
  brouillons: [{
    idBrouillon: 'ENV_1',
    idPatient,
    prenom: 'Sophie',
    nom: 'Nicola',
    emailPatient: 'sophie@example.test',
    items: qids.map(id => ({ id, titre: id })),
    dateLimite: null,
    notes: null,
  }],
});

const RECOMMANDATION_PSQI = {
  cible: { type: 'questionnaire' as const, questionnaireId: 'Q_SOM_01' },
  idPackBase: null,
  priorite: 1,
  niveau: 'approfondissement' as const,
  objectifs: ['Caractériser la fragmentation du sommeil'],
  needIds: [3],
  dejaAssigne: false,
  dejaRepondu: false,
  motifs: [
    {
      regleId: 'R-SOM-01',
      conditions: ['PSQI au-dessus de son seuil publié'],
      claims: [{ claimId: 'WN-CLM-0001', versionClaim: 'v1.0' }],
    },
  ],
};

const RECOMMANDATION_CUNGI = {
  cible: { type: 'questionnaire' as const, questionnaireId: 'Q_STR_03' },
  priorite: 2,
  niveau: 'socle' as const,
  objectifs: [],
  needIds: [],
  dejaAssigne: false,
  dejaRepondu: null,
  motifs: [{ regleId: 'R-STR-02', conditions: ['Stress déclaré'], claims: [] }],
};

/** Réponse d'échec de la route — le texte vient d'elle, pas de l'écran. */
const ECHEC_DOSSIER_CLOS = { success: false, reason: 'dossier_cloture', error: 'Dossier clos.' };

const ACTIF = {
  ok: true,
  actif: true,
  version: 'orientation-nnpp2-v1',
  sha256: 'abc123',
  recommandations: [RECOMMANDATION_PSQI, RECOMMANDATION_CUNGI],
  // VIDE, jamais absent — c'est le contrat de la route ([[D-178]]).
  ecartees: [],
};

/** Une proposition écartée, telle que la route la sert. */
const CUNGI_ECARTE = {
  cible: { type: 'questionnaire' as const, questionnaireId: 'Q_STR_03' },
  ecartementId: 'ec_cungi',
  motif: 'Le stress est déjà travaillé en consultation.',
  parEmail: 'praticien@wellneuro.fr',
  faitLe: '2026-09-13T10:00:00.000Z',
  reglesAuGeste: ['R-STR-02'],
};

const BOUTON_AJOUT = { name: /ajouter à la file d’envoi/i };

describe('OrientationPanel', () => {
  it('affiche le message serveur quand le verrou est fermé, sans alerte ni écran vide', async () => {
    stubFetch({
      ok: true,
      actif: false,
      version: 'orientation-nnpp2-v1',
      message: 'Orientation non activée sur cet environnement.',
    });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/non activée sur cet environnement/i)).toBeTruthy();
    // Un verrou fermé n'est pas une panne : le signaler en alerte enverrait le
    // praticien chercher un incident qui n'existe pas.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('rend une alerte et un bouton Réessayer sur échec de lecture', async () => {
    const { appels } = stubFetch({ ok: false, reason: 'exception', error: 'Impossible de lire.' });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    const bouton = screen.getByRole('button', { name: /réessayer/i });
    const lecturesAvant = appels.filter(a => a.url.startsWith('/api/praticien/orientation')).length;
    fireEvent.click(bouton);
    expect(appels.filter(a => a.url.startsWith('/api/praticien/orientation')).length)
      .toBe(lecturesAvant + 1);
  });

  it('distingue l’échec de lecture de l’absence de recommandation', async () => {
    stubFetch({ ok: true, actif: true, version: 'v1', sha256: 'abc', recommandations: [] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/aucune exploration complémentaire/i)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // D-433 §3 — libellé validé par le responsable le 2026-11-04 (lot t60). Une
  // ligne par passation en cause, les règles regroupées sous elle.
  const NON_EVALUEES = [
    { regleId: 'R2-MOD-01', passations: [{ idQuestionnaire: 'Q_MOD_01', dateReponse: '2026-09-12T12:00:00.000Z', fenetreJours: 21 }] },
    { regleId: 'R2-MOD-02', passations: [{ idQuestionnaire: 'Q_MOD_01', dateReponse: '2026-09-12T12:00:00.000Z', fenetreJours: 21 }] },
  ];

  it('liste vide : ne dit pas « aucune exploration proposée » sur des règles non évaluées', async () => {
    stubFetch({ ...ACTIF, recommandations: [], reglesNonEvaluees: NON_EVALUEES });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(
      'Aucune exploration n’est proposée sur les passations à jour. Certaines règles n’ont pas pu être évaluées (ci-dessous).',
    )).toBeTruthy();
    expect(screen.queryByText(/aucune exploration complémentaire/i)).toBeNull();
    expect(screen.getByText('Règles non évaluées : passation trop ancienne')).toBeTruthy();
    expect(screen.getByText(/, rempli le 12\/09\/2026 : au-delà de sa fenêtre de 21 jours\. 2 règles non évaluées\.$/)).toBeTruthy();
    expect(screen.getByText('R2-MOD-01, R2-MOD-02')).toBeTruthy();
    expect(screen.getByText(/ne vaut ni signal ni absence de trouble : ces règles ne sont ni\s+déclenchées ni écartées\. La faire repasser reste votre décision\./)).toBeTruthy();
  });

  it('liste non vide : le bloc des règles non évaluées est rendu aussi', async () => {
    stubFetch({ ...ACTIF, reglesNonEvaluees: [NON_EVALUEES[0]] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('Règles non évaluées : passation trop ancienne')).toBeTruthy();
    expect(screen.getByText(/1 règle non évaluée\.$/)).toBeTruthy();
  });

  // La seule combinaison où la phrase des propositions écartées côtoie le bloc :
  // liste vide, écartées ET règles non évaluées. Les deux faits sont dits.
  it('liste vide avec écartées et règles non évaluées : les deux faits sont rendus', async () => {
    stubFetch({ ...ACTIF, recommandations: [], ecartees: [CUNGI_ECARTE], reglesNonEvaluees: NON_EVALUEES });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/Plus aucune exploration à examiner/)).toBeTruthy();
    expect(screen.getByText('Règles non évaluées : passation trop ancienne')).toBeTruthy();
    expect(screen.getByText(/1 exploration écartée/)).toBeTruthy();
  });

  // [[D-500]] §4 — une règle d'arrêt NON ÉVALUÉE : deux cas, deux textes du
  // responsable (passation trop ancienne, fenêtre non définie), dits dans les
  // deux branches de rendu.
  const ARRET_NON_EVALUE = {
    stopRuleId: 'STOP-STR',
    passations: [
      { idQuestionnaire: 'Q_STR_01', dateReponse: '2026-11-10T10:00:00.000Z', fenetreJours: null },
      { idQuestionnaire: 'Q_STR_04', dateReponse: '2026-11-01T10:00:00.000Z', fenetreJours: 7 },
    ],
  };

  it('D-500, liste non vide : l’arrêt non évalué est dit, fenêtre non définie puis passation trop ancienne', async () => {
    stubFetch({ ...ACTIF, reglesNonEvaluees: [], arretsSuspendus: [], arretsNonEvalues: [ARRET_NON_EVALUE] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('Règle d’arrêt non évaluée : STOP-STR.')).toBeTruthy();
    const titreSiin = CATALOGUE_DEFINITIONS.Q_STR_01?.titre ?? 'Q_STR_01';
    const titreDass = CATALOGUE_DEFINITIONS.Q_STR_04?.titre ?? 'Q_STR_04';
    const dateDass = new Date('2026-11-01T10:00:00.000Z').toLocaleDateString('fr-FR');
    const ligne = screen.getByText('Règle d’arrêt non évaluée : STOP-STR.').closest('p');
    expect(ligne?.textContent).toBe(
      'Règle d’arrêt non évaluée : STOP-STR.'
      + ` Aucune fenêtre de fraîcheur n’est définie pour ${titreSiin}.`
      + ` La passation de ${titreDass} du ${dateDass} dépasse sa fenêtre de 7 jours.`
      + ' Elle ne retire donc aucune exploration.',
    );
  });

  // [[D-508]] §2 — troisième cas, texte validé par le responsable le
  // 2026-11-12 : une passation datée après la date du jour n'éteint pas.
  it('D-508, passation datée après la date du jour : texte complet', async () => {
    const futur = {
      stopRuleId: 'STOP-STR',
      passations: [{
        idQuestionnaire: 'Q_STR_03',
        dateReponse: '2026-12-01T10:00:00.000Z',
        fenetreJours: 7,
        dateeApresMaintenant: true as const,
      }],
    };
    stubFetch({ ...ACTIF, reglesNonEvaluees: [], arretsSuspendus: [], arretsNonEvalues: [futur] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('Règle d’arrêt non évaluée : STOP-STR.')).toBeTruthy();
    const titreCungi = CATALOGUE_DEFINITIONS.Q_STR_03?.titre ?? 'Q_STR_03';
    const date = new Date('2026-12-01T10:00:00.000Z').toLocaleDateString('fr-FR');
    const ligne = screen.getByText('Règle d’arrêt non évaluée : STOP-STR.').closest('p');
    expect(ligne?.textContent).toBe(
      'Règle d’arrêt non évaluée : STOP-STR.'
      + ` La passation de ${titreCungi} est datée du ${date}, après la date du jour.`
      + ' Elle ne retire donc aucune exploration.',
    );
  });

  it('D-500, liste vide : l’arrêt non évalué est dit aussi', async () => {
    stubFetch({ ...ACTIF, recommandations: [], reglesNonEvaluees: [], arretsSuspendus: [], arretsNonEvalues: [ARRET_NON_EVALUE] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('Règle d’arrêt non évaluée : STOP-STR.')).toBeTruthy();
  });

  it('D-500 : aucun bloc quand toutes les règles d’arrêt ont été évaluées', async () => {
    stubFetch({ ...ACTIF, reglesNonEvaluees: [], arretsSuspendus: [], arretsNonEvalues: [] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/Index de qualité du sommeil de Pittsburgh/i)).toBeTruthy();
    expect(screen.queryByText(/Règle d’arrêt non évaluée/)).toBeNull();
  });

  // [[D-491]] — une règle d'arrêt suspendue faute de claim admissible : dite
  // dans les deux branches, hors de tout repli.
  const SUSPENDU = {
    stopRuleId: 'STOP-STR',
    motif: 'claims_non_admissibles' as const,
    claims: [{ claimId: 'WN-CL-0051-019', versionClaim: 'v1.0' }],
  };

  it('D-491, liste non vide : la règle d’arrêt suspendue est dite, avec ses claims', async () => {
    stubFetch({ ...ACTIF, reglesNonEvaluees: [], arretsSuspendus: [SUSPENDU] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('Règle d’arrêt suspendue : STOP-STR.')).toBeTruthy();
    expect(screen.getByText(/Au moins un claim cité ne satisfait pas les critères de validité du corpus\. Elle ne retire donc aucune exploration\./)).toBeTruthy();
    expect(screen.getByText('Claims concernés : WN-CL-0051-019 v1.0')).toBeTruthy();
  });

  it('D-491, liste vide : la suspension est dite aussi', async () => {
    stubFetch({ ...ACTIF, recommandations: [], reglesNonEvaluees: [], arretsSuspendus: [SUSPENDU] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('Règle d’arrêt suspendue : STOP-STR.')).toBeTruthy();
  });

  it('D-491, validité non vérifiée : le motif est dit, sans liste de claims', async () => {
    stubFetch({
      ...ACTIF,
      reglesNonEvaluees: [],
      arretsSuspendus: [{ stopRuleId: 'STOP-STR', motif: 'validite_non_verifiee', claims: [] }],
    });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/La validité de ses sources n’a pas pu être vérifiée\. Elle ne retire donc aucune exploration\./)).toBeTruthy();
    expect(screen.queryByText(/Claims concernés/)).toBeNull();
  });

  // [[D-495]] — une règle d'ORIENTATION non appliquée faute de claim
  // admissible : rubrique distincte, dite dans les deux branches (texte T1).
  const NON_APPLIQUEE = {
    regleId: 'R-SOM-01',
    claims: [{ claimId: 'WN-CL-0102-004', versionClaim: 'v1.0' }],
  };

  it('D-495, liste non vide : la règle non appliquée est dite, dans sa rubrique, avec ses claims', async () => {
    stubFetch({ ...ACTIF, reglesNonEvaluees: [], arretsSuspendus: [], reglesNonAppliquees: [NON_APPLIQUEE] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('Règles d’orientation non appliquées')).toBeTruthy();
    expect(screen.getByText('Règle d’orientation non appliquée : R-SOM-01.')).toBeTruthy();
    expect(screen.getByText(/Au moins un claim cité ne satisfait pas les critères de validité du corpus\. Elle ne propose donc aucune exploration\./)).toBeTruthy();
    expect(screen.getByText('Claims concernés : WN-CL-0102-004 v1.0')).toBeTruthy();
  });

  it('D-495, liste vide : la règle non appliquée est dite aussi', async () => {
    stubFetch({ ...ACTIF, recommandations: [], reglesNonEvaluees: [], arretsSuspendus: [], reglesNonAppliquees: [NON_APPLIQUEE] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('Règle d’orientation non appliquée : R-SOM-01.')).toBeTruthy();
  });

  it('D-495 : corpus illisible — le message du serveur est affiché tel quel', async () => {
    stubFetch({
      ok: true,
      actif: false,
      version: 'orientation-nnpp2-v1',
      message: 'L\'orientation n\'est pas affichée : la validité de ses sources n\'a pas pu être vérifiée.',
    });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('L\'orientation n\'est pas affichée : la validité de ses sources n\'a pas pu être vérifiée.')).toBeTruthy();
  });

  it('D-491 : aucun bloc de suspension quand aucune règle d’arrêt n’est suspendue', async () => {
    stubFetch({ ...ACTIF, reglesNonEvaluees: [], arretsSuspendus: [] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/Index de qualité du sommeil de Pittsburgh/i)).toBeTruthy();
    expect(screen.queryByText(/Règle d’arrêt suspendue/)).toBeNull();
  });

  it('aucun bloc quand toutes les règles sont évaluées', async () => {
    stubFetch({ ...ACTIF, reglesNonEvaluees: [] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/Index de qualité du sommeil de Pittsburgh/i)).toBeTruthy();
    expect(screen.queryByText(/Règles non évaluées/)).toBeNull();
  });

  it('rend les recommandations dans l’ordre servi, avec le sha256', async () => {
    stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    expect(await screen.findByText(/Index de qualité du sommeil de Pittsburgh/i)).toBeTruthy();
    expect(screen.getByText(/abc123/)).toBeTruthy();

    // L'ordre est calculé (priorité, motifs, clé de cible) : le rendre autrement
    // détruirait une information que rien d'autre ne porte.
    const items = screen.getAllByRole('listitem').map(n => n.textContent ?? '');
    const rangPsqi = items.findIndex(t => t.includes('Pittsburgh'));
    const rangCungi = items.findIndex(t => t.includes('R-STR-02'));
    expect(rangPsqi).toBeGreaterThanOrEqual(0);
    expect(rangPsqi).toBeLessThan(rangCungi);
  });

  it('présente une couverture inconnue comme inconnue, pas comme négative', async () => {
    stubFetch({ ...ACTIF, recommandations: [RECOMMANDATION_CUNGI] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/couverture inconnue/i)).toBeTruthy();
  });

  // ── EXTINCTION ([[D-053]]) ───────────────────────────────────────────────
  it('affiche une ligne éteinte SANS effacer ses motifs d’origine', async () => {
    const eteinte = {
      ...RECOMMANDATION_PSQI,
      extinction: {
        stopRuleId: 'STOP-STR',
        conditions: ['Q_STR_01 : interprétation « Oriente vers les conseils de vie antistress »'],
        motif: 'Les instruments spécifiques de l’axe stress sont rassurants.',
        claims: [{ claimId: 'WN-CL-0051-033', versionClaim: 'v1.0' }],
      },
    };
    stubFetch({ ...ACTIF, recommandations: [eteinte] });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    expect(await screen.findByText(/Information suffisante/i)).toBeTruthy();
    // NEUTRE, ET PAS VERT : `data-variant` expose la couleur au banc — sans
    // lui, un `variant="success"` codé en dur passerait, et l'écran dirait
    // « tout va bien » là où la consigne du modèle l'interdit.
    expect(screen.getByText(/exploration éteinte/i).getAttribute('data-variant')).toBe('neutral');
    expect(screen.getByText(/STOP-STR/)).toBeTruthy();
    // L'historique n'est pas effacé : le motif d'origine reste lisible, et c'est
    // ce qui permet de comprendre pourquoi l'exploration avait été proposée.
    expect(screen.getByText(/PSQI au-dessus de son seuil publié/)).toBeTruthy();
    // Le geste reste au praticien : le bouton n'est pas retiré.
    expect(screen.getByRole('button', BOUTON_AJOUT)).toBeTruthy();
  });

  // Contre-épreuve : sans extinction, aucune de ces mentions n'apparaît. Sans ce
  // cas, un rendu qui afficherait toujours le bandeau passerait le précédent.
  it('n’affiche aucune mention d’extinction sur une recommandation allumée', async () => {
    stubFetch({ ...ACTIF, recommandations: [RECOMMANDATION_PSQI] });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect(screen.queryByText(/Information suffisante/i)).toBeNull();
    expect(screen.queryByText(/exploration éteinte/i)).toBeNull();
  });

  it('n’affiche aucun bouton d’ajout sans email patient', async () => {
    stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    await screen.findByText(/Pittsburgh/i);
    // La route identifie le patient par son EMAIL : un bouton sans email serait
    // présent et voué à l'échec.
    expect(screen.queryByRole('button', BOUTON_AJOUT)).toBeNull();
  });

  // LOT-B — le badge « déjà assigné » existait depuis toujours, mais le bouton
  // restait actif à côté. Le refus est porté ici aussi, et il nomme le geste
  // réellement possible plutôt que de retirer le bouton en silence. Le MESSAGE,
  // lui, n'existait que dans la branche pack : il est écrit pour la cible
  // questionnaire depuis le 2026-08-06.
  it('ne propose pas d’ajouter un questionnaire déjà assigné, et dit quoi faire à la place', async () => {
    const dejaAssigne = { ...RECOMMANDATION_PSQI, dejaAssigne: true };
    stubFetch({ ...ACTIF, recommandations: [dejaAssigne] });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect(screen.queryByRole('button', BOUTON_AJOUT)).toBeNull();
    // Un bouton absent sans explication se lit comme un défaut de droits. Le
    // texte est celui de la route d'assignation, pas une reformulation.
    expect(await screen.findByText(MESSAGE_DEJA_ASSIGNE)).toBeTruthy();
  });

  // Le refus disait l'état sans dire depuis quand : un envoi posé il y a 39 jours
  // et un posé hier portaient le même texte, alors que la fiche, deux blocs plus
  // haut, sait dire « 39 j ». La date vient du serveur — l'écran ne la déduit pas.
  it('dit depuis quand l’envoi bloquant attend, et où l’annuler', async () => {
    const poseeIlYA39Jours = new Date(Date.now() - 39 * 86_400_000).toISOString();
    stubFetch({
      ...ACTIF,
      recommandations: [
        { ...RECOMMANDATION_PSQI, dejaAssigne: true, dateAssignationOuverte: poseeIlYA39Jours },
      ],
    });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect(await screen.findByText(/\(39 j\)/)).toBeTruthy();
    // Le LIEU est dit par cet écran et par lui seul : la constante est rendue par
    // cinq écrans, dont quatre ne sont pas sur la fiche.
    expect(await screen.findByText(/sur cette fiche/i)).toBeTruthy();
    expect(MESSAGE_DEJA_ASSIGNE).not.toContain('cette fiche');
  });

  // Sans la date, le refus s'affiche seul plutôt que d'inventer une ancienneté.
  it('affiche le refus seul quand le serveur ne sert aucune date', async () => {
    stubFetch({ ...ACTIF, recommandations: [{ ...RECOMMANDATION_PSQI, dejaAssigne: true }] });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect(await screen.findByText(MESSAGE_DEJA_ASSIGNE)).toBeTruthy();
    expect(screen.queryByText(/sur cette fiche/i)).toBeNull();
  });

  // Contrôle négatif : la garde ne doit pas éteindre le bouton hors du doublon.
  it('propose toujours l’ajout quand le questionnaire n’est pas déjà assigné', async () => {
    stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(2);
  });

  it('n’ajoute rien par le seul affichage, et pose le bon contrat au clic', async () => {
    const { appels } = stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    const ecritures = () => appels.filter(a => a.url.includes('file-envoi') && a.init?.method === 'POST');
    expect(ecritures()).toHaveLength(0);

    // UN SEUL CLIC, délibérément : rien ne part de la file sans validation, et
    // un geste sans effet sortant n'a pas à être confirmé deux fois.
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);
    expect(await screen.findByText(/rien ne part sans votre validation/i)).toBeTruthy();

    const appel = ecritures()[0];
    expect(appel?.init?.method).toBe('POST');
    // Le contrat serveur attend l'email du patient et une liste de qids.
    expect(JSON.parse(String(appel?.init?.body))).toEqual({
      emailPatient: 'sophie@example.test',
      qids: ['Q_SOM_01'],
    });
  });

  // `count` est la taille TOTALE du brouillon, jamais un nombre d'ajouts :
  // l'afficher mentirait dès le deuxième instrument posé.
  it('n’affiche jamais le `count` de la route comme un nombre d’ajouts', async () => {
    stubFetch(ACTIF, { success: true, idBrouillon: 'ENV_1', count: 47 });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);
    const succes = await screen.findByText(/rien ne part sans votre validation/i);

    // Ni dans le message de succès, ni ailleurs à l'écran.
    expect(succes.textContent).not.toContain('47');
    expect(screen.queryByText(/47/)).toBeNull();
  });

  // LE CAS QUE LA RÉPONSE DU POST NE PEUT PAS DIRE. La route déduplique en
  // silence : un instrument déjà au brouillon rend `success: true` comme un
  // ajout réel. L'état vient donc du GET, filtré sur le patient affiché.
  it('dit « déjà dans la file » à partir de la LECTURE, pas de l’écriture', async () => {
    stubFetch(ACTIF, undefined, [brouillonAvec('PAT_SEED_03', ['Q_SOM_01'])]);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect(await screen.findByText(/déjà dans la file d’envoi/i)).toBeTruthy();
    // L'autre ligne, elle, reste proposable : la file ne la porte pas.
    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(1);
  });

  it('ne prend pas la file d’un AUTRE patient pour celle du patient affiché', async () => {
    stubFetch(ACTIF, undefined, [brouillonAvec('PAT_SEED_01', ['Q_SOM_01'])]);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect(screen.queryByText(/déjà dans la file d’envoi/i)).toBeNull();
    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(2);
  });

  it('relit la file après un ajout réussi et bascule la ligne', async () => {
    const { appels } = stubFetch(ACTIF, undefined, [
      { brouillons: [] },
      brouillonAvec('PAT_SEED_03', ['Q_SOM_01']),
    ]);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);

    expect(await screen.findByText(/déjà dans la file d’envoi/i)).toBeTruthy();
    // Une seule écriture : la bascule vient de la relecture, pas d'un second POST.
    expect(appels.filter(a => a.url.includes('file-envoi') && a.init?.method === 'POST')).toHaveLength(1);
  });

  it('remet l’état de file à zéro quand le patient change', async () => {
    stubFetch(ACTIF, undefined, [
      brouillonAvec('PAT_SEED_03', ['Q_SOM_01']),
      { brouillons: [] },
    ]);

    const { rerender } = render(
      <OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />,
    );

    await screen.findByText(/déjà dans la file d’envoi/i);

    // Les clés (`questionnaire:Q_SOM_01`) ne portent pas le patient : sans
    // remise à zéro, le second hériterait de la file du premier.
    rerender(<OrientationPanel idPatient="PAT_SEED_01" emailPatient="jennifer@example.test" />);

    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(2);
    expect(screen.queryByText(/déjà dans la file d’envoi/i)).toBeNull();
  });

  // C6 — DEUX PHRASES, PAS UN GABARIT UNIQUE. « Ajout impossible pour :
  // Dossier clos. » collait une phrase serveur dans une place réservée à un
  // titre. Quand la route parle, sa phrase se suffit.
  it('laisse réessayer après un échec d’ajout, en reprenant la phrase de la route', async () => {
    stubFetch(ACTIF, ECHEC_DOSSIER_CLOS);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);
    expect(await screen.findByText('Ajout impossible : Dossier clos.')).toBeTruthy();
    // Et surtout pas l'ancienne forme, qui mêlait les deux registres.
    expect(screen.queryByText(/ajout impossible pour : dossier clos/i)).toBeNull();

    // Un échec n'a rien posé dans la file : le geste doit rester possible.
    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(2);
  });

  // L'autre moitié de C6 : quand la route ne dit RIEN (panne réseau, charge
  // illisible), c'est l'écran qui nomme ce qui a échoué — et le titre est alors
  // la bonne information.
  it('nomme l’instrument quand la route n’explique pas le refus', async () => {
    stubFetch(ACTIF, { success: false, reason: 'exception' });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);
    const message = await screen.findByText(/^Ajout impossible pour « /);
    expect(message.textContent).toContain('Pittsburgh');
    expect(message.textContent?.endsWith('».')).toBe(true);
  });

  // C5 — UNE FILE ILLISIBLE N'EST PAS UNE FILE VIDE. Sur 500, la route rend un
  // JSON bien formé `{brouillons: [], unavailable: true}` : le lire comme une
  // file vide effacerait un « déjà dans la file » acquis, et inviterait à
  // réajouter ce qui s'y trouve.
  it('garde l’état connu quand la file devient illisible (500)', async () => {
    stubFetch(ACTIF, undefined, [
      brouillonAvec('PAT_SEED_03', ['Q_SOM_01']),
      { payload: { brouillons: [], unavailable: true, reason: 'exception' }, ok: false },
    ]);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    // Première lecture : la ligne est dans la file.
    expect(await screen.findByText(/déjà dans la file d’envoi/i)).toBeTruthy();

    // Seconde lecture (relecture après ajout) : 500. L'état ne doit pas retomber.
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);
    await screen.findByText(/rien ne part sans votre validation/i);
    expect(screen.getByText(/déjà dans la file d’envoi/i)).toBeTruthy();
  });

  // C4 — RÉSOLUTION HORS ORDRE. La réponse du patient A arrive APRÈS le passage
  // à B. Son filtre est correct pour A ; l'appliquer à l'écran de B afficherait
  // la file de A sous les recommandations de B.
  it('n’applique pas la file d’un patient quitté quand sa réponse arrive en retard', async () => {
    stubFetch(ACTIF, undefined, [
      // A : lent, et sa file porte Q_SOM_01.
      { payload: brouillonAvec('PAT_SEED_03', ['Q_SOM_01']), delaiMs: 60 },
      // B : rapide, file vide.
      { payload: { brouillons: [] } },
    ]);

    const { rerender } = render(
      <OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />,
    );
    // On quitte A avant que sa réponse ne revienne.
    rerender(<OrientationPanel idPatient="PAT_SEED_01" emailPatient="jennifer@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    // Laisser la réponse lente de A arriver pour de bon.
    await new Promise(resoudre => setTimeout(resoudre, 120));

    // L'écran est celui de B : rien de la file de A n'a dû s'y appliquer.
    expect(screen.queryByText(/déjà dans la file d’envoi/i)).toBeNull();
    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(2);
  });

  it('tombe en erreur plutôt que de jeter sur une charge ok:true malformée', async () => {
    stubFetch({ ok: true, actif: true, version: 'v1', sha256: 'abc' });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  // ── Bouton d'envoi sous les suggestions (demande propriétaire 2026-08-09) ──
  // Le même geste que la file de la Bibliothèque, sans navigation : le clic
  // EST la validation. Il n'apparaît que si le brouillon du patient existe.

  it('n’affiche aucun bouton d’envoi quand la file du patient est vide', async () => {
    stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect(screen.queryByRole('button', { name: /envoyer \(/i })).toBeNull();
  });

  it('n’affiche pas le bouton d’envoi sans email patient (panneau en lecture seule)', async () => {
    stubFetch(ACTIF, undefined, [brouillonAvec('PAT_SEED_03', ['Q_SOM_01'])]);

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    await screen.findByText(/Pittsburgh/i);
    expect(screen.queryByRole('button', { name: /envoyer \(/i })).toBeNull();
  });

  it('porte le compte du brouillon ENTIER, pas celui des seules recommandations', async () => {
    // Q_ALI_02 vient de la Bibliothèque, pas des suggestions : il partira
    // aussi, le libellé doit le compter.
    stubFetch(ACTIF, undefined, [brouillonAvec('PAT_SEED_03', ['Q_SOM_01', 'Q_ALI_02'])]);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    expect(await screen.findByRole('button', { name: /envoyer \(2\) — un seul mail/i })).toBeTruthy();
    expect(screen.getByText(/toute la file d’envoi de ce patient part d’un coup/i)).toBeTruthy();
  });

  it('envoie le brouillon au clic, dit le compte envoyé et relit l’orientation', async () => {
    const { appels } = stubFetch(
      ACTIF,
      undefined,
      [brouillonAvec('PAT_SEED_03', ['Q_SOM_01', 'Q_STR_03']), { brouillons: [] }],
      { success: true, count: 2 },
    );

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    const bouton = await screen.findByRole('button', { name: /envoyer \(2\)/i });
    const lecturesOrientation = () =>
      appels.filter(a => a.url.startsWith('/api/praticien/orientation')).length;
    const avant = lecturesOrientation();

    fireEvent.click(bouton);

    expect(await screen.findByText(/2 questionnaires envoyés — un seul mail au patient/i)).toBeTruthy();
    // Le contrat serveur : l'identifiant du brouillon, rien d'autre.
    const envois = appels.filter(a => a.url.startsWith('/api/praticien/file-envoi/envoyer'));
    expect(envois).toHaveLength(1);
    expect(JSON.parse(String(envois[0]?.init?.body))).toEqual({ idBrouillon: 'ENV_1' });
    // Les lignes envoyées sont désormais assignées : c'est l'orientation RELUE
    // qui le dira — l'écran ne le déduit pas localement.
    expect(lecturesOrientation()).toBe(avant + 1);
    // Et la file relue étant vide, le bouton disparaît.
    expect(screen.queryByRole('button', { name: /envoyer \(/i })).toBeNull();
  });

  it('reprend la phrase de la route quand l’envoi est refusé, et laisse réessayer', async () => {
    stubFetch(
      ACTIF,
      undefined,
      [brouillonAvec('PAT_SEED_03', ['Q_SOM_01'])],
      { success: false, reason: 'portal_revoked', error: 'Accès portail révoqué pour ce patient.' },
    );

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    fireEvent.click(await screen.findByRole('button', { name: /envoyer \(1\)/i }));

    expect(
      await screen.findByText('Envoi impossible : Accès portail révoqué pour ce patient.'),
    ).toBeTruthy();
    // L'échec n'a pas consommé le brouillon : le geste reste possible.
    expect(await screen.findByRole('button', { name: /envoyer \(1\)/i })).toBeTruthy();
  });
});

// ── ÉCARTEMENT PRATICIEN — [[D-178]] ───────────────────────────────────────────
//
// Le geste écarte une proposition d'orientation avec un motif écrit obligatoire.
// Ce que ce banc doit tenir, au-delà du rendu : le corps envoyé ne porte NI
// règle NI `supersedes` — la route les calcule, et c'est ce qui rend le réveil
// fiable (`DC-30`). Un écran qui les fournirait pourrait figer une liste
// couvrant tous les axes et empêcher une proposition de revenir.

const BOUTON_ECARTER = { name: /écarter cette exploration/i };

function ecrireMotif(texte: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: texte } });
}

function corpsDesGestes(appels: { url: string; init?: RequestInit }[]): Record<string, unknown>[] {
  return appels
    .filter(appel => appel.url.startsWith('/api/praticien/orientation/ecartement'))
    .map(appel => JSON.parse(String(appel.init?.body)) as Record<string, unknown>);
}

describe('OrientationPanel — écartement praticien', () => {
  it('chaque ligne visible porte le geste, et le formulaire exige un motif écrit', async () => {
    stubFetch(ACTIF);
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    // Sur les DEUX lignes, y compris celle sans bouton d'ajout : le geste porte
    // sur la proposition, pas sur l'envoi.
    expect(await screen.findAllByRole('button', BOUTON_ECARTER)).toHaveLength(2);

    fireEvent.click((await screen.findAllByRole('button', BOUTON_ECARTER))[0]);
    const confirmer = screen.getByRole('button', { name: /confirmer l’écartement/i });
    // Vide, puis espaces, puis TABULATIONS : la même sévérité que la route et
    // que le CHECK de la base — `btrim/1` ne retire que l'espace ASCII.
    expect(confirmer.hasAttribute('disabled')).toBe(true);
    ecrireMotif('   ');
    expect(confirmer.hasAttribute('disabled')).toBe(true);
    ecrireMotif('\t\n ');
    expect(confirmer.hasAttribute('disabled')).toBe(true);
    ecrireMotif('Déjà exploré en consultation.');
    expect(confirmer.hasAttribute('disabled')).toBe(false);
  });

  it('le corps envoyé ne porte NI règle NI `supersedes`, et la cible est la forme LONGUE', async () => {
    // LE BANC CENTRAL DE CETTE SECTION. `q:Q_STR_03` est la clé interne du
    // moteur ; la base exige `questionnaire:`. Et les règles viennent du
    // serveur : les envoyer d'ici serait laisser le client décider de ce qui
    // pourra réveiller la proposition.
    const { appels } = stubFetch(ACTIF);
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    fireEvent.click((await screen.findAllByRole('button', BOUTON_ECARTER))[1]);
    ecrireMotif('Le stress est déjà travaillé.');
    fireEvent.click(screen.getByRole('button', { name: /confirmer l’écartement/i }));

    await screen.findByText(/proposition écartée/i);
    const corps = corpsDesGestes(appels);
    expect(corps).toHaveLength(1);
    expect(corps[0]).toEqual({
      idPatient: 'PAT_SEED_03',
      cibleId: 'questionnaire:Q_STR_03',
      action: 'ecarter',
      motif: 'Le stress est déjà travaillé.',
    });
  });

  it('après le geste, c’est la RELECTURE qui déplace la ligne dans le repli', async () => {
    // Rien n'est déduit localement : le serveur seul sait si la proposition est
    // encore motivée, et une ligne peut revenir accompagnée d'un réveil.
    const { appels } = stubFetch(ACTIF, undefined, undefined, undefined, {
      orientationParAppel: [
        ACTIF,
        { ...ACTIF, recommandations: [RECOMMANDATION_PSQI], ecartees: [CUNGI_ECARTE] },
      ],
    });
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    fireEvent.click((await screen.findAllByRole('button', BOUTON_ECARTER))[1]);
    ecrireMotif('Le stress est déjà travaillé.');
    fireEvent.click(screen.getByRole('button', { name: /confirmer l’écartement/i }));

    expect(await screen.findByText('1 exploration écartée')).toBeTruthy();
    // Motif, auteur et date voyagent avec la ligne : rien n'est effacé.
    expect(screen.getByText('Le stress est déjà travaillé en consultation.')).toBeTruthy();
    expect(screen.getByText(/Écartée le 13\/09\/2026 par praticien@wellneuro\.fr/)).toBeTruthy();
    // Et la ligne a quitté la liste à traiter.
    expect(screen.queryAllByRole('button', BOUTON_ECARTER)).toHaveLength(1);
    expect(appels.filter(a => a.url.startsWith('/api/praticien/orientation?')).length).toBe(2);
  });

  it('un refus du serveur s’affiche AVEC son texte, et le motif saisi reste', async () => {
    // « Déjà écartée », « plus proposée », fil illisible : ces refus sont des
    // faits que le praticien peut avoir à considérer avant de réécrire. Effacer
    // sa saisie le ferait recommencer.
    stubFetch(ACTIF, undefined, undefined, undefined, {
      ecartement: { ok: false, reason: 'not_proposed', error: "Cette exploration n'est plus proposée : il n'y a rien à écarter. Rechargez la fiche." },
      ecartementOk: false,
    });
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    fireEvent.click((await screen.findAllByRole('button', BOUTON_ECARTER))[0]);
    ecrireMotif('Motif que je ne veux pas réécrire.');
    fireEvent.click(screen.getByRole('button', { name: /confirmer l’écartement/i }));

    expect(await screen.findByText(/n'est plus proposée/)).toBeTruthy();
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value)
      .toBe('Motif que je ne veux pas réécrire.');
  });

  it('« Annuler » referme le formulaire sans rien envoyer', async () => {
    const { appels } = stubFetch(ACTIF);
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    fireEvent.click((await screen.findAllByRole('button', BOUTON_ECARTER))[0]);
    ecrireMotif('Finalement non.');
    fireEvent.click(screen.getByRole('button', { name: /^annuler$/i }));

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(corpsDesGestes(appels)).toHaveLength(0);
  });

  it('la reprise part du repli, avec son propre motif obligatoire', async () => {
    const { appels } = stubFetch(
      { ...ACTIF, recommandations: [RECOMMANDATION_PSQI], ecartees: [CUNGI_ECARTE] },
      undefined,
      undefined,
      undefined,
      {},
    );
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    fireEvent.click(await screen.findByRole('button', { name: /reprendre cette exploration/i }));
    const confirmer = screen.getByRole('button', { name: /confirmer la reprise/i });
    // Rouvrir une exploration qu'on avait refusée se justifie autant que
    // l'avoir refusée.
    expect(confirmer.hasAttribute('disabled')).toBe(true);
    ecrireMotif('Le sommeil s’est dégradé depuis.');
    fireEvent.click(confirmer);

    await screen.findByText(/proposition reprise/i);
    expect(corpsDesGestes(appels)[0]).toEqual({
      idPatient: 'PAT_SEED_03',
      cibleId: 'questionnaire:Q_STR_03',
      action: 'reprendre',
      motif: 'Le sommeil s’est dégradé depuis.',
    });
  });

  it('un RÉVEIL est signalé, daté, motivé, et sa règle neuve reste en traçabilité', async () => {
    // LE CAS QUI FAIT TENIR `DC-30`. Une ligne écartée revient quand un AUTRE
    // axe la motive ; sans ce signal, sa réapparition se lirait comme un défaut
    // de l'écran alors que c'est le comportement voulu.
    stubFetch({
      ...ACTIF,
      recommandations: [{
        ...RECOMMANDATION_CUNGI,
        reveil: {
          reglesNouvelles: ['R-SOM-01'],
          ecarteLe: '2026-09-13T10:00:00.000Z',
          motif: 'Le stress est déjà travaillé en consultation.',
        },
      }],
    });
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/revient : une nouvelle indication la motive/i)).toBeTruthy();
    expect(screen.getByText(/Écartée le 13\/09\/2026 : Le stress est déjà travaillé/)).toBeTruthy();
    expect(screen.getByText('revenue')).toBeTruthy();
    // L'identifiant de règle n'est pas du langage praticien (audit 2026-09-02) :
    // il est présent, en repli, comme partout ailleurs dans ce panneau.
    expect(screen.getByText('R-SOM-01')).toBeTruthy();
  });

  it('liste vide AVEC des écartées : l’écran ne dit pas « aucune exploration proposée »', async () => {
    // Ce serait faux : la table en propose, et c'est le praticien qui les a
    // écartées. Une absence à l'écran ne doit pas se lire comme une absence de
    // fait (`DC-24`).
    stubFetch({ ...ACTIF, recommandations: [], ecartees: [CUNGI_ECARTE] });
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/ont toutes été écartées/)).toBeTruthy();
    expect(screen.queryByText(/Aucune exploration complémentaire n’est proposée/)).toBeNull();
    // Et le repli est là, sinon le geste serait irréversible depuis cet écran.
    expect(screen.getByText('1 exploration écartée')).toBeTruthy();
    expect(screen.getByRole('button', { name: /reprendre cette exploration/i })).toBeTruthy();
  });

  it('liste vide SANS écartée : la phrase d’origine, et aucun repli', async () => {
    stubFetch({ ...ACTIF, recommandations: [], ecartees: [] });
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/Aucune exploration complémentaire n’est proposée/)).toBeTruthy();
    expect(screen.queryByText(/exploration écartée/)).toBeNull();
  });

  it('un geste réussi sur le dossier A ne s’annonce PAS sur le dossier B', async () => {
    // DÉFAUT BLOQUANT TROUVÉ EN REVUE (2026-09-13). `enregistrerGeste` était le
    // seul appel asynchrone de ce fichier sans garde de péremption, alors que
    // l'en-tête documente ce défaut exact pour l'ajout à la file. Sans elle,
    // l'écran du dossier B affichait un message vert affirmant qu'une proposition
    // venait d'y être écartée — et renvoyant vers un repli qui peut être absent.
    let resoudrePost: ((valeur: unknown) => void) | undefined;
    const mock = vi.fn((url: string, init?: RequestInit) => {
      if (url.startsWith('/api/praticien/orientation/ecartement')) {
        return new Promise(resoudre => { resoudrePost = resoudre; });
      }
      if (url.startsWith('/api/praticien/file-envoi')) {
        return Promise.resolve(json({ brouillons: [] }));
      }
      return Promise.resolve(json(ACTIF));
    });
    vi.stubGlobal('fetch', mock);

    const { rerender } = render(<OrientationPanel idPatient="PAT_A" />);
    fireEvent.click((await screen.findAllByRole('button', BOUTON_ECARTER))[0]);
    ecrireMotif('Écarté sur le dossier A.');
    fireEvent.click(screen.getByRole('button', { name: /confirmer l’écartement/i }));

    // Le praticien change de dossier AVANT que le POST réponde.
    rerender(<OrientationPanel idPatient="PAT_B" />);
    await screen.findAllByRole('button', BOUTON_ECARTER);

    // La réponse arrive maintenant, et elle concerne le dossier A.
    resoudrePost?.(json({ ok: true, ecartementId: 'ec_1' }));
    await new Promise(resoudre => setTimeout(resoudre, 0));

    expect(screen.queryByText(/proposition écartée/i)).toBeNull();
    // Et l'écran de B reste utilisable : `gesteEnCours` n'est pas resté à vrai.
    expect((await screen.findAllByRole('button', BOUTON_ECARTER))[0].hasAttribute('disabled'))
      .toBe(false);
  });

  it('une ligne ÉTEINTE et écartée garde sa qualification dans le repli', async () => {
    // PERTE RELEVÉE EN REVUE. Deux faits de natures différentes : l'extinction
    // vient de la table d'arrêt, l'écartement du praticien. Le repli n'affichait
    // que le second, si bien qu'écarter une ligne éteinte faisait disparaître de
    // l'écran la qualification qui explique POURQUOI l'exploration avait cessé
    // d'être proposée. Écarter ne dé-qualifie pas (`D-055`).
    stubFetch({
      ...ACTIF,
      recommandations: [],
      ecartees: [{
        ...CUNGI_ECARTE,
        extinction: {
          stopRuleId: 'STOP-STR-01',
          motif: 'Le stress déclaré est retombé sous le seuil publié.',
          conditions: ['PSS-10 sous son seuil'],
          claims: [{ claimId: 'WN-CLM-0042', versionClaim: 'v1.0' }],
        },
      }],
    });
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('1 exploration écartée')).toBeTruthy();
    expect(screen.getByText('exploration éteinte')).toBeTruthy();
    expect(screen.getByText(/Le stress déclaré est retombé/)).toBeTruthy();
    // Et le motif d'écartement reste là, distinct de celui de l'extinction.
    expect(screen.getByText('Le stress est déjà travaillé en consultation.')).toBeTruthy();
    // LA PROVENANCE AUSSI : écarter ne dé-qualifie pas, et ne doit pas dé-sourcer.
    // L'identifiant de règle d'arrêt et le claim sont ce qui permet d'expliquer une
    // extinction contestée des mois plus tard.
    expect(screen.getByText('PSS-10 sous son seuil')).toBeTruthy();
    expect(screen.getByText(/STOP-STR-01 \(WN-CLM-0042\)/)).toBeTruthy();
  });

  it('une écartée SANS extinction ne porte aucun badge d’extinction', async () => {
    // Contre-épreuve : sans elle, un badge rendu inconditionnellement passerait le
    // cas ci-dessus et qualifierait d'éteinte toute ligne écartée.
    stubFetch({ ...ACTIF, recommandations: [], ecartees: [CUNGI_ECARTE] });
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('1 exploration écartée')).toBeTruthy();
    expect(screen.queryByText('exploration éteinte')).toBeNull();
  });

  it('plusieurs écartées : le repli les compte au pluriel', async () => {
    stubFetch({
      ...ACTIF,
      recommandations: [],
      ecartees: [
        CUNGI_ECARTE,
        { ...CUNGI_ECARTE, ecartementId: 'ec_psqi', cible: { type: 'questionnaire' as const, questionnaireId: 'Q_SOM_01' } },
      ],
    });
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText('2 explorations écartées')).toBeTruthy();
  });
});

describe('OrientationPanel — PRA-3b, PR 3 (Q11 a), à sa place dans l’onglet Trajectoire', () => {
  it('chaque bouton fait 44 px au moins et porte un anneau de focus', async () => {
    stubFetch(ACTIF);
    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    fireEvent.click((await screen.findAllByRole('button', BOUTON_ECARTER))[0]);
    const boutons = screen.getAllByRole('button');
    expect(boutons.length).toBeGreaterThan(2);
    for (const bouton of boutons) {
      expect(bouton.className).toContain('min-h-11');
      expect(bouton.className).toContain('focus-visible:ring-2');
    }
  });
});
