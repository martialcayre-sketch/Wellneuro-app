import { describe, expect, it } from 'vitest';

import { BESOIN_SOURCES } from '@/lib/equilibre/constants';
import { IDS_ASSIGNABLES } from '@/lib/bibliotheque';
import {
  besoinsDeRepassation,
  questionnairesACompleter,
  questionnairesCiblesPourPriorite,
  questionnairesProposables,
} from './repassationCiblee';
import type { MotifNonMesureServi } from '@/lib/praticien/motifNonMesure';

// Ce que ce banc défend (LOT-07, `D-058`) : la re-passation ciblée vise ce que
// la priorité FONDE (`needIds` → `BESOIN_SOURCES`), jamais le pack entier — et
// elle ne propose jamais un instrument que la route refuserait d'administrer.

describe('questionnairesCiblesPourPriorite', () => {
  it('cible les sources du besoin visé, et elles seules', () => {
    // Besoin 4 (digestif) : Q_GAS_01 et Q_INF_01 dans la table signée.
    const cibles = questionnairesCiblesPourPriorite([4]);
    const attendues = BESOIN_SOURCES[4]
      .map(source => source.idQuestionnaire)
      .filter(qid => IDS_ASSIGNABLES.has(qid));
    expect(cibles).toEqual(attendues);
    expect(cibles.length).toBeGreaterThan(0);
  });

  it('déduplique deux besoins partageant une source', () => {
    // Besoins 1 et 3 lisent tous deux Q_ALI_01 (total et sous-score) : une
    // seule proposition, pas deux boutons pour le même instrument.
    const cibles = questionnairesCiblesPourPriorite([1, 3]);
    expect(cibles.filter(qid => qid === 'Q_ALI_01')).toHaveLength(1);
  });

  it('une priorité sans provenance ne cible RIEN — jamais le pack entier à la place', () => {
    expect(questionnairesCiblesPourPriorite([])).toEqual([]);
  });

  it('un besoin sans source vivante ne cible rien', () => {
    // Besoin 2 : sources retirées en v4 (note en tête de constants.ts).
    expect(questionnairesCiblesPourPriorite([2])).toEqual([]);
  });

  it('un identifiant de besoin inconnu est ignoré sans lever', () => {
    expect(questionnairesCiblesPourPriorite([999])).toEqual([]);
  });

  it('l’ordre est déterministe : celui des besoins, puis des sources', () => {
    const unDeux = questionnairesCiblesPourPriorite([4, 9]);
    const memeAppel = questionnairesCiblesPourPriorite([4, 9]);
    expect(unDeux).toEqual(memeAppel);
  });

  it('ne propose que des instruments assignables par la file d’envoi', () => {
    // Tous les besoins d'un coup : pas un seul id hors de `IDS_ASSIGNABLES`,
    // LE prédicat de la route destinataire (`idsAssignablesPour`) — proposer
    // un instrument que la file refuserait serait un bouton cassé.
    const tous = questionnairesCiblesPourPriorite(Object.keys(BESOIN_SOURCES).map(Number));
    expect(tous.length).toBeGreaterThan(0);
    for (const qid of tous) {
      expect(IDS_ASSIGNABLES.has(qid), qid).toBe(true);
    }
  });
});

