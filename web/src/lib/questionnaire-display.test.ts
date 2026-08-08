import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import type { QuestionnaireDef } from './questionnaire-types';
import { calculateScore, QUESTIONNAIRE_CATALOGUE } from './questions';
import {
  buildQuestionnaireAnswerPayload,
  getDisplayPolicy,
  getEnabledRenderer,
  getMicroBatches,
  getRendererPourDefinition,
  resoudreRenderer,
  type OptionOrderPolicy,
} from './questionnaire-display';
import { Q_ALI_01_SIIN_57, Q_ALI_01_COURT_14 } from './questionnaires/alimentaire';

const questionnaire: QuestionnaireDef = {
  id: 'Q_TEST_01',
  titre: 'Questionnaire fictif de test',
  sections: [
    {
      id: 'S1',
      questions: [
        { id: 'Q1', texte: 'Question 1', type: 'likert', options: [{ v: 0, l: 'Non' }] },
        { id: 'Q2', texte: 'Question 2', type: 'number' },
        { id: 'Q3', texte: 'Question conditionnelle', type: 'select', conditionnel: 'Q1>=1' },
      ],
    },
  ],
};

describe('registre d’affichage questionnaires', () => {
  it('applique strict et ordre fixe par défaut', () => {
    expect(getDisplayPolicy('Q_INCONNU')).toEqual({
      administration: 'strict',
      renderer: 'standard',
      itemOrder: 'fixed',
      optionOrder: { mode: 'fixed' },
      activation: 'enabled',
    });
  });

  it('le résolveur ne connaît AUCUN identifiant d’instrument', () => {
    // Garde de style, portée au corps de la fonction seule : le registre du même
    // fichier n'est QUE des littéraux `Q_*`, une regex sur le fichier entier
    // serait rouge dès l'écriture. Il double le garde comportemental ci-dessous,
    // qui est le seul à prouver quelque chose : celui-ci interdit une
    // orthographe, pas un comportement.
    expect(resoudreRenderer.toString()).not.toMatch(/Q_[A-Z]{3}_\d{2}/);
  });

  it('le résolveur lit la levée conditionnelle, sur des policies fabriquées', () => {
    // Aucun instrument nommé nulle part : c'est ce qui distingue la levée du
    // contournement qu'elle remplace.
    const bloquee = {
      administration: 'strict', renderer: 'guided_sections', itemOrder: 'fixed',
      optionOrder: { mode: 'fixed' }, activation: 'blocked',
      leveeConditionnelle: { discriminant: 'scoring.maxTotal', valeur: 90, motif: 'test' },
    } as const;
    expect(resoudreRenderer(bloquee, { scoring: { maxTotal: 90 } })).toBe('guided_sections');
    expect(resoudreRenderer(bloquee, { scoring: { maxTotal: 42 } })).toBe('standard');
    expect(resoudreRenderer(bloquee, { scoring: {} })).toBe('standard');
    expect(resoudreRenderer(bloquee, null)).toBe('standard');
    // Une policy bloquée SANS levée ne rend jamais son renderer, quelle que soit
    // la définition — sinon la levée n'aurait rien à lever.
    const { leveeConditionnelle: _, ...sansLevee } = bloquee;
    expect(resoudreRenderer(sansLevee as any, { scoring: { maxTotal: 90 } })).toBe('standard');
  });

  it('un discriminant INCONNU ne lève rien — jamais fail-open', () => {
    // Sans la vérification du champ `discriminant`, il serait décoratif :
    // déclarer `{discriminant:'items.count', valeur:57}` ferait quand même
    // comparer `scoring.maxTotal === 57`, et un instrument coté /57 ouvrirait la
    // grille. Une levée qu'on ne sait pas interpréter ne lève rien.
    const exotique = {
      administration: 'strict', renderer: 'guided_sections', itemOrder: 'fixed',
      optionOrder: { mode: 'fixed' }, activation: 'blocked',
      leveeConditionnelle: { discriminant: 'items.count', valeur: 57, motif: 'test' },
    } as any;
    expect(resoudreRenderer(exotique, { scoring: { maxTotal: 57 } })).toBe('standard');
  });

  it('toute page montant GenericQuestionnaire transmet le renderer du serveur', () => {
    // Le défaut réparé ici était un chemin patient qui NE passait PAS la prop :
    // le repli client retombe alors sur l'identifiant seul et sert la
    // disposition de l'autre forme. Un garde nominatif sur les deux pages
    // connues laisserait un troisième chemin s'ouvrir sans témoin ; celui-ci
    // balaie tous les sites de montage.
    const racine = join(__dirname, '..');
    const sites: string[] = [];
    const sansRenderer: string[] = [];
    const parcourir = (dossier: string) => {
      for (const entree of readdirSync(dossier, { withFileTypes: true })) {
        const chemin = join(dossier, entree.name);
        if (entree.isDirectory()) { parcourir(chemin); continue; }
        if (!entree.name.endsWith('.tsx') || entree.name.includes('.test.')) continue;
        const source = readFileSync(chemin, 'utf8');
        let i = source.indexOf('<GenericQuestionnaire');
        while (i !== -1) {
          const bloc = source.slice(i, source.indexOf('/>', i) + 2);
          sites.push(chemin);
          if (!/\brenderer=/.test(bloc)) sansRenderer.push(chemin);
          i = source.indexOf('<GenericQuestionnaire', i + 1);
        }
      }
    };
    parcourir(racine);
    // Anti-vacuité : un balayage qui ne trouve aucun site passerait au vert.
    // Le plancher était de 2 tant que le parcours legacy `app/patient` montait
    // le second : il a été retiré le 2026-08-08 (dette 5), et il ne reste que
    // l'écran portail. Le plancher descend donc à 1 — c'est le nombre de
    // montages réels, et abaisser un plancher sans le dire est la manière dont
    // un garde anti-vacuité cesse silencieusement de garder.
    expect(sites.length, 'aucun montage de GenericQuestionnaire trouvé').toBeGreaterThanOrEqual(1);
    expect(sansRenderer, `pages sans prop renderer : ${sansRenderer.join(', ')}`).toEqual([]);
  });

  it('n’active que le pilote Q_NEU_03', () => {
    expect(getEnabledRenderer('Q_NEU_03')).toBe('micro_batch');
    expect(getEnabledRenderer('Q_MOD_02')).toBe('standard');
    expect(getEnabledRenderer('Q_ALI_01')).toBe('standard');
    expect(getEnabledRenderer('Q_ALI_03')).toBe('standard');
  });

  it('définit neuf micro-lots ordonnés sans omission ni doublon pour Q_NEU_03', () => {
    const batches = getMicroBatches('Q_NEU_03');
    const questionIds = batches.flat();

    expect(batches).toHaveLength(9);
    expect(batches.map(batch => batch.length)).toEqual([3, 4, 3, 3, 1, 2, 5, 3, 1]);
    expect(questionIds).toEqual(
      Array.from({ length: 25 }, (_, index) => `SIGH_Q${String(index + 1).padStart(3, '0')}`),
    );
    expect(new Set(questionIds).size).toBe(25);
  });

  it('ne fournit aucun micro-lot aux questionnaires non activés', () => {
    for (const id of ['Q_MOD_02', 'Q_ALI_01', 'Q_ALI_03', 'Q_INCONNU']) {
      expect(getMicroBatches(id)).toEqual([]);
    }
  });

  it('spécifie shuffle_nominal sans l’utiliser dans le registre V1', () => {
    const specification: OptionOrderPolicy = {
      mode: 'shuffle_nominal',
      specificationVersion: 1,
      pinnedValues: [0],
    };
    expect(specification.mode).toBe('shuffle_nominal');
    for (const id of ['Q_NEU_03', 'Q_MOD_02', 'Q_ALI_01', 'Q_ALI_03', 'Q_INCONNU']) {
      expect(getDisplayPolicy(id).optionOrder.mode).toBe('fixed');
    }
  });

  it('conserve uniquement questionId → value, y compris pour un item conditionnel', () => {
    const payload = buildQuestionnaireAnswerPayload(questionnaire, {
      Q1: '1',
      Q2: 0,
      Q3: '2',
      __draftVersion: 3,
      visualOrder: ['Q2', 'Q1'],
      renderer: 'focus',
      invalid: Number.NaN,
    });
    expect(payload).toEqual({ Q1: '1', Q2: 0, Q3: '2' });
    expect(Object.keys(payload)).toEqual(['Q1', 'Q2', 'Q3']);
  });

  it('conserve le payload et le scoring Q_NEU_03 indépendamment de l’état UX', () => {
    const questionnaireNeu03 = QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef;
    const localValues = Object.fromEntries(
      questionnaireNeu03.sections.flatMap(section => section.questions.map(question => [question.id, 1])),
    );
    const localValuesWithUxState = {
      ...localValues,
      renderer: 'micro_batch',
      currentBatch: 6,
      visualOrder: getMicroBatches('Q_NEU_03'),
    };
    const payload = buildQuestionnaireAnswerPayload(questionnaireNeu03, localValuesWithUxState);

    expect(payload).toEqual(localValues);
    const score = calculateScore('Q_NEU_03', payload);
    expect(score).toEqual(calculateScore('Q_NEU_03', localValues));
    expect(score).toMatchObject({ scoreGroupeA: 16, scoreGroupeB: 8, total: 24 });
  });
});

