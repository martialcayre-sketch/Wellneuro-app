import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@/generated/prisma';

// [[D-343]] §9 — BANC COMPARATIF : sur une fixture, le jour 0 de chaque cycle
// (`joursZeroParCycle`) et les quatre empreintes de chaque version
// (`decision_card_input_hash`, `snapshot_input_hash`, `review_input_hash`,
// `input_hash`) sont IDENTIQUES avant et après la pose de chaque nature.
//
// La base de la fixture vit en mémoire ; la transaction passée à
// `ecrireDecision` n'y permet qu'UNE écriture, `decisionParcours.create`.
// Toute autre écriture — sur les versions, les approbations, les check-ins,
// les ancres, ou un SQL brut autre que les deux verrous — lève, et le banc
// rougit. Le jour 0 se relit par `lireCalendriersSuivi`, le lecteur réel du
// suivi, sur la même base. Identifiants synthétiques.

const { base, prisma } = vi.hoisted(() => {
  const base = {
    protocolDraft: [] as Record<string, unknown>[],
    protocolDiffusionApproval: [] as Record<string, unknown>[],
    protocolCheckin: [] as Record<string, unknown>[],
    decisionParcours: [] as Record<string, unknown>[],
  };
  const prisma = {
    protocolDiffusionApproval: {
      findMany: async ({ where }: { where: { idPatient: string } }) =>
        base.protocolDiffusionApproval.filter(a => a.idPatient === where.idPatient),
    },
  };
  return { base, prisma };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
// Le contenu d'une version se relit par son empreinte ; la fixture porte ses
// actions en clair.
vi.mock('@/lib/protocol/fromPrisma', () => ({
  reconstructProtocolDraft: (payload: { actions: { actionId: string; title: string }[] }) => ({ actions: payload.actions }),
}));

import { DIFFUSION_CONFIRMATION } from '@/lib/protocol/diffusion';
import { joursZeroParCycle } from '@/lib/protocol/calendrierSuivi';
import { lireCalendriersSuivi } from '@/lib/protocol/calendriersPersistes';
import { lireDemande, type Demande } from './demande';
import { ecrireDecision } from './ecriture';

const PAT = 'PAT_FIXTURE';
const PRATICIEN = 'praticien@example.test';
const DIFFUSEE = 'proto_a#h1';
const SUIVANTE = 'proto_b#h2';
const REVUE = new Date('2026-09-01T08:00:00.000Z');

function version(id: string, n: number) {
  return {
    id,
    idPatient: PAT,
    contractVersion: 'protocol-draft-v1',
    payload: { actions: [{ actionId: 'act_1', title: 'Action de fixture' }] },
    inputHash: `input_${n}`,
    decisionCardInputHash: `carte_${n}`,
    snapshotInputHash: `instantane_${n}`,
    reviewInputHash: `revue_${n}`,
    status: 'practitioner_reviewed',
    reviewedAt: REVUE,
  };
}

base.protocolDraft.push(version(DIFFUSEE, 1), version(SUIVANTE, 2));
base.protocolDiffusionApproval.push({
  id: 'appro_1',
  idPatient: PAT,
  approvedAt: new Date('2026-09-02T08:00:00.000Z'),
  createdAt: new Date('2026-09-02T08:00:00.000Z'),
  approvedBy: 'practitioner',
  confirmation: DIFFUSION_CONFIRMATION,
  decisionCardInputHash: 'carte_1',
  protocolDraftInputHash: 'input_1',
  protocolDraftId: DIFFUSEE,
  draft: {
    idPatient: PAT,
    inputHash: 'input_1',
    decisionCardInputHash: 'carte_1',
    status: 'practitioner_reviewed',
    reviewedAt: REVUE,
    selectedPriorityId: 'priorite_1',
    episode: { id: 'episode_1', milestone: 'T0', cycleId: 'cycle_1' },
  },
});
base.protocolCheckin.push({ id: 'checkin_1', idPatient: PAT, protocolDraftId: DIFFUSEE, jour: 7 });

const ECRITURES = /^(create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany)$/;
const ecritures: string[] = [];

/** Un délégué : ses lectures, et le refus de toute écriture hors `decisionParcours.create`. */
function delegue(table: string, methodes: Record<string, (arg: never) => unknown>) {
  return new Proxy(methodes, {
    get(cible, nom) {
      if (typeof nom !== 'string') return undefined;
      if (ECRITURES.test(nom)) {
        return (arg: never) => {
          ecritures.push(`${table}.${nom}`);
          if (table !== 'decisionParcours' || nom !== 'create') throw new Error(`écriture interdite : ${table}.${nom}`);
          return cible.create(arg);
        };
      }
      if (nom in cible) return cible[nom];
      throw new Error(`lecture inattendue : ${table}.${nom}`);
    },
  });
}

const delegues: Record<string, unknown> = {
  protocolDraft: delegue('protocolDraft', {
    findFirst: ({ where }: { where: { id: string; idPatient: string } }) =>
      base.protocolDraft.find(v => v.id === where.id && v.idPatient === where.idPatient) ?? null,
  }),
  protocolDiffusionApproval: delegue('protocolDiffusionApproval', { findMany: prisma.protocolDiffusionApproval.findMany as never }),
  protocolCheckin: delegue('protocolCheckin', {}),
  decisionParcours: delegue('decisionParcours', {
    findMany: ({ where }: { where: { idPatient: string; idVersion: string } }) =>
      base.decisionParcours.filter(l => l.idPatient === where.idPatient && l.idVersion === where.idVersion),
    create: ({ data }: { data: Record<string, unknown> }) => {
      const n = base.decisionParcours.length + 1;
      const ligne = {
        id: `ligne_${n}`,
        ordre: BigInt(n),
        idAction: null,
        nature: null,
        idLigneRemplacee: null,
        ...data,
      };
      base.decisionParcours.push(ligne);
      return { id: ligne.id };
    },
  }),
};

const tx = new Proxy({} as Prisma.TransactionClient, {
  get(_cible, nom) {
    if (nom === '$executeRaw') {
      return (morceaux: TemplateStringsArray) => {
        const sql = morceaux.join('?');
        if (!/FOR KEY SHARE|pg_advisory_xact_lock\(343,/.test(sql)) throw new Error(`SQL brut interdit : ${sql}`);
        return 1;
      };
    }
    if (typeof nom === 'string' && nom in delegues) return delegues[nom];
    if (nom === 'then' || typeof nom === 'symbol') return undefined;
    throw new Error(`accès inattendu : tx.${String(nom)}`);
  },
});

/** Tout ce qui n'est pas une décision de parcours, figé pour comparaison. */
const horsDecisions = () =>
  structuredClone({
    protocolDraft: base.protocolDraft,
    protocolDiffusionApproval: base.protocolDiffusionApproval,
    protocolCheckin: base.protocolCheckin,
  });

const empreintes = () =>
  base.protocolDraft.map(v => [v.id, v.decisionCardInputHash, v.snapshotInputHash, v.reviewInputHash, v.inputHash]);

const joursZero = async () => joursZeroParCycle((await lireCalendriersSuivi(PAT, null, [])).parCycle);

function demande(corps: Record<string, unknown>): Demande {
  const lu = lireDemande({ idVersion: DIFFUSEE, acte: 'pose', ...corps }, '2026-10-22');
  if (!lu.ok) throw new Error(`demande de fixture refusée : ${lu.raison}`);
  return lu.demande;
}

const tete = () => String(base.decisionParcours.at(-1)?.id);

describe('Décisions de parcours — le jour 0 et les quatre empreintes ne bougent pas ([[D-343]] §9)', () => {
  it('chaque nature se pose sans rien écrire hors de `decisions_parcours`', async () => {
    const jour0Avant = await joursZero();
    expect(jour0Avant.size, 'fixture vide : le banc ne prouverait rien').toBe(1);
    const figeAvant = horsDecisions();
    const empreintesAvant = empreintes();

    const source = 'rapporte_par_patient';
    const poses: Array<() => Demande> = [
      () => demande({ nature: 'preference', source, motif: 'choix_du_patient', note: 'note de fixture' }),
      () => demande({ nature: 'refus', source, motif: 'contrainte_pratique', idAction: 'act_1' }),
      () => demande({ nature: 'debut', source, evenementLe: '2026-09-05' }),
      () => demande({ nature: 'interruption', source, motif: 'evenement_intercurrent', evenementInconnu: true }),
      () => demande({ nature: 'reprise', source, evenementLe: '2026-09-20' }),
      () => demande({ nature: 'arret', source, motif: 'choix_du_patient', evenementLe: '2026-10-01', idAction: 'act_1' }),
      () => demande({ nature: 'revision', issue: 'maintenir' }),
      () => demande({ nature: 'revision', issue: 'ajuster', motif: 'mise_en_oeuvre_incomplete', remplace: tete(), idVersionSuivante: SUIVANTE }),
      () => demande({ nature: 'revision', issue: 'arreter', motif: 'choix_du_patient', remplace: tete() }),
    ];

    for (const pose of poses) {
      await ecrireDecision(tx, PAT, pose(), PRATICIEN);
      expect(horsDecisions()).toEqual(figeAvant);
      expect(empreintes()).toEqual(empreintesAvant);
      expect(await joursZero()).toEqual(jour0Avant);
    }
    // Un retrait non plus.
    await ecrireDecision(tx, PAT, { acte: 'retrait', idVersion: DIFFUSEE, remplace: tete() }, PRATICIEN);
    expect(horsDecisions()).toEqual(figeAvant);
    expect(await joursZero()).toEqual(jour0Avant);

    expect(new Set(ecritures)).toEqual(new Set(['decisionParcours.create']));
    expect(base.decisionParcours).toHaveLength(poses.length + 1);
  });

  // CONTRE-ÉPREUVE : la transaction de la fixture refuse bien une écriture
  // hors de la table — sans quoi le banc serait vert par construction.
  it('la fixture refuse une écriture sur les versions', () => {
    const versions = (tx as unknown as Record<string, { update: (arg: unknown) => unknown }>).protocolDraft;
    expect(() => versions.update({})).toThrow('écriture interdite : protocolDraft.update');
  });
});
