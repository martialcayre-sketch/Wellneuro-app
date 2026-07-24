import { afterEach, describe, expect, it } from 'vitest';
import {
  resolveDatabaseUrl,
  resolvePoolMax,
  supabasePoolSsl,
  stripSslParams,
  withSupabaseSslMode,
} from './postgres';

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
});

describe('resolveDatabaseUrl', () => {
  it('préfère DATABASE_URL quand les deux sont présentes', () => {
    process.env.DATABASE_URL = 'postgresql://a/db';
    process.env.SCALINGO_POSTGRESQL_URL = 'postgresql://scalingo/db';
    expect(resolveDatabaseUrl()).toBe('postgresql://a/db');
  });

  it('retombe sur SCALINGO_POSTGRESQL_URL si DATABASE_URL absente', () => {
    delete process.env.DATABASE_URL;
    process.env.SCALINGO_POSTGRESQL_URL = 'postgresql://scalingo/db';
    expect(resolveDatabaseUrl()).toBe('postgresql://scalingo/db');
  });

  it('undefined si aucune n’est définie', () => {
    delete process.env.DATABASE_URL;
    delete process.env.SCALINGO_POSTGRESQL_URL;
    expect(resolveDatabaseUrl()).toBeUndefined();
  });

  it('DATABASE_URL vide/blanche ne masque pas le repli Scalingo', () => {
    process.env.DATABASE_URL = '   ';
    process.env.SCALINGO_POSTGRESQL_URL = 'postgresql://scalingo/db';
    expect(resolveDatabaseUrl()).toBe('postgresql://scalingo/db');
  });
});

describe('resolvePoolMax', () => {
  it('défaut 1 si DB_POOL_MAX absente', () => {
    delete process.env.DB_POOL_MAX;
    expect(resolvePoolMax()).toBe(1);
  });

  it('lit une valeur valide', () => {
    process.env.DB_POOL_MAX = '8';
    expect(resolvePoolMax()).toBe(8);
  });

  it('plancher 1 : 0, négatif, vide ou non numérique retombent à 1', () => {
    for (const v of ['0', '-5', '', 'abc']) {
      process.env.DB_POOL_MAX = v;
      expect(resolvePoolMax(), `DB_POOL_MAX=${JSON.stringify(v)}`).toBe(1);
    }
  });
});

describe('supabasePoolSsl', () => {
  it('local : aucun TLS forcé', () => {
    delete process.env.DB_SSL_CA;
    expect(supabasePoolSsl('postgresql://localhost:5432/db')).toBeUndefined();
    expect(supabasePoolSsl('postgresql://127.0.0.1:5432/db')).toBeUndefined();
  });

  it('distant sans DB_SSL_CA : chiffré sans vérifier la chaîne (défaut historique)', () => {
    delete process.env.DB_SSL_CA;
    expect(supabasePoolSsl('postgresql://db.abc.supabase.co:5432/db')).toEqual({
      rejectUnauthorized: false,
    });
    // S'applique aussi à un hôte non-Supabase (Scalingo), comportement inchangé.
    expect(supabasePoolSsl('postgresql://pg.osc-fr1.scalingo-dbs.example:5432/db')).toEqual({
      rejectUnauthorized: false,
    });
  });

  it('distant avec DB_SSL_CA : vérifie la chaîne (durcissement HDS)', () => {
    process.env.DB_SSL_CA = '-----BEGIN CERTIFICATE-----\nAAA\n-----END CERTIFICATE-----';
    expect(supabasePoolSsl('postgresql://pg.osc-fr1.scalingo-dbs.example:5432/db')).toEqual({
      ca: process.env.DB_SSL_CA,
      rejectUnauthorized: true,
    });
  });

  it('local avec DB_SSL_CA : reste sans TLS (le local prime)', () => {
    process.env.DB_SSL_CA = 'x';
    expect(supabasePoolSsl('postgresql://127.0.0.1:5432/db')).toBeUndefined();
  });
});

describe('withSupabaseSslMode', () => {
  it('ajoute sslmode/uselibpqcompat pour un hôte Supabase', () => {
    const out = withSupabaseSslMode('postgresql://db.abc.supabase.co:5432/db');
    expect(out).toContain('sslmode=require');
    expect(out).toContain('uselibpqcompat=true');
  });

  it('no-op hors Supabase (Scalingo)', () => {
    const url = 'postgresql://pg.osc-fr1.scalingo-dbs.example:5432/db';
    expect(withSupabaseSslMode(url)).toBe(url);
  });
});

describe('stripSslParams', () => {
  it('retire sslmode, uselibpqcompat et ssl de la chaîne', () => {
    const out = stripSslParams(
      'postgresql://h:5432/db?sslmode=require&uselibpqcompat=true&ssl=1&application_name=wn',
    );
    expect(out).not.toContain('sslmode=');
    expect(out).not.toContain('uselibpqcompat=');
    expect(out).not.toMatch(/[?&]ssl=/);
    expect(out).toContain('application_name=wn');
  });
});
