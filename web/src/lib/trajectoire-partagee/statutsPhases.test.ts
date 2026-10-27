import { describe, expect, it } from 'vitest';

import {
  entreesPhaseDueDuDossier,
  phaseDueDuDossier,
  statutPhase,
  statutsDesPhases,
  type EntreesStatutsPhases,
  type EtatRuntimePourPhases,
} from './statutsPhases';

// J3-cabinet ([[D-385]]) — le moteur des statuts sorti de la fiche se prouve
// seul, sans composant. Ces cas fixent chaque branche ; la constance de la
// fiche, elle, est prouvée par ses bancs existants, inchangés.

const runtime = (surcharge: Partial<EtatRuntimePourPhases> = {}): EtatRuntimePourPhases => ({
  chargement: false,
  erreur: null,
  episodeConfirme: true,
  nombreVersions: 1,
  versionsLues: true,
  suiviRenseigne: true,
  suiviOuvert: true,
  trajectoireErreur: false,
  trajectoireEnLecture: false,
  reevaluationMesuree: true,
  decisionBloquee: false,
  rideauT0Satisfait: null,
  selectionPrioriteDue: false,
  ...surcharge,
});

/** Un dossier où tout est renseigné : chaque cas n'écarte qu'une condition. */
const entrees = (surcharge: Partial<EntreesStatutsPhases> = {}): EntreesStatutsPhases => ({
  lecturesDeBase: 'ok',
  corrections: { etat: 'chargees', enAttente: 0 },
  passations: { etat: 'chargees', assignees: 3 },
  phase3: { lu: 'lu', etat: { objectifsActifs: 1, synthesePubliee: true, demandesCorrectionEnAttente: 0 } },
  runtime: runtime(),
  ...surcharge,
});

