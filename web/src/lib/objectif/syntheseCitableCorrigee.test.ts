import { beforeEach, describe, expect, it, vi } from 'vitest';

// t62 — UNE SYNTHÈSE CORRIGÉE EST UNE SYNTHÈSE VALIDÉE.
//
// `Corrigee_Praticien` ne naît que d'une `Validee_Praticien` annotée (route de
// synthèse, action `annoter`) : texte et `dateValidation` restent ceux de la
// validation. Ces bancs éprouvent les trois lecteurs des adaptateurs bornés sur
// une TABLE SIMULÉE qui applique réellement le `where`, l'`orderBy` et le
// `select` reçus : un banc qui ne regarderait que l'argument passé à Prisma
// prouverait la requête, pas ce qu'elle laisse sortir.

type Ligne = {
  idSynthese: string;
  idPatient: string;
  statut: string;
  dateValidation: Date | null;
  syntheseJson: unknown;
  notesPraticien: string | null;
};

const table: Ligne[] = [];

function correspond(ligne: Ligne, where: { idPatient: string; statut: unknown }): boolean {
  if (ligne.idPatient !== where.idPatient) return false;
  const statut = where.statut as string | { in: string[] };
  return typeof statut === 'string' ? ligne.statut === statut : statut.in.includes(ligne.statut);
}

/**
 * Le tri de Postgres, dates absentes comprises : une date absente compte comme
 * la plus grande — en DERNIER en `asc`, en TÊTE en `desc` (NULLS LAST / FIRST
 * par défaut). Un tri qui la mettrait à zéro prouverait l'ordre inverse.
 */
function cle(l: Ligne): number {
  return l.dateValidation?.getTime() ?? Number.POSITIVE_INFINITY;
}

function lire(args: {
  where: { idPatient: string; statut: unknown };
  orderBy: { dateValidation: 'asc' | 'desc' };
  select: Record<string, true>;
}): Record<string, unknown>[] {
  const sens = args.orderBy.dateValidation === 'asc' ? 1 : -1;
  return table
    .filter((l) => correspond(l, args.where))
    .sort((a, b) => (cle(a) === cle(b) ? 0 : sens * (cle(a) < cle(b) ? -1 : 1)))
    .map((l) => Object.fromEntries(Object.keys(args.select).map((k) => [k, l[k as keyof Ligne]])));
}

