import { describe, expect, it } from 'vitest';
import {
  estSensExclusion,
  lireLigneExclusion,
  lireListeExclusion,
  MAX_LIGNES_EXCLUSION_LOT,
  motifExclusion,
} from './exclusionRecherche';

describe('motifExclusion — un motif vide pour l’écran l’est aussi pour la base ([[D-490]] §7)', () => {
  it('garde un motif lisible, rogné', () => {
    expect(motifExclusion('  dossier, classement  ')).toBe('dossier, classement');
  });

  // L'ensemble du CHECK : blancs ASCII, espace insécable, espace chiffre,
  // espace fine insécable, espace sans chasse, marque d'ordre des octets.
  it.each([
    ['vide', ''],
    ['espaces', '   '],
    ['tabulation et retours', '\t\r\n'],
    ['saut de page et tabulation verticale', '\f\v'],
    ['espace insécable', ' '],
    ['espace chiffre', ' '],
    ['espace fine insécable', ' '],
    ['espace sans chasse', '​'],
    ['marque d’ordre des octets', '﻿'],
    ['mélange', '   ​﻿\t'],
  ])('refuse un motif fait de blancs : %s', (_libelle, motif) => {
    expect(motifExclusion(motif)).toBeNull();
  });

  it('refuse ce que PostgreSQL refuserait : caractère nul, moitié de paire isolée', () => {
    expect(motifExclusion('dossier\u0000')).toBeNull();
    expect(motifExclusion('dossier \uD800')).toBeNull();
    expect(motifExclusion('\uDC00 dossier')).toBeNull();
    expect(motifExclusion('dossier 🙂')).toBe('dossier 🙂');
  });

  it('refuse un motif non textuel ou trop long', () => {
    expect(motifExclusion(undefined)).toBeNull();
    expect(motifExclusion(12)).toBeNull();
    expect(motifExclusion('x'.repeat(4001))).toBeNull();
    expect(motifExclusion('x'.repeat(4000))).toBe('x'.repeat(4000));
  });
});

describe('estSensExclusion', () => {
  it('ne connaît que exclure et retablir', () => {
    expect(estSensExclusion('exclure')).toBe(true);
    expect(estSensExclusion('retablir')).toBe(true);
    expect(estSensExclusion('rétablir')).toBe(false);
    expect(estSensExclusion(undefined)).toBe(false);
  });
});

describe('lireListeExclusion — liste collée, rien n’est complété ni écarté en silence', () => {
  it('lit identifiant, version facultative et motif ; coupe au PREMIER séparateur', () => {
    const lue = lireListeExclusion(
      [
        '# commentaire',
        'Identifiant ; Motif',
        'WN-CL-0001-001 ; dossier A ; hors parcours',
        'WN-CL-0001-002@v1.0\tdossier B',
        '| WN-CL-0001-003 | dossier C | rang 2 |',
        '',
      ].join('\n'),
    );
    expect(lue.erreurs).toEqual([]);
    expect(lue.lignes).toEqual([
      { claimId: 'WN-CL-0001-001', motif: 'dossier A ; hors parcours' },
      { claimId: 'WN-CL-0001-002', versionClaim: 'v1.0', motif: 'dossier B' },
      { claimId: 'WN-CL-0001-003', motif: 'dossier C | rang 2' },
    ]);
  });

  it('hors tableau, la barre finale appartient au motif', () => {
    const lue = lireListeExclusion('WN-CL-0001-001 ; dossier A|B|\nWN-CL-0001-002 ; |');
    expect(lue.erreurs).toEqual([]);
    expect(lue.lignes).toEqual([
      { claimId: 'WN-CL-0001-001', motif: 'dossier A|B|' },
      { claimId: 'WN-CL-0001-002', motif: '|' },
    ]);
  });

  it('une ligne illisible est une ERREUR nommée, jamais une ligne sautée', () => {
    const lue = lireListeExclusion(
      ['WN-CL-0001-001', '0001-002 ; motif', 'WN-CL-0001-003 ;   ', 'WN-CL-0001-004@x ; motif'].join('\n'),
    );
    expect(lue.lignes).toEqual([]);
    expect(lue.erreurs.map((e) => [e.numero, e.raison])).toEqual([
      [1, 'deux champs attendus : identifiant ; motif'],
      [2, 'identifiant de claim illisible'],
      [3, 'motif absent ou trop long (au plus 4000 caractères)'],
      [4, 'identifiant de claim illisible'],
    ]);
  });

  it('un claim en double est une erreur', () => {
    const lue = lireListeExclusion('WN-CL-0001-001 ; a\nWN-CL-0001-001@v1.0 ; b');
    expect(lue.lignes).toHaveLength(1);
    expect(lue.erreurs).toEqual([
      { numero: 2, texte: 'WN-CL-0001-001@v1.0 ; b', raison: 'claim déjà présent plus haut dans la liste' },
    ]);
  });

  it('au-delà de la borne technique, une erreur bloque l’envoi', () => {
    const texte = Array.from(
      { length: MAX_LIGNES_EXCLUSION_LOT + 1 },
      (_, i) => `WN-CL-${String(1000 + Math.floor(i / 1000))}-${String(i % 1000).padStart(3, '0')} ; motif`,
    ).join('\n');
    const lue = lireListeExclusion(texte);
    expect(lue.erreurs.at(-1)?.raison).toContain('au plus 500 claims');
  });
});

describe('lireLigneExclusion — corps JSON de la route', () => {
  it('rejoue les mêmes règles', () => {
    expect(lireLigneExclusion({ claimId: 'WN-CL-0001-001', motif: ' m ' })).toEqual({
      claimId: 'WN-CL-0001-001',
      motif: 'm',
    });
    expect(lireLigneExclusion({ claimId: 'WN-CL-0001-001', versionClaim: 'v2.0', motif: 'm' })).toEqual({
      claimId: 'WN-CL-0001-001',
      versionClaim: 'v2.0',
      motif: 'm',
    });
    for (const v of [
      null,
      [],
      { claimId: 'WN-CL-0001-001' },
      { claimId: 'WN-CL-0001-001', motif: ' ' },
      { claimId: 'WN-CL-1-1', motif: 'm' },
      { claimId: 'WN-CL-0001-001', versionClaim: 2, motif: 'm' },
    ]) {
      expect(lireLigneExclusion(v)).toBeNull();
    }
  });
});
