import { createHash } from 'crypto';
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
// Les trois gardes ci-dessous échouent si l'un ou l'autre revient — y compris
// sous une forme conditionnée aux réponses, et non seulement par un revert
// littéral. La preuve comportementale du second point (l'identifiant survit à
// `JSON.stringify`) vit dans `route.post.test.ts`.

const SOURCE_ROUTE = readFileSync(join(__dirname, 'route.ts'), 'utf8');

// Empreinte de la consigne système sous `synthese-v5`. À reporter en même temps
// que tout bump de `VERSION_PROMPT_SYNTHESE` — c'est le couple qui est verrouillé,
// pas chacun des deux séparément.
const EMPREINTE_V5 = '7a2a60d64444864e';

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

function questionsDe(id: string): Array<{ id: string; options?: Array<{ v: unknown }> }> {
  const def = (QUESTIONNAIRE_CATALOGUE as Record<string, any>)[id];
  return (def?.sections ?? []).flatMap((s: any) => s.questions ?? []);
}

/**
 * Réponses saturées à la borne basse ou haute. Même forme que
 * `reponsesALaBorne` dans `conduite.guard.test.ts` — les options du catalogue
 * sont `{v, l}` et **pas** `{value}` : `value` n'apparaît qu'après
 * `getQuestionnaireForClient`. Une première version de ce helper lisait
 * `options[0].value`, obtenait `undefined`, retombait sur l'objet et envoyait
 * « [object Object] » au moteur — qui rendait alors un questionnaire
 * entièrement non répondu, identique aux deux « bornes ». La garde ne scorait
 * donc jamais une seule réponse valide. Trouvé en re-revue le 2026-07-27 ;
 * c'est la raison de l'assertion d'anti-vacuité plus bas.
 */
function reponsesALaBorne(id: string, borne: 'min' | 'max'): Record<string, number> {
  return Object.fromEntries(
    questionsDe(id).map(q => {
      const valeurs = (q.options ?? []).map(o => Number(o.v)).filter(Number.isFinite);
      return [q.id, borne === 'min' ? Math.min(...valeurs) : Math.max(...valeurs)];
    })
  );
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

  it('change de version dès que la consigne change', () => {
    // `not.toBe('synthese-v4')` passait pour n'importe quelle valeur, retour à
    // v3 compris — il ne couplait rien. L'empreinte lie la version au texte :
    // **toute** édition de la consigne fait échouer ce test tant que la
    // version n'a pas été incrémentée et l'empreinte remise à jour ensemble.
    // C'est précisément ce que le changelog présente comme l'objet du bump.
    const empreinte = createHash('sha256').update(SYSTEM_PROMPT_GOUVERNANCE).digest('hex').slice(0, 16);
    expect(
      { version: VERSION_PROMPT_SYNTHESE, empreinte },
      'consigne modifiée : incrémenter VERSION_PROMPT_SYNTHESE et reporter la nouvelle empreinte ici',
    ).toEqual({ version: 'synthese-v5', empreinte: EMPREINTE_V5 });
  });
});

describe('garde-fou alimentaire — couplage consigne / charge utile', () => {
  // Contrôle structurel seul : `buildUserMessage` n'est pas exportable depuis
  // un `route.ts` (contrainte Next.js), même patron que `conduite.guard.test`.
  // La preuve **comportementale** — l'identifiant survit à `JSON.stringify` —
  // vit dans `route.post.test.ts`, qui capture la charge utile Anthropic.
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
    const totaux: Record<string, number> = {};
    for (const borne of ['min', 'max'] as const) {
      const reponses = reponsesALaBorne(id, borne);
      // Un helper de bornes cassé rend des réponses dégénérées — `undefined`,
      // `NaN`, ou `±Infinity` quand `Math.min(...[])` opère sur un tableau
      // vide. Le vérifier ici, sur l'entrée, plutôt que d'espérer que le score
      // de sortie le trahisse : c'est ce détour par la sortie qui a laissé
      // passer la version cassée du 2026-07-27.
      const valeurs = Object.values(reponses);
      expect(valeurs.length, `${id} : aucune question balayée`).toBeGreaterThan(0);
      expect(
        valeurs.every(Number.isFinite),
        `${id} (${borne}) : réponses dégénérées ${JSON.stringify(reponses)}`,
      ).toBe(true);
      const scores = (calculateScore as any)(id, reponses);
      // La charge utile réelle est `scoresPourPrompt(scoresJson)`, et
      // `scoresJson` vaut `{...scores, rawAnswers}` (`api/patient/submit`).
      // Balayer le retour nu du moteur laisserait `rawAnswers` hors du champ.
      const charge = scoresPourPrompt({ ...scores, rawAnswers: reponses });
      const chemins = cheminsDeQuantite(charge);
      expect(chemins, `${id} (${borne}) laisse passer ${chemins.join(', ')}`).toEqual([]);
      totaux[borne] = Number(scores?.total);
    }
    // Anti-vacuité, sur la sortie cette fois : les deux bornes doivent produire
    // des totaux finis et **distincts**. Un balayage qui rend deux fois le même
    // score n'a pas exercé l'échelle — c'est la signature du questionnaire non
    // répondu que la version cassée envoyait au moteur.
    expect(Number.isFinite(totaux.min) && Number.isFinite(totaux.max), `${id} : totaux non finis`).toBe(true);
    expect(totaux.max, `${id} : les deux bornes rendent ${totaux.max} — échelle non exercée`).toBeGreaterThan(totaux.min);
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
