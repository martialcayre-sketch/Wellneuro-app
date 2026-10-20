import { describe, expect, it } from 'vitest';
import { raisonsARelire, regrouperParHypothese, type ActeConstatLu, type EtatDuDossier } from './aRelire';
import { RAISONS_A_RELIRE } from './liste';
import { codePostgres, estConflitConcurrent, estRefusDeLaBase } from './erreurs';

// « À relire », dérivé à la lecture ([[D-331]] §5) : chaque condition, seule,
// rend le constat « à relire » ; aucune ne tient, il tient.

const acte = (surcharge: Partial<ActeConstatLu>): ActeConstatLu => ({
  id: 'c1',
  ordre: '1',
  acte: 'pose',
  hypotheseCode: 'HYP_TEST_A',
  verdict: 'confirmee',
  motif: null,
  note: null,
  aRevoirLe: null,
  idConstatRemplace: null,
  praticienEmail: 'praticien@wellneuro.fr',
  acteLe: '2026-10-10T09:00:00.000Z',
  pieces: [
    { type: 'resultat', idResultat: 'res1' },
    { type: 'reponse', idReponse: 'rep1' },
  ],
  ...surcharge,
});

const etat = (surcharge: Partial<EtatDuDossier> = {}): EtatDuDossier => ({
  resultats: new Map([['res1', { analyteCode: 'BIO_TEST', preleveLe: '2026-10-01T08:00:00.000Z', corrigee: false, annulee: false }]]),
  dernierPrelevement: new Map([['BIO_TEST', '2026-10-01T08:00:00.000Z']]),
  reponses: new Map([['rep1', { idQuestionnaire: 'Q1', dateReponse: '2026-10-02T08:00:00.000Z', statutValidite: 'VALID' }]]),
  derniereReponse: new Map([['Q1', '2026-10-02T08:00:00.000Z']]),
  hypothesesEnVigueur: new Set(['HYP_TEST_A']),
  aujourdhui: '2026-10-20',
  ...surcharge,
});

describe('regrouperParHypothese — la tête suit l’ordre de la base', () => {
  it('une pose devient la tête, un remplacement la déplace, un retrait la vide', () => {
    const lues = regrouperParHypothese([
      acte({ id: 'c3', ordre: '10', acte: 'retrait', hypotheseCode: 'HYP_TEST_B', verdict: null, pieces: [] }),
      acte({ id: 'c2', ordre: '9', idConstatRemplace: 'c1' }),
      acte({ id: 'c1', ordre: '2' }),
      acte({ id: 'c0', ordre: '3', hypotheseCode: 'HYP_TEST_B' }),
    ]);
    expect(lues.map(h => [h.hypotheseCode, h.tete?.id ?? null, h.historique.map(a => a.id)])).toEqual([
      ['HYP_TEST_A', 'c2', ['c1', 'c2']],
      ['HYP_TEST_B', null, ['c0', 'c3']],
    ]);
  });

  it('l’ordre est numérique, pas lexical', () => {
    const [h] = regrouperParHypothese([acte({ id: 'neuf', ordre: '10' }), acte({ id: 'ancien', ordre: '9' })]);
    expect(h.tete?.id).toBe('neuf');
  });
});

