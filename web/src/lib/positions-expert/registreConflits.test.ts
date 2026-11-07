import { describe, expect, it } from 'vitest';
import { CONFLITS_SOURCES_V1, type ConflitSourcesDeclare } from '@/lib/clinical/conflitsSourcesV1';
import { claimsDuConflit, conflitPublie, empreinteEntreeConflit, fichesCurees, REGISTRE_DU_DEPOT } from './registreConflits';

describe('le registre lu par l’arbitrage (D-439 A2, A3)', () => {
  it('lit le registre signé du dépôt, sans copie', () => {
    expect(REGISTRE_DU_DEPOT).toBe(CONFLITS_SOURCES_V1);
  });

  // RÉÉCRIT À LA RE-SIGNATURE ([[D-452]]) : ce cas disait « aucune entrée ne
  // porte de liste curée, l'arbitrage est fermé » (PR 3). Chaque entrée publiée
  // porte désormais sa liste signée, et l'arbitrage lit exactement celle-là.
  it('chaque conflit publié porte sa liste signée, et l’arbitrage lit exactement celle-là', () => {
    const publies = CONFLITS_SOURCES_V1.filter(c => c.statut === 'publiee');
    expect(publies.length).toBeGreaterThan(1);
    for (const entree of publies) {
      expect(fichesCurees(entree), entree.id).toEqual([...entree.fichesUsage]);
      expect(fichesCurees(entree).length, entree.id).toBeGreaterThan(0);
    }
  });

  it('`CS-BIO-01`, le conflit que la proposition de bilan déclenche, s’arbitre sur les fiches de WN-CL-0312-018', () => {
    const bio = conflitPublie('CS-BIO-01');
    expect(bio && fichesCurees(bio)).toEqual(['FU_B9B12_P8', 'FU_MG_P7', 'FU_VITD_P7', 'FU_ZINC_P7']);
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
