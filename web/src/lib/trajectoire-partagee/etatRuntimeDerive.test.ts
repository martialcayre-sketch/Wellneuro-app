import { describe, expect, it } from 'vitest';
import type { DecisionCard } from '@/lib/clinical-engine/types';

import { deriverEtatRuntimePourPhases, type EntreesRuntimeDerive } from './etatRuntimeDerive';

// J3-cabinet ([[D-385]]) — la dérivation de l'état runtime sortie de
// `ClinicalRuntimeSection` se prouve seule. La constance du cockpit, elle, est
// prouvée par ses bancs existants (`onEtatChange`), inchangés.

/** Seuls les champs lus par les gardes de la carte ; le reste n'est pas consommé. */
const carte = (surcharge: Partial<DecisionCard> = {}): DecisionCard =>
  ({
    abstention: { status: 'not_required' },
    safetyFindingIds: [],
    priorityCandidates: [],
    selectedMainPriority: null,
    ...surcharge,
  }) as unknown as DecisionCard;

const entrees = (surcharge: Partial<EntreesRuntimeDerive> = {}): EntreesRuntimeDerive => ({
  chargement: false,
  erreur: null,
  carte: null,
  idCarteServie: null,
  preconditionsProposition: null,
  versions: { luesPourLaCarte: false, nombre: 0 },
  checkins: { lusPourLaCarte: false, pointsRenseignes: 0 },
  trajectoire: { statut: 'inconnue', cycles: null },
  ...surcharge,
});

