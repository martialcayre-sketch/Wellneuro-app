import { describe, expect, it } from 'vitest';
import { lireDemandeConstatBesoin, type ContexteDemande } from './demande';
import { BESOINS_CONSTATABLES, LIBELLES_MOTIF, MOTIFS_PAR_VERDICT, VERDICTS } from './liste';

// La demande d'un geste de constat sur un besoin ([[D-347]] §2-§4), lue avant
// toute écriture. La liste fermée est celle des CHECK de la migration.

const contexte = (surcharge: Partial<ContexteDemande> = {}): ContexteDemande => ({
  aujourdhui: '2026-10-23',
  besoinsAvecScore: new Set(),
  biologieCitable: true,
  ...surcharge,
});

const pose = (surcharge: Record<string, unknown> = {}) => ({ acte: 'pose', besoin: 6, verdict: 'a_soutenir', ...surcharge });
const raison = (corps: Record<string, unknown>, ctx = contexte()) => {
  const lu = lireDemandeConstatBesoin(corps, ctx);
  return lu.ok ? 'ok' : lu.raison;
};

describe('la liste fermée ([[D-347]] §3)', () => {
  it('quatre besoins, quatre verdicts, neuf motifs, chacun libellé', () => {
    expect(BESOINS_CONSTATABLES).toEqual([2, 6, 7, 11]);
    expect(VERDICTS).toEqual(['a_soutenir', 'non_retenu', 'non_evaluable', 'sans_objet']);
    const motifs = new Set(Object.values(MOTIFS_PAR_VERDICT).flat());
    expect(motifs.size).toBe(9);
    for (const m of motifs) expect(LIBELLES_MOTIF[m]).toBeTruthy();
  });

  it('aucun libellé ne juge un état ni ne pose un diagnostic', () => {
    const textes = JSON.stringify(LIBELLES_MOTIF);
    expect(textes).not.toMatch(/satisfait|couvert|déficit|carence|normal|anormal/i);
  });
});

describe('lireDemandeConstatBesoin — pose', () => {
  it('« à soutenir » sans motif ni pièce : lue', () => {
    expect(lireDemandeConstatBesoin(pose(), contexte())).toEqual({
      ok: true,
      demande: { acte: 'pose', besoin: 6, remplace: null, verdict: 'a_soutenir', motif: null, note: null, aRevoirLe: null, pieces: [] },
    });
  });

  it('besoin hors de 2, 6, 7 et 11, ou mal typé : refusé', () => {
    for (const besoin of [1, 3, 12, '6', 6.5, null]) expect(raison(pose({ besoin }))).toBe('besoin_invalide');
  });

  it('besoin qui porte une source de score : la pose est refusée, le retrait non', () => {
    const ctx = contexte({ besoinsAvecScore: new Set([6]) });
    expect(raison(pose(), ctx)).toBe('besoin_avec_score');
    expect(raison({ acte: 'retrait', besoin: 6, remplace: 'c1' }, ctx)).toBe('ok');
  });

  it('motif : interdit avec « à soutenir », exigé et pris dans la liste du verdict ailleurs', () => {
    expect(raison(pose({ motif: 'non_aborde' }))).toBe('motif_invalide');
    expect(raison(pose({ verdict: 'non_retenu' }))).toBe('motif_invalide');
    expect(raison(pose({ verdict: 'non_retenu', motif: 'non_aborde' }))).toBe('motif_invalide');
    expect(raison(pose({ verdict: 'non_evaluable', motif: 'non_aborde' }))).toBe('ok');
    expect(raison(pose({ verdict: 'normal' }))).toBe('verdict_invalide');
  });

  it('note : obligatoire avec « autre », jamais faite de blancs, 2000 caractères au plus', () => {
    expect(raison(pose({ verdict: 'sans_objet', motif: 'autre' }))).toBe('note_requise');
    expect(raison(pose({ verdict: 'sans_objet', motif: 'autre', note: '    ' }))).toBe('note_requise');
    expect(raison(pose({ verdict: 'sans_objet', motif: 'autre', note: 'Précision' }))).toBe('ok');
    expect(raison(pose({ note: 'x'.repeat(2001) }))).toBe('note_trop_longue');
    expect(raison(pose({ note: 42 }))).toBe('note_invalide');
  });

  it('date « à revoir le » : civile, postérieure au jour', () => {
    expect(raison(pose({ aRevoirLe: '2026-10-23' }))).toBe('date_passee');
    expect(raison(pose({ aRevoirLe: '2026-02-31' }))).toBe('date_invalide');
    expect(raison(pose({ aRevoirLe: '2026-10-24' }))).toBe('ok');
  });

  it('pièces facultatives : biologie seulement si l’étage est ouvert, sans doublon, 30 au plus', () => {
    expect(raison(pose({ pieces: [{ type: 'resultat', id: 'r1' }, { type: 'reponse', id: 'q1' }] }))).toBe('ok');
    expect(raison(pose({ pieces: [{ type: 'resultat', id: 'r1' }] }), contexte({ biologieCitable: false }))).toBe('pieces_invalides');
    expect(raison(pose({ pieces: [{ type: 'traitement', id: 't1' }] }))).toBe('pieces_invalides');
    expect(raison(pose({ pieces: [{ type: 'reponse', id: 'q1' }, { type: 'reponse', id: 'q1' }] }))).toBe('pieces_invalides');
    expect(raison(pose({ pieces: Array.from({ length: 31 }, (_, i) => ({ type: 'reponse', id: `q${i}` })) }))).toBe('pieces_trop_nombreuses');
  });
});

describe('lireDemandeConstatBesoin — retrait', () => {
  it('ne porte que le constat retiré', () => {
    expect(lireDemandeConstatBesoin({ acte: 'retrait', besoin: 2, remplace: 'c1' }, contexte()))
      .toEqual({ ok: true, demande: { acte: 'retrait', besoin: 2, remplace: 'c1' } });
    expect(raison({ acte: 'retrait', besoin: 2 })).toBe('remplacement_invalide');
    expect(raison({ acte: 'retrait', besoin: 2, remplace: 'c1', verdict: 'a_soutenir' })).toBe('acte_invalide');
    expect(raison({ acte: 'retrait', besoin: 2, remplace: 'c1', pieces: [] })).toBe('acte_invalide');
  });
});