describe('raisonsARelire (D-331 §5)', () => {
  it('rien ne tient : le constat tient', () => {
    expect(raisonsARelire(acte({}), etat())).toEqual([]);
  });

  it('chaque condition, seule', () => {
    const ligne = { analyteCode: 'BIO_TEST', preleveLe: '2026-10-01T08:00:00.000Z' };
    expect(raisonsARelire(acte({}), etat({ resultats: new Map([['res1', { ...ligne, corrigee: true, annulee: false }]]) })))
      .toEqual(['piece_corrigee']);
    expect(raisonsARelire(acte({}), etat({ resultats: new Map([['res1', { ...ligne, corrigee: false, annulee: true }]]) })))
      .toEqual(['piece_annulee']);
    expect(raisonsARelire(acte({}), etat({ dernierPrelevement: new Map([['BIO_TEST', '2026-10-15T08:00:00.000Z']]) })))
      .toEqual(['nouveau_prelevement']);
    expect(raisonsARelire(acte({}), etat({ derniereReponse: new Map([['Q1', '2026-10-15T08:00:00.000Z']]) })))
      .toEqual(['passation_plus_recente']);
    expect(raisonsARelire(acte({}), etat({
      reponses: new Map([['rep1', { idQuestionnaire: 'Q1', dateReponse: '2026-10-02T08:00:00.000Z', statutValidite: 'INVALID' }]]),
    }))).toEqual(['passation_invalidee']);
    expect(raisonsARelire(acte({ aRevoirLe: '2026-10-20' }), etat())).toEqual(['date_echue']);
    expect(raisonsARelire(acte({}), etat({ hypothesesEnVigueur: new Set() }))).toEqual(['hypothese_hors_structure']);
  });

  it('une date à venir ne compte pas ; une passation AMBIGUOUS reste retenue', () => {
    expect(raisonsARelire(acte({ aRevoirLe: '2026-10-21' }), etat())).toEqual([]);
    expect(raisonsARelire(acte({}), etat({
      reponses: new Map([['rep1', { idQuestionnaire: 'Q1', dateReponse: '2026-10-02T08:00:00.000Z', statutValidite: 'AMBIGUOUS' }]]),
    }))).toEqual([]);
  });

  it('le nouveau prélèvement se juge contre le PLUS RÉCENT prélèvement cité de l’analyte', () => {
    const constat = acte({ pieces: [{ type: 'resultat', idResultat: 'res1' }, { type: 'resultat', idResultat: 'res2' }] });
    const resultats = new Map([
      ['res1', { analyteCode: 'BIO_TEST', preleveLe: '2026-09-01T08:00:00.000Z', corrigee: false, annulee: false }],
      ['res2', { analyteCode: 'BIO_TEST', preleveLe: '2026-10-01T08:00:00.000Z', corrigee: false, annulee: false }],
    ]);
    expect(raisonsARelire(constat, etat({ resultats }))).toEqual([]);
  });

  it('plusieurs conditions se disent toutes, dans l’ordre de la liste', () => {
    const r = raisonsARelire(acte({ aRevoirLe: '2026-10-01' }), etat({
      hypothesesEnVigueur: new Set(),
      dernierPrelevement: new Map([['BIO_TEST', '2026-10-15T08:00:00.000Z']]),
    }));
    expect(r).toEqual(['nouveau_prelevement', 'date_echue', 'hypothese_hors_structure']);
    expect(r).toEqual(RAISONS_A_RELIRE.filter(x => r.includes(x)));
  });
});

describe('erreurs — le code Postgres, jamais le message', () => {
  it('lit les deux formes mesurées', () => {
    expect(codePostgres({ code: 'P2039', meta: { driverAdapterError: { cause: { code: 'P0001' } } } })).toBe('P0001');
    expect(codePostgres({ name: 'DriverAdapterError', cause: { code: 'P0001' } })).toBe('P0001');
    expect(codePostgres(new Error('P0001'))).toBeNull();
    expect(codePostgres(null)).toBeNull();
  });

  it('refus de trigger et course perdue', () => {
    expect(estRefusDeLaBase({ cause: { code: 'P0001' } })).toBe(true);
    expect(estRefusDeLaBase({ cause: { code: '23505' } })).toBe(false);
    expect(estConflitConcurrent({ cause: { code: '40001' } })).toBe(true);
    expect(estConflitConcurrent({ meta: { driverAdapterError: { cause: { code: '40P01' } } } })).toBe(true);
    expect(estConflitConcurrent({ code: 'P2034' })).toBe(true);
    expect(estConflitConcurrent({ cause: { code: 'P0001' } })).toBe(false);
  });
});
