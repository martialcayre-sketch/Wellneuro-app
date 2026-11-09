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

const MODELES = /\b(protocolDrafts?|protocolDiffusionApprovals?|diffusionApprovals)\b|protocol_drafts|protocol_diffusion_approvals/;
const COLONNES = /\bcreePar\b|\bvalidePar\b|\bcree_par\b|\bvalide_par\b/;
const LECTURE = /\.(protocolDraft|protocolDiffusionApproval)\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow|create)\(/g;

/**
 * Les champs de relation qui mènent aux deux modèles (`schema.prisma`). Lus
 * par `: true` ou par `include`, ils rendent toutes les colonnes scalaires,
 * auteur compris. Les noms ambigus (`draft`, `version`) se jugent sur les
 * fichiers qui touchent un modèle porteur de la relation.
 */
const RELATIONS_SANS_AMBIGUITE = ['protocolDraft', 'protocolDrafts', 'protocolDiffusionApprovals', 'diffusionApprovals', 'approbation', 'versionSuivante'];
const RELATIONS_AMBIGUES = ['draft', 'version'];
const PORTEURS_AMBIGUS = /\.(protocolDiffusionApproval|protocolCheckin|arbitrageBiologique|decisionParcours)\./;

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

/** Les clés posées au PREMIER niveau de l'objet d'arguments d'un appel. */
function clesDePremierNiveau(args: string): string[] {
  const cles: string[] = [];
  let profondeur = 0;
  let jeton = '';
  // Au premier niveau, on alterne : une clé, puis (après `:`) sa valeur
  // jusqu'à la virgule. Une clé abrégée (`{ where, … }`) n'a pas de `:`.
  let dansValeur = false;
  const clore = () => {
    if (!dansValeur && jeton) cles.push(jeton);
    jeton = '';
    dansValeur = false;
  };
  for (const c of args) {
    // Profondeur 2 : l'intérieur de `(` puis de `{` — le premier niveau de l'objet.
    if (c === '}' || c === ')' || c === ']') {
      if (profondeur === 2) clore();
      profondeur--;
      continue;
    }
    if (c === '{' || c === '(' || c === '[') {
      profondeur++;
      continue;
    }
    if (profondeur !== 2) continue;
    if (c === ',') clore();
    else if (c === ':' && !dansValeur) {
      if (jeton) cles.push(jeton);
      jeton = '';
      dansValeur = true;
    } else if (!dansValeur && /[A-Za-z0-9_$]/.test(c)) jeton += c;
    else if (!dansValeur && c === '.') jeton = '';
  }
  return cles;
}

const tousLesFichiers = sources(RACINE)
  .map(chemin => ({ chemin: relative(RACINE, chemin), texte: readFileSync(chemin, 'utf8') }));

const fichiersDesTables = tousLesFichiers.filter(f => MODELES.test(f.texte));

const lectures = fichiersDesTables.flatMap(f =>
  [...f.texte.matchAll(LECTURE)].map(m => ({
    creation: m[2] === 'create',
    ou: `${f.chemin}:${f.texte.slice(0, m.index).split('\n').length}`,
    args: argumentsDe(f.texte, (m.index ?? 0) + m[0].length - 1),
  })),
);

describe('BP-14 — aucun lecteur des colonnes d’auteur (D-459 §7)', () => {
  it('la garde voit bien les lectures des deux tables (plancher)', () => {
    // Sans plancher, une expression cassée rendrait la garde vide et verte.
    expect(lectures.length).toBeGreaterThanOrEqual(30);
  });

  it('chaque lecture (et création) des deux tables nomme ses colonnes par `select` de premier niveau, sans `include`', () => {
    const fautives = lectures
      .filter(l => {
        const cles = clesDePremierNiveau(l.args);
        return !cles.includes('select') || cles.includes('include');
      })
      .map(l => l.ou);
    expect(fautives).toEqual([]);
  });

  it('la lecture des clés de premier niveau mord (témoins)', () => {
    expect(clesDePremierNiveau('({ where: { id }, select: { id: true } })')).toEqual(['where', 'select']);
    // Un `select` imbriqué sous `include` n'est pas un `select` de premier niveau.
    expect(clesDePremierNiveau('({ where, include: { episode: { select: { milestone: true } } } })')).toEqual(['where', 'include']);
  });

  it('aucune lecture ne nomme `creePar` ni `validePar`, ni ne les lit par `: true`', () => {
    // Les créations nomment les colonnes dans `data` : c'est l'écriture du §3.
    const fautives = lectures.filter(l => !l.creation && COLONNES.test(l.args)).map(l => l.ou);
    expect(fautives).toEqual([]);
    const parConstante = fichiersDesTables
      .filter(f => /\b(creePar|validePar)\s*:\s*true\b/.test(f.texte))
      .map(f => f.chemin);
    expect(parConstante).toEqual([]);
  });

  it('aucune lecture par une relation vers les deux tables (`: true` ou `include`)', () => {
    const relation = (noms: string[]) => new RegExp(`\\b(${noms.join('|')})\\s*:\\s*true\\b`);
    const dansInclude = (noms: string[]) => new RegExp(`\\binclude\\s*:\\s*\\{[^}]*\\b(${noms.join('|')})\\s*:`);
    const fautifs = tousLesFichiers
      .filter(f =>
        relation(RELATIONS_SANS_AMBIGUITE).test(f.texte)
        || dansInclude(RELATIONS_SANS_AMBIGUITE).test(f.texte)
        || (PORTEURS_AMBIGUS.test(f.texte)
          && (relation(RELATIONS_AMBIGUES).test(f.texte) || dansInclude(RELATIONS_AMBIGUES).test(f.texte))))
      .map(f => f.chemin);
    expect(fautifs).toEqual([]);
  });

  it('aucun accès détourné aux deux tables (alias, crochets, SQL `SELECT *`)', () => {
    const fautifs = fichiersDesTables
      .filter(f =>
        /=\s*(prisma|tx|client)\.(protocolDraft|protocolDiffusionApproval)\s*[;,\n]/.test(f.texte)
        || /\[\s*['"`](protocolDraft|protocolDiffusionApproval)['"`]\s*\]/.test(f.texte)
        || /SELECT\s+\*[^`]*\b(protocol_drafts|protocol_diffusion_approvals)\b/i.test(f.texte))
      .map(f => f.chemin);
    expect(fautifs).toEqual([]);
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
