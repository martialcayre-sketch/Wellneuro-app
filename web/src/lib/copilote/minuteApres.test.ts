import { describe, expect, it } from 'vitest';
import { STATUTS_SYNTHESE_VALIDES } from '@/lib/documents/types';
import {
  construireCloture,
  type ApprobationActiveCloture,
  type EntreesCloture,
  type VersionActiveCloture,
} from './minuteApres';

const version = (surcharge: Partial<VersionActiveCloture> = {}): VersionActiveCloture => ({
  inputHash: 'hash-v2',
  selectedPriorityId: 'PRIO_SOMMEIL',
  status: 'practitioner_reviewed',
  reviewedAt: new Date('2026-07-01T10:00:00.000Z'),
  createdAt: new Date('2026-07-01T09:00:00.000Z'),
  ...surcharge,
});

const approbation = (surcharge: Partial<ApprobationActiveCloture> = {}): ApprobationActiveCloture => ({
  protocolDraftInputHash: 'hash-v2',
  approvedAt: new Date('2026-07-01T11:00:00.000Z'),
  ...surcharge,
});

const entrees = (surcharge: Partial<EntreesCloture> = {}): EntreesCloture => ({
  versionActive: version(),
  approbationActive: approbation(),
  syntheses: [{ statut: 'Validee_Praticien', dateValidation: new Date('2026-07-01T12:00:00.000Z') }],
  ...surcharge,
});

const etape = (cloture: ReturnType<typeof construireCloture>, cle: string) =>
  cloture.etapes.find((e) => e.cle === cle)!;

describe('construireCloture — chaîne complète', () => {
  it('les trois étapes franchies sur la version active → prêt pour diffusion', () => {
    const cloture = construireCloture(entrees());
    expect(cloture.etapes.map((e) => e.statut)).toEqual(['faite', 'faite', 'faite']);
    expect(cloture.blocages).toEqual([]);
    expect(cloture.pretPourDiffusion).toBe(true);
  });

  it('la décision reprend la priorité retenue et l’ancrage de version', () => {
    const cloture = construireCloture(entrees());
    expect(cloture.decision).toEqual({
      selectedPriorityId: 'PRIO_SOMMEIL',
      versionInputHash: 'hash-v2',
      enregistreLe: '2026-07-01T09:00:00.000Z',
    });
  });

  it('les trois étapes sont toujours rendues, dans le même ordre', () => {
    const cloture = construireCloture(entrees({ versionActive: null }));
    expect(cloture.etapes.map((e) => e.cle)).toEqual([
      'protocole_relu',
      'diffusion_approuvee',
      'document_diffusable',
    ]);
  });
});

describe('construireCloture — aucune étape ne peut être supposée franchie', () => {
  it('protocole non relu → à faire, et jamais prêt', () => {
    const cloture = construireCloture(
      entrees({ versionActive: version({ status: 'draft', reviewedAt: null }) }),
    );
    expect(etape(cloture, 'protocole_relu').statut).toBe('a_faire');
    expect(cloture.pretPourDiffusion).toBe(false);
  });

  it('statut « relu » sans date de relecture ne vaut pas relecture', () => {
    const cloture = construireCloture(
      entrees({ versionActive: version({ status: 'practitioner_reviewed', reviewedAt: null }) }),
    );
    expect(etape(cloture, 'protocole_relu').statut).toBe('a_faire');
  });

  it('une date de relecture illisible ne vaut pas relecture', () => {
    const cloture = construireCloture(
      entrees({ versionActive: version({ reviewedAt: new Date('pas-une-date') }) }),
    );
    expect(etape(cloture, 'protocole_relu').statut).toBe('a_faire');
  });

  it('aucune approbation → à faire', () => {
    const cloture = construireCloture(entrees({ approbationActive: null }));
    expect(etape(cloture, 'diffusion_approuvee').statut).toBe('a_faire');
    expect(cloture.pretPourDiffusion).toBe(false);
  });

  it('aucune synthèse validée → document à faire', () => {
    const cloture = construireCloture(entrees({ syntheses: [] }));
    expect(etape(cloture, 'document_diffusable').statut).toBe('a_faire');
    expect(cloture.pretPourDiffusion).toBe(false);
  });

  it('un brouillon IA n’est pas un document diffusable', () => {
    const cloture = construireCloture(
      entrees({ syntheses: [{ statut: 'Brouillon_IA', dateValidation: new Date('2026-07-01T12:00:00.000Z') }] }),
    );
    expect(etape(cloture, 'document_diffusable').statut).toBe('a_faire');
  });

  it('une synthèse rejetée n’est pas un document diffusable', () => {
    const cloture = construireCloture(
      entrees({ syntheses: [{ statut: 'Rejetee', dateValidation: new Date('2026-07-01T12:00:00.000Z') }] }),
    );
    expect(etape(cloture, 'document_diffusable').statut).toBe('a_faire');
  });

  it('une synthèse validée sans date de validation ne compte pas', () => {
    const cloture = construireCloture(
      entrees({ syntheses: [{ statut: 'Validee_Praticien', dateValidation: null }] }),
    );
    expect(etape(cloture, 'document_diffusable').statut).toBe('a_faire');
  });

  it('la validation retenue est la plus récente', () => {
    const cloture = construireCloture(
      entrees({
        syntheses: [
          { statut: 'Validee_Praticien', dateValidation: new Date('2026-05-01T00:00:00.000Z') },
          { statut: 'Corrigee_Praticien', dateValidation: new Date('2026-07-01T00:00:00.000Z') },
        ],
      }),
    );
    expect(etape(cloture, 'document_diffusable').date).toBe('2026-07-01T00:00:00.000Z');
  });
});

