import { describe, expect, it } from 'vitest';
import { appuisAdmis, contenuAdmis, lireReferenceClaim, motifAdmis, versionSuit } from './vocabulaire';
import { empreinteContenuPosition } from './empreinte';
import { createHash } from 'node:crypto';

const C = { enonce: 'e', perimetre: 'p', population: 'po', limites: 'l' };

describe('vocabulaire des positions (CHECK de la migration, recopiés)', () => {
  it('contenu : quatre rubriques exactement, chacune visible', () => {
    expect(contenuAdmis(C)).toEqual(C);
    expect(contenuAdmis({ ...C, autre: 'x' })).toBeNull();
    expect(contenuAdmis({ enonce: 'e', perimetre: 'p', population: 'po' })).toBeNull();
    expect(contenuAdmis({ ...C, limites: ' \t\n ' })).toBeNull();
    expect(contenuAdmis({ ...C, limites: 3 })).toBeNull();
    expect(contenuAdmis([C])).toBeNull();
    // UTF-16 mal formé : `jsonb` le refuserait (500). Une paire complète passe.
    expect(contenuAdmis({ ...C, limites: 'a\ud800b' })).toBeNull();
    expect(contenuAdmis({ ...C, limites: 'a\udc00' })).toBeNull();
    expect(contenuAdmis({ ...C, limites: 'hors BMP 𝔘' })?.limites).toBe('hors BMP 𝔘');
    expect(motifAdmis('motif \ud83d')).toBeNull();
    // NUL : refusé par `jsonb` et par `text` (500 sinon).
    expect(contenuAdmis({ ...C, enonce: 'a\u0000b' })).toBeNull();
    expect(motifAdmis('motif\u0000')).toBeNull();
    // Gardé à l'octet, jamais rogné : l'empreinte porte sur le texte.
    expect(contenuAdmis({ ...C, enonce: '  e  ' })?.enonce).toBe('  e  ');
  });
  it('appuis : au moins un, bien formés, sans doublon', () => {
    expect(appuisAdmis(['WN-CL-0001-001@v1.0', 'WN-CL-0001-002@1.0'])).toHaveLength(2);
    expect(appuisAdmis([])).toBeNull();
    expect(appuisAdmis(['WN-CL-0001-001'])).toBeNull();
    expect(appuisAdmis(['WN-CL-0001-001@v1.0', 'WN-CL-0001-001@v1.0'])).toBeNull();
  });
  it('version : comparaison numérique, jamais textuelle', () => {
    expect(versionSuit('v1.10', 'v1.9')).toBe(true);
    expect(versionSuit('v10.0', 'v9.9')).toBe(true);
    expect(versionSuit('v9.10', 'v10.0')).toBe(false);
    expect(versionSuit('v1.0', 'v1.0')).toBe(false);
  });
  it('motif : rogné, visible, borné', () => {
    expect(motifAdmis('  raison  ')).toBe('raison');
    expect(motifAdmis('   ')).toBeNull();
    expect(motifAdmis('x'.repeat(4001))).toBeNull();
    expect(motifAdmis(undefined)).toBeNull();
  });
  it('référence de claim', () => {
    expect(lireReferenceClaim('WN-CL-0312-018@v1.0')).toEqual({ claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' });
    expect(lireReferenceClaim('WN-CL-0312-018')).toBeNull();
  });
});

describe('empreinte JS — la formule de `positions_expert_empreinte_contenu`', () => {
  it('sha256 de la concaténation des sha256 des quatre rubriques, dans l’ordre fixe', () => {
    const sha = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');
    expect(empreinteContenuPosition(C)).toBe(sha(sha('e') + sha('p') + sha('po') + sha('l')));
    // L'ordre compte : permuter deux rubriques change l'empreinte.
    expect(empreinteContenuPosition({ ...C, enonce: 'p', perimetre: 'e' })).not.toBe(empreinteContenuPosition(C));
  });
});
