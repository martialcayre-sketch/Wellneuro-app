// @vitest-environment node
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════
// BP-14 — BANC HISTORIQUE (D-459 §5, §7, §8 point 4)
//
// Une version ou une approbation peut porter un auteur NUL (portail, ligne
// créée entre la date seuil et le déploiement du code, brouillon `draft` non
// repris) ou DÉDUIT (reprise du §4). Aucune des deux formes ne doit casser un
// lecteur de la diffusion, du portail ni du calendrier — et aucun lecteur ne
// doit lire ces colonnes dans ce lot (§7).
//
// Deux moitiés :
//   — la garde statique : chaque lecture des deux tables nomme ses colonnes
//     par `select`, et aucune ne nomme `creePar` ni `validePar`. C'est ce qui
//     rend l'auteur invisible à tout lecteur, quelle que soit sa valeur ;
//   — le comportement : le portail et le calendrier rendent la même chose
//     sur une ligne nulle, déduite ou sans la colonne.
// ═══════════════════════════════════════════════════════════════════════════

const { prisma } = vi.hoisted(() => ({
  prisma: {
    protocolDiffusionApproval: { findMany: vi.fn() },
    protocolDraft: { findUnique: vi.fn(), findMany: vi.fn() },
    assessmentEpisode: { findMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/patient-session', () => ({
  isSessionAuthorizedForAssignment: vi.fn(),
  readPatientSession: vi.fn(),
}));

import { DIFFUSION_CONFIRMATION } from './diffusion';
import { lireCalendriersSuivi } from './calendriersPersistes';
import { resolveProtocoleDiffuse } from './portailProtocol';

// ── La garde statique ──────────────────────────────────────────────────────

const RACINE = join(__dirname, '..', '..');

/** Les trois écrivains autorisés à nommer les colonnes (D-459 §3). */
const ECRIVAINS = new Set([
  'app/api/praticien/protocoles/versions/route.ts',
  'app/api/praticien/protocoles/diffusion/route.ts',
  'lib/food-observation/persistence.ts',
]);

const MODELES = /\b(protocolDraft|protocolDiffusionApproval)\b|protocol_drafts|protocol_diffusion_approvals/;
const COLONNES = /\bcreePar\b|\bvalidePar\b|\bcree_par\b|\bvalide_par\b/;
const LECTURE = /\.(protocolDraft|protocolDiffusionApproval)\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow)\(/g;

function sources(dossier: string): string[] {
  const fichiers: string[] = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, entree.name);
    if (entree.isDirectory()) {
      if (entree.name === 'generated' || entree.name === 'node_modules') continue;
      fichiers.push(...sources(chemin));
    } else if (/\.tsx?$/.test(entree.name) && !/\.test\.tsx?$/.test(entree.name)) {
      fichiers.push(chemin);
    }
  }
  return fichiers;
}

/** Les arguments d'un appel, parenthèses équilibrées, depuis l'ouvrante. */
function argumentsDe(texte: string, ouvrante: number): string {
  let profondeur = 0;
  for (let i = ouvrante; i < texte.length; i++) {
    if (texte[i] === '(') profondeur++;
    else if (texte[i] === ')') {
      profondeur--;
      if (profondeur === 0) return texte.slice(ouvrante, i + 1);
    }
  }
  return texte.slice(ouvrante);
}

const fichiersDesTables = sources(RACINE)
  .map(chemin => ({ chemin: relative(RACINE, chemin), texte: readFileSync(chemin, 'utf8') }))
  .filter(f => MODELES.test(f.texte));

const lectures = fichiersDesTables.flatMap(f =>
  [...f.texte.matchAll(LECTURE)].map(m => ({
    ou: `${f.chemin}:${f.texte.slice(0, m.index).split('\n').length}`,
    args: argumentsDe(f.texte, (m.index ?? 0) + m[0].length - 1),
  })),
);

describe('BP-14 — aucun lecteur des colonnes d’auteur (D-459 §7)', () => {
  it('la garde voit bien les lectures des deux tables (plancher)', () => {
    // Sans plancher, une expression cassée rendrait la garde vide et verte.
    expect(lectures.length).toBeGreaterThanOrEqual(30);
  });

  it('chaque lecture des deux tables nomme ses colonnes par `select`', () => {
    const sansSelect = lectures.filter(l => !/\bselect\s*:/.test(l.args)).map(l => l.ou);
    expect(sansSelect).toEqual([]);
  });

  it('aucune lecture ne nomme `creePar` ni `validePar`', () => {
    const fautives = lectures.filter(l => COLONNES.test(l.args)).map(l => l.ou);
    expect(fautives).toEqual([]);
  });

  it('hors des trois écrivains, aucun fichier des deux tables ne nomme les colonnes', () => {
    const fautifs = fichiersDesTables
      .filter(f => !ECRIVAINS.has(f.chemin) && COLONNES.test(f.texte))
      .map(f => f.chemin);
    expect(fautifs).toEqual([]);
  });
});

