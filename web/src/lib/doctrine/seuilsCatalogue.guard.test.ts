import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { Q_ALI_01_COURT_14, Q_ALI_01_SIIN_57 } from '@/lib/questionnaires';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import {
  DEBUT_DU_CATALOGUE,
  empreinteMoteur,
  empreinteScoring,
  FIN_DU_CATALOGUE,
  sourceSansCommentaires,
} from './empreinteScoring';
import INSTANTANE from './seuilsCatalogue.instantane.json';

// GARDE : AUCUN SEUIL DU CATALOGUE NE BOUGE SANS DÉCISION — t23, portée
// déclarée par le LOT-03 « Doctrine exécutable » ([[D-105]]), rappelée par le
// LOT-11 ([[D-107]]) ; forme et portée arbitrées le 2026-10-21.
//
// LE TROU QU'IL FERME. `seuilsLitterauxMotives.guard.test.ts` exempte le
// catalogue PAR FORME : tout `questions.ts`, moteur compris, est « chez lui ».
// Ses seuils — les bandes des 65 blocs `scoring` ET ceux que le moteur écrit en
// dur (Horne, QIF, Berlin, AUDIT, composantes du PSQI, Karasek, Bristol…) —
// n'étaient gardés que par une PROCÉDURE : la certification et `DC-17`/`DC-18`.
//
// LA FORME. Un instantané figé (`seuilsCatalogue.instantane.json`) porte
// l'HISTORIQUE des empreintes (`empreinteScoring.ts`) du moteur et de chaque
// bloc. Le banc exige :
//   — que la dernière étape de chaque historique soit l'empreinte du code ;
//   — que les étapes de POSE (2026-10-21, sans décision) n'aient pas été
//     réécrites : leur empreinte globale est figée ici, en littéral ;
//   — que chaque étape APRÈS la pose porte une décision `D-xxx` présente au
//     registre ET postérieure à la pose (numéro > celui de la dernière décision
//     à la pose) — une retouche se décide avant de s'écrire ;
//   — que les questionnaires de l'instantané soient ceux du catalogue, un
//     retrait s'écrivant comme une étape `retire: true` avec sa décision.
//
// JAMAIS UN VERROU. Une empreinte divergente fait rougir le CI ; elle ne coupe
// pas le scoring en production — couper 65 questionnaires sur une virgule
// serait le pire des modes de panne.
//
// METTRE À JOUR, APRÈS LA DÉCISION ET JAMAIS AVANT : ajouter à l'historique
// concerné `{ "empreinte": <celle que le banc affiche>, "decision": "D-xxx",
// "date": "AAAA-MM-JJ" }`. Un questionnaire neuf entre avec une première étape
// qui porte déjà sa décision. Ne jamais réécrire une étape : l'historique
// s'allonge, il ne se corrige pas. L'instantané de pose a été produit une fois,
// le 2026-10-21, par un script jetable qui appelait ces mêmes fonctions.
//
// LIMITES, NOMMÉES — `seuilsLitterauxMotives` en dit autant, et un banc qu'on
// croit garder autre chose est pire qu'absent :
//   — la valeur des options de réponse (`sections`) n'entre dans aucune
//     empreinte ;
//   — le MOTEUR est tout `questions.ts` hors du littéral du catalogue (imports
//     compris) ; les modules qu'il importe (`clinical/bandesPsqi.ts`, gardé, lui,
//     par les grilles signées) ne sont pas dans son empreinte, seul l'import l'est ;
//   — le banc vérifie qu'une décision EXISTE et qu'elle est récente, pas
//     qu'elle parle de ce questionnaire : la revue le fait.

type Etape = { empreinte: string; decision: string | null; date: string; retire?: boolean };
type Instantane = {
  version: number;
  pose: string;
  derniereDecisionALaPose: string;
  moteur: Etape[];
  entrees: Record<string, Etape[]>;
};