describe('statutPhase', () => {
  it('un dossier complet : les sept phases renseignées, rien de dû', () => {
    const e = entrees();
    expect(Object.values(statutsDesPhases(e))).toEqual(Array(7).fill('fait'));
    expect(phaseDueDuDossier(e)).toBeNull();
  });

  it('lectures de base indisponibles : tout est indéterminé, rien de dû', () => {
    const e = entrees({ lecturesDeBase: 'indisponible' });
    expect(Object.values(statutsDesPhases(e))).toEqual(Array(7).fill('inconnu'));
    expect(phaseDueDuDossier(e)).toBeNull();
    expect(entreesPhaseDueDuDossier(e).chargement).toBe(true);
  });

  describe('patient', () => {
    it('une correction en attente', () => {
      expect(statutPhase('patient', entrees({ corrections: { etat: 'chargees', enAttente: 2 } }))).toBe('en_attente');
    });
    it('lecture des corrections en échec : indéterminée, jamais « rien en attente »', () => {
      expect(statutPhase('patient', entrees({ corrections: { etat: 'erreur', enAttente: 0 } }))).toBe('inconnu');
    });
  });

  describe('donnees', () => {
    const sansEpisode = (r: Partial<EtatRuntimePourPhases>) => runtime({ episodeConfirme: false, ...r });
    it.each(['erreur', 'tronque'] as const)('envois en %s : indéterminée', etat => {
      expect(statutPhase('donnees', entrees({ passations: { etat, assignees: 3 } }))).toBe('inconnu');
    });
    it('runtime absent ou en chargement : indéterminée', () => {
      expect(statutPhase('donnees', entrees({ runtime: null }))).toBe('inconnu');
      expect(statutPhase('donnees', entrees({ runtime: runtime({ chargement: true }) }))).toBe('inconnu');
    });
    it("l'ancre confirmée vaut verdict, même sans verdict du rideau", () => {
      expect(statutPhase('donnees', entrees({ runtime: runtime({ rideauT0Satisfait: null }) }))).toBe('fait');
    });
    it('verdict du rideau absent : indéterminée', () => {
      expect(statutPhase('donnees', entrees({ runtime: sansEpisode({ rideauT0Satisfait: null }) }))).toBe('inconnu');
    });
    it('rideau satisfait : renseignée, même sans envoi (le verdict avant l’acteur)', () => {
      expect(
        statutPhase('donnees', entrees({
          passations: { etat: 'chargees', assignees: 0 },
          runtime: sansEpisode({ rideauT0Satisfait: true }),
        })),
      ).toBe('fait');
    });
    it('rideau incomplet : à ouvrir sans envoi, en attente sinon', () => {
      const incomplet = sansEpisode({ rideauT0Satisfait: false });
      expect(statutPhase('donnees', entrees({ passations: { etat: 'chargees', assignees: 0 }, runtime: incomplet }))).toBe('a_ouvrir');
      expect(statutPhase('donnees', entrees({ passations: { etat: 'chargees', assignees: 2 }, runtime: incomplet }))).toBe('en_attente');
    });
  });

  describe('comprehension', () => {
    it('lecture en vol, en échec, ou sans état : indéterminée', () => {
      expect(statutPhase('comprehension', entrees({ phase3: { lu: 'chargement', etat: null } }))).toBe('inconnu');
      expect(statutPhase('comprehension', entrees({ phase3: { lu: 'erreur', etat: null } }))).toBe('inconnu');
      expect(statutPhase('comprehension', entrees({ phase3: { lu: 'lu', etat: null } }))).toBe('inconnu');
    });
    it.each([
      { objectifsActifs: 0, synthesePubliee: true, demandesCorrectionEnAttente: 0 },
      { objectifsActifs: 1, synthesePubliee: false, demandesCorrectionEnAttente: 0 },
      { objectifsActifs: 1, synthesePubliee: true, demandesCorrectionEnAttente: 1 },
    ])('les trois conditions, pas une ou deux : %o → en attente', etat => {
      expect(statutPhase('comprehension', entrees({ phase3: { lu: 'lu', etat } }))).toBe('en_attente');
    });
  });

  describe('phases du runtime', () => {
    it.each(['decision', 'actions', 'suivi', 'reevaluation'] as const)(
      '%s : runtime absent, en chargement ou en erreur → indéterminée',
      id => {
        expect(statutPhase(id, entrees({ runtime: null }))).toBe('inconnu');
        expect(statutPhase(id, entrees({ runtime: runtime({ chargement: true }) }))).toBe('inconnu');
        expect(statutPhase(id, entrees({ runtime: runtime({ erreur: 'technical' }) }))).toBe('inconnu');
      },
    );

    it('decision : épisode non confirmé → en attente ; carte illisible → indéterminée ; sélection due → en attente', () => {
      expect(statutPhase('decision', entrees({ runtime: runtime({ episodeConfirme: false }) }))).toBe('en_attente');
      expect(statutPhase('decision', entrees({ runtime: runtime({ selectionPrioriteDue: null }) }))).toBe('inconnu');
      expect(statutPhase('decision', entrees({ runtime: runtime({ selectionPrioriteDue: true }) }))).toBe('en_attente');
    });

    it('actions : une version suffit ; sans épisode à ouvrir ; versions non lues indéterminées', () => {
      expect(statutPhase('actions', entrees({ runtime: runtime({ nombreVersions: 1, episodeConfirme: false }) }))).toBe('fait');
      expect(statutPhase('actions', entrees({ runtime: runtime({ nombreVersions: 0, episodeConfirme: false }) }))).toBe('a_ouvrir');
      expect(statutPhase('actions', entrees({ runtime: runtime({ nombreVersions: 0, versionsLues: false }) }))).toBe('inconnu');
      expect(statutPhase('actions', entrees({ runtime: runtime({ nombreVersions: 0, versionsLues: true }) }))).toBe('en_attente');
    });

    it('suivi : sans épisode ou sans diffusion à ouvrir ; inconnus rendus tels quels', () => {
      expect(statutPhase('suivi', entrees({ runtime: runtime({ episodeConfirme: false }) }))).toBe('a_ouvrir');
      expect(statutPhase('suivi', entrees({ runtime: runtime({ suiviOuvert: null }) }))).toBe('inconnu');
      expect(statutPhase('suivi', entrees({ runtime: runtime({ suiviOuvert: false }) }))).toBe('a_ouvrir');
      expect(statutPhase('suivi', entrees({ runtime: runtime({ suiviRenseigne: null }) }))).toBe('inconnu');
      expect(statutPhase('suivi', entrees({ runtime: runtime({ suiviRenseigne: false }) }))).toBe('en_attente');
    });

    it('réévaluation : trajectoire en échec ou en lecture → indéterminée ; non mesurée → à ouvrir', () => {
      expect(statutPhase('reevaluation', entrees({ runtime: runtime({ trajectoireErreur: true }) }))).toBe('inconnu');
      expect(statutPhase('reevaluation', entrees({ runtime: runtime({ trajectoireEnLecture: true }) }))).toBe('inconnu');
      expect(statutPhase('reevaluation', entrees({ runtime: runtime({ reevaluationMesuree: false }) }))).toBe('a_ouvrir');
    });
  });
});

