import { describe, expect, it } from 'vitest';
import type { ResultatOrientation } from '@/lib/clinical/orientationService';
import {
  construireBlocReglesNonEvaluees,
  passationsNonEvaluees,
  reglesNonEvalueesIds,
  TITRE_BLOC_REGLES_NON_EVALUEES,
} from './blocReglesNonEvaluees';

// [[D-471]], ligne t61 — le bloc des règles d'orientation non évaluées.

function orientation(reglesNonEvaluees: unknown): ResultatOrientation {
  return {
    actif: true,
    version: 'orientation-nnpp2-v1',
    sha256: 'abc',
    recommandations: [],
    ecartees: [],
    reglesNonEvaluees,
    arret: null,
  } as ResultatOrientation;
}

const PSS = { idQuestionnaire: 'Q_STR_02', dateReponse: '2026-03-12T09:30:00.000Z', fenetreJours: 30 };
const MOD = { idQuestionnaire: 'Q_MOD_01', dateReponse: '2026-09-01T09:30:00.000Z', fenetreJours: 21 };

describe('construireBlocReglesNonEvaluees', () => {
  it('rend la forme validée : titre, version, une ligne par passation', () => {
    const bloc = construireBlocReglesNonEvaluees(orientation([{ regleId: 'R2-STR-01', passations: [PSS] }]));
    expect(bloc).toBe([
      TITRE_BLOC_REGLES_NON_EVALUEES,
      'Version: orientation-nnpp2-v1',
      '',
      'Q_STR_02 — Échelle de stress perçu (PSS-10), passation du 2026-03-12 : au-delà de sa fenêtre de 30 jours.',
    ].join('\n'));
  });

  it('regroupe par passation, dans l’ordre de la table, comme le cockpit', () => {
    const bloc = construireBlocReglesNonEvaluees(orientation([
      { regleId: 'R2-STR-01', passations: [PSS] },
      { regleId: 'R2-MOD-01', passations: [MOD, PSS] },
      { regleId: 'R2-STR-02', passations: [PSS] },
    ]));
    const lignes = bloc.split('\n').slice(3);
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toMatch(/^Q_STR_02 /);
    expect(lignes[1]).toMatch(/^Q_MOD_01 /);
  });

  it('ne porte ni l’identifiant des règles, ni leur nombre', () => {
    const bloc = construireBlocReglesNonEvaluees(orientation([
      { regleId: 'R2-STR-01', passations: [PSS] },
      { regleId: 'R2-STR-02', passations: [PSS] },
    ]));
    expect(bloc).not.toContain('R2-');
    expect(bloc).not.toMatch(/\b2 règles\b/);
  });

  it('une fenêtre absente se dit inconnue, sans nombre inventé', () => {
    const bloc = construireBlocReglesNonEvaluees(orientation([
      { regleId: 'R', passations: [{ ...PSS, fenetreJours: null }] },
    ]));
    expect(bloc).toContain('passation du 2026-03-12 : fenêtre de fraîcheur inconnue.');
  });

  it('un instrument hors catalogue se nomme par son seul identifiant', () => {
    const bloc = construireBlocReglesNonEvaluees(orientation([
      { regleId: 'R', passations: [{ ...PSS, idQuestionnaire: 'Q_XXX_99' }] },
    ]));
    expect(bloc).toContain('\nQ_XXX_99, passation du 2026-03-12 :');
  });

  it('vide quand aucune règle n’est restée non évaluée, ou l’orientation inactive', () => {
    expect(construireBlocReglesNonEvaluees(orientation([]))).toBe('');
    expect(construireBlocReglesNonEvaluees(null)).toBe('');
    expect(construireBlocReglesNonEvaluees({ actif: false, version: 'v', message: 'm' })).toBe('');
  });

  it('ignore une forme malformée au lieu de jeter (lu hors du try du service)', () => {
    expect(construireBlocReglesNonEvaluees(orientation(undefined))).toBe('');
    expect(construireBlocReglesNonEvaluees(orientation([null, {}, { passations: [{}, { ...PSS, dateReponse: 'x' }] }]))).toBe('');
    expect(passationsNonEvaluees(orientation([{ regleId: 'R', passations: [{}, PSS] }]))).toEqual([PSS]);
  });
});

describe('reglesNonEvalueesIds — pour la trace seulement', () => {
  it('rend les identifiants dans l’ordre du moteur', () => {
    expect(reglesNonEvalueesIds(orientation([
      { regleId: 'R2-STR-01', passations: [PSS] },
      { regleId: 'R2-MOD-01', passations: [MOD] },
    ]))).toEqual(['R2-STR-01', 'R2-MOD-01']);
  });

  it('vide sans orientation active, ou sur une forme malformée', () => {
    expect(reglesNonEvalueesIds(null)).toEqual([]);
    expect(reglesNonEvalueesIds(orientation(undefined))).toEqual([]);
    expect(reglesNonEvalueesIds(orientation([null, { regleId: 3 }]))).toEqual([]);
  });
});