/** Toute réécriture d'une étape de pose change cette valeur. */
const EMPREINTE_DE_LA_POSE = '8fc610670c87b1bf4749c4df3709d18376e9ecaeba4835a197ef0279b60dc11c';

const instantane = INSTANTANE as Instantane;
type Entree = { scoring?: unknown };
const CATALOGUE = QUESTIONNAIRE_CATALOGUE as Record<string, Entree>;

/**
 * UN QUESTIONNAIRE À DEUX VARIANTES servies selon un drapeau
 * (`WN_ALI_01_SIIN57`, lu à l'import) : chacune a son historique, quelle que
 * soit la position du drapeau dans le run — sinon le banc ne garderait que la
 * variante du jour, et rougirait selon l'environnement.
 */
const VARIANTES: Record<string, Record<string, Entree>> = { Q_ALI_01: { Q_ALI_01_COURT_14, Q_ALI_01_SIIN_57 } };

/** Les blocs gardés : le catalogue, chaque variante à la place de son entrée. */
const BLOCS: Record<string, Entree> = Object.fromEntries(
  Object.entries(CATALOGUE).flatMap(([id, entree]) => (VARIANTES[id] ? Object.entries(VARIANTES[id]) : [[id, entree]])),
);
const SOURCE_QUESTIONS = readFileSync(path.resolve(__dirname, '../questions.ts'), 'utf8');
const REGISTRE = readFileSync(path.resolve(__dirname, '../../../../docs/DECISIONS.md'), 'utf8');

const numero = (decision: string) => Number(decision.slice(2));

/** Une décision existe si le registre lui consacre un titre. */
function decisionAuRegistre(registre: string, decision: string): boolean {
  return new RegExp(`^#+ ${decision.replace('-', '\\-')} `, 'm').test(registre);
}

/**
 * Ce qui fait la pose : sa date, la dernière décision qu'elle connaissait, et
 * les étapes SANS décision. Un questionnaire neuf, entré avec sa décision, n'y
 * touche pas ; abaisser `derniereDecisionALaPose` la change (contre-revue).
 */
function empreinteDeLaPose(i: Instantane): string {
  const pose = {
    pose: i.pose,
    derniereDecisionALaPose: i.derniereDecisionALaPose,
    moteur: i.moteur[0],
    entrees: Object.fromEntries(
      Object.keys(i.entrees)
        .sort()
        .filter(k => i.entrees[k][0].decision === null)
        .map(k => [k, i.entrees[k][0]]),
    ),
  };
  return createHash('sha256').update(JSON.stringify(pose)).digest('hex');
}

/** Les fautes d'historique, jouables sur un instantané synthétique. */
function fautesHistorique(i: Instantane, registre: string, idsCatalogue: string[]): string[] {
  const fautes: string[] = [];
  const historiques: [string, Etape[]][] = [['MOTEUR', i.moteur], ...Object.entries(i.entrees)];
  for (const [id, historique] of historiques) {
    historique.forEach((etape, rang) => {
      if (!/^[0-9a-f]{64}$/.test(etape.empreinte)) fautes.push(`${id}#${rang} : empreinte illisible`);
      if (etape.decision === null) {
        if (!(rang === 0 && etape.date === i.pose)) fautes.push(`${id}#${rang} : sans décision hors de la pose`);
      } else if (!/^D-\d{3,}$/.test(etape.decision) || !decisionAuRegistre(registre, etape.decision)) {
        fautes.push(`${id}#${rang} : ${etape.decision} absente du registre`);
      } else if (numero(etape.decision) <= numero(i.derniereDecisionALaPose)) {
        fautes.push(`${id}#${rang} : ${etape.decision} antérieure à la pose`);
      }
    });
  }
  const actifs = Object.entries(i.entrees).filter(([, h]) => !h.at(-1)?.retire).map(([id]) => id).sort();
  if (JSON.stringify(actifs) !== JSON.stringify([...idsCatalogue].sort())) {
    fautes.push(`questionnaires divergents : instantané ${actifs.length}, catalogue ${idsCatalogue.length}`);
  }
  return fautes;
}

