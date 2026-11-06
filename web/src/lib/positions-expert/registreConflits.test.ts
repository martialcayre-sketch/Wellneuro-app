import { describe, expect, it } from 'vitest';
import { CONFLITS_SOURCES_V1, type ConflitSourcesDeclare } from '@/lib/clinical/conflitsSourcesV1';
import { claimsDuConflit, conflitPublie, empreinteEntreeConflit, fichesCurees, REGISTRE_DU_DEPOT } from './registreConflits';

describe('le registre lu par l’arbitrage (D-439 A2, A3)', () => {
  it('lit le registre signé du dépôt, sans copie', () => {
    expect(REGISTRE_DU_DEPOT).toBe(CONFLITS_SOURCES_V1);
  });

  it('AUJOURD’HUI, AUCUNE ENTRÉE NE PORTE DE LISTE CURÉE : l’arbitrage est fermé jusqu’à la re-signature', () => {
    // Arbitrage du responsable du 2026-11-06. Ce banc rougit le jour où la
    // re-signature (PR 4) pose une liste : il faudra alors le réécrire, en
    // nommant les listes signées.
    for (const entree of CONFLITS_SOURCES_V1) expect(fichesCurees(entree)).toEqual([]);
  });

  it('une liste mal formée se lit vide, jamais en partie', () => {
    const base = CONFLITS_SOURCES_V1[0];
    const avec = (fichesUsage: unknown) => ({ ...base, fichesUsage }) as unknown as ConflitSourcesDeclare;
    expect(fichesCurees(avec(['FU_A', 'FU_B']))).toEqual(['FU_A', 'FU_B']);
    expect(fichesCurees(avec(['FU_A', 'mauvais']))).toEqual([]);
    expect(fichesCurees(avec('FU_A'))).toEqual([]);
  });

  it('seul un conflit publié se trouve ; un identifiant bien formé mais inconnu ne se trouve pas', () => {
    expect(conflitPublie('CS-BIO-01')?.id).toBe('CS-BIO-01');
    expect(conflitPublie('CS-INCONNU-99')).toBeNull();
    const brouillon = [{ ...CONFLITS_SOURCES_V1[0], statut: 'brouillon' }] as ConflitSourcesDeclare[];
    expect(conflitPublie('CS-BIO-01', brouillon)).toBeNull();
  });

  it('les claims du conflit, en identifiant@version', () => {
    const [a, b] = claimsDuConflit(CONFLITS_SOURCES_V1[0]);
    expect(a).toMatch(/^WN-CL-\d{4}-\d{3}@v?\d+\.\d+$/);
    expect(b).toMatch(/^WN-CL-\d{4}-\d{3}@v?\d+\.\d+$/);
  });

  it('l’empreinte d’une entrée change avec l’entrée', () => {
    const base = CONFLITS_SOURCES_V1[0];
    expect(empreinteEntreeConflit(base)).toMatch(/^[0-9a-f]{64}$/);
    expect(empreinteEntreeConflit({ ...base, objet: `${base.objet} ` })).not.toBe(empreinteEntreeConflit(base));
  });
});
