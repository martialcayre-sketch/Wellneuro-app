import { describe, expect, it } from 'vitest';
import { construireBloc, type ConstruireBlocInput } from './bloc';
import { assemblerDocument, avancerEtat, etatSuivant, peutAvancer } from './document';
import { MODELE_SUIVI_21J } from './modele';
import { deriveVersionDocument, memeVersion } from './versioning';

function bloc(id: string, type: ConstruireBlocInput['type'], ancrage: string): ReturnType<typeof construireBloc> {
  return construireBloc({
    id,
    type,
    regime: 'statique_valide',
    provenance: { source: 'c1_decision', ancrageHash: ancrage, version: 'c1-decision-v1' },
    contenu: { praticien: `p_${id}`, patient: `pat_${id}` },
  });
}

describe('assemblerDocument', () => {
  it('démarre à brouillon et ordonne les blocs selon le modèle', () => {
    const doc = assemblerDocument({
      modele: MODELE_SUIVI_21J,
      patientId: 'PAT_1',
      blocs: [bloc('a', 'action_21j', 'h_a'), bloc('n', 'narratif', 'h_n')],
    });
    expect(doc.etat).toBe('brouillon');
    // 'narratif' précède 'action_21j' dans le modèle → réordonné.
    expect(doc.blocs.map((b) => b.type)).toEqual(['narratif', 'action_21j']);
  });

  it('exige un patient', () => {
    expect(() =>
      assemblerDocument({ modele: MODELE_SUIVI_21J, patientId: '', blocs: [] }),
    ).toThrow(/patient/);
  });
});

describe('machine d’états', () => {
  it('progresse d’exactement une étape', () => {
    expect(etatSuivant('brouillon')).toBe('relu');
    expect(etatSuivant('relu')).toBe('valide');
    expect(etatSuivant('valide')).toBe('envoye');
    expect(etatSuivant('envoye')).toBeNull();
  });

  it('interdit le saut d’étape', () => {
    expect(peutAvancer('brouillon', 'valide')).toBe(false);
  });

  it('exige une action humaine explicite pour franchir « validé »', () => {
    expect(peutAvancer('relu', 'valide')).toBe(false);
    expect(peutAvancer('relu', 'valide', { parActionPraticien: true })).toBe(true);
  });

  it('avancerEtat applique une transition valide et refuse une transition invalide', () => {
    const doc = assemblerDocument({ modele: MODELE_SUIVI_21J, patientId: 'PAT_1', blocs: [bloc('n', 'narratif', 'h')] });
    const relu = avancerEtat(doc, 'relu');
    expect(relu.etat).toBe('relu');
    expect(() => avancerEtat(relu, 'valide')).toThrow(/validation humaine/);
    const valide = avancerEtat(relu, 'valide', { parActionPraticien: true });
    expect(valide.etat).toBe('valide');
    expect(() => avancerEtat(doc, 'valide', { parActionPraticien: true })).toThrow(/saut/);
  });
});

describe('versionnage = tuple des versions de blocs', () => {
  it('même tuple de blocs → même hash (idempotence, ordre indifférent)', () => {
    const v1 = deriveVersionDocument([bloc('a', 'narratif', 'h_a'), bloc('b', 'action_21j', 'h_b')]);
    const v2 = deriveVersionDocument([bloc('b', 'action_21j', 'h_b'), bloc('a', 'narratif', 'h_a')]);
    expect(memeVersion(v1, v2)).toBe(true);
  });

  it('un ancrage de bloc différent → version différente', () => {
    const v1 = deriveVersionDocument([bloc('a', 'narratif', 'h_a')]);
    const v2 = deriveVersionDocument([bloc('a', 'narratif', 'h_a_bis')]);
    expect(memeVersion(v1, v2)).toBe(false);
  });

  it('la version du document est le tuple des versions de ses blocs', () => {
    const doc = assemblerDocument({
      modele: MODELE_SUIVI_21J,
      patientId: 'PAT_1',
      blocs: [bloc('a', 'narratif', 'h_a')],
    });
    expect(doc.version.blocs).toEqual([
      { id: 'a', source: 'c1_decision', ancrageHash: 'h_a', version: 'c1-decision-v1' },
    ]);
    expect(doc.version.hash).toMatch(/^[0-9a-f]+$/);
  });
});
