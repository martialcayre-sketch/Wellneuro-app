import { describe, expect, it } from 'vitest';
import { lireDemandeConstat } from './demande';
import { estMotifDuVerdict, MOTIFS_PAR_VERDICT, normaliserNote, PIECES_MAX, VERDICTS } from './liste';
import type { StructureDuParcours } from './structure';

// La demande d'un geste de constat ([[D-331]] §2-§4) : ce que la route
// refuse AVANT la base, nommé. Structure synthétique : la vraie est vide et
// non signée.

const SIGNEE: StructureDuParcours = { signee: true, empreinte: 'e'.repeat(64), hypotheses: ['HYP_TEST_A', 'HYP_TEST_B'] };
const NON_SIGNEE: StructureDuParcours = { ...SIGNEE, signee: false };
const AUJOURDHUI = '2026-10-20';

const POSE = {
  acte: 'pose',
  hypothese: 'HYP_TEST_A',
  verdict: 'confirmee',
  pieces: [{ type: 'resultat', id: 'res1' }],
};

const lire = (corps: Record<string, unknown>, structure = SIGNEE) => lireDemandeConstat(corps, structure, AUJOURDHUI);
const raison = (corps: Record<string, unknown>, structure = SIGNEE) => {
  const lu = lire(corps, structure);
  return lu.ok ? 'ok' : lu.raison;
};

describe('liste fermée (D-331 §3)', () => {
  it('quatre verdicts ; hors `confirmee`, un motif de son verdict, `autre` partout', () => {
    expect(VERDICTS).toEqual(['confirmee', 'non_retenue', 'non_evaluable', 'sans_objet']);
    expect(MOTIFS_PAR_VERDICT.confirmee).toEqual([]);
    for (const v of ['non_retenue', 'non_evaluable', 'sans_objet'] as const) expect(MOTIFS_PAR_VERDICT[v]).toContain('autre');
    expect(estMotifDuVerdict('confirmee', null)).toBe(true);
    expect(estMotifDuVerdict('confirmee', 'autre')).toBe(false);
    expect(estMotifDuVerdict('non_retenue', 'hors_population')).toBe(false);
    expect(estMotifDuVerdict('sans_objet', 'hors_population')).toBe(true);
  });

  it('la note se normalise : blancs Unicode retirés, faite de blancs = absente', () => {
    expect(normaliserNote('   ​﻿  ')).toBeNull();
    expect(normaliserNote('  note  ')).toBe('note');
    expect(normaliserNote(12)).toBeNull();
  });
});

