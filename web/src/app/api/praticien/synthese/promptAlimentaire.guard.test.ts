import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore, computeScoreFromDef } from '@/lib/questions';
import { scoresPourPrompt } from '@/lib/scoring/scoresPourPrompt';
import {
  MASSE_RESIDUELLE,
  libellePourLeModele,
  reponsesLisibles,
  reponsesLisiblesPourPrompt,
} from '@/lib/scoring/reponsesLisibles';
import { Q_ALI_01_COURT_14, Q_ALI_01_SIIN_57 } from '@/lib/questionnaires/alimentaire';
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

// Empreinte de la consigne système sous `synthese-v13`. À reporter en même temps
// que tout bump de `VERSION_PROMPT_SYNTHESE` — c'est le couple qui est verrouillé,
// pas chacun des deux séparément.
//
// v12, le 2026-07-30 : la consigne décrit trois champs nouveaux — le champ `sens` des sous-scores.
// Il arrive avec la cotation EORTC, et sans lui un score de 100 est illisible —
// « fonctionnement sexuel » et « symptômes du bras » se lisent en sens
// CONTRAIRES, et rien dans leur libellé ne le dit. C'est le banc des sous-scores
// qui a exigé ces lignes : il refuse tout champ livré au modèle et non décrit.
// S'y ajoutent 'notApplicable' et 'raisonNonScore', que la garde ne voyait PAS :
// elle recense les champs sur des passations SATURÉES, où aucune échelle n'est
// sans objet. Elle restait verte en ratant exactement la classe qu'elle nomme.
// v13, le 2026-07-31 : la consigne affirmait « Le patient n'a jamais saisi un
// nombre : il a coché une tranche dans une liste ». C'était vrai jusqu'à la
// reconstruction de `Q_ALI_03`, qui demande désormais un NOMBRE DE PORTIONS par
// ligne. La phrase serait devenue une contre-vérité au moment précis où le
// modèle reçoit le cas qu'elle nie — et elle l'aurait invité à traiter une
// quantité déclarée comme un code de barème, c'est-à-dire à l'ignorer.
// La même version décrit `unite`, champ NOUVEAU dans la charge. Il porte la
// PÉRIODICITÉ, qui ne vivait jusque-là que dans le titre de section — jamais
// transmis : « 2 » par jour et « 2 » par semaine arrivaient identiques. Et elle
// corrige la définition de `quantiteDeclaree`, qui la disait réservée aux
// tranches sans correspondance : un instrument de saisie chiffrée n'a aucune
// tranche, et la consigne se serait contredite sur ses propres champs.
// v14 (2026-08-03, LOT-06) : section « Recommandation d'exploration
// déterministe ». Le modèle reçoit désormais un bloc numéroté, signé par le
// sha256 d'une table relue, et la consigne lui interdit d'en proposer un autre,
// d'en changer l'ordre ou d'en inventer la justification. Le bump est ce qui
// distingue une synthèse rédigée sous ce garde d'une rédigée sans.
const EMPREINTE_V14 = '828c5ed28738ed94';

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
      // Item de SAISIE CHIFFRÉE : ses bornes sont `min`/`max`, pas des options.
      // Sans cette branche, `Math.min(...[])` rendait `Infinity` et le contrôle
      // de dégénérescence ci-dessous faisait échouer la garde sur son propre
      // helper — ce qui est arrivé le 2026-07-31, quand `Q_ALI_03` reconstruit a
      // apporté 21 items chiffrés.
      const anyQ = q as { type?: string; min?: number; max?: number };
      if (anyQ.type === 'number') {
        return [q.id, borne === 'min' ? (anyQ.min ?? 0) : (anyQ.max ?? 0)];
      }
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

  it('porte la section des passations non interprétables et le NOM du champ', () => {
    // Sans cette assertion, la section ne tenait qu'à l'empreinte — or le geste
    // que le test lui-même enseigne (bump + report du nouveau hash) suffit à la
    // supprimer en gardant le CI vert. C'est la classe de défaut que ce fichier
    // documente : une interdiction dont le critère de déclenchement n'arrive
    // pas vaut moins que rien. Relevé en revue le 2026-07-27.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('mesureNonInterpretable');
    for (const interdit of ['sévérité', 'reconstituer', 'points_de_vigilance']) {
      expect(SYSTEM_PROMPT_GOUVERNANCE).toContain(interdit);
    }
  });

  it('nomme ce qui reste autorisé pour ces passations, pas seulement ce qui est interdit', () => {
    // Même raison que pour la section alimentaire : une consigne purement
    // prohibitive laisse le modèle inventer une formulation de repli.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("n'est pas exploitable");
  });

  it('dit ce que l’instrument recueille VRAIMENT, et pas seulement ce qu’il ne mesure pas', () => {
    // v7 : la consigne affirmait que les Q_ALI ne recueillent pas de quantités.
    // L'Enquête SIIN en pose 33 (portions, verres, cuillères, heures). Une
    // interdiction fondée sur une prémisse fausse s'effondre dès que le modèle
    // voit la donnée : la règle porte désormais sur ce qui la justifie
    // réellement — une quantité d'ALIMENT n'est pas un APPORT en nutriments.
    //
    // v8 a dû corriger la correction : v7 ajoutait que « la valeur enregistrée
    // EST la quantité dans l'unité de la question ». Vrai du seul moteur
    // `seuils_points`, et encore à la précision de la tranche près ; faux des
    // moteurs `sum` et `subscore`, où la valeur est un poids de points parfois
    // inversé. Voir `lib/scoring/reponsesLisibles.ts`.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('DÉCLARÉES');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('apport nutritionnel');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain("n'est pas un apport en nutriments");
    // Et elle ne doit plus nier le recueil de quantités.
    expect(SYSTEM_PROMPT_GOUVERNANCE).not.toContain('ne recueillent ni quantités consommées');
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
    ).toEqual({ version: 'synthese-v14', empreinte: EMPREINTE_V14 });
  });

  it('décrit les sous-scores livrés à la synthèse (dimensions et besoins)', () => {
    // Réserve #432, arm « décrire ce qui est livré » : à l'allumage de
    // `WN_ALI_01_SIIN57`, la charge porte, pour un même thème « rythme », une
    // dimension d'affichage (`RYTHME_ALIMENTAIRE`, /10) ET un sous-score de
    // besoin (`RYTHME_CHRONO`, /7), côte à côte sous des dénominateurs
    // différents. La consigne doit nommer les deux clés et interdire de les
    // confondre — sinon le modèle additionne deux vues d'un même thème. Marqueurs
    // stables (pas un reformulage cosmétique) : les deux noms de clés et la
    // notion de périmètres distincts.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('dimensions');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('scoresBesoins');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('périmètres différents');
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

  it('transmet le champ sur lequel la consigne « non interprétable » s’indexe', () => {
    // Même couplage que ci-dessus, pour la section ajoutée en v6 : si la
    // consigne parle de `mesureNonInterpretable`, la route doit poser ce champ
    // — orthographié à l'identique. Une consigne qui cite un nom de champ que
    // personne n'émet est une protection de façade.
    if (!SYSTEM_PROMPT_GOUVERNANCE.includes('mesureNonInterpretable')) return;
    expect(SOURCE_ROUTE).toMatch(/mesureNonInterpretable:\s*motifNonMesure/);
    // Et le motif doit venir du registre, pas d'un littéral recopié sur place.
    // La DATE de la passation est passée avec l'identifiant depuis le
    // 2026-07-31 : le registre ne marque plus un instrument entier mais les
    // passations antérieures à sa reconstruction. L'omettre ferait retomber sur
    // la frontière fermée — toutes les passations marquées, y compris les neuves.
    expect(SOURCE_ROUTE).toMatch(/motifNonInterpretable\(r\.idQuestionnaire,\s*r\.date\)/);
  });

  it('livre réellement les sous-scores que la consigne décrit', () => {
    // Couplage dans le sens « décrire = livrer » : si la consigne décrit
    // `scoresBesoins`, une passation SIIN complète doit réellement porter ce
    // porteur dans la charge — sinon la consigne décrit un fantôme. Sur la
    // DÉFINITION `Q_ALI_01_SIIN_57` (via `computeScoreFromDef`), donc indépendant
    // du drapeau env : drapeau éteint, le catalogue sert la forme courte qui n'a
    // ni dimensions ni scoresBesoins, et le test serait trivialement absent.
    if (!SYSTEM_PROMPT_GOUVERNANCE.includes('scoresBesoins')) return;
    const reponses = Object.fromEntries(
      Q_ALI_01_SIIN_57.sections.flatMap(s =>
        s.questions.map(q => [q.id, Number((q.options ?? [])[0]?.v)] as const)
      )
    );
    expect(Object.keys(reponses).length, 'forme SIIN : aucune question balayée').toBe(57);
    const scores = computeScoreFromDef(Q_ALI_01_SIIN_57 as any, reponses) as any;
    // La charge réelle est `scoresPourPrompt({...scores, rawAnswers})` (route.ts).
    const charge = scoresPourPrompt({ ...scores, rawAnswers: reponses }) as any;
    for (const cle of ['dimensions', 'scoresBesoins'] as const) {
      expect(
        Array.isArray(charge[cle]) && charge[cle].length > 0,
        `la consigne décrit ${cle} mais la charge ne le porte pas`,
      ).toBe(true);
      for (const sous of charge[cle]) {
        expect(typeof sous.id, `${cle} : id manquant`).toBe('string');
        expect(typeof sous.label, `${cle} : label manquant`).toBe('string');
        expect(typeof sous.max, `${cle} : max non numérique`).toBe('number');
        expect('total' in sous, `${cle} : total absent`).toBe(true);
      }
    }
    // Le thème « rythme » apparaît bien SOUS LES DEUX clés, avec des max
    // distincts : c'est l'homonymie que la consigne apprend à ne pas confondre.
    const maxDim = charge.dimensions.find((d: any) => d.id === 'RYTHME_ALIMENTAIRE')?.max;
    const maxBesoin = charge.scoresBesoins.find((d: any) => d.id === 'RYTHME_CHRONO')?.max;
    expect(maxDim, 'RYTHME_ALIMENTAIRE absent des dimensions').toBe(10);
    expect(maxBesoin, 'RYTHME_CHRONO absent des scoresBesoins').toBe(7);
    expect(maxDim === maxBesoin, 'les deux vues du rythme ont le même dénominateur — homonymie non exercée').toBe(false);
  });
});

