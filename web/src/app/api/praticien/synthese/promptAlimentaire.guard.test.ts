import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore } from '@/lib/questions';
import { scoresPourPrompt } from '@/lib/scoring/scoresPourPrompt';
import { SYSTEM_PROMPT_GOUVERNANCE, VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';

// Garde du garde-fou alimentaire (audit métrologique du 2026-07-26, P0 point 4).
//
// La revue adversariale du 2026-07-27 a trouvé deux défauts que la suite ne
// voyait pas, parce qu'ils étaient tous deux dans ce que le code *ne faisait
// pas* :
//
//  1. `Q_ALI_03` émettait un bloc `monnier` annonçant des protéines en g/j et
//     des calories en kcal/j, calculé depuis des sous-scores inexistants — donc
//     0 partout, invariant aux réponses, persisté en base et transmis au
//     modèle. La consigne lui interdisait de conclure à une quantité pendant
//     qu'on lui en livrait une, fausse.
//  2. La consigne désigne les questionnaires alimentaires par leur identifiant,
//     que la route ne transmettait pas. Le critère de déclenchement n'arrivait
//     jamais.
//
// Les trois gardes ci-dessous échouent si l'un ou l'autre revient.

const SOURCE_ROUTE = readFileSync(join(__dirname, 'route.ts'), 'utf8');

/** Clés dont le nom annonce une quantité physiologique étalonnée. */
const MOTIFS_QUANTITE = /^(proteines|calories|kcal|glucides|lipides|monnier|apport)/i;

function cheminsDeQuantite(valeur: unknown, chemin = ''): string[] {
  if (Array.isArray(valeur)) {
    return valeur.flatMap((v, i) => cheminsDeQuantite(v, `${chemin}[${i}]`));
  }
  if (valeur === null || typeof valeur !== 'object') return [];
  const trouves: string[] = [];
  for (const [cle, sousValeur] of Object.entries(valeur as Record<string, unknown>)) {
    const ici = chemin ? `${chemin}.${cle}` : cle;
    if (MOTIFS_QUANTITE.test(cle)) trouves.push(ici);
    trouves.push(...cheminsDeQuantite(sousValeur, ici));
  }
  return trouves;
}

/** Réponses aux deux bornes pour un questionnaire du catalogue. */
function bornes(def: any): Record<string, string>[] {
  const questions = (def.sections ?? []).flatMap((s: any) => s.questions ?? []);
  const basse: Record<string, string> = {};
  const haute: Record<string, string> = {};
  for (const q of questions) {
    const options = q.options ?? [];
    if (options.length === 0) continue;
    basse[q.id] = String(options[0].value ?? options[0]);
    haute[q.id] = String(options[options.length - 1].value ?? options[options.length - 1]);
  }
  return [basse, haute];
}

describe('garde-fou alimentaire — consigne système', () => {
  it('porte la section alimentaire et ses interdictions clés', () => {
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('Q_ALI');
    for (const interdit of ['carence', 'kilocalories', 'supplémentation', 'statut biologique']) {
      expect(SYSTEM_PROMPT_GOUVERNANCE.toLowerCase()).toContain(interdit.toLowerCase());
    }
  });

  it('nomme ce qui reste autorisé, pas seulement ce qui est interdit', () => {
    // Une consigne purement prohibitive laisse le modèle sans formulation de
    // repli : il en invente une, souvent équivalente à ce qu'on lui interdit.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('exposition');
  });

  it('est étiquetée par une version distincte de v4', () => {
    // La règle a été ajoutée après v4 : sans bump, les synthèses produites avec
    // et sans le garde-fou seraient indiscernables en base.
    expect(VERSION_PROMPT_SYNTHESE).not.toBe('synthese-v4');
  });
});

describe('garde-fou alimentaire — couplage consigne / charge utile', () => {
  it('transmet au modèle l’identifiant sur lequel la consigne s’indexe', () => {
    // Défaut B2 : la consigne cite « identifiants commençant par Q_ALI » alors
    // que `buildUserMessage` ne sérialisait que `titre`. Si la consigne
    // continue de s'indexer sur l'identifiant, la route doit le transmettre.
    if (!SYSTEM_PROMPT_GOUVERNANCE.includes('Q_ALI')) return;
    expect(SOURCE_ROUTE).toMatch(/idQuestionnaire:\s*r\.idQuestionnaire/);
    const bloc = SOURCE_ROUTE.slice(
      SOURCE_ROUTE.indexOf('function buildUserMessage'),
      SOURCE_ROUTE.indexOf('function buildUserMessage') + 1200,
    );
    expect(bloc).toContain('idQuestionnaire');
  });
});

describe('garde-fou alimentaire — aucune quantité non étalonnée dans le prompt', () => {
  const idsAlimentaires = Object.keys(QUESTIONNAIRE_CATALOGUE).filter(id => id.startsWith('Q_ALI'));

  it('couvre au moins les trois questionnaires alimentaires servis', () => {
    expect(idsAlimentaires.length).toBeGreaterThanOrEqual(3);
  });

  it.each(idsAlimentaires)('%s ne fait sortir aucune clé de quantité vers le modèle', id => {
    const def = (QUESTIONNAIRE_CATALOGUE as any)[id];
    for (const reponses of bornes(def)) {
      const scores = (calculateScore as any)(id, reponses);
      const chemins = cheminsDeQuantite(scoresPourPrompt(scores));
      expect(chemins, `${id} laisse passer ${chemins.join(', ')}`).toEqual([]);
    }
  });

  it('écarte un bloc `monnier` hérité, encore porté par les passations en base', () => {
    // La clé subsiste dans les `scores_json` déjà enregistrés : le retrait du
    // calcul ne les réécrit pas. Le filtre doit donc la couvrir aussi.
    const herite = {
      type: 'subscore',
      total: 12,
      monnier: { proteinesGJour: 0, caloriesTotalesEstimees: 0 },
    };
    expect(cheminsDeQuantite(scoresPourPrompt(herite))).toEqual([]);
  });
});
