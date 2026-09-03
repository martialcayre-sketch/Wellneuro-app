import { describe, expect, it } from 'vitest';
import type { ContradictionAffichee } from '@/lib/clinical/contradictionsService';
import { recoupementsContradictions } from './recoupementContradictions';

// D-119 — le recoupement est une INTERSECTION D'IDENTIFIANTS, rien d'autre.
// Ce banc éprouve les deux faits joignables (instrument via la provenance des
// candidats, canal de plainte), et surtout ce que le module NE fait PAS :
// joindre une convergence, une résolue, ou deux instruments sans lien.

function constat(surcharge: Partial<ContradictionAffichee> = {}): ContradictionAffichee {
  return {
    id: 'C-STR',
    forme: 'DISCORDANCE',
    description: 'Stress déclaré discordant entre instruments.',
    actionSuggeree: 'Reprendre en entretien.',
    hypotheses: [],
    limitations: [],
    passations: [
      { idQuestionnaire: 'Q_MOD_01', date: '2026-03-12', dateLisible: '12/03/2026' },
      { idQuestionnaire: 'Q_STR_04', date: '2026-08-10', dateLisible: '10/08/2026' },
    ],
    ecartJours: 151,
    claims: [],
    importance: 'useful_not_urgent',
    resolution: { statut: 'ouverte' },
    regleId: 'C-STR',
    ...surcharge,
  };
}

const snapshot = {
  sourceRefs: [
    { responseId: 'REP_MOD', questionnaireId: 'Q_MOD_01' },
    { responseId: 'REP_SOM', questionnaireId: 'Q_SOM_01' },
  ],
};

const carte = {
  priorityCandidates: [
    { label: 'Axe stress et adaptation', provenance: { responseIds: ['REP_MOD'] } },
    { label: 'Axe sommeil', provenance: { responseIds: ['REP_SOM'] } },
  ],
};

describe('recoupementsContradictions (`D-119`)', () => {
  it('joint par instrument : le candidat fondé sur une passation confrontée est nommé, lui seul', () => {
    const resultat = recoupementsContradictions({
      contradictions: [constat()],
      snapshot,
      decisionCard: carte,
      canalPlainte: 'Q_MOD_03',
    });
    expect(resultat).toEqual([{
      // L'id est RECOPIÉ du constat pour servir de clé stable à la liste — il
      // ne s'affiche pas (audit 2026-09-02 : pas de référence au code à l'écran).
      id: 'C-STR',
      description: 'Stress déclaré discordant entre instruments.',
      candidats: ['Axe stress et adaptation'],
      canalPlainte: false,
    }]);
  });

  it('signale le canal de plainte quand la contradiction le confronte, même sans candidat', () => {
    const resultat = recoupementsContradictions({
      contradictions: [constat({
        passations: [{ idQuestionnaire: 'Q_MOD_03', date: '2026-08-19', dateLisible: '19/08/2026' }],
      })],
      snapshot,
      decisionCard: carte,
      canalPlainte: 'Q_MOD_03',
    });
    expect(resultat).toEqual([{
      // L'id est RECOPIÉ du constat pour servir de clé stable à la liste — il
      // ne s'affiche pas (audit 2026-09-02 : pas de référence au code à l'écran).
      id: 'C-STR',
      description: 'Stress déclaré discordant entre instruments.',
      candidats: [],
      canalPlainte: true,
    }]);
  });

  it('sans intersection, rien n’est rendu — le détail complet vit déjà en Données fiables', () => {
    const resultat = recoupementsContradictions({
      contradictions: [constat({
        passations: [{ idQuestionnaire: 'Q_GAS_01', date: '2026-08-19', dateLisible: '19/08/2026' }],
      })],
      snapshot,
      decisionCard: carte,
      canalPlainte: 'Q_MOD_03',
    });
    expect(resultat).toEqual([]);
  });

  it('une CONVERGENCE n’oppose rien et une résolue est close : ni l’une ni l’autre ne se joint', () => {
    const resultat = recoupementsContradictions({
      contradictions: [
        constat({ forme: 'CONVERGENCE' }),
        constat({ resolution: { statut: 'resolue', motif: 'Reprise en entretien.' } }),
      ],
      snapshot,
      decisionCard: carte,
      canalPlainte: 'Q_MOD_03',
    });
    expect(resultat).toEqual([]);
  });

  it('une passation du candidat absente du snapshot ne joint rien — aucun instrument inventé', () => {
    const resultat = recoupementsContradictions({
      contradictions: [constat()],
      snapshot: { sourceRefs: [] },
      decisionCard: carte,
      canalPlainte: 'Q_MOD_03',
    });
    expect(resultat).toEqual([]);
  });
});
