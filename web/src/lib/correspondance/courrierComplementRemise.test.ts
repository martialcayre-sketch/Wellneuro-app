import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import type { EntreeGardeComplement } from '@/lib/clinical/gardeComplementCible';
import { listeComplementsCibles } from './courrierComplementListe';
import { PREFIXE_ANCRAGE_COMPLEMENT } from './courrierComplement';

// L'aperçu, le jeton et la remise du courrier complément au clic (D-345 §4-§6).
// Les entrées de la garde sont simulées ; la GARDE, elle, est la vraie.

const entreesSimulees = vi.hoisted(() => ({ valeur: null as EntreeGardeComplement | null }));
vi.mock('@/lib/clinical/entreesGardeComplement', () => ({
  lireEntreesGardeComplement: vi.fn(async (_c: unknown, _p: string, actions: readonly ProtocolAction[]) =>
    (entreesSimulees.valeur ? { ...entreesSimulees.valeur, actions } : null)),
}));

const {
  apercuCourrierComplement,
  bloqueLeClic,
  courrierComplementOuvert,
  jetonAvecComplement,
  RemiseComplementRefusee,
  remettreCourrierComplement,
} = await import('./courrierComplementRemise');

const V4 = 'c1-protocol-draft-v4';
const CIBLE: ProtocolAction = {
  actionId: 'a1',
  type: 'supplement_exploration',
  title: 'Intention ciblée',
  idealPlan: 'i',
  minimalPlan: 'm',
  rescuePlan: 'r',
  limitations: [],
  natureComplement: 'cible',
  interventionStatus: 'active',
};
const LISTE = (() => {
  const liste = listeComplementsCibles([CIBLE], V4);
  if (!liste.ok) throw new Error('fixture');
  return liste;
})();

function requisPourGrossesse(accord: EntreeGardeComplement['accordPartage'] = 'accorde'): EntreeGardeComplement {
  return {
    actions: [],
    statutAge: 'majeur',
    declarations: [{ critere: 'grossesse', reponse: 'oui', source: 'anamnese', le: '2026-10-01T00:00:00.000Z' }],
    accordPartage: accord,
  };
}

type Etat = {
  remises: { complements: string[]; idCorrespondance: string }[];
  listes: { complements: string[]; correspondance: Record<string, unknown> }[];
  createMany?: () => Promise<{ count: number }>;
};

function client(etat: Etat) {
  const sql: string[] = [];
  const fake = {
    courrierComplementRemise: {
      findMany: async () => etat.remises.map(r => ({ complements: r.complements })),
      findUnique: async ({ where }: { where: { idCorrespondance: string } }) =>
        (etat.remises.some(r => r.idCorrespondance === where.idCorrespondance) ? { id: 'r' } : null),
      createMany: vi.fn(etat.createMany ?? (async () => ({ count: 1 }))),
    },
    courrierComplementListe: { findMany: async () => etat.listes },
    $executeRaw: async (morceaux: TemplateStringsArray) => {
      sql.push(morceaux.join(''));
      return 0;
    },
  };
  return { fake, sql };
}

const COURRIER = {
  id: 'corr-1',
  idPatient: 'p',
  sens: 'sortant',
  ancrageVersion: `${PREFIXE_ANCRAGE_COMPLEMENT}${'a'.repeat(64)}`,
  texte: 'Docteur,\n\ntexte',
  consigneLe: new Date('2026-10-20T10:00:00.000Z'),
};

const ENTREES = { idPatient: 'p', actions: [CIBLE], contractVersion: V4, maintenantMs: 0 };

beforeEach(() => {
  vi.stubEnv('WN_COURRIER_COMPLEMENT', 'true');
});
afterEach(() => {
  vi.unstubAllEnvs();
  entreesSimulees.valeur = null;
});

describe('courrierComplementOuvert — fail-closed', () => {
  it('seule la chaîne exacte « true » ouvre', () => {
    expect(courrierComplementOuvert('true')).toBe(true);
    expect(courrierComplementOuvert('TRUE')).toBe(false);
    expect(courrierComplementOuvert('1')).toBe(false);
    expect(courrierComplementOuvert('')).toBe(false);
  });
});

