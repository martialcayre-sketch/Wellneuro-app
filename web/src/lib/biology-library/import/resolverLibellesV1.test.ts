import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  indexerPourBanc,
  normaliserLibelle,
  RESOLVER_LIBELLES_METADATA,
  RESOLVER_LIBELLES_SHA256,
  RESOLVER_LIBELLES_V1,
  resolverSigne,
  resoudreLibelle,
} from './resolverLibellesV1';

const MIGRATIONS = path.join(process.cwd(), 'prisma', 'migrations');

/** Les codes d'analytes INSÉRÉS par les migrations — le catalogue réel. */
function codesDuCatalogue(): Set<string> {
  const codes = new Set<string>();
  for (const dossier of readdirSync(MIGRATIONS)) {
    let sql: string;
    try {
      sql = readFileSync(path.join(MIGRATIONS, dossier, 'migration.sql'), 'utf8');
    } catch {
      continue;
    }
    for (const m of sql.matchAll(/\('bioan_[a-z0-9_]+',\s*'([A-Z0-9_]+)'/g)) codes.add(m[1]);
  }
  return codes;
}

const INDEX = indexerPourBanc(RESOLVER_LIBELLES_V1);

describe('resolver libellé → analyte — la table', () => {
  it('ne propose que des codes qui existent au catalogue (sinon la FK refuserait l’import entier)', () => {
    const catalogue = codesDuCatalogue();
    expect(catalogue.size).toBeGreaterThan(40);
    const inconnus = [...new Set(RESOLVER_LIBELLES_V1.map(e => e.code))].filter(c => !catalogue.has(c));
    expect(inconnus).toEqual([]);
  });

  it('ne rattache aucun panel composite sans unité', () => {
    const codes = new Set(RESOLVER_LIBELLES_V1.map(e => e.code));
    for (const composite of ['BIO_PROFIL_LIPIDIQUE', 'BIO_NFS', 'BIO_BILAN_HEPATIQUE', 'BIO_IONOGRAMME']) {
      expect(codes.has(composite), composite).toBe(false);
    }
  });

  it('aucune entrée n’est recopiée deux fois à l’identique', () => {
    const vues = RESOLVER_LIBELLES_V1.map(e => `${normaliserLibelle(e.libelle)}→${e.code}`);
    expect(new Set(vues).size).toBe(vues.length);
  });
});

describe('resolver — la résolution (table supposée signée)', () => {
  const resoudre = (l: string) => resoudreLibelle(l, true, INDEX);

  it('normalise accents, casse et ponctuation', () => {
    expect(normaliserLibelle('25-OH Vitamine D (D2+D3)')).toBe('25 oh vitamine d d2 d3');
    expect(resoudre('FERRITINÉMIE')).toEqual({ statut: 'resolu', code: 'BIO_FERRITINE' });
    expect(resoudre('25 oh vitamine d')).toEqual({ statut: 'resolu', code: 'BIO_VITAMINE_D_25OH' });
  });

  it('retire une parenthèse de méthode en seconde passe', () => {
    expect(resoudre('Ferritine (chimiluminescence)')).toEqual({ statut: 'resolu', code: 'BIO_FERRITINE' });
  });

  it('rend `ambigu` sans code quand un libellé désigne deux analytes', () => {
    expect(resoudre('Cortisol salivaire')).toEqual({ statut: 'ambigu', code: null });
    expect(resoudre('IgA sécrétoires')).toEqual({ statut: 'ambigu', code: null });
  });

  it('ne rattache pas un libellé générique dont la matrice n’est pas dite', () => {
    for (const l of ['Zinc', 'Magnésium', 'Vitamine B12', 'Glycémie', 'CRP', '']) {
      expect(resoudre(l), l).toEqual({ statut: 'inconnu', code: null });
    }
  });
});

describe('resolver — la signature, fail-closed', () => {
  it('est livré NON signé : tout sort `inconnu`', () => {
    expect(RESOLVER_LIBELLES_METADATA.validationExterne).toBe(false);
    expect(resolverSigne()).toBe(false);
    expect(resoudreLibelle('Ferritine')).toEqual({ statut: 'inconnu', code: null });
  });

  it('ne s’ouvre qu’avec les cinq termes, et se referme si la table bouge', () => {
    const signee = {
      version: 'resolver-libelles-v1',
      validationExterne: true,
      dateValidation: '2026-10-02T10:00:00.000Z',
      sourceReference: 'relecture praticien',
      shaPerimetre: RESOLVER_LIBELLES_SHA256,
    };
    expect(resolverSigne(signee)).toBe(true);
    expect(resolverSigne({ ...signee, validationExterne: false })).toBe(false);
    expect(resolverSigne({ ...signee, dateValidation: '2026-10-02' })).toBe(false);
    expect(resolverSigne({ ...signee, sourceReference: ' ' })).toBe(false);
    expect(resolverSigne({ ...signee, shaPerimetre: null })).toBe(false);
    expect(resolverSigne(signee, 'a'.repeat(64))).toBe(false);
  });
});