const { prisma } = vi.hoisted(() => ({
  prisma: {
    syntheseIA: { findMany: vi.fn(), findFirst: vi.fn() },
    desaccordComprehension: { findMany: vi.fn() },
    assignation: { count: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { lireSyntheseCitable } from './matierePriorite';
import { constaterOuverture, lireSynthesesCitables } from './matiereComprehension';

const NOTE_PRIVEE = 'Note du praticien : à revoir avec le médecin traitant.';

function synthese(
  id: string,
  statut: string,
  jour: string | null,
  narratif = `Narratif de ${id}.`,
): Ligne {
  return {
    idSynthese: id,
    idPatient: 'PAT_1',
    statut,
    dateValidation: jour === null ? null : new Date(jour),
    syntheseJson: {
      resume_praticien: `Résumé de ${id}.`,
      narratif_patient: narratif,
      axes_prioritaires: [{ axe: `Axe de ${id}`, niveau_priorite: 'eleve' }],
    },
    notesPraticien: statut === 'Corrigee_Praticien' ? NOTE_PRIVEE : null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  table.length = 0;
  prisma.syntheseIA.findMany.mockImplementation(async (args) => lire(args));
  prisma.syntheseIA.findFirst.mockImplementation(async (args) => lire(args)[0] ?? null);
  prisma.desaccordComprehension.findMany.mockResolvedValue([]);
  prisma.assignation.count.mockResolvedValue(3);
});

describe('t62 — la corrigée est citée', () => {
  it('le résumé global lit la validée ET la corrigée, dans l’ordre de validation', async () => {
    table.push(
      synthese('S_VAL', 'Validee_Praticien', '2026-07-07'),
      synthese('S_COR', 'Corrigee_Praticien', '2026-08-29'),
    );
    const matiere = await lireSynthesesCitables('PAT_1');
    expect(matiere.map((m) => m.idSynthese)).toEqual(['S_VAL', 'S_COR']);
  });

  it('la priorité cite la dernière synthèse validée, même corrigée', async () => {
    table.push(
      synthese('S_VAL', 'Validee_Praticien', '2026-07-07'),
      synthese('S_COR', 'Corrigee_Praticien', '2026-08-29'),
    );
    expect(await lireSyntheseCitable('PAT_1')).toEqual({
      idSynthese: 'S_COR',
      resumePraticien: 'Résumé de S_COR.',
      narratifPatient: 'Narratif de S_COR.',
    });
  });

  it('l’ordre vient de la date, pas du statut : une corrigée plus ancienne cède à la validée', async () => {
    table.push(
      synthese('S_COR', 'Corrigee_Praticien', '2026-07-07'),
      synthese('S_VAL', 'Validee_Praticien', '2026-08-29'),
    );
    expect((await lireSyntheseCitable('PAT_1'))?.idSynthese).toBe('S_VAL');
    expect((await lireSynthesesCitables('PAT_1')).map((m) => m.idSynthese)).toEqual(['S_COR', 'S_VAL']);
  });

  it('brouillons et rejetées restent exclus, quelle que soit leur date', async () => {
    table.push(
      synthese('S_COR', 'Corrigee_Praticien', '2026-07-07'),
      synthese('S_BIA', 'Brouillon_IA', '2026-09-01'),
      synthese('S_BPR', 'Brouillon_Praticien', '2026-09-02'),
      synthese('S_REJ', 'Rejetee', '2026-09-03'),
    );
    expect((await lireSynthesesCitables('PAT_1')).map((m) => m.idSynthese)).toEqual(['S_COR']);
    expect((await lireSyntheseCitable('PAT_1'))?.idSynthese).toBe('S_COR');
    expect((await constaterOuverture('PAT_1')).deuxSynthesesValidees).toBe(false);
  });

  it('les notes du praticien ne sortent d’aucun des deux adaptateurs', async () => {
    table.push(
      synthese('S_VAL', 'Validee_Praticien', '2026-07-07'),
      synthese('S_COR', 'Corrigee_Praticien', '2026-08-29'),
    );
    const sorties = JSON.stringify([
      await lireSynthesesCitables('PAT_1'),
      await lireSyntheseCitable('PAT_1'),
      await constaterOuverture('PAT_1'),
    ]);
    expect(sorties).not.toContain(NOTE_PRIVEE);
    expect(sorties).not.toContain('notesPraticien');
    for (const appel of [
      ...prisma.syntheseIA.findMany.mock.calls,
      ...prisma.syntheseIA.findFirst.mock.calls,
    ]) {
      expect(appel[0].select).not.toHaveProperty('notesPraticien');
    }
  });
});

describe('t62 — la corrigée est comptée pour l’ouverture du résumé global', () => {
  it('une validée et une corrigée font les deux synthèses de la barre', async () => {
    table.push(
      synthese('S_VAL', 'Validee_Praticien', '2026-07-07'),
      synthese('S_COR', 'Corrigee_Praticien', '2026-08-29'),
    );
    expect(await constaterOuverture('PAT_1')).toEqual({
      deuxSynthesesValidees: true,
      secondRideau: true,
    });
  });

  it('une corrigée SANS date compte comme synthèse, sans fonder de rideau (DC-24)', async () => {
    table.push(
      synthese('S_VAL', 'Validee_Praticien', null),
      synthese('S_COR', 'Corrigee_Praticien', null),
    );
    expect(await constaterOuverture('PAT_1')).toEqual({
      deuxSynthesesValidees: true,
      secondRideau: false,
    });
    expect(prisma.assignation.count).not.toHaveBeenCalled();
  });

  it('première synthèse CORRIGÉE : sa date de validation d’origine reste la borne du second rideau', async () => {
    // L'effet assumé par la décision : avant t62, la corrigée était ignorée et
    // la borne glissait au 2026-08-29 ; elle revient à la première validation.
    table.push(
      synthese('S_COR', 'Corrigee_Praticien', '2026-07-07'),
      synthese('S_VAL', 'Validee_Praticien', '2026-08-29'),
    );
    await constaterOuverture('PAT_1');
    expect(prisma.assignation.count).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_1', dateAssignation: { gt: new Date('2026-07-07') } },
    });
  });
});