// ── Le comportement : nul, déduit ou absent, même lecture ──────────────────

const AUTEURS: { libelle: string; auteur: Record<string, unknown> }[] = [
  { libelle: 'sans la colonne', auteur: {} },
  { libelle: 'auteur nul', auteur: { creePar: null, validePar: null } },
  { libelle: 'auteur déduit', auteur: { creePar: 'praticien@wellneuro.fr', validePar: 'praticien@wellneuro.fr' } },
];

const T_REVUE = new Date('2026-09-01T10:00:00.000Z');
const T_APPROBATION = new Date('2026-09-01T11:00:00.000Z');

function approbation(auteur: Record<string, unknown>) {
  const { validePar } = auteur as { validePar?: unknown };
  return {
    id: 'appr_1',
    idPatient: 'PAT_1',
    protocolDraftId: 'v_1',
    protocolDraftInputHash: 'HASH_V1',
    decisionCardInputHash: 'HASH_DEC',
    supersedesApprovalId: null,
    createdAt: T_APPROBATION,
    approvedAt: T_APPROBATION,
    approvedBy: 'practitioner',
    confirmation: DIFFUSION_CONFIRMATION,
    ...('validePar' in auteur ? { validePar } : {}),
    draft: {
      idPatient: 'PAT_1',
      inputHash: 'HASH_V1',
      decisionCardInputHash: 'HASH_DEC',
      status: 'practitioner_reviewed',
      reviewedAt: T_REVUE,
      selectedPriorityId: 'PRIO-A',
      ...('creePar' in auteur ? { creePar: auteur.creePar } : {}),
      episode: { id: 'ep-T0', milestone: 'T0', cycleId: 'ep-T0' },
    },
  };
}

function version(auteur: Record<string, unknown>) {
  return {
    id: 'v_1',
    decisionCardId: 'DEC_1',
    decisionCardInputHash: 'HASH_DEC',
    inputHash: 'HASH_V1',
    status: 'practitioner_reviewed',
    reviewedAt: T_REVUE,
    supersedesDraftId: null,
    createdAt: T_REVUE,
    ...('creePar' in auteur ? { creePar: auteur.creePar } : {}),
  };
}

describe('BP-14 — une ligne nulle ou déduite ne casse aucun lecteur (D-459 §8 point 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.assessmentEpisode.findMany.mockResolvedValue([
      { id: 'ep-T0', cycleId: 'ep-T0', milestone: 'T0', confirmedAt: new Date('2026-08-30T10:00:00.000Z') },
    ]);
  });

  it('portail : le protocole diffusé se résout à l’identique', async () => {
    const rendus = [];
    for (const { auteur } of AUTEURS) {
      prisma.protocolDiffusionApproval.findMany.mockResolvedValueOnce([approbation(auteur)]);
      prisma.protocolDraft.findUnique.mockResolvedValueOnce(version(auteur));
      prisma.protocolDraft.findMany.mockResolvedValueOnce([version(auteur)]);
      rendus.push(await resolveProtocoleDiffuse('PAT_1'));
    }
    expect(rendus[0]).toMatchObject({ protocolDraftId: 'v_1', approbationId: 'appr_1', approvedBy: 'practitioner' });
    expect(rendus[1]).toEqual(rendus[0]);
    expect(rendus[2]).toEqual(rendus[0]);
  });

  it('calendrier : le jour 0 du cycle se lit à l’identique', async () => {
    const rendus = [];
    for (const { auteur } of AUTEURS) {
      prisma.protocolDiffusionApproval.findMany.mockResolvedValueOnce([approbation(auteur)]);
      const { parCycle } = await lireCalendriersSuivi('PAT_1');
      rendus.push(parCycle.get('ep-T0'));
    }
    expect(rendus[0]).toMatchObject({ jourZero: T_APPROBATION, approbationId: 'appr_1' });
    expect(rendus[1]).toEqual(rendus[0]);
    expect(rendus[2]).toEqual(rendus[0]);
  });
});