describe('phaseDueDuDossier (règle D5, mémoire exclue)', () => {
  it('runtime absent ou en chargement : rien de dû, état non établi', () => {
    expect(phaseDueDuDossier(entrees({ runtime: null }))).toBeNull();
    expect(phaseDueDuDossier(entrees({ runtime: runtime({ chargement: true }) }))).toBeNull();
  });

  it('le bloqueur de sécurité prime : décision bloquée → actions', () => {
    const e = entrees({
      corrections: { etat: 'chargees', enAttente: 1 },
      runtime: runtime({ decisionBloquee: true }),
    });
    expect(entreesPhaseDueDuDossier(e).bloqueurs).toEqual(['actions']);
    expect(phaseDueDuDossier(e)).toBe('actions');
  });

  it('un runtime en erreur ne porte ni bloqueur ni décision exigible', () => {
    const e = entreesPhaseDueDuDossier(
      entrees({ runtime: runtime({ erreur: 'technical', decisionBloquee: true, episodeConfirme: false }) }),
    );
    expect(e.bloqueurs).toEqual([]);
    expect(e.actionsExigibles).toEqual([]);
  });

  it('les actions exigibles, dans l’ordre du cycle : correction → patient avant décision', () => {
    const e = entrees({
      corrections: { etat: 'chargees', enAttente: 1 },
      runtime: runtime({ episodeConfirme: false }),
    });
    expect(entreesPhaseDueDuDossier(e).actionsExigibles).toEqual(['patient', 'decision']);
    expect(phaseDueDuDossier(e)).toBe('patient');
  });

  it('un dossier neuf, épisode non confirmé : Décision 21 j', () => {
    const neuf = entrees({
      passations: { etat: 'chargees', assignees: 0 },
      phase3: { lu: 'lu', etat: { objectifsActifs: 0, synthesePubliee: false, demandesCorrectionEnAttente: 0 } },
      runtime: runtime({
        episodeConfirme: false,
        nombreVersions: 0,
        rideauT0Satisfait: false,
        selectionPrioriteDue: null,
        reevaluationMesuree: false,
      }),
    });
    expect(phaseDueDuDossier(neuf)).toBe('decision');
  });

  it('sans action exigible : la première phase en attente, puis la première à ouvrir', () => {
    expect(phaseDueDuDossier(entrees({ runtime: runtime({ suiviRenseigne: false, reevaluationMesuree: false }) }))).toBe('suivi');
    expect(phaseDueDuDossier(entrees({ runtime: runtime({ reevaluationMesuree: false }) }))).toBe('reevaluation');
  });

  it('un statut inconnu n’est jamais dû : la phase suivante qui l’est est désignée', () => {
    expect(
      phaseDueDuDossier(entrees({
        runtime: runtime({ selectionPrioriteDue: null, suiviRenseigne: false }),
      })),
    ).toBe('suivi');
  });
});