// ── Renderer décidé sur la définition SERVIE (2026-07-28) ────────────────────
//
// `Q_ALI_01` a deux formes : le dépistage court à 14 items et l'Enquête
// alimentaire SIIN à 57. Le drapeau qui les départage n'existe que côté
// serveur ; si le client tranchait, il lirait `undefined` et choisirait la
// disposition de l'autre forme. Le serveur décide donc, et transmet.
describe('getRendererPourDefinition', () => {
  it('laisse la forme courte au rendu standard — son gate n’est pas levé', () => {
    expect(getRendererPourDefinition('Q_ALI_01', Q_ALI_01_COURT_14)).toBe('standard');
  });

  it('sert la grille à la forme SIIN à 57 items', () => {
    expect(getRendererPourDefinition('Q_ALI_01', Q_ALI_01_SIIN_57)).toBe('guided_sections');
  });

  it('n’ouvre la grille à aucun autre questionnaire, quel que soit son nombre d’items', () => {
    // Contrôle négatif : sans lui, un `return 'guided_sections'` inconditionnel
    // ferait passer le test ci-dessus au vert.
    expect(getRendererPourDefinition('Q_ALI_03', Q_ALI_01_SIIN_57)).toBe('standard');
    expect(getRendererPourDefinition('Q_MOD_02', Q_ALI_01_SIIN_57)).toBe('standard');
  });

  it('reste tolérante à une définition absente', () => {
    expect(getRendererPourDefinition('Q_ALI_01', null)).toBe('standard');
    expect(getRendererPourDefinition('Q_ALI_01', undefined)).toBe('standard');
  });

  it('un identifiant ABSENT du registre reste au rendu standard', () => {
    // Le contrôle négatif ci-dessus n'exerce que des identifiants PRÉSENTS au
    // registre : il ne prouve pas que la policy par défaut refuse. Sans cette
    // ligne, une policy par défaut portant une levée passerait inaperçue.
    expect(getRendererPourDefinition('Q_INCONNU', Q_ALI_01_SIIN_57)).toBe('standard');
  });

  it('le gate de `Q_ALI_01` reste BLOQUÉ — il est levé, pas retiré', () => {
    // La distinction est tout l'objet du lot : le registre continue de dire que
    // l'identifiant est bloqué, et déclare à côté la condition qui le lève. Le
    // passer à `enabled` ouvrirait la grille à la forme courte non certifiée.
    const policy = getDisplayPolicy('Q_ALI_01');
    expect(policy.activation).toBe('blocked');
    expect(policy.leveeConditionnelle).toEqual({
      discriminant: 'scoring.maxTotal',
      valeur: 90,
      motif: expect.any(String),
    });
    // Et le gate nomme les DEUX formes, pas seulement celle qui passe.
    expect(policy.gate).toContain('57');
    expect(policy.gate).toContain('14');
  });

  it('n’altère pas `getEnabledRenderer`, qui garde son contrat par identifiant', () => {
    // L'ancienne fonction est conservée telle quelle : elle sert encore de
    // repli pour tous les questionnaires à forme unique.
    expect(getEnabledRenderer('Q_ALI_01')).toBe('standard');
    expect(getEnabledRenderer('Q_NEU_03')).toBe('micro_batch');
  });
});