describe('garde-fou alimentaire — aucune quantité non étalonnée dans le prompt', () => {
  const idsAlimentaires = Object.keys(QUESTIONNAIRE_CATALOGUE).filter(id => id.startsWith('Q_ALI'));

  it('couvre au moins les trois questionnaires alimentaires servis', () => {
    expect(idsAlimentaires.length).toBeGreaterThanOrEqual(3);
  });

  it.each(idsAlimentaires)('%s ne fait sortir aucune clé de quantité vers le modèle', id => {
    // BRANCHE « instrument de recueil », et non un filtre sur l'identifiant.
    // `Q_ALI_09` (agenda alimentaire) ne porte AUCUN item : sa saisie passe par
    // un composant patient dédié, jour par jour. Le balayage aux bornes n'a donc
    // rien à balayer, et l'anti-vacuité ci-dessous exigerait deux totaux
    // distincts d'un moteur qui n'en produit aucun.
    //
    // Le sortir de `idsAlimentaires` serait plus court et serait une TRAPPE —
    // c'est le mot qu'emploie `promptSousScores.guard.test.ts` pour la même
    // tentation. L'exigence est donc REMPLACÉE, pas levée : ce que cette garde
    // protège (aucune quantité ne part au modèle) doit rester vrai ici, et l'est
    // même plus fortement, puisque rien ne part du tout.
    const definition = (QUESTIONNAIRE_CATALOGUE as any)[id];
    const sansItems = !(definition?.sections ?? []).flatMap((s: any) => s.questions ?? []).length;
    if (sansItems) {
      const scores = (calculateScore as any)(id, {});
      expect(scores?.scored, `${id} : instrument sans item, il doit rendre scored:false`).toBe(false);
      expect(scores?.total, `${id} : instrument sans item, aucun total ne doit être produit`).toBeUndefined();
      // La vraie exigence de ce fichier, exercée sur le chemin réel du prompt.
      const charge = scoresPourPrompt({ ...scores, rawAnswers: {} });
      expect(
        cheminsDeQuantite(charge),
        `${id} : instrument sans item, mais des quantités partent au modèle`,
      ).toEqual([]);
      return;
    }
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
      // La charge utile réelle est `reponsesLisiblesPourPrompt(id,
      // scoresPourPrompt(scoresJson))` (`route.ts`), et `scoresJson` vaut
      // `{...scores, rawAnswers}` (`api/patient/submit`). Balayer le retour nu
      // du moteur laisserait `rawAnswers` hors du champ.
      const charge = scoresPourPrompt({ ...scores, rawAnswers: reponses });
      const chemins = cheminsDeQuantite(charge);
      expect(chemins, `${id} (${borne}) laisse passer ${chemins.join(', ')}`).toEqual([]);
      // La grandeur observable n'est pas toujours `total` : `Q_ALI_03` rend deux
      // apports d'unités différentes et AUCUN total global — les additionner
      // n'aurait pas de sens. On prend donc ce que l'instrument produit
      // réellement, faute de quoi l'anti-vacuité ci-dessous comparerait deux
      // fois zéro et ne prouverait rien.
      totaux[borne] = Number(scores?.total ?? scores?.proteinesG);
    }
    // Anti-vacuité, sur la sortie cette fois : les deux bornes doivent produire
    // des totaux finis et **distincts**. Un balayage qui rend deux fois le même
    // score n'a pas exercé l'échelle — c'est la signature du questionnaire non
    // répondu que la version cassée envoyait au moteur.
    expect(Number.isFinite(totaux.min) && Number.isFinite(totaux.max), `${id} : totaux non finis`).toBe(true);
    expect(totaux.max, `${id} : les deux bornes rendent ${totaux.max} — échelle non exercée`).toBeGreaterThan(totaux.min);
  });

  // La forme SIIN à 57 items n'est servie que drapeau allumé. `idsAlimentaires`
  // itère sur le CATALOGUE, donc sur la seule forme que sert le drapeau : sans
  // cette passe, allumer `WN_ALI_01_SIIN57` changerait en silence ce que ce
  // fichier vérifie. Même patron que `formeAlimentaireServie.guard.test.ts`.
  it('couvre la forme SIIN dans les deux positions du drapeau', () => {
    const reponses = Object.fromEntries(
      Q_ALI_01_SIIN_57.sections.flatMap(s =>
        s.questions.map(q => [q.id, Number((q.options ?? [])[0]?.v)] as const)
      )
    );
    expect(Object.keys(reponses).length, 'forme SIIN : aucune question balayée').toBe(57);
    // Sur la DÉFINITION, jamais via le catalogue : drapeau éteint, le catalogue
    // sert la forme courte, aucun des 57 identifiants n'y existe et la fonction
    // ne traduit rien. L'assertion serait alors trivialement vraie sur un objet
    // où rien n'a été fait — un garde vide portant le nom qu'il ne tient pas.
    const lisibles = reponsesLisibles(Q_ALI_01_SIIN_57 as any, reponses);
    // Anti-vacuité sur la SORTIE, pas sur l'entrée : c'est le détour par
    // l'entrée qui avait laissé passer la version cassée du 2026-07-27.
    const resolus = Object.values(lisibles).filter((v: any) => v?.reponse !== undefined);
    expect(resolus.length, 'forme SIIN : aucun item traduit').toBe(57);
    expect(cheminsDeQuantite(lisibles)).toEqual([]);
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

describe('garde-fou alimentaire — la charge porte la tranche cochée, pas son code', () => {
  // Aucun item alimentaire n'est en saisie libre : ce sont des listes. Ce que la
  // valeur enregistrée SIGNIFIE dépend du moteur — quantité représentative de la
  // tranche sur `seuils_points`, poids de points parfois inversé sur `sum` et
  // `subscore`. La consigne autorisant le modèle à rapporter la déclaration du
  // patient, lui livrer l'entier nu revenait à l'inviter à la fabriquer : ici une
  // précision fausse (« 6 verres » pour « 5 à 8 »), là un contresens (« 3 » pour
  // « Rarement ou jamais »).
  //
  // ATTENDUS ÉCRITS À LA MAIN, jamais recalculés depuis le catalogue. Un
  // attendu dérivé du champ testé est ce qui avait rendu `ALI01_SERT_UNE_CONDUITE`
  // vert alors qu'une perte clinique réelle passait : les deux membres
  // bougeaient ensemble.

  // Sur les DÉFINITIONS, jamais sur le catalogue : le catalogue ne montre que la
  // forme que sert le drapeau, et ces assertions doivent mordre dans les deux
  // positions.
  const surSIIN = (r: Record<string, unknown>, item: string) =>
    reponsesLisibles(Q_ALI_01_SIIN_57 as any, r)[item];
  const surCourte = (r: Record<string, unknown>, item: string) =>
    reponsesLisibles(Q_ALI_01_COURT_14 as any, r)[item];

  it('SIIN01 : la valeur 6 devient « 5 à 8 verres », et la question est nommée', () => {
    expect(surSIIN({ SIIN01: 6 }, 'SIIN01')).toEqual({
      question: "Combien de verres d'eau buvez-vous chaque jour, en comptant thés, tisanes et cafés ?",
      reponse: '5 à 8 verres',
    });
  });

  it('SIIN07 : la valeur 12 devient « 10 à 14 » — jamais douze verres', () => {
    expect(surSIIN({ SIIN07: 12 }, 'SIIN07')).toMatchObject({ reponse: '10 à 14' });
  });

  it('AL5 : le code 3 devient « Rarement ou jamais » — l’échelle est INVERSÉE', () => {
    // Le cas le plus dangereux, et il vit sur la forme servie AUJOURD'HUI :
    // lu comme une quantité, `AL5: 3` devient « 3 fois par semaine » de viande
    // rouge pour un patient qui a déclaré n'en manger jamais.
    expect(surCourte({ AL5: 3 }, 'AL5')).toMatchObject({ reponse: 'Rarement ou jamais' });
  });

  it('AL6 : le code 3 n’est pas une quantité du tout', () => {
    expect(surCourte({ AL6: 3 }, 'AL6')).toMatchObject({
      reponse: "Huile d'olive vierge extra",
    });
  });

  it('sur `seuils_points`, une valeur hors tranches reste une QUANTITÉ DÉCLARÉE', () => {
    // Sur la forme SIIN, la valeur stockée EST la quantité, et les tranches sont
    // une construction WellNeuro révisable : le moteur existe pour qu'un barème
    // révisé se rejoue sur les réponses déjà recueillies. La déclarer « non
    // exploitable » détruirait cette propriété — après ajout d'une tranche, une
    // passation parfaitement scorée serait annoncée illisible au modèle.
    // 13 verres/semaine : entre les tranches « 10 à 14 » (v=12) et « 15 ou plus »
    // (v=15), donc hors des valeurs servies — l'état exact où laisserait une
    // révision des bandes. Le moteur, lui, la score sans peine (13 > 9).
    const item = surSIIN({ SIIN07: 13 }, 'SIIN07') as any;
    expect(item.reponse).toBeUndefined();
    expect(item.quantiteDeclaree).toBe(13);
    expect(item.valeurNonResolue).toBeUndefined();
  });

  it('sur `sum`, une valeur hors options est NON RÉSOLUE — c’est un code', () => {
    // Contrôle négatif du test ci-dessus : sur la forme courte, la valeur est un
    // poids de points, sans rapport avec une quantité. La livrer comme une
    // quantité déclarée serait le défaut d'origine, remis en place.
    const item = surCourte({ AL5: 99 }, 'AL5') as any;
    expect(item.valeurNonResolue).toBe(99);
    expect(item.quantiteDeclaree).toBeUndefined();
  });

  it('un item étranger à la forme servie ne repart JAMAIS nu', () => {
    // Une des 8 passations `AL*` de production, relue drapeau allumé : livrée
    // nue, `AL5: 0` (« Tous les jours » de viande rouge) arriverait sous une
    // consigne affirmant que les réponses portent leur libellé — le défaut même
    // que ce module existe pour fermer, rouvert au prochain basculement.
    expect(surSIIN({ AL5: 0 }, 'AL5')).toEqual({ valeurNonResolue: 0 });
    expect(surCourte({ SIIN01: 6 }, 'SIIN01')).toEqual({ valeurNonResolue: 6 });
  });

  it('aucun libellé transmis ne porte une masse — parade déterministe', () => {
    // Dix questions définissent la portion en grammes pour aider le PATIENT.
    // Transmises telles quelles, elles offrent au modèle une multiplication
    // (« 3 portions × 100 g = 300 g »), une masse que personne n'a déclarée.
    // Une interdiction en langue naturelle ne serait pas vérifiable — c'est le
    // reproche que ce lot adresse à `synthese-v7` et le défaut de #408.
    const defs = [Q_ALI_01_SIIN_57, Q_ALI_01_COURT_14, QUESTIONNAIRE_CATALOGUE['Q_ALI_02'], QUESTIONNAIRE_CATALOGUE['Q_ALI_03']];
    const fautifs: string[] = [];
    let nettoyes = 0;
    for (const def of defs as any[]) {
      for (const section of def.sections) {
        for (const q of section.questions) {
          const transmis = libellePourLeModele(q.texte);
          if (transmis !== q.texte) nettoyes++;
          if (MASSE_RESIDUELLE.test(transmis)) fautifs.push(`${q.id}: ${transmis}`);
        }
      }
    }
    expect(fautifs, `masses transmises : ${fautifs.join(' | ')}`).toEqual([]);
    // Anti-vacuité : une fonction identité passerait l'assertion ci-dessus si
    // aucun libellé ne portait de masse. Dix en portaient jusqu'au 2026-07-31 ;
    // seize depuis. `Q_ALI_03` reconstruit en apporte huit — « Petite portion
    // (100 g) », « Poisson (150 g) », « Fromage (30 g) »… — et en retire deux,
    // ses anciens `MO1`/`MO2`.
    //
    // Les masses y sont ENTRE PARENTHÈSES délibérément : c'est la forme que la
    // parade sait retirer, et il fallait qu'elle sache. Sur cet instrument la
    // multiplication « 3 portions × 100 g » est faite par le MOTEUR, à partir de
    // la table de conversion de la source ; le modèle, lui, n'a aucune raison de
    // la refaire et ne reçoit donc ni la masse unitaire, ni le total pondéré
    // (`scoresPourPrompt` écarte `proteinesG` et `caloriesKcal`).
    expect(nettoyes, 'aucun libellé nettoyé — la parade ne s’applique nulle part').toBe(16);
  });

  it('le nettoyage ne mutile pas le libellé', () => {
    expect(libellePourLeModele('Combien de portions de légumes (environ 80 g) consommez-vous chaque jour ?'))
      .toBe('Combien de portions de légumes consommez-vous chaque jour ?');
    // Une parenthèse sans masse est intacte.
    expect(libellePourLeModele("Combien de verres d'eau ? (ou plus d'1,5 L)"))
      .toBe("Combien de verres d'eau ? (ou plus d'1,5 L)");
  });

  it('la forme servie passe bien par le catalogue', () => {
    // Le seul point où le drapeau intervient : l'enveloppe indexée par id.
    const servie = QUESTIONNAIRE_CATALOGUE['Q_ALI_01'] as any;
    const premier = servie.sections[0].questions[0];
    const charge = reponsesLisiblesPourPrompt('Q_ALI_01', {
      rawAnswers: { [premier.id]: premier.options[0].v },
    }) as any;
    expect(charge.rawAnswers[premier.id]).toEqual({
      question: premier.texte,
      reponse: premier.options[0].l,
    });
  });

  it('ne touche à rien hors des Q_ALI', () => {
    const scores = { rawAnswers: { P1: 2 }, total: 7 };
    expect(reponsesLisiblesPourPrompt('Q_SOM_01', scores)).toBe(scores);
    expect(reponsesLisiblesPourPrompt('CAB_TENSION', scores)).toBe(scores);
  });

  it('laisse passer une ligne héritée sans rawAnswers', () => {
    const errone = { error: 'Questionnaire introuvable' };
    expect(reponsesLisiblesPourPrompt('Q_ALI_01', errone)).toBe(errone);
    expect(reponsesLisiblesPourPrompt('Q_ALI_01', null)).toBe(null);
  });

  it('la consigne dit ce que la route livre — sinon l’une des deux ment', () => {
    // Couplage consigne/charge : la consigne décrit la forme `{question, reponse}`
    // et le champ `valeurNonResolue`. Si la route cessait de les produire, ou la
    // consigne de les décrire, ce test tombe.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('reponse');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('valeurNonResolue');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('tranche');
    const item = surSIIN({ SIIN01: 6 }, 'SIIN01') as any;
    expect(Object.keys(item).sort()).toEqual(['question', 'reponse']);
  });

  it('interdit la conversion d’une tranche en compte et d’une portion en masse', () => {
    // Dix questions Q_ALI définissent la portion en grammes pour aider le
    // patient (« une portion = 12 g », « 100 g »). Ces équivalences arrivent au
    // modèle avec le libellé de la question : sans interdiction explicite, il
    // peut les multiplier et rendre une masse que personne n'a déclarée.
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('Ne convertis jamais une tranche en compte exact');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('Ne calcule aucune masse consommée');
    expect(SYSTEM_PROMPT_GOUVERNANCE).toContain('quantiteDeclaree');
  });
});

describe('garde-fou alimentaire — forme de la sortie moteur', () => {
  // La seule garde qui attrape un apport étalonné REPOSÉ SOUS UN NOM NEUTRE.
  // Aucune règle de nom ne le fera jamais : `monnier` n'a été attrapé que parce
  // qu'on connaissait son nom. Ici l'ensemble attendu est écrit à la main —
  // le dériver du moteur rendrait le test vrai par construction.
  // Portée : la charge RÉELLEMENT transmise, `scoresPourPrompt(scores)`, et non
  // le retour nu du moteur — `conduite` est légitime en sortie de moteur et
  // n'arrive jamais au modèle. Balayer le retour nu ferait rougir la garde sur
  // une clé qui ne sort pas, et elle finirait désactivée.
  //
  // `dimensions`, `missing` et `missingIds` sont émis par le moteur
  // `seuils_points` de la forme SIIN — donc invisibles drapeau éteint. C'est la
  // passe drapeau allumé qui les a fait apparaître, et c'est la preuve que
  // cette passe sert. Vérifiés un par un avant d'être admis : `dimensions` est
  // le découpage DESCRIPTIF en 12 catégories (`{id,label,total,max}`, aucune
  // unité physiologique), `missing` un COMPTE d'items non répondus, `missingIds`
  // leurs identifiants. Aucun n'est un apport étalonné.
  // `repondus` : ajouté au niveau RACINE le 2026-08-04, avec la garde de
  // complétude des moteurs `sum` et `bms_average`. Il était déjà admis en
  // imbriqué (voir plus bas) et pour la même raison, vérifiée à nouveau ici sur
  // `questions.ts` avant admission : c'est un COMPTE de questions renseignées,
  // pendant exact de `missing`, sans unité physiologique ni valeur de barème.
  // Les deux disent pourquoi une bande manque, là où un `interpretation: null`
  // nu laisserait croire à un trou de grille.
  const CLES_ADMISES = new Set([
    'type', 'total', 'maxTotal', 'subScores', 'interpretation', 'note',
    'certification', 'scored', 'rawAnswers', 'categories', 'bande',
    'dimensions', 'missing', 'missingIds', 'raisonNonScore', 'scoresBesoins',
    'repondus',
  ]);
  // `scoresBesoins` : sous-scores SERVIS à un besoin de Mon équilibre, ajouté le
  // 2026-07-28 pour le besoin 3. Lu avant admission : même forme que
  // `dimensions` (`{id, label, total, max, repondus, items, interpretation}`),
  // des comptes et des points de barème, aucune unité physiologique. Clé
  // distincte de `subScores` à dessein — la fiche patient basculerait ses
  // colonnes Score et Interprétation dessus et remplacerait le total /90.
  // `repondus` et `items` sont deux COMPTES portés par chaque catégorie SIIN
  // (items renseignés / items de la catégorie) — vérifiés dans `questions.ts`
  // avant admission, aucune unité physiologique.
  const CLES_IMBRIQUEES_ADMISES = new Set([
    ...CLES_ADMISES, 'id', 'label', 'max', 'scaled', 'maxScaled', 'repondus', 'items',
  ]);

  function clesInconnues(objet: unknown, admises: Set<string>): string[] {
    if (objet === null || typeof objet !== 'object') return [];
    return Object.keys(objet as Record<string, unknown>).filter(c => !admises.has(c));
  }

  const idsAlimentaires = Object.keys(QUESTIONNAIRE_CATALOGUE).filter(id => id.startsWith('Q_ALI'));

  it.each(idsAlimentaires)('%s n’émet aucune clé hors de l’ensemble admis', id => {
    const scores = (calculateScore as any)(id, reponsesALaBorne(id, 'max'));
    const charge = scoresPourPrompt(scores) as any;
    const inconnues = clesInconnues(charge, CLES_ADMISES);
    expect(
      inconnues,
      `${id} : clés non déclarées ${inconnues.join(', ')} — si elles sont légitimes, les ajouter ICI en connaissance de cause`,
    ).toEqual([]);
    // `subScores`, `dimensions` ET `scoresBesoins` : trois imbrications où un
    // bloc au nom neutre pourrait se loger. N'en balayer que deux laisserait la
    // troisième ouverte — c'est exactement ce qui était arrivé à `dimensions`.
    const imbriques = [
      ...((charge?.subScores ?? []) as Array<Record<string, unknown>>),
      ...((charge?.dimensions ?? []) as Array<Record<string, unknown>>),
      ...((charge?.scoresBesoins ?? []) as Array<Record<string, unknown>>),
    ];
    for (const bloc of imbriques) {
      const inconnuesBloc = clesInconnues(bloc, CLES_IMBRIQUEES_ADMISES);
      expect(inconnuesBloc, `${id} : bloc ${String(bloc.id)} — ${inconnuesBloc.join(', ')}`).toEqual([]);
    }
  });

  it('échoue si un apport étalonné revient sous un nom neutre', () => {
    // Preuve par mutation, intégrée : la garde ci-dessus n'a de valeur que si
    // elle rougit sur ce cas. `bloc7` ne matche AUCUN motif de nom — c'est
    // précisément la classe qu'aucune liste noire de noms n'attrapera jamais.
    const avecApport = scoresPourPrompt({ type: 'sum', total: 12, bloc7: { valeur: 78 } });
    expect(clesInconnues(avecApport, CLES_ADMISES)).toEqual(['bloc7']);
  });
});
