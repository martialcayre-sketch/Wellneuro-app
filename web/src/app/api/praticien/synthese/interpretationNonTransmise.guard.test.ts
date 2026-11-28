import { beforeEach, describe, expect, it, vi } from 'vitest';

// L'ENTRÉE DE L'APPEL PRINCIPAL, POUR LA LISTE FERMÉE DE [[D-571]] §3.
//
// Une passation de `Q_INF_02` ou de `Q_INF_03` n'apporte au modèle son libellé
// d'interprétation par AUCUN des trois canaux : ni la colonne `interpretation`,
// ni les scores (objet `interpretation`, bande de chaque sous-score, et ce que
// le moteur en recopie sur un recueil partiel : `bandePlancher`, `note`), ni la
// mini-synthèse. Elle reste nommée, et reçoit ses scores, le domaine de chaque
// sous-score du DNST et le motif fixe `interpretationNonTransmise`.
//
// CE TEST JOUE LA VRAIE ROUTE, et lit le message réellement envoyé au modèle
// (même harnais que `passationCourante.test.ts`). Il le fait sur les DEUX
// formes de D-571 §5 : le libellé global des fixtures (`prisma/seedReponses.ts`,
// que le banc reprend) et les bandes du moteur (`calculateScore`, recueils
// complets à chaque bande et recueils partiels). Il vérifie aussi qu'après le
// retrait, les deux formes donnent la même forme d'entrée.
//
// SA PORTÉE est la conformité de l'entrée : il n'évalue aucune génération.

const { getServerSession, prisma, anthropicCreate } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
    syntheseIA: { create: vi.fn() },
    auditSynthese: { create: vi.fn() },
  },
  anthropicCreate: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/generated/prisma', () => ({ Prisma: { DbNull: Symbol('DbNull') } }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: (s: { user?: { email?: string } } | null) => s?.user?.email?.toLowerCase() ?? null,
  filtrePatientsDuPraticien: (email: string) => ({ praticienEmail: { equals: email, mode: 'insensitive' } }),
}));
vi.mock('@/lib/praticien/journalAcces', () => ({ journaliserAccesDossier: vi.fn() }));
vi.mock('@/lib/anthropic', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/anthropic')>();
  return { ...reel, anthropic: { messages: { create: anthropicCreate } } };
});
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), security: vi.fn() },
}));
vi.mock('@/lib/observability/eventCodes', () => ({ EVENT_CODES: {} }));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';
import {
  MOTIF_INTERPRETATION_NON_TRANSMISE,
  QUESTIONNAIRES_INTERPRETATION_NON_TRANSMISE,
  domaineDuSousScore,
  libellesDuCatalogue,
} from '@/lib/synthese/interpretationNonTransmise';
import { REPONSES_JENNIFER, REPONSES_MICHEL, REPONSES_SOPHIE } from '../../../../../prisma/seedReponses';
import { POST } from './route';

const CONFORME = JSON.stringify({
  resume_praticien: 'Synthèse concise pour le praticien.',
  axes_prioritaires: [],
  points_de_vigilance: ['Un point'],
  questions_entretien: ['Une question ?'],
  narratif_patient: 'Un texte accessible.',
  limites: 'À valider par le praticien.',
});

type Passation = {
  idReponse: string;
  idQuestionnaire: string;
  titre: string;
  dateReponse: Date;
  scoresJson: unknown;
  scorePrincipal: number | null;
  interpretation: string | null;
  statutValidite: string;
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com', actif: true, suiviClotureLe: null });
  prisma.consultation.findFirst.mockResolvedValue(null);
  anthropicCreate.mockResolvedValue({ content: [{ type: 'text', text: CONFORME }], stop_reason: 'end_turn', usage: {} });
  prisma.syntheseIA.create.mockResolvedValue({ idSynthese: 'SYN_1', dateGeneration: new Date('2026-11-26T00:00:00Z') });
  prisma.auditSynthese.create.mockResolvedValue({});
});