describe('garde : les seuils du catalogue ne bougent pas sans décision', () => {
  it('le registre est lu et la pose n’a pas été réécrite', () => {
    expect(decisionAuRegistre(REGISTRE, instantane.derniereDecisionALaPose)).toBe(true);
    expect(empreinteDeLaPose(instantane)).toBe(EMPREINTE_DE_LA_POSE);
  });

  it('le moteur a l’empreinte de la dernière étape de son historique', () => {
    // Les bornes du littéral exclu existent : sans elles, l'empreinte lève.
    expect(SOURCE_QUESTIONS).toContain(DEBUT_DU_CATALOGUE);
    expect(SOURCE_QUESTIONS).toContain(FIN_DU_CATALOGUE);
    expect(empreinteMoteur(SOURCE_QUESTIONS)).toBe(instantane.moteur.at(-1)?.empreinte);
  });

  it('une entrée à variantes sert l’une de ses variantes déclarées, jamais une troisième', () => {
    for (const [id, variantes] of Object.entries(VARIANTES)) {
      expect(Object.values(variantes)).toContain(CATALOGUE[id]);
    }
  });

  it('chaque bloc de scoring a l’empreinte de la dernière étape de son historique', () => {
    const divergents = Object.entries(BLOCS)
      .map(([id, entree]) => ({
        id,
        attendue: instantane.entrees[id]?.at(-1)?.empreinte,
        actuelle: empreinteScoring(entree.scoring),
      }))
      .filter(d => d.attendue !== d.actuelle);
    // Le message porte l'empreinte à recopier — APRÈS la décision.
    expect(divergents).toEqual([]);
  });

  it('l’historique respecte ses règles', () => {
    expect(fautesHistorique(instantane, REGISTRE, Object.keys(BLOCS))).toEqual([]);
  });
});

describe('les règles d’historique rougissent sur ce qu’elles doivent refuser', () => {
  const E = 'a'.repeat(64);
  const REG = '### D-100 — ancienne\n### D-200 — à la pose\n### D-201 — après\n';
  const base = (): Instantane => ({
    version: 1,
    pose: '2026-10-21',
    derniereDecisionALaPose: 'D-200',
    moteur: [{ empreinte: E, decision: null, date: '2026-10-21' }],
    entrees: { Q_A: [{ empreinte: E, decision: null, date: '2026-10-21' }] },
  });

  it('un historique conforme passe', () => {
    const i = base();
    i.entrees.Q_A.push({ empreinte: E, decision: 'D-201', date: '2026-11-02' });
    expect(fautesHistorique(i, REG, ['Q_A'])).toEqual([]);
  });

  it('une étape sans décision hors de la pose, ou un questionnaire neuf sans décision', () => {
    const i = base();
    i.entrees.Q_A.push({ empreinte: E, decision: null, date: '2026-11-02' });
    i.entrees.Q_B = [{ empreinte: E, decision: null, date: '2026-11-02' }];
    expect(fautesHistorique(i, REG, ['Q_A', 'Q_B'])).toEqual([
      'Q_A#1 : sans décision hors de la pose',
      'Q_B#0 : sans décision hors de la pose',
    ]);
  });

  it('une décision absente du registre, ou antérieure à la pose', () => {
    const i = base();
    i.moteur.push({ empreinte: E, decision: 'D-999', date: '2026-11-02' });
    i.entrees.Q_A.push({ empreinte: E, decision: 'D-100', date: '2026-11-02' });
    expect(fautesHistorique(i, REG, ['Q_A'])).toEqual([
      'MOTEUR#1 : D-999 absente du registre',
      'Q_A#1 : D-100 antérieure à la pose',
    ]);
  });

  it('un retrait sans étape « retire », et un retrait en règle', () => {
    const i = base();
    expect(fautesHistorique(i, REG, [])).toEqual(['questionnaires divergents : instantané 1, catalogue 0']);
    i.entrees.Q_A.push({ empreinte: E, decision: 'D-201', date: '2026-11-02', retire: true });
    expect(fautesHistorique(i, REG, [])).toEqual([]);
  });

  it('la pose : un questionnaire neuf décidé ne la touche pas ; abaisser la dernière décision la change', () => {
    const i = base();
    const avant = empreinteDeLaPose(i);
    i.entrees.Q_B = [{ empreinte: E, decision: 'D-201', date: '2026-11-02' }];
    expect(empreinteDeLaPose(i)).toBe(avant);
    i.derniereDecisionALaPose = 'D-100';
    expect(empreinteDeLaPose(i)).not.toBe(avant);
  });

  it('D-10 ne se lit pas comme D-107', () => {
    expect(decisionAuRegistre('### D-107 — x\n', 'D-10')).toBe(false);
  });
});

