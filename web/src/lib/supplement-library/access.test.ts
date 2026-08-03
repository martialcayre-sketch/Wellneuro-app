import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// emailPraticien() importe @/lib/prisma transitivement (journalAcces.ts) ;
// neutralisé comme dans les tests de route sœurs, ce fichier ne touche jamais
// la base.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import {
  getPractitionerC4Access,
  getPractitionerRechercheCorpusAccess,
} from './access';

// Le commentaire de rayonCorpus.test.ts affirme que le fail-closed retiré de
// servirRayonCorpus() « vit désormais dans chaque fonction d'accès par route,
// testée dans son propre fichier ». Ce fichier est cette couverture — sans
// elle, les deux gates produit n'étaient vérifiées qu'indirectement via les
// routes (route.test.ts), et la branche « session sans e-mail » n'était
// couverte nulle part.

const SESSION_OK = { user: { email: 'praticien@wellneuro.fr' } };
const SESSION_SANS_EMAIL = { user: {} };

describe('getPractitionerC4Access', () => {
  beforeEach(() => {
    process.env.WN_C4_ENABLED = 'true';
  });
  afterEach(() => {
    delete process.env.WN_C4_ENABLED;
  });

  it('session nulle : 401 unauthenticated', () => {
    const res = getPractitionerC4Access(null);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('unauthenticated');
      expect(res.status).toBe(401);
    }
  });

  it('session sans e-mail praticien : 401 unauthenticated', () => {
    const res = getPractitionerC4Access(SESSION_SANS_EMAIL as never);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('unauthenticated');
      expect(res.status).toBe(401);
    }
  });

  it('flag WN_C4_ENABLED éteint : 404 flag_eteint', () => {
    delete process.env.WN_C4_ENABLED;
    const res = getPractitionerC4Access(SESSION_OK as never);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('flag_eteint');
      expect(res.status).toBe(404);
    }
  });

  it('session valide et flag ouvert : ok', () => {
    const res = getPractitionerC4Access(SESSION_OK as never);
    expect(res.ok).toBe(true);
  });
});

describe('getPractitionerRechercheCorpusAccess', () => {
  beforeEach(() => {
    process.env.WN_RECHERCHE_CORPUS_ENABLED = 'true';
  });
  afterEach(() => {
    delete process.env.WN_RECHERCHE_CORPUS_ENABLED;
  });

  it('session nulle : 401 unauthenticated', () => {
    const res = getPractitionerRechercheCorpusAccess(null);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('unauthenticated');
      expect(res.status).toBe(401);
    }
  });

  it('session sans e-mail praticien : 401 unauthenticated', () => {
    const res = getPractitionerRechercheCorpusAccess(SESSION_SANS_EMAIL as never);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('unauthenticated');
      expect(res.status).toBe(401);
    }
  });

  it('flag WN_RECHERCHE_CORPUS_ENABLED éteint : 404 flag_eteint', () => {
    delete process.env.WN_RECHERCHE_CORPUS_ENABLED;
    const res = getPractitionerRechercheCorpusAccess(SESSION_OK as never);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe('flag_eteint');
      expect(res.status).toBe(404);
    }
  });

  it('reste fermé même si WN_C4_ENABLED est ouvert (gate indépendante)', () => {
    delete process.env.WN_RECHERCHE_CORPUS_ENABLED;
    process.env.WN_C4_ENABLED = 'true';
    const res = getPractitionerRechercheCorpusAccess(SESSION_OK as never);
    expect(res.ok).toBe(false);
    delete process.env.WN_C4_ENABLED;
  });

  it('session valide et flag ouvert : ok', () => {
    const res = getPractitionerRechercheCorpusAccess(SESSION_OK as never);
    expect(res.ok).toBe(true);
  });
});