describe('pose', () => {
  it('lit une pose complète', () => {
    const lu = lire({
      ...POSE,
      verdict: 'non_retenue',
      motif: 'autre',
      note: ' une note ',
      aRevoirLe: '2026-10-21',
      remplace: 'c1',
      pieces: [{ type: 'resultat', id: 'res1' }, { type: 'reponse', id: 'rep1' }],
    });
    expect(lu).toEqual({
      ok: true,
      demande: {
        acte: 'pose',
        hypotheseCode: 'HYP_TEST_A',
        remplace: 'c1',
        verdict: 'non_retenue',
        motif: 'autre',
        note: 'une note',
        aRevoirLe: '2026-10-21',
        pieces: [{ type: 'resultat', id: 'res1' }, { type: 'reponse', id: 'rep1' }],
      },
    });
  });

  it('aucune pose avant la signature de la structure, ni hors d’elle', () => {
    expect(raison(POSE, NON_SIGNEE)).toBe('structure_non_signee');
    expect(raison({ ...POSE, hypothese: 'HYP_TEST_C' })).toBe('hypothese_hors_structure');
    expect(raison({ ...POSE, hypothese: 'hyp_test_a' })).toBe('hypothese_invalide');
  });

  it('verdict et motif de la liste fermée', () => {
    expect(raison({ ...POSE, verdict: 'normal' })).toBe('verdict_invalide');
    expect(raison({ ...POSE, motif: 'autre' })).toBe('motif_invalide');
    expect(raison({ ...POSE, verdict: 'non_evaluable' })).toBe('motif_invalide');
    expect(raison({ ...POSE, verdict: 'non_evaluable', motif: 'hors_population' })).toBe('motif_invalide');
    expect(raison({ ...POSE, verdict: 'non_evaluable', motif: 'contexte_inconnu', pieces: [] })).toBe('ok');
  });

  it('la note : chaîne, 2000 caractères au plus, requise avec `autre`, jamais faite de blancs', () => {
    expect(raison({ ...POSE, note: 3 })).toBe('note_invalide');
    expect(raison({ ...POSE, note: 'x'.repeat(2001) })).toBe('note_trop_longue');
    expect(raison({ ...POSE, note: `  ${'x'.repeat(2000)}  ` })).toBe('ok');
    expect(raison({ ...POSE, verdict: 'sans_objet', motif: 'autre' })).toBe('note_requise');
    expect(raison({ ...POSE, verdict: 'sans_objet', motif: 'autre', note: ' ​' })).toBe('note_requise');
  });

  it('« à revoir le » : une date civile réelle, strictement après aujourd’hui', () => {
    expect(raison({ ...POSE, aRevoirLe: '2026-02-31' })).toBe('date_invalide');
    expect(raison({ ...POSE, aRevoirLe: '21/10/2026' })).toBe('date_invalide');
    expect(raison({ ...POSE, aRevoirLe: AUJOURDHUI })).toBe('date_passee');
    expect(raison({ ...POSE, aRevoirLe: '2026-10-19' })).toBe('date_passee');
    expect(raison({ ...POSE, aRevoirLe: null })).toBe('ok');
  });

  it('les pièces : désignées, sans doublon, bornées ; au moins une pour `confirmee` et `non_retenue`', () => {
    expect(raison({ ...POSE, pieces: [] })).toBe('piece_requise');
    expect(raison({ ...POSE, verdict: 'non_retenue', motif: 'contexte_explique', pieces: undefined })).toBe('piece_requise');
    expect(raison({ ...POSE, pieces: [{ type: 'valeur', id: 'x' }] })).toBe('pieces_invalides');
    expect(raison({ ...POSE, pieces: [{ type: 'resultat', id: '  ' }] })).toBe('pieces_invalides');
    expect(raison({ ...POSE, pieces: [{ type: 'resultat', id: 'a' }, { type: 'resultat', id: 'a' }] })).toBe('pieces_invalides');
    expect(raison({ ...POSE, pieces: [{ type: 'resultat', id: 'a' }, { type: 'reponse', id: 'a' }] })).toBe('ok');
    const trop = Array.from({ length: PIECES_MAX + 1 }, (_, i) => ({ type: 'resultat', id: `r${i}` }));
    expect(raison({ ...POSE, pieces: trop })).toBe('pieces_invalides');
  });

  it('un remplacement mal désigné est refusé', () => {
    expect(raison({ ...POSE, remplace: '' })).toBe('remplacement_invalide');
    expect(raison({ ...POSE, remplace: 'x'.repeat(65) })).toBe('remplacement_invalide');
  });
});

describe('retrait', () => {
  it('désigne la tête et rien d’autre ; reste offert hors structure et avant signature', () => {
    expect(lire({ acte: 'retrait', hypothese: 'HYP_SORTIE', remplace: 'c1' }, NON_SIGNEE)).toEqual({
      ok: true,
      demande: { acte: 'retrait', hypotheseCode: 'HYP_SORTIE', remplace: 'c1' },
    });
    expect(raison({ acte: 'retrait', hypothese: 'HYP_TEST_A' })).toBe('remplacement_invalide');
    expect(raison({ acte: 'retrait', hypothese: 'HYP_TEST_A', remplace: 'c1', motif: 'autre' })).toBe('acte_invalide');
    expect(raison({ acte: 'retrait', hypothese: 'HYP_TEST_A', remplace: 'c1', pieces: [] })).toBe('acte_invalide');
  });

  it('un acte inconnu est refusé', () => {
    expect(raison({ acte: 'modification', hypothese: 'HYP_TEST_A' })).toBe('acte_invalide');
  });
});