// t41 : la cible que la re-passation lit d'une carte — une seule dérivation,
// appliquée par l'écran à la carte affichée et par la route à celle de l'ancre.
describe('besoinsDeRepassation', () => {
  const candidat = (candidateId: string, needIds: number[]) => ({ candidateId, provenance: { needIds } });
  const carte = (surcharge: Record<string, unknown> = {}) => ({
    priorityCandidates: [candidat('priority:A', [4]), candidat('priority:B', [9, 12])],
    proposedMainPriorityId: 'priority:A',
    selectedMainPriority: null,
    ...surcharge,
  }) as unknown as Parameters<typeof besoinsDeRepassation>[0];
  const selection = (candidateId: string, libre?: Record<string, unknown>) => ({
    candidateId, selectedAt: '2026-08-13T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Motif.',
    ...(libre ? { libre } : {}),
  });

  it('sans carte, rien — et le même vide d’un appel à l’autre', () => {
    const un = besoinsDeRepassation(null);
    const deux = besoinsDeRepassation(null);
    expect(un).toEqual({ needIds: [], besoinsVises: [] });
    // Une référence stable : l'écran passe ces tableaux à un effet.
    expect(un.needIds).toBe(deux.needIds);
    expect(un.besoinsVises).toBe(deux.besoinsVises);
  });

  it('à défaut de sélection, vise la priorité PROPOSÉE — par la référence de la carte', () => {
    const lue = carte();
    const cible = besoinsDeRepassation(lue);
    expect(cible).toEqual({ needIds: [4], besoinsVises: [] });
    expect(cible.needIds).toBe(lue?.priorityCandidates[0].provenance.needIds);
  });

  it('la sélection du praticien l’emporte sur la proposition', () => {
    expect(besoinsDeRepassation(carte({ selectedMainPriority: selection('priority:B') })).needIds).toEqual([9, 12]);
  });

  it('une priorité posée ne vise aucun candidat, et transmet ses besoins visés', () => {
    const libre = { domaine: 'sommeil', libelle: 'Retrouver un sommeil réparateur', besoinsVises: [5] };
    expect(besoinsDeRepassation(carte({ selectedMainPriority: selection('libre:sommeil:0123456789abcdef', libre) })))
      .toEqual({ needIds: [], besoinsVises: [5] });
  });

  it('ni sélection ni proposition (table non signée) : rien', () => {
    expect(besoinsDeRepassation(carte({ proposedMainPriorityId: null }))).toEqual({ needIds: [], besoinsVises: [] });
  });
});

// « Compléter la mesure » ([[D-352]] §2) : le motif « aucune passation
// exploitable » seul, dérivé de la ligne servie, filtré comme la re-passation.
describe('questionnairesACompleter', () => {
  const ligne = (motif: MotifNonMesureServi['motif'], ids: string[]): MotifNonMesureServi => ({
    motif,
    idsQuestionnaire: ids,
    dateDernierePassation: null,
  });
  const assignables = BESOIN_SOURCES[4].map(s => s.idQuestionnaire).filter(qid => IDS_ASSIGNABLES.has(qid));

  it('propose les questionnaires de la ligne « aucune passation exploitable », et d’elle seule', () => {
    expect(assignables.length).toBeGreaterThan(0);
    const motifs = [
      ligne('aucune_passation', assignables),
      ligne('passation_ecartee', ['Q_ECARTE']),
      ligne('recueil_incomplet', ['Q_INCOMPLET']),
    ];
    expect(questionnairesACompleter(motifs)).toEqual(assignables);
  });

  it('aucun autre motif n’appelle une première passation', () => {
    for (const motif of [
      'hors_score',
      'sans_instrument',
      'passation_ecartee',
      'source_suspendue',
      'recueil_incomplet',
      'forme_sans_sous_score',
      'calcul_en_erreur',
      'sous_score_absent_ou_double',
    ] as const) {
      expect(questionnairesACompleter([ligne(motif, assignables)])).toEqual([]);
    }
  });

  it('un besoin mesuré (motif null) ne propose rien', () => {
    expect(questionnairesACompleter(null)).toEqual([]);
  });

  it('même filtre que la re-passation ciblée : un instrument non assignable n’est pas proposé', () => {
    expect(questionnairesACompleter([ligne('aucune_passation', ['Q_INEXISTANT', ...assignables])])).toEqual(assignables);
    expect(questionnairesCiblesPourPriorite([4])).toEqual(questionnairesProposables(BESOIN_SOURCES[4].map(s => s.idQuestionnaire)));
  });
});
