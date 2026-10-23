import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SITUATIONS_COMPLEMENT } from '@/lib/clinical-engine/complementCible';
import {
  DECLENCHEURS_COMPLEMENT_METADATA,
  DECLENCHEURS_COMPLEMENT_V1,
  shaPerimetreDeclencheurs,
  tableDeclencheursSignee,
  type DeclencheursMetadata,
  type LigneDeclencheur,
} from './declencheursComplementCibleV1';

// Banc du verrou de la table des déclencheurs ([[D-345]] §2, J3-12h, lot 1).
// Chaque terme du verrou ferme un chemin : on les éteint un par un sur une
// signature qui, sans eux, serait valide.

function signer(lignes: readonly LigneDeclencheur[]): DeclencheursMetadata {
  return {
    validationExterne: true,
    dateValidation: '2026-10-23T12:00:00.000Z',
    shaPerimetre: shaPerimetreDeclencheurs(lignes),
  };
}

const LIGNES = DECLENCHEURS_COMPLEMENT_V1;

describe('Table des déclencheurs — contenu', () => {
  it('porte les trois populations et exactement les situations du contrat', () => {
    const populations = LIGNES.filter(ligne => ligne.nature === 'population').map(ligne => ligne.id).sort();
    const situations = LIGNES.filter(ligne => ligne.nature === 'situation').map(ligne => ligne.id).sort();
    expect(populations).toEqual(['allaitement', 'grossesse', 'mineur']);
    expect(situations).toEqual([...SITUATIONS_COMPLEMENT].sort());
  });

  it('chaque ligne a au moins une provenance datée', () => {
    for (const ligne of LIGNES) {
      expect(ligne.provenance.length, ligne.id).toBeGreaterThan(0);
      for (const provenance of ligne.provenance) {
        expect(provenance.reference.trim(), ligne.id).not.toBe('');
        expect(provenance.date, ligne.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('reste en forme opaque : aucun identifiant de claim, aucune dose dans le fichier', () => {
    // Le dépôt est public : un claim rattaché à une situation publierait une
    // conduite (P0-1 de la contre-revue du cadrage).
    const source = readFileSync(join(__dirname, 'declencheursComplementCibleV1.ts'), 'utf8');
    expect(source).not.toMatch(/WN-CL-/);
    expect(source).not.toMatch(/\d+\s*mg\b/i);
  });
});

describe('Table des déclencheurs — verrou', () => {
  it('une signature complète ouvre le verrou', () => {
    expect(tableDeclencheursSignee(signer(LIGNES), LIGNES)).toBe(true);
  });

  it('la métadonnée livrée est cohérente avec son état', () => {
    // Avant la déclaration du responsable : verrou éteint. Après : il ouvre.
    expect(tableDeclencheursSignee(DECLENCHEURS_COMPLEMENT_METADATA))
      .toBe(DECLENCHEURS_COMPLEMENT_METADATA.validationExterne);
  });

  it.each([
    ['validation externe absente', { validationExterne: false }],
    ['date de validation absente', { dateValidation: null }],
    ['date de validation non canonique', { dateValidation: '2026-10-23' }],
    ['sha absent', { shaPerimetre: null }],
    ['sha divergent', { shaPerimetre: '0'.repeat(64) }],
  ])('ferme sur %s', (_cas, champs) => {
    expect(tableDeclencheursSignee({ ...signer(LIGNES), ...champs }, LIGNES)).toBe(false);
  });

  it('ferme sur une table vide, même « signée »', () => {
    expect(tableDeclencheursSignee(signer([]), [])).toBe(false);
  });

  const variantes: [string, LigneDeclencheur[]][] = [
    ['une population retirée', LIGNES.filter(ligne => ligne.id !== 'grossesse')],
    ['une situation retirée', LIGNES.filter(ligne => ligne.id !== 'S-MG-2')],
    ['un identifiant dupliqué', [...LIGNES, LIGNES[0]]],
    ['une provenance vide', LIGNES.map(ligne => (ligne.id === 'S-MG-1' ? { ...ligne, provenance: [] } : ligne))],
    ['une référence blanche', LIGNES.map(ligne => (ligne.id === 'allaitement'
      ? { ...ligne, provenance: [{ ...ligne.provenance[0], reference: '  ' }] } : ligne))],
    ['une date de provenance illisible', LIGNES.map(ligne => (ligne.id === 'mineur'
      ? { ...ligne, provenance: [{ ...ligne.provenance[0], date: '2026-02-31' }] } : ligne))],
    ['une population restreinte à un nutriment', LIGNES.map(ligne => (ligne.id === 'grossesse'
      ? { ...ligne, portee: 'magnesium' as const } : ligne))],
    ['une situation rangée parmi les populations', LIGNES.map(ligne => (ligne.id === 'S-MG-1'
      ? { ...ligne, nature: 'population' as const, portee: 'tous_nutriments' as const } : ligne))],
    ['une situation sans position d’expert qui dit son appui', LIGNES.map(ligne => (ligne.id === 'S-MG-2'
      ? { ...ligne, provenance: ligne.provenance.map(p => ({ ...p, appui: undefined })) } : ligne))],
    ['un appui posé sur une décision', LIGNES.map(ligne => (ligne.id === 'mineur'
      ? { ...ligne, provenance: ligne.provenance.map(p => ({ ...p, appui: 'sans_claim' as const })) } : ligne))],
  ];
  it.each(variantes)('ferme sur %s, même signée sur son propre sha', (_cas, lignes) => {
    expect(tableDeclencheursSignee(signer(lignes), lignes)).toBe(false);
  });

  it('une ligne retouchée sous une signature acquise ferme', () => {
    const signature = signer(LIGNES);
    const retouchees = LIGNES.map(ligne => (ligne.id === 'S-MG-2'
      ? { ...ligne, provenance: [{ ...ligne.provenance[0], date: '2026-10-24' }] } : ligne));
    expect(tableDeclencheursSignee(signature, retouchees)).toBe(false);
  });
});