describe('deriverEtatRuntimePourPhases', () => {
  it('rien de lu : chaque inconnu reste inconnu, jamais une valeur par défaut', () => {
    expect(deriverEtatRuntimePourPhases(entrees({ chargement: true }))).toEqual({
      chargement: true,
      erreur: null,
      episodeConfirme: false,
      nombreVersions: 0,
      versionsLues: false,
      suiviRenseigne: null,
      suiviOuvert: null,
      trajectoireErreur: false,
      trajectoireEnLecture: true,
      reevaluationMesuree: false,
      decisionBloquee: false,
      rideauT0Satisfait: null,
      selectionPrioriteDue: null,
    });
  });

  it('erreur et versions recopiées telles quelles', () => {
    const etat = deriverEtatRuntimePourPhases(entrees({ erreur: 'patient', versions: { luesPourLaCarte: true, nombre: 2 } }));
    expect(etat.erreur).toBe('patient');
    expect(etat.versionsLues).toBe(true);
    expect(etat.nombreVersions).toBe(2);
  });

  describe('épisode confirmé', () => {
    it('par une carte servie', () => {
      expect(deriverEtatRuntimePourPhases(entrees({ idCarteServie: 'carte-1' })).episodeConfirme).toBe(true);
    });
    it('par un cycle en base (D-118), même sans carte servie', () => {
      const etat = deriverEtatRuntimePourPhases(entrees({
        trajectoire: { statut: 'chargement', cycles: [{ jourZero: null, jalons: [] }] },
      }));
      expect(etat.episodeConfirme).toBe(true);
    });
  });

  describe('trajectoire', () => {
    it.each([
      ['inconnue', false, true],
      ['chargement', false, true],
      ['chargee', false, false],
      ['erreur', true, false],
    ] as const)('statut %s → erreur %s, en lecture %s', (statut, erreur, enLecture) => {
      const etat = deriverEtatRuntimePourPhases(entrees({ trajectoire: { statut, cycles: null } }));
      expect(etat.trajectoireErreur).toBe(erreur);
      expect(etat.trajectoireEnLecture).toBe(enLecture);
    });

    it('suivi ouvert : le jour 0 du cycle COURANT, seulement trajectoire chargée', () => {
      const cycles = [
        { jourZero: '2026-01-01T00:00:00.000Z', jalons: [] },
        { jourZero: null, jalons: [] },
      ];
      expect(deriverEtatRuntimePourPhases(entrees({ trajectoire: { statut: 'chargee', cycles } })).suiviOuvert).toBe(false);
      expect(
        deriverEtatRuntimePourPhases(entrees({ trajectoire: { statut: 'chargee', cycles: [...cycles].reverse() } })).suiviOuvert,
      ).toBe(true);
      expect(deriverEtatRuntimePourPhases(entrees({ trajectoire: { statut: 'chargee', cycles: null } })).suiviOuvert).toBe(false);
      expect(deriverEtatRuntimePourPhases(entrees({ trajectoire: { statut: 'erreur', cycles } })).suiviOuvert).toBeNull();
    });

    it('réévaluation : un jalon de MESURE mesuré, jamais l’ancre', () => {
      const ancreSeule = [{ jourZero: null, jalons: [{ jalon: 'T1', mesure: true }] }];
      const mesureNonFaite = [{ jourZero: null, jalons: [{ jalon: 'J21', mesure: false }] }];
      const mesuree = [{ jourZero: null, jalons: [{ jalon: 'T0', mesure: true }, { jalon: 'J21', mesure: true }] }];
      const lire = (cycles: EntreesRuntimeDerive['trajectoire']['cycles']) =>
        deriverEtatRuntimePourPhases(entrees({ trajectoire: { statut: 'chargee', cycles } })).reevaluationMesuree;
      expect(lire(ancreSeule)).toBe(false);
      expect(lire(mesureNonFaite)).toBe(false);
      expect(lire(mesuree)).toBe(true);
    });
  });

  describe('suivi renseigné', () => {
    it('check-ins non lus pour la carte : inconnu', () => {
      expect(deriverEtatRuntimePourPhases(entrees({ checkins: { lusPourLaCarte: false, pointsRenseignes: 3 } })).suiviRenseigne).toBeNull();
    });
    it('lus : un point d’étape au moins', () => {
      expect(deriverEtatRuntimePourPhases(entrees({ checkins: { lusPourLaCarte: true, pointsRenseignes: 0 } })).suiviRenseigne).toBe(false);
      expect(deriverEtatRuntimePourPhases(entrees({ checkins: { lusPourLaCarte: true, pointsRenseignes: 1 } })).suiviRenseigne).toBe(true);
    });
  });

  describe('carte de décision', () => {
    it('sans carte : ni bloquée, ni sélection connue', () => {
      const etat = deriverEtatRuntimePourPhases(entrees());
      expect(etat.decisionBloquee).toBe(false);
      expect(etat.selectionPrioriteDue).toBeNull();
    });
    it('un constat de sécurité bloque, et ferme la sélection', () => {
      const etat = deriverEtatRuntimePourPhases(entrees({ carte: carte({ safetyFindingIds: ['constat-1'] }) }));
      expect(etat.decisionBloquee).toBe(true);
      expect(etat.selectionPrioriteDue).toBe(false);
    });
    it('sans constat, sans priorité retenue : la sélection est due (priorité libre ouverte)', () => {
      const etat = deriverEtatRuntimePourPhases(entrees({ carte: carte() }));
      expect(etat.decisionBloquee).toBe(false);
      expect(etat.selectionPrioriteDue).toBe(true);
    });
  });

  describe('rideau T0', () => {
    it('le verdict servi par la route, tel quel', () => {
      const avec = (satisfaite: boolean) =>
        deriverEtatRuntimePourPhases(entrees({
          preconditionsProposition: { dures: [{ id: 'autre', satisfaite: !satisfaite }, { id: 'rideau_t0', satisfaite }] },
        })).rideauT0Satisfait;
      expect(avec(true)).toBe(true);
      expect(avec(false)).toBe(false);
    });
    it('hors proposition, sans préconditions ou sans ligne du rideau : inconnu', () => {
      expect(deriverEtatRuntimePourPhases(entrees({ preconditionsProposition: null })).rideauT0Satisfait).toBeNull();
      expect(deriverEtatRuntimePourPhases(entrees({ preconditionsProposition: undefined })).rideauT0Satisfait).toBeNull();
      expect(
        deriverEtatRuntimePourPhases(entrees({ preconditionsProposition: { dures: [{ id: 'autre', satisfaite: true }] } }))
          .rideauT0Satisfait,
      ).toBeNull();
    });
  });
});