describe('les empreintes voient ce qu’elles doivent voir', () => {
  const BLOC = { type: 'sum', interpretation: [{ min: 0, max: 4, label: 'Faible' }], note: 'provenance' };

  it('un seuil, une interprétation ou la note retouchés changent l’empreinte du bloc', () => {
    expect(empreinteScoring({ ...BLOC, interpretation: [{ min: 0, max: 5, label: 'Faible' }] })).not.toBe(empreinteScoring(BLOC));
    expect(empreinteScoring({ ...BLOC, interpretation: [{ min: 0, max: 4, label: 'Bas' }] })).not.toBe(empreinteScoring(BLOC));
    expect(empreinteScoring({ ...BLOC, note: 'autre' })).not.toBe(empreinteScoring(BLOC));
  });

  it('l’ordre des clés ne change pas l’empreinte du bloc ; un nombre non fini est refusé', () => {
    expect(empreinteScoring({ note: 'provenance', interpretation: BLOC.interpretation, type: 'sum' })).toBe(empreinteScoring(BLOC));
    expect(() => empreinteScoring({ ...BLOC, max: Infinity })).toThrow(/non fini/);
  });

  const FICHIER = [
    "import { BANDES_PSQI } from './clinical/bandesPsqi';",
    DEBUT_DU_CATALOGUE,
    "  Q_X: { scoring: { type: 'sum' } },",
    FIN_DU_CATALOGUE,
    'export function calculateScore(id) { return 1; }',
    "function computeScoreFromDefBrut(def) { if (score > 30) return { label: 'Élevé' }; // seuil publié",
    '  return null; /* fin */',
    '}',
  ].join('\n');

  it('le moteur : un seuil, un libellé ou un import retouchés changent l’empreinte', () => {
    expect(empreinteMoteur(FICHIER.replace('> 30', '>= 30'))).not.toBe(empreinteMoteur(FICHIER));
    expect(empreinteMoteur(FICHIER.replace("'Élevé'", "'Haut'"))).not.toBe(empreinteMoteur(FICHIER));
    expect(empreinteMoteur(FICHIER.replace('./clinical/bandesPsqi', './autresBandes'))).not.toBe(empreinteMoteur(FICHIER));
  });

  it('le moteur : commentaires, blancs et littéral du catalogue ne changent pas son empreinte', () => {
    const recommente = FICHIER.replace('// seuil publié', '// autre motif').replace('/* fin */', '').replace('  return', '\treturn');
    expect(empreinteMoteur(recommente)).toBe(empreinteMoteur(FICHIER));
    expect(empreinteMoteur(FICHIER.replace("type: 'sum'", "type: 'subscore'"))).toBe(empreinteMoteur(FICHIER));
  });

  it('une regex après un mot-clé n’avale pas le seuil qui la suit', () => {
    const source = 'function f(x, s) { return /a\\/\\//.test(x) && s > 30; }';
    expect(sourceSansCommentaires(source)).toContain('s > 30');
  });

  it('une chaîne qui contient // n’est pas prise pour un commentaire', () => {
    expect(sourceSansCommentaires("const u = 'http://x'; // note")).toBe("const u = 'http://x';");
  });
});