/** Le message utilisateur réellement envoyé, et ses passations reparsées. */
async function envoyer(passations: Passation[]): Promise<{ message: string; transmises: Array<Record<string, unknown>> }> {
  prisma.questionnaireReponse.findMany.mockResolvedValue(passations);
  const res = await POST(new Request('http://x/api/praticien/synthese', { method: 'POST', body: JSON.stringify({ idPatient: 'PAT_SEED_01' }) }));
  expect(res.status).toBe(200);
  const message = anthropicCreate.mock.calls[0][0].messages[0].content as string;
  const titre = '## Résultats des questionnaires\n\n';
  const transmises = JSON.parse(message.slice(message.indexOf(titre) + titre.length));
  return { message, transmises };
}

// ── Les deux formes ─────────────────────────────────────────────────────────

const FIXTURES: Passation[] = [...REPONSES_SOPHIE, ...REPONSES_JENNIFER, ...REPONSES_MICHEL]
  .filter((r) => (QUESTIONNAIRES_INTERPRETATION_NON_TRANSMISE as readonly string[]).includes(r.idQuestionnaire))
  .map((r) => ({ ...(r as Omit<Passation, 'statutValidite'>), statutValidite: 'VALID' }));

function questionsDe(id: string): string[] {
  const def = (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[id];
  return (def?.sections ?? []).flatMap((s: any) => (s.questions ?? []).map((q: any) => q.id));
}

/** Un recueil du moteur : chaque item à `valeur`, le premier retiré si `partiel`. */
function passationMoteur(id: string, valeur: number, partiel: boolean, n: number): Passation {
  const items = questionsDe(id);
  const reponses = Object.fromEntries(items.map((q) => [q, valeur]));
  if (partiel) delete reponses[items[0]];
  const scores = calculateScore(id, reponses) as { total?: number | null; interpretation?: { label?: string } | null };
  return {
    idReponse: `R_${id}_${n}`,
    idQuestionnaire: id,
    titre: (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[id].titre,
    dateReponse: new Date(`2026-11-${String(10 + n).padStart(2, '0')}T10:00:00Z`),
    scoresJson: scores,
    scorePrincipal: typeof scores.total === 'number' ? scores.total : null,
    // La colonne, comme le dépôt l'écrit : le libellé global, s'il y en a un.
    interpretation: scores.interpretation?.label ?? null,
    statutValidite: 'VALID',
  };
}

/** Recueils complets à chaque palier de réponse (donc chaque bande), et partiels. */
const MOTEUR: Passation[] = QUESTIONNAIRES_INTERPRETATION_NON_TRANSMISE.flatMap((id, i) =>
  [0, 1, 2, 3, 4].flatMap((v) => [passationMoteur(id, v, false, i * 10 + v), passationMoteur(id, v, true, i * 10 + v + 5)]),
);

/** Ce qui ne doit jamais atteindre le message, pour une passation donnée. */
function libellesInterdits(p: Passation): string[] {
  const s = p.scoresJson as Record<string, any>;
  const duMoteur = [
    s?.interpretation?.label,
    s?.bandePlancher?.label,
    ...(s?.bandePlancher?.labelsPossibles ?? []),
    s?.note,
    ...((s?.subScores ?? []) as any[]).flatMap((x) => [x?.interpretation?.label, x?.bandePlancher?.label]),
  ];
  return [
    ...libellesDuCatalogue(p.idQuestionnaire),
    p.interpretation,
    buildMiniSynthese(p.scoresJson as Parameters<typeof buildMiniSynthese>[0]),
    ...duMoteur,
  ].filter((l): l is string => typeof l === 'string' && l.trim() !== '');
}

/** Toutes les clés d'une structure, à toute profondeur. */
function cles(v: unknown, chemin = ''): string[] {
  if (Array.isArray(v)) return v.flatMap((x) => cles(x, `${chemin}[]`));
  if (v === null || typeof v !== 'object') return [];
  return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => [`${chemin}${k}`, ...cles(x, `${chemin}${k}.`)]);
}

const CLES_INTERDITES = ['interpretation', 'miniSynthese', 'bandePlancher', 'note', 'labelsPossibles', 'couleursPossibles', 'color', 'min'];

// ── La liste fermée ──────────────────────────────────────────────────────────

describe('D-571 §3 — la liste fermée', () => {
  it('est Q_INF_02 et Q_INF_03, et ne change que par décision', () => {
    expect([...QUESTIONNAIRES_INTERPRETATION_NON_TRANSMISE], 'liste fermée modifiée : elle ne change que par décision (D-571 §3)').toEqual(['Q_INF_02', 'Q_INF_03']);
  });

  it('le motif est fixe', () => {
    expect(MOTIF_INTERPRETATION_NON_TRANSMISE).toBe("Libellé d'interprétation non transmis.");
  });

  it('les libellés cherchés existent au catalogue — sinon le contrôle est vide', () => {
    expect(libellesDuCatalogue('Q_INF_02')).toHaveLength(3);
    expect(libellesDuCatalogue('Q_INF_03')).toHaveLength(3);
  });

  it('le domaine de chaque sous-score du DNST est lu au titre de sa section, au catalogue', () => {
    const def = (QUESTIONNAIRE_CATALOGUE as Record<string, any>).Q_INF_03;
    for (const ss of def.scoring.subScores as Array<{ id: string; label: string }>) {
      const titre = (def.sections as Array<{ id: string; titre: string }>).find((s) => s.id === ss.id)!.titre;
      expect(titre.startsWith(`${ss.label} — `), `${ss.id} : la section s'ouvre sur le nom du sous-score`).toBe(true);
      expect(domaineDuSousScore('Q_INF_03', ss.id)).toBe(titre.slice(`${ss.label} — `.length));
    }
    expect(domaineDuSousScore('Q_INF_02', 'A')).toBeNull();
  });

  it('les deux formes sont réellement visitées : fixtures des deux questionnaires, et moteur à chaque bande, recueils partiels compris', () => {
    expect(new Set(FIXTURES.map((p) => p.idQuestionnaire))).toEqual(new Set(['Q_INF_02', 'Q_INF_03']));
    for (const p of FIXTURES) expect(p.interpretation, `${p.idReponse} : la fixture porte un libellé global`).toBeTruthy();
    for (const id of QUESTIONNAIRES_INTERPRETATION_NON_TRANSMISE) {
      const atteints = new Set(MOTEUR.filter((p) => p.idQuestionnaire === id).flatMap((p) => libellesInterdits(p)));
      for (const l of libellesDuCatalogue(id)) expect(atteints.has(l) || [...atteints].some((a) => a.includes(l)), `${id} : bande « ${l} » jamais produite`).toBe(true);
    }
    expect(MOTEUR.some((p) => (p.scoresJson as any).bandePlancher), 'aucun recueil partiel ne porte de bande plancher').toBe(true);
  });
});

// ── Le message ───────────────────────────────────────────────────────────────

describe('D-571 §3 et §5 — aucun libellé n’atteint le message, par aucun canal, sur les deux formes', () => {
  const cas: Array<[string, Passation]> = [
    ...FIXTURES.map((p) => [`fixture ${p.idReponse}`, p] as [string, Passation]),
    ...MOTEUR.map((p) => [`moteur ${p.idReponse}`, p] as [string, Passation]),
  ];

  it.each(cas)('%s', async (_nom, p) => {
    const { message, transmises } = await envoyer([p]);
    const bas = message.toLowerCase();
    for (const l of libellesInterdits(p)) {
      expect(bas.includes(l.toLowerCase()), `libellé transmis : « ${l} »`).toBe(false);
    }
    expect(transmises).toHaveLength(1);
    const e = transmises[0];
    // Les trois canaux, et les porteurs du recueil partiel : absents à toute profondeur.
    const toutes = cles(e).map((c) => c.split('.').pop()!.replace('[]', ''));
    for (const k of CLES_INTERDITES) expect(toutes, `clé « ${k} » transmise`).not.toContain(k);
    // La passation reste nommée, et porte le motif fixe.
    expect(e.idQuestionnaire).toBe(p.idQuestionnaire);
    expect(e.titre).toBe(p.titre);
    expect(e.interpretationNonTransmise).toBe(MOTIF_INTERPRETATION_NON_TRANSMISE);
  });

  it('le DNST garde ses quatre sous-scores, leur libellé et leur domaine ; le dépistage magnésium, son total', async () => {
    const dnst = MOTEUR.find((p) => p.idQuestionnaire === 'Q_INF_03' && p.idReponse.endsWith('_13'))!;
    const { transmises } = await envoyer([dnst]);
    const s = transmises[0].scores as { subScores: Array<{ id: string; label: string; domaine: string; total: number; max: number }> };
    expect(s.subScores.map((x) => [x.id, x.label, x.domaine])).toEqual([
      ['DA', 'Dopamine', domaineDuSousScore('Q_INF_03', 'DA')],
      ['NA', 'Noradrénaline', domaineDuSousScore('Q_INF_03', 'NA')],
      ['SE', 'Sérotonine', domaineDuSousScore('Q_INF_03', 'SE')],
      ['ME', 'Mélatonine', domaineDuSousScore('Q_INF_03', 'ME')],
    ]);
    const moteur = (dnst.scoresJson as { subScores: Array<{ total: number; max: number }> }).subScores;
    expect(s.subScores.map((x) => [x.total, x.max])).toEqual(moteur.map((x) => [x.total, x.max]));

    anthropicCreate.mockClear();
    const mg = MOTEUR.find((p) => p.idQuestionnaire === 'Q_INF_02' && p.idReponse.endsWith('_3'))!;
    const sortie = await envoyer([mg]);
    const sm = sortie.transmises[0].scores as { total: number; maxTotal: number };
    expect([sm.total, sm.maxTotal]).toEqual([(mg.scoresJson as any).total, (mg.scoresJson as any).maxTotal]);
  });

  it('un questionnaire hors liste reçoit toujours son interprétation et sa mini-synthèse', async () => {
    const had = REPONSES_JENNIFER.find((r) => r.idQuestionnaire === 'Q_NEU_11')!;
    const hors: Passation = { ...(had as Omit<Passation, 'statutValidite'>), statutValidite: 'VALID' };
    const { transmises } = await envoyer([hors]);
    expect(transmises[0].interpretation).toBe(had.interpretation);
    expect(transmises[0].interpretationNonTransmise).toBeUndefined();
    expect('miniSynthese' in transmises[0]).toBe(true);
    expect('interpretation' in transmises[0]).toBe(true);
  });
});

// ── L'équivalence des deux formes ────────────────────────────────────────────
//
// Ce que « la même forme d'entrée » veut dire ici, et ce qu'elle ne veut pas
// dire. Les mêmes clés de passation, le même porteur des sous-scores, les
// mêmes identifiants, libellés et domaines : oui. Les mêmes clés de scores :
// non — une clé absente de la fixture reste absente (la consigne donne un sens
// à `null`), si bien que la fixture porte un SOUS-ENSEMBLE des clés du moteur,
// jamais une clé qu'il n'a pas. Les valeurs, elles, sont celles de chaque
// source (la fixture du DNST compte sur 15, le moteur sur 40).

/** Les clés de scores d'une entrée, à toute profondeur. */
function clesDeScores(entree: Record<string, unknown>): Set<string> {
  return new Set(cles(entree.scores));
}

describe('D-571 §5 — après le retrait, les deux formes donnent la même forme d’entrée', () => {
  it.each(QUESTIONNAIRES_INTERPRETATION_NON_TRANSMISE)('%s : mêmes clés de passation ; clés de scores de la fixture incluses dans celles du moteur', async (id) => {
    const lire = async (p: Passation) => {
      anthropicCreate.mockClear();
      return (await envoyer([p])).transmises[0];
    };
    const fixtures = await Promise.all(FIXTURES.filter((x) => x.idQuestionnaire === id).map(lire));
    const moteurs = [];
    for (const p of MOTEUR.filter((x) => x.idQuestionnaire === id)) moteurs.push(await lire(p));
    const passation = new Set([...fixtures, ...moteurs].map((e) => JSON.stringify(Object.keys(e).sort())));
    expect([...passation], `${id} : plusieurs jeux de clés de passation`).toHaveLength(1);
    const duMoteur = new Set(moteurs.flatMap((e) => [...clesDeScores(e)]));
    for (const f of fixtures) {
      const enTrop = [...clesDeScores(f)].filter((c) => !duMoteur.has(c));
      expect(enTrop, `${id} : clé de la fixture que le moteur ne porte pas`).toEqual([]);
      expect(clesDeScores(f).size, `${id} : la fixture ne transmet aucun score`).toBeGreaterThan(0);
    }
  });

  it('les identifiants, libellés et domaines des sous-scores sont les mêmes sous les deux formes', async () => {
    const fixture = FIXTURES.find((p) => p.idQuestionnaire === 'Q_INF_03')!;
    const moteur = MOTEUR.find((p) => p.idQuestionnaire === 'Q_INF_03')!;
    const lire = async (p: Passation) => {
      anthropicCreate.mockClear();
      const { transmises } = await envoyer([p]);
      return (transmises[0].scores as { subScores: Array<{ id: string; label: string; domaine: string }> }).subScores.map((x) => [x.id, x.label, x.domaine]);
    };
    expect(await lire(fixture)).toEqual(await lire(moteur));
  });

  it('les totaux de la fixture sont repris, pas inventés ; aucune clé absente n’est écrite à null', async () => {
    for (const p of FIXTURES) {
      anthropicCreate.mockClear();
      const { transmises } = await envoyer([p]);
      const s = transmises[0].scores as Record<string, any>;
      const brut = p.scoresJson as Record<string, { total: number; max: number }>;
      if (p.idQuestionnaire === 'Q_INF_03') {
        // Le DNST de fixture n'a pas de total global : la clé reste absente,
        // elle ne devient pas un « score global non établi ».
        expect(Object.keys(s)).toEqual(['subScores']);
        for (const x of s.subScores) {
          expect(Object.keys(x).sort()).toEqual(['domaine', 'id', 'label', 'max', 'total']);
          expect([x.total, x.max]).toEqual([brut[x.id].total, brut[x.id].max]);
        }
      } else {
        expect(s).toEqual({ total: brut.A.total, maxTotal: brut.A.max });
      }
    }
  });
});

describe('D-571 §3 — cas que l’envoi d’une passation seule ne voit pas', () => {
  it('plusieurs passations : la liste fermée retirée, la passation hors liste intacte, dans le même message', async () => {
    const dnst = MOTEUR.find((p) => p.idQuestionnaire === 'Q_INF_03' && p.idReponse.endsWith('_12'))!;
    const had = REPONSES_JENNIFER.find((r) => r.idQuestionnaire === 'Q_NEU_11')!;
    const hors: Passation = { ...(had as Omit<Passation, 'statutValidite'>), statutValidite: 'VALID' };
    const { message, transmises } = await envoyer([dnst, hors]);
    const bas = message.toLowerCase();
    for (const l of libellesInterdits(dnst)) expect(bas.includes(l.toLowerCase()), `libellé transmis : « ${l} »`).toBe(false);
    const parId = Object.fromEntries(transmises.map((e) => [e.idQuestionnaire, e]));
    expect(parId.Q_INF_03.interpretationNonTransmise).toBe(MOTIF_INTERPRETATION_NON_TRANSMISE);
    expect('miniSynthese' in parId.Q_INF_03).toBe(false);
    expect(parId.Q_NEU_11.interpretation).toBe(had.interpretation);
    expect('miniSynthese' in parId.Q_NEU_11).toBe(true);
  });

  it('Q_INF_02 sur un recueil partiel : le total partiel part avec son compte de questions sans réponse', async () => {
    const partiel = MOTEUR.find((p) => p.idQuestionnaire === 'Q_INF_02' && (p.scoresJson as any).missing > 0 && typeof (p.scoresJson as any).total === 'number')!;
    expect(partiel, 'aucun recueil partiel chiffré de Q_INF_02').toBeTruthy();
    const { transmises } = await envoyer([partiel]);
    const brut = partiel.scoresJson as { total: number; maxTotal: number; missing: number };
    expect(transmises[0].scores).toEqual({ total: brut.total, maxTotal: brut.maxTotal, missing: brut.missing });
  });
});
