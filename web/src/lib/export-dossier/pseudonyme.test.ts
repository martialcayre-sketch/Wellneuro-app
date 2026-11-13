import { describe, expect, it } from 'vitest';
import {
  FORME_PSEUDONYME,
  lireSecretPseudonyme,
  pseudonymeExport,
  SecretPseudonymeAbsent,
  VARIABLE_SECRET_PSEUDONYME,
} from './pseudonyme';

const SECRET = 'secret-de-test-non-production-0123456789';
const AUTRE_SECRET = 'autre-secret-de-test-non-production-9876';

describe('pseudonymeExport', () => {
  it('rend la forme lisible EXT-XXXXXX, en base 32 de Crockford', () => {
    for (const id of ['PAT001', 'PAT002', 'PAT_SEED_01', 'PAT1000']) {
      expect(pseudonymeExport(id, SECRET)).toMatch(FORME_PSEUDONYME);
    }
  });

  it('est stable pour un même dossier et un même secret', () => {
    expect(pseudonymeExport('PAT_SEED_01', SECRET)).toBe(pseudonymeExport('PAT_SEED_01', SECRET));
  });

  it('change avec le dossier et avec le secret', () => {
    expect(pseudonymeExport('PAT001', SECRET)).not.toBe(pseudonymeExport('PAT002', SECRET));
    expect(pseudonymeExport('PAT001', SECRET)).not.toBe(pseudonymeExport('PAT001', AUTRE_SECRET));
  });

  it("ne contient jamais l'identifiant interne", () => {
    const pseudonyme = pseudonymeExport('PAT001', SECRET);
    expect(pseudonyme).not.toContain('PAT');
    expect(pseudonyme).not.toContain('001');
  });

  it('ne suit pas l’ordre des identifiants : des dossiers voisins ne se rangent pas côte à côte', () => {
    const pseudonymes = Array.from({ length: 200 }, (_, i) => pseudonymeExport(`PAT${String(i + 1).padStart(3, '0')}`, SECRET));
    expect(new Set(pseudonymes).size).toBe(200);
    const tries = [...pseudonymes].sort();
    expect(tries).not.toEqual(pseudonymes);
  });

  it('accepte un secret de 32 caractères exactement, refuse 31', () => {
    expect(pseudonymeExport('PAT001', 'x'.repeat(32))).toMatch(FORME_PSEUDONYME);
    expect(() => pseudonymeExport('PAT001', 'x'.repeat(31))).toThrow(SecretPseudonymeAbsent);
  });

  it('refuse un secret trop court plutôt que de calculer une empreinte faible', () => {
    expect(() => pseudonymeExport('PAT001', 'court')).toThrow(SecretPseudonymeAbsent);
    expect(() => pseudonymeExport('PAT001', '')).toThrow(SecretPseudonymeAbsent);
  });
});

describe('lireSecretPseudonyme', () => {
  it('lit la variable nommée', () => {
    expect(VARIABLE_SECRET_PSEUDONYME).toBe('WN_EXPORT_PSEUDONYME_SECRET');
    expect(lireSecretPseudonyme({ WN_EXPORT_PSEUDONYME_SECRET: SECRET })).toBe(SECRET);
  });

  it('32 caractères exactement : lue ; 31 : null', () => {
    expect(lireSecretPseudonyme({ WN_EXPORT_PSEUDONYME_SECRET: 'x'.repeat(32) })).toBe('x'.repeat(32));
    expect(lireSecretPseudonyme({ WN_EXPORT_PSEUDONYME_SECRET: 'x'.repeat(31) })).toBeNull();
  });

  it('absente, vide ou trop courte : null — jamais un secret de repli', () => {
    expect(lireSecretPseudonyme({})).toBeNull();
    expect(lireSecretPseudonyme({ WN_EXPORT_PSEUDONYME_SECRET: '   ' })).toBeNull();
    expect(lireSecretPseudonyme({ WN_EXPORT_PSEUDONYME_SECRET: 'trop-court' })).toBeNull();
  });
});