describe('apercuCourrierComplement — ce que le clic fera', () => {
  it('aucun complément : non requis, ne bloque pas', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const { fake } = client({ remises: [], listes: [] });
    const apercu = await apercuCourrierComplement(fake as never, { ...ENTREES, actions: [] });
    expect(apercu.etat).toBe('non_requis');
    expect(bloqueLeClic(apercu)).toBe(false);
  });

  it('accord absent : refusé, motif de la garde', async () => {
    entreesSimulees.valeur = requisPourGrossesse('jamais_exprime');
    const { fake } = client({ remises: [], listes: [] });
    const apercu = await apercuCourrierComplement(fake as never, ENTREES);
    expect(apercu).toMatchObject({ etat: 'refuse', statut: 'accord_requis', populationDeclenche: true });
    expect(bloqueLeClic(apercu)).toBe(true);
  });

  it('dossier introuvable : refusé', async () => {
    const { fake } = client({ remises: [], listes: [] });
    expect((await apercuCourrierComplement(fake as never, ENTREES)).statut).toBe('dossier_introuvable');
  });

  it('requis, liste refusée en clair (contrat non V4)', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const { fake } = client({ remises: [], listes: [] });
    const apercu = await apercuCourrierComplement(fake as never, { ...ENTREES, contractVersion: 'c1-protocol-draft-v3' });
    expect(apercu).toMatchObject({ etat: 'refuse', statut: 'contrat_non_v4' });
  });

  it('requis, une remise antérieure CONTIENT la liste : déjà couvert', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const { fake } = client({
      remises: [{ complements: [...LISTE.elements, 'zz:autre'], idCorrespondance: 'ancien' }],
      listes: [],
    });
    const apercu = await apercuCourrierComplement(fake as never, ENTREES);
    expect(apercu.etat).toBe('deja');
    expect(bloqueLeClic(apercu)).toBe(false);
  });

  it('requis, aucun courrier consigné pour cette liste : manquant, bloque', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const { fake } = client({ remises: [], listes: [] });
    const apercu = await apercuCourrierComplement(fake as never, ENTREES);
    expect(apercu.etat).toBe('manquant');
    expect(bloqueLeClic(apercu)).toBe(true);
  });

  it('requis, courrier consigné pour EXACTEMENT cette liste : part', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const { fake } = client({ remises: [], listes: [{ complements: LISTE.elements, correspondance: COURRIER }] });
    const apercu = await apercuCourrierComplement(fake as never, ENTREES);
    expect(apercu).toMatchObject({
      etat: 'part',
      courrier: { idCorrespondance: 'corr-1', consigneLe: '2026-10-20T10:00:00.000Z' },
    });
  });

  it('un courrier qui n’est pas un courrier complément sortant du dossier ne part pas', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    for (const faux of [
      { ...COURRIER, sens: 'entrant' },
      { ...COURRIER, idPatient: 'autre' },
      { ...COURRIER, ancrageVersion: 'safety-signals-v1' },
      { ...COURRIER, texte: '   ' },
    ]) {
      const { fake } = client({ remises: [], listes: [{ complements: LISTE.elements, correspondance: faux }] });
      expect((await apercuCourrierComplement(fake as never, ENTREES)).etat).toBe('manquant');
    }
  });
});

describe('jetonAvecComplement — le jeton du clic couvre le courrier', () => {
  it('drapeau fermé : le jeton reçu, inchangé', () => {
    vi.stubEnv('WN_COURRIER_COMPLEMENT', '');
    expect(jetonAvecComplement('jeton', null)).toBe('jeton');
  });

  it('drapeau ouvert : l’état et le courrier entrent dans le jeton', () => {
    const base = { statut: 'requis' as const, motif: 'm', populationDeclenche: false };
    const manquant = jetonAvecComplement('j', { ...base, etat: 'manquant', courrier: null });
    const part = jetonAvecComplement('j', { ...base, etat: 'part', courrier: { idCorrespondance: 'c', consigneLe: 'x' } });
    expect(manquant).not.toBe('j');
    expect(manquant).not.toBe(part);
  });
});

