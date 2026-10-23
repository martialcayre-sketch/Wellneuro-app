import { describe, expect, it } from 'vitest';
import { raisonsARelireBesoin, regrouperParBesoin, type ActeConstatBesoinLu, type EtatPourBesoins } from './aRelire';

// « À relire », dérivé jamais écrit ([[D-347]] §5) : les conditions de
// [[D-331]] §5 sur les pièces, la date atteinte, le besoin qui gagne un score.

const acte = (surcharge: Partial<ActeConstatBesoinLu> = {}): ActeConstatBesoinLu => ({
  id: 'c1',
  ordre: '1',
  acte: 'pose',
  besoin: 6,
  verdict: 'a_soutenir',
  motif: null,
  note: null,
  aRevoirLe: null,
  idConstatRemplace: null,
  praticienEmail: 'praticien@wellneuro.fr',
  acteLe: '2026-10-10T09:00:00.000Z',
  pieces: [],
  ...surcharge,
});

const etat = (surcharge: Partial<EtatPourBesoins> = {}): EtatPourBesoins => ({
  resultats: new Map(),
  dernierPrelevement: new Map(),
  reponses: new Map(),
  derniereReponse: new Map(),
  besoinsAvecScore: new Set(),
  aujourdhui: '2026-10-23',
  ...surcharge,
});

describe('regrouperParBesoin', () => {
  it('une pose devient la tête, un retrait la vide ; l’ordre de la base fait foi', () => {
    const lus = regrouperParBesoin([
      acte({ id: 'c3', ordre: '3', besoin: 2 }),
      acte({ id: 'c1', ordre: '1' }),
      acte({ id: 'r2', ordre: '2', acte: 'retrait', verdict: null, idConstatRemplace: 'c1' }),
    ]);
    expect(lus.map(b => [b.besoin, b.tete?.id ?? null, b.historique.map(a => a.id)])).toEqual([
      [2, 'c3', ['c3']],
      [6, null, ['c1', 'r2']],
    ]);
  });
});

describe('raisonsARelireBesoin', () => {
  it('sans pièce, sans date, besoin sans score : le constat tient', () => {
    expect(raisonsARelireBesoin(acte(), etat())).toEqual([]);
  });

  it('pièces de biologie : corrigée, annulée, prélèvement plus récent', () => {
    const constat = acte({ pieces: [{ type: 'resultat', idResultat: 'res1' }] });
    const resultats = new Map([['res1', { analyteCode: 'BIO_TEST', preleveLe: '2026-10-01T08:00:00.000Z', corrigee: true, annulee: true }]]);
    expect(raisonsARelireBesoin(constat, etat({
      resultats,
      dernierPrelevement: new Map([['BIO_TEST', '2026-10-15T08:00:00.000Z']]),
    }))).toEqual(['piece_corrigee', 'piece_annulee', 'nouveau_prelevement']);
  });

  it('pièces de questionnaire : passation invalidée, passation plus récente', () => {
    const constat = acte({ pieces: [{ type: 'reponse', idReponse: 'rep1' }] });
    expect(raisonsARelireBesoin(constat, etat({
      reponses: new Map([['rep1', { idQuestionnaire: 'Q_TEST', dateReponse: '2026-10-01T08:00:00.000Z', statutValidite: 'INVALID' }]]),
      derniereReponse: new Map([['Q_TEST', '2026-10-20T08:00:00.000Z']]),
    }))).toEqual(['passation_plus_recente', 'passation_invalidee']);
  });

  it('la date « à revoir le » atteinte compte le jour même, pas la veille', () => {
    expect(raisonsARelireBesoin(acte({ aRevoirLe: '2026-10-23' }), etat())).toEqual(['date_echue']);
    expect(raisonsARelireBesoin(acte({ aRevoirLe: '2026-10-24' }), etat())).toEqual([]);
  });

  it('le besoin qui gagne une source de score rend le constat « à relire », et lui seul', () => {
    expect(raisonsARelireBesoin(acte(), etat({ besoinsAvecScore: new Set([6]) }))).toEqual(['besoin_avec_score']);
    expect(raisonsARelireBesoin(acte({ besoin: 7 }), etat({ besoinsAvecScore: new Set([6]) }))).toEqual([]);
  });
});