describe('construireCloture — une approbation ancrée ailleurs est caduque, pas absente', () => {
  it('approbation sur une version supplantée → caduque', () => {
    const cloture = construireCloture(
      entrees({ approbationActive: approbation({ protocolDraftInputHash: 'hash-v1' }) }),
    );
    const diffusion = etape(cloture, 'diffusion_approuvee');
    expect(diffusion.statut).toBe('caduque');
    expect(diffusion.date).toBe('2026-07-01T11:00:00.000Z');
    expect(cloture.pretPourDiffusion).toBe(false);
  });

  it('une caducité produit un blocage, comme une étape non franchie', () => {
    const cloture = construireCloture(
      entrees({ approbationActive: approbation({ protocolDraftInputHash: 'hash-v1' }) }),
    );
    expect(cloture.blocages).toHaveLength(1);
  });
});

describe('construireCloture — sans protocole enregistré', () => {
  const cloture = construireCloture(entrees({ versionActive: null }));

  it('les étapes sont indisponibles, jamais « à faire »', () => {
    expect(cloture.etapes.map((e) => e.statut)).toEqual([
      'indisponible',
      'indisponible',
      'indisponible',
    ]);
  });

  it('aucune décision n’est inventée', () => {
    expect(cloture.decision).toBeNull();
  });

  it('le blocage désigne la cause réelle, pas les trois symptômes', () => {
    expect(cloture.blocages).toHaveLength(1);
    expect(cloture.pretPourDiffusion).toBe(false);
  });
});

describe('construireCloture — invariants transverses', () => {
  it('chaque étape porte un « pourquoi maintenant » non vide', () => {
    for (const cas of [entrees(), entrees({ versionActive: null }), entrees({ approbationActive: null })]) {
      for (const e of construireCloture(cas).etapes) {
        expect(e.pourquoiMaintenant.length).toBeGreaterThan(0);
      }
    }
  });

  it('un blocage est émis pour chaque étape non franchie, jamais un de plus', () => {
    const cloture = construireCloture(
      entrees({
        versionActive: version({ status: 'draft', reviewedAt: null }),
        approbationActive: null,
        syntheses: [],
      }),
    );
    expect(cloture.blocages).toHaveLength(3);
  });

  it('la liste des statuts diffusables ne diverge pas de celle de C3', () => {
    // Le domaine recopie la constante plutôt que de l'importer ; ce test est le
    // garde-fou de cette recopie.
    const validee = STATUTS_SYNTHESE_VALIDES.map((statut) =>
      construireCloture(entrees({ syntheses: [{ statut, dateValidation: new Date('2026-07-01T00:00:00.000Z') }] })),
    );
    expect(validee.every((c) => etape(c, 'document_diffusable').statut === 'faite')).toBe(true);
    expect(STATUTS_SYNTHESE_VALIDES).toHaveLength(2);
  });
});