describe('remettreCourrierComplement — dans la transaction du clic', () => {
  it('remet le courrier vu, par createMany, sous point de sauvegarde', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const { fake, sql } = client({ remises: [], listes: [{ complements: LISTE.elements, correspondance: COURRIER }] });
    const issue = await remettreCourrierComplement(fake as never, {
      ...ENTREES, idApprobation: 'appr', idCorrespondanceVue: 'corr-1',
    });
    expect(issue).toBe('remis');
    expect(fake.courrierComplementRemise.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        idPatient: 'p',
        idApprobation: 'appr',
        idCorrespondance: 'corr-1',
        texte: COURRIER.texte,
        complements: LISTE.elements,
        complementsSha256: LISTE.sha256,
      })],
    });
    expect(sql).toEqual(['SAVEPOINT courrier_complement_remise', 'RELEASE SAVEPOINT courrier_complement_remise']);
  });

  it('0 ligne (trigger rend NULL) et remise existante : « déjà remis »', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const etat: Etat = {
      remises: [],
      listes: [{ complements: LISTE.elements, correspondance: COURRIER }],
      createMany: async () => {
        etat.remises.push({ complements: ['autre'], idCorrespondance: 'corr-1' });
        return { count: 0 };
      },
    };
    const { fake } = client(etat);
    expect(await remettreCourrierComplement(fake as never, {
      ...ENTREES, idApprobation: 'appr', idCorrespondanceVue: 'corr-1',
    })).toBe('deja_remis');
  });

  it('23505 d’un clic rejoué : rollback au point de sauvegarde, « déjà remis »', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const etat: Etat = {
      remises: [],
      listes: [{ complements: LISTE.elements, correspondance: COURRIER }],
      createMany: async () => {
        etat.remises.push({ complements: ['autre'], idCorrespondance: 'corr-1' });
        throw Object.assign(new Error('unique'), { code: 'P2002' });
      },
    };
    const { fake, sql } = client(etat);
    expect(await remettreCourrierComplement(fake as never, {
      ...ENTREES, idApprobation: 'appr', idCorrespondanceVue: 'corr-1',
    })).toBe('deja_remis');
    expect(sql).toContain('ROLLBACK TO SAVEPOINT courrier_complement_remise');
  });

  it('tout autre refus de la base ANNULE le clic (fail-closed)', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const { fake } = client({
      remises: [],
      listes: [{ complements: LISTE.elements, correspondance: COURRIER }],
      createMany: async () => { throw Object.assign(new Error('trigger'), { code: 'P2039' }); },
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(remettreCourrierComplement(fake as never, {
      ...ENTREES, idApprobation: 'appr', idCorrespondanceVue: 'corr-1',
    })).rejects.toBeInstanceOf(RemiseComplementRefusee);
  });

  it('0 ligne SANS remise existante : annule le clic', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const { fake } = client({
      remises: [],
      listes: [{ complements: LISTE.elements, correspondance: COURRIER }],
      createMany: async () => ({ count: 0 }),
    });
    await expect(remettreCourrierComplement(fake as never, {
      ...ENTREES, idApprobation: 'appr', idCorrespondanceVue: 'corr-1',
    })).rejects.toBeInstanceOf(RemiseComplementRefusee);
  });

  it('un courrier autre que celui vu ne part pas : annule le clic', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const { fake } = client({ remises: [], listes: [{ complements: LISTE.elements, correspondance: COURRIER }] });
    await expect(remettreCourrierComplement(fake as never, {
      ...ENTREES, idApprobation: 'appr', idCorrespondanceVue: 'autre',
    })).rejects.toBeInstanceOf(RemiseComplementRefusee);
    expect(fake.courrierComplementRemise.createMany).not.toHaveBeenCalled();
  });

  it('un aperçu devenu bloquant sous verrou (accord retiré) : annule le clic', async () => {
    entreesSimulees.valeur = requisPourGrossesse('retire');
    const { fake } = client({ remises: [], listes: [{ complements: LISTE.elements, correspondance: COURRIER }] });
    await expect(remettreCourrierComplement(fake as never, {
      ...ENTREES, idApprobation: 'appr', idCorrespondanceVue: 'corr-1',
    })).rejects.toBeInstanceOf(RemiseComplementRefusee);
  });

  it('non requis ou déjà couvert : rien à remettre', async () => {
    entreesSimulees.valeur = requisPourGrossesse();
    const { fake } = client({ remises: [{ complements: LISTE.elements, idCorrespondance: 'ancien' }], listes: [] });
    expect(await remettreCourrierComplement(fake as never, {
      ...ENTREES, idApprobation: 'appr', idCorrespondanceVue: null,
    })).toBe('rien');
    expect(fake.courrierComplementRemise.createMany).not.toHaveBeenCalled();
  });
});
