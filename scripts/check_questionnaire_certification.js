#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const questionsPath = path.join(root, 'web/src/lib/questions.ts');
const mappingPath = path.join(root, 'docs/questionnaires-drive-mapping.md');

// Le catalogue est découpé par domaine (lot 7) : `questions.ts` importe des
// modules locaux (`./questionnaires/*`). Ce check évalue le catalogue comme un
// script autonome ; il faut donc « inliner » ces imports relatifs locaux (déps
// d'abord, dédupliquées) avant l'eval, puis retirer les mots-clés `export`.
function stripModuleSource(source) {
  return source
    .replace(/^\s*import\s+[^;]*?from\s+['"]\.[^'"]*['"];?\s*$/gm, '')
    .replace(/^\s*export\s+\*\s+from\s+['"]\.[^'"]*['"];?\s*$/gm, '')
    .replace(/^\s*export\s+\{[^}]*\}\s+from\s+['"]\.[^'"]*['"];?\s*$/gm, '')
    .replace(/^export\s+(const|function|class|let|var)\b/gm, '$1')
    .replace(/^export\s+default\s+/gm, '');
}

function localImportPaths(source, dir) {
  const re = /(import\s+[^;]*?from\s+['"](\.[^'"]*)['"])|(export\s+(?:\*|\{[^}]*\})\s+from\s+['"](\.[^'"]*)['"])/g;
  const out = [];
  let match;
  while ((match = re.exec(source))) {
    const rel = match[2] || match[4];
    if (!rel) continue;
    let abs = path.resolve(dir, rel);
    if (!abs.endsWith('.ts')) abs += '.ts';
    out.push(abs);
  }
  return out;
}

function stripDuplicateQuestionHelpers(source) {
  if (!source.includes('QUESTIONNAIRE_CATALOGUE')) return source;
  const duplicateNames = new Set(['O_RPS', 'O_JPT', 'O_04', 'O_03jt', 'O_YN', 'O_UPPS', 'O_YOUNG', 'O_BMS', 'O_CUNGI', 'O_PAS', 'O_ZARIT', 'O_DASS', 'O_CONNERS']);
  return source.split('\n').filter(line => {
    const constMatch = line.match(/^const ([A-Za-z0-9_]+)\s*=/);
    if (constMatch && duplicateNames.has(constMatch[1])) return false;
    if (/^function q(n|s)?\(/.test(line)) return false;
    return true;
  }).join('\n');
}

function inlineModule(file, seen, parts) {
  const abs = path.resolve(file);
  if (seen.has(abs)) return;
  seen.add(abs);
  const source = fs.readFileSync(abs, 'utf8');
  for (const dep of localImportPaths(source, path.dirname(abs))) inlineModule(dep, seen, parts);
  parts.push(stripDuplicateQuestionHelpers(stripModuleSource(source)));
}

function loadQuestionsModule() {
  const parts = [];
  inlineModule(questionsPath, new Set(), parts);
  const source = parts.join('\n');
  return new Function(`${source}\nreturn { QUESTIONNAIRE_CATALOGUE, calculateScore };`)();
}

function assertEqual(actual, expected, message) {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) {
    throw new Error(`[questionnaires] ${message} — attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`[questionnaires] ${message}`);
}

const { QUESTIONNAIRE_CATALOGUE, calculateScore } = loadQuestionsModule();
const mapping = fs.readFileSync(mappingPath, 'utf8');
const allowedStatuses = new Set(['certifié', 'mappé', 'ambigu', 'n/a', 'absent Drive', 'historique', 'doublon', 'à vérifier', 'à faire', 'non scoré']);

const certifiedFixtures = new Set([
  'Q_CAN_01',
  'Q_CAN_02',
  'Q_GEO_01',
  'Q_GEO_02',
  'Q_GAS_01',
  'Q_GAS_02',
  'Q_FIB_01',
  'Q_FIB_02',
  'Q_FIB_03',
  'Q_INF_01',
  'Q_INF_02',
  'Q_INF_03',
  'Q_INF_04',
  'Q_INF_05',
  'Q_MOD_03',
  'Q_NEU_01',
  'Q_NEU_03',
  'Q_NEU_04',
  'Q_NEU_07',
  'Q_NEU_08',
  'Q_NEU_09',
  'Q_NEU_11',
  'Q_NEU_02',
  'Q_NEU_05',
  'Q_NEU_10',
  'Q_NEU_12',
  'Q_PED_01',
  'Q_PED_03',
  'Q_PNE_01',
  'Q_SOM_02',
  'Q_SOM_05',
  'Q_SOM_06',
  'Q_STR_01',
  'Q_STR_02',
  'Q_STR_03',
  'Q_STR_04',
  'Q_STR_05',
  'Q_STR_06',
  'Q_STR_08',
  'Q_TAB_01',
  'Q_TAB_02',
  'Q_TAB_05',
  'Q_URO_01',
  'Q_URO_02',
]);

function questions(idQuestionnaire) {
  return QUESTIONNAIRE_CATALOGUE[idQuestionnaire].sections.flatMap(section => section.questions);
}

function fill(idQuestionnaire, value) {
  return Object.fromEntries(questions(idQuestionnaire).map(question => [question.id, value]));
}

function fillByOptionBoundary(idQuestionnaire, boundary) {
  return Object.fromEntries(questions(idQuestionnaire).map(question => {
    const values = (question.options || [])
      .map(option => Number(option.v))
      .filter(value => Number.isFinite(value));
    const value = boundary === 'min' ? Math.min(...values) : Math.max(...values);
    return [question.id, value];
  }));
}

function optionLabels(idQuestionnaire, idQuestion) {
  const question = questions(idQuestionnaire).find(question => question.id === idQuestion);
  return (question?.options || []).map(option => option.l);
}

function optionValues(idQuestionnaire, idQuestion) {
  const question = questions(idQuestionnaire).find(question => question.id === idQuestion);
  return (question?.options || []).map(option => option.v);
}

function defaultAnswers(idQuestionnaire) {
  return Object.fromEntries(questions(idQuestionnaire).flatMap(question => {
    if (!question.id) return [];
    if (Array.isArray(question.options) && question.options.length > 0) {
      const firstNumeric = question.options
        .map(option => option.v)
        .find(value => value !== null && value !== undefined && value !== '');
      return [[question.id, firstNumeric ?? 0]];
    }
    if (typeof question.min === 'number') return [[question.id, question.min]];
    return [[question.id, 0]];
  }));
}

function hasInvalidNumber(value) {
  if (typeof value === 'number') return Number.isNaN(value) || !Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasInvalidNumber);
  if (value && typeof value === 'object') return Object.values(value).some(hasInvalidNumber);
  return false;
}

function parseMatrixRows(markdown) {
  return markdown
    .split('\n')
    .filter(line => line.startsWith('| `Q_'))
    .map(line => {
      const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
      return {
        id: cells[0].replace(/`/g, ''),
        source: cells[1],
        items: cells[2],
        options: cells[3],
        conditionnels: cells[4],
        scoring: cells[5],
        interpretation: cells[6],
        tests: cells[7],
        notes: cells[8],
      };
    });
}

const ids = Object.keys(QUESTIONNAIRE_CATALOGUE).sort();
const matrixRows = parseMatrixRows(mapping);
const matrixIds = matrixRows.map(row => row.id).sort();
const missingMapping = ids.filter(id => !matrixIds.includes(id));
const extraMapping = matrixIds.filter(id => !ids.includes(id));
assertEqual(missingMapping, [], 'chaque questionnaire du catalogue doit être documenté dans la matrice Drive');
assertEqual(extraMapping, [], 'la matrice ne doit pas référencer de questionnaire absent du catalogue');
assertEqual(new Set(matrixIds).size, matrixIds.length, 'la matrice ne doit pas contenir de doublon Q_*');

matrixRows.forEach(row => {
  ['items', 'options', 'conditionnels', 'scoring', 'interpretation', 'tests'].forEach(field => {
    assert(allowedStatuses.has(row[field]), `${row.id} contient un statut inconnu dans ${field}: ${row[field]}`);
  });
  if (row.tests === 'certifié') {
    assert(certifiedFixtures.has(row.id), `${row.id} est marqué tests certifié mais n'a pas de fixture déclarée`);
  }
});

const fixturesMissingInMatrix = [...certifiedFixtures].filter(id => {
  const row = matrixRows.find(row => row.id === id);
  return !row || row.tests !== 'certifié';
});
assertEqual(fixturesMissingInMatrix, [], 'chaque fixture certifiée doit être marquée certifiée dans la matrice');

const supportedScoringTypes = new Set([
  'audit',
  'berlin',
  'bms_average',
  'bristol',
  'composite_multi_parties',
  'count_threshold',
  'ecab',
  'francis',
  'group_majority',
  'had',
  'horne',
  'idtas_ae',
  'journal',
  'karasek',
  'plaintes_actuelles',
  'psqi',
  'qif',
  'sigh_sad_sa',
  'subscore',
  'sum',
  'sum_decimal',
  'sum_items',
  'sum_no_interpretation',
  'sum_reversed',
  'sum_two_phases',
  'tfd',
  'upps',
  'weighted_per_axis',
]);

const unknownScoringTypes = ids
  .map(id => QUESTIONNAIRE_CATALOGUE[id].scoring?.type)
  .filter(type => type && !supportedScoringTypes.has(type));
assertEqual([...new Set(unknownScoringTypes)], [], 'chaque scoring.type déclaré doit être connu du check');

ids.forEach(id => {
  const result = calculateScore(id, defaultAnswers(id));
  assert(!result.error, `${id} ne doit pas retourner une erreur avec des réponses synthétiques`);
  assert(!hasInvalidNumber(result), `${id} ne doit pas produire de NaN ou Infinity avec des réponses synthétiques`);
});

function assertCertification(result, expectedStatus, idQuestionnaire) {
  assert(result.certification, `${idQuestionnaire} doit exposer une métadonnée certification`);
  assertEqual(result.certification.source, 'drive', `${idQuestionnaire} doit être sourcé Drive`);
  assertEqual(result.certification.status, expectedStatus, `${idQuestionnaire} statut certification incorrect`);
}

assertEqual(calculateScore('Q_CAN_01', fill('Q_CAN_01', 1)).total, 28, 'Q_CAN_01 score minimal');
assertEqual(calculateScore('Q_CAN_01', fill('Q_CAN_01', 4)).total, 112, 'Q_CAN_01 score maximal');
assertEqual(calculateScore('Q_CAN_01', fill('Q_CAN_01', 2)).total, 56, 'Q_CAN_01 score médian');
const c30Missing = fill('Q_CAN_01', 1);
delete c30Missing.QL1;
assertEqual(calculateScore('Q_CAN_01', c30Missing).missingIds, ['QL1'], 'Q_CAN_01 missingIds');
assertCertification(calculateScore('Q_CAN_01', fill('Q_CAN_01', 1)), 'ambigu', 'Q_CAN_01');

const brMasked = fill('Q_CAN_02', 1);
brMasked.BR4 = 1;
brMasked.BR15 = 1;
const brMaskedScore = calculateScore('Q_CAN_02', brMasked);
assertEqual(brMaskedScore.total, 21, 'Q_CAN_02 conditionnels masqués total');
assertEqual(brMaskedScore.notApplicable, ['BR5', 'BR16'], 'Q_CAN_02 notApplicable');
assertEqual(calculateScore('Q_CAN_02', fill('Q_CAN_02', 4)).total, 92, 'Q_CAN_02 score maximal');
assertEqual(calculateScore('Q_CAN_02', fill('Q_CAN_02', 2)).total, 46, 'Q_CAN_02 score médian');
assertCertification(calculateScore('Q_CAN_02', fill('Q_CAN_02', 2)), 'ambigu', 'Q_CAN_02');

assertEqual(calculateScore('Q_PED_03', fill('Q_PED_03', 0)).total, 0, 'Q_PED_03 score minimal');
assertEqual(calculateScore('Q_PED_03', fill('Q_PED_03', 3)).total, 324, 'Q_PED_03 score maximal');
assertEqual(calculateScore('Q_PED_03', fill('Q_PED_03', 1)).total, 108, 'Q_PED_03 score médian');
assertEqual(questions('Q_PED_03').length, 108, 'Q_PED_03 doit contenir 108 items scorés');
assertCertification(calculateScore('Q_PED_03', fill('Q_PED_03', 0)), 'certifie', 'Q_PED_03');

assertEqual(calculateScore('Q_NEU_03', fillByOptionBoundary('Q_NEU_03', 'min')).total, 0, 'Q_NEU_03 score minimal');
assertEqual(calculateScore('Q_NEU_03', fillByOptionBoundary('Q_NEU_03', 'max')).total, 74, 'Q_NEU_03 score maximal');
assertEqual(calculateScore('Q_NEU_03', fill('Q_NEU_03', 1)).total, 24, 'Q_NEU_03 score médian');
const sighSpecial = fillByOptionBoundary('Q_NEU_03', 'min');
sighSpecial.SIGH_Q015 = 2;
sighSpecial.SIGH_Q016 = 2;
sighSpecial.SIGH_Q017 = 4;
assertEqual(calculateScore('Q_NEU_03', sighSpecial).scoreDual1517, 2, 'Q_NEU_03 règle spéciale Q15-Q17');
assertEqual(questions('Q_NEU_03').length, 25, 'Q_NEU_03 doit contenir 25 items');
assertCertification(calculateScore('Q_NEU_03', fillByOptionBoundary('Q_NEU_03', 'min')), 'certifie', 'Q_NEU_03');

assertEqual(calculateScore('Q_NEU_01', fill('Q_NEU_01', 0)).total, 0, 'Q_NEU_01 score minimal');
assertEqual(calculateScore('Q_NEU_01', fill('Q_NEU_01', 3)).total, 39, 'Q_NEU_01 score maximal');
assertEqual(calculateScore('Q_NEU_01', fill('Q_NEU_01', 0)).interpretation.label, "Variation de l'humeur considérée comme physiologique", 'Q_NEU_01 seuil minimal rattaché');
assertEqual(calculateScore('Q_NEU_01', fill('Q_NEU_01', 2)).interpretation.label, 'Dépression avérée', 'Q_NEU_01 seuil dépression avérée');
assertEqual(questions('Q_NEU_01').length, 13, 'Q_NEU_01 doit contenir 13 items');
assertEqual(optionLabels('Q_NEU_01', 'B7'), [
  'Je ne pense pas à me faire du mal.',
  'Je pense que la mort me libérerait.',
  "J'ai des plans précis pour me suicider.",
  'Si je le pouvais, je me tuerais.',
], 'Q_NEU_01 options vigilance suicide Drive');
assert(calculateScore('Q_NEU_01', fill('Q_NEU_01', 0)).note.includes('score calculable 0'), 'Q_NEU_01 doit documenter le rattachement du score 0');
assertCertification(calculateScore('Q_NEU_01', fill('Q_NEU_01', 0)), 'certifie', 'Q_NEU_01');

const hadMin = calculateScore('Q_NEU_11', fill('Q_NEU_11', 0));
const hadMax = calculateScore('Q_NEU_11', fill('Q_NEU_11', 3));
assertEqual(hadMin.subScores.map(score => score.total), [0, 0], 'Q_NEU_11 sous-scores minimaux');
assertEqual(hadMax.subScores.map(score => score.total), [21, 21], 'Q_NEU_11 sous-scores maximaux');
assertEqual(hadMax.total, 42, 'Q_NEU_11 score total maximal');
assertEqual(hadMax.subScores.map(score => score.interpretation.label), ['Symptomatologie certaine', 'Symptomatologie certaine'], 'Q_NEU_11 seuils hauts');
assertEqual(optionLabels('Q_NEU_11', 'A3'), ['Oui, très nettement', "Oui, mais ce n'est pas très grave", "Un peu, mais cela ne m'inquiète pas", 'Pas du tout'], 'Q_NEU_11 options A3 Drive');
assertEqual(optionLabels('Q_NEU_11', 'D10'), ['Plus du tout', "Je n'y accorde pas autant d'attention que je le devrais", "Il se peut que je n'y fasse plus autant attention", "J'y prête autant d'attention que par le passé"], 'Q_NEU_11 options D10 Drive');
assert(calculateScore('Q_NEU_11', fill('Q_NEU_11', 0)).note.includes('ordre alterné historique'), 'Q_NEU_11 doit documenter l’ordre conservé');
assertCertification(hadMin, 'certifie', 'Q_NEU_11');

assertEqual(calculateScore('Q_MOD_03', fill('Q_MOD_03', 1)).total, 7, 'Q_MOD_03 score minimal');
assertEqual(calculateScore('Q_MOD_03', fill('Q_MOD_03', 10)).total, 70, 'Q_MOD_03 score maximal');
assertEqual(calculateScore('Q_MOD_03', fill('Q_MOD_03', 4)).average, 4, 'Q_MOD_03 moyenne globale');
assertEqual(calculateScore('Q_MOD_03', fill('Q_MOD_03', 10)).subScores.map(score => score.total), [10, 10, 10, 10, 10, 10, 10], 'Q_MOD_03 domaines maximaux');
assertEqual(calculateScore('Q_MOD_03', fill('Q_MOD_03', 10)).interpretation.label, 'Intensité très élevée', 'Q_MOD_03 lecture descriptive haute');
assertEqual(questions('Q_MOD_03').map(question => question.id), ['Q001', 'Q002', 'Q003', 'Q004', 'Q005', 'Q006', 'Q007'], 'Q_MOD_03 identifiants Drive');
assertCertification(calculateScore('Q_MOD_03', fill('Q_MOD_03', 1)), 'certifie', 'Q_MOD_03');

const stressSiinScore4 = fill('Q_STR_01', 0);
stressSiinScore4.A1 = 2;
stressSiinScore4.A2 = 2;
const stressSiinScore5 = {...stressSiinScore4, A3: 1};
const stressSiinScore15 = fill('Q_STR_01', 0);
['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'].forEach(id => { stressSiinScore15[id] = 2; });
stressSiinScore15.B8 = 1;
assertEqual(calculateScore('Q_STR_01', fill('Q_STR_01', 0)).total, 0, 'Q_STR_01 score minimal');
assertEqual(calculateScore('Q_STR_01', fill('Q_STR_01', 2)).total, 42, 'Q_STR_01 score maximal');
assertEqual(calculateScore('Q_STR_01', stressSiinScore4).interpretation.label, 'Oriente vers les conseils de vie antistress', 'Q_STR_01 seuil 4 harmonisé');
assertEqual(calculateScore('Q_STR_01', stressSiinScore5).interpretation.dominant, 'A', 'Q_STR_01 groupe dominant à partir de 5');
assertEqual(calculateScore('Q_STR_01', stressSiinScore15).interpretation.label, 'Oriente vers le protocole mixte dopaminergique + sérotoninergique', 'Q_STR_01 seuil 15 harmonisé');
assertEqual(calculateScore('Q_STR_01', stressSiinScore15).subScores.map(score => score.total), [14, 1, 0], 'Q_STR_01 sous-scores A/B/C');
assertEqual(optionLabels('Q_STR_01', 'A1'), ['Rarement', 'Parfois', 'Souvent'], 'Q_STR_01 options Drive');
assertEqual(questions('Q_STR_01').map(question => question.texte), [
  'J’ai du mal à me réveiller le matin, je dois souvent prendre un café ou des stimulants.',
  'Je me sens vite fatigué(e), même sans effort.',
  'J’ai des troubles de la concentration, j’oublie des choses facilement.',
  'Je me sens moins en forme au quotidien.',
  'J’ai parfois des coups de pompe, des vertiges, une faiblesse soudaine.',
  'Je suis démotivé(e), je n’ai goût à rien et j’ai tendance à remettre à demain ce que je dois faire.',
  'J’ai parfois la tête vide, je suis distrait(e).',
  'Je me sens tendu(e) et nerveux(se), souvent agité(e).',
  'Je rencontre des difficultés pour m’endormir, je pense souvent à des soucis.',
  'Je suis nerveux(se), inquiet(e) et parfois anxieux(se).',
  'Je n’arrive pas à prendre du temps pour décompresser, me détendre.',
  'Je me réveille souvent dans la nuit ou fin de nuit.',
  'Un rien me stresse, m’énerve et me fait réagir.',
  'Je suis très exigeant(e), envers moi-même et les autres.',
  'J’ai souvent mal au dos, à la nuque ou des maux de tête.',
  'J’ai des palpitations cardiaques, des tremblements.',
  'J’ai une respiration courte et rapide, je suis essoufflé(e), je soupire souvent.',
  'J’ai parfois un nœud creux de l’estomac, la gorge serrée.',
  'J’ai des troubles digestifs ou intestinaux, des douleurs au ventre.',
  'J’ai des secousses musculaires, au niveau du visage, des paupières.',
  'Je fume, je bois de l’alcool ou prends d’autres substances pour me stimuler ou me calmer.',
], 'Q_STR_01 libellés Stress SIIN Drive');
assert(calculateScore('Q_STR_01', stressSiinScore15).note.includes('seuils 4 et 15'), 'Q_STR_01 doit documenter les seuils harmonisés');
assertCertification(calculateScore('Q_STR_01', fill('Q_STR_01', 0)), 'certifie', 'Q_STR_01');

assertEqual(calculateScore('Q_STR_02', fillByOptionBoundary('Q_STR_02', 'min')).total, 10, 'Q_STR_02 score minimal brut Drive');
assertEqual(calculateScore('Q_STR_02', fillByOptionBoundary('Q_STR_02', 'max')).total, 50, 'Q_STR_02 score maximal brut Drive');
assertEqual(calculateScore('Q_STR_02', fillByOptionBoundary('Q_STR_02', 'max')).interpretation.label, 'Niveau élevé de stress et désadaptation', 'Q_STR_02 seuil haut');
assertEqual(optionLabels('Q_STR_02', 'P1'), ['Jamais', 'Presque jamais', 'Parfois', 'Assez souvent', 'Souvent'], 'Q_STR_02 options directes Drive');
assertEqual(optionValues('Q_STR_02', 'P1'), [1, 2, 3, 4, 5], 'Q_STR_02 cotation directe Drive');
assertEqual(optionValues('Q_STR_02', 'P4'), [5, 4, 3, 2, 1], 'Q_STR_02 cotation inversée Drive');
assertEqual(questions('Q_STR_02').map(question => question.texte), [
  'Au cours du dernier mois combien de fois, avez-vous été dérangé(e) par un évènement inattendu ?',
  'Au cours du dernier mois combien de fois vous a-t-il semblé difficile de contrôler les choses importantes de votre vie ?',
  'Au cours du dernier mois combien de fois vous êtes-vous senti(e) nerveux(se) ou stressé(e) ?',
  'Au cours du dernier mois combien de fois vous êtes-vous senti(e) confiant(e) à prendre en main vos problèmes personnels ?',
  'Au cours du dernier mois combien de fois avez-vous senti que les choses allaient comme vous le vouliez ?',
  'Au cours du dernier mois combien de fois avez-vous pensé que vous ne pouviez pas assumer toutes les choses que vous deviez faire ?',
  'Au cours du dernier mois combien de fois avez-vous été capable de maîtriser votre énervement ?',
  'Au cours du dernier mois combien de fois avez-vous senti que vous dominiez la situation ?',
  'Au cours du dernier mois combien de fois vous êtes-vous senti(e) irrité(e) parce que des événements échappaient à votre contrôle ?',
  'Au cours du dernier mois combien de fois avez-vous trouvé que les difficultés s’accumulaient à un tel point que vous ne pouviez les contrôler ?',
], 'Q_STR_02 libellés PSS Drive');
assert(calculateScore('Q_STR_02', fillByOptionBoundary('Q_STR_02', 'max')).note.includes('score 27'), 'Q_STR_02 doit documenter la borne 27 arbitrée');
assertCertification(calculateScore('Q_STR_02', fillByOptionBoundary('Q_STR_02', 'min')), 'certifie', 'Q_STR_02');

assertEqual(calculateScore('Q_STR_03', fill('Q_STR_03', 0)).total, 0, 'Q_STR_03 score minimal');
assertEqual(calculateScore('Q_STR_03', fill('Q_STR_03', 5)).total, 55, 'Q_STR_03 score maximal');
assertEqual(optionLabels('Q_STR_03', 'CU1'), ['Non pas du tout', 'Faiblement', 'Un peu', 'Assez', 'Beaucoup', 'Extrêmement'], 'Q_STR_03 options Cungi Drive');
assertEqual(questions('Q_STR_03').map(question => question.texte), [
  'Suis-je émotif, sensible aux remarques, aux critiques d\'autrui ?',
  'Suis-je colérique ou rapidement irritable ?',
  'Suis-je perfectionniste, ai-je tendance à ne pas être satisfait de ce que j\'ai fait ou de ce que les autres ont fait ?',
  'Ai-je le cœur qui bat vite, de la transpiration, des tremblements, des secousses musculaires, par exemple au niveau du visage, des paupières ?',
  'Est-ce que je me sens tendu au niveau des muscles, ai-je une sensation de crispation au niveau des mâchoires, du visage, du corps en général ?',
  'Ai-je des problèmes de sommeil ?',
  'Suis-je anxieux, est-ce que je me fais souvent du souci ?',
  'Ai-je des manifestations corporelles comme un trouble digestif, des douleurs, des maux de tête, des allergies, de l\'eczéma ?',
  'Est-ce que je suis fatigué(e) ?',
  'Ai-je des problèmes de santé plus importants comme un ulcère d\'estomac, une maladie de peau, un problème de cholestérol, de l\'hypertension artérielle, un trouble cardio-vasculaire ?',
  'Est-ce que je fume ou bois de l\'alcool pour me stimuler ou me calmer ? Est-ce que j\'utilise d\'autres produits ou des médicaments dans ce but ?',
], 'Q_STR_03 libellés Cungi Drive');
assertCertification(calculateScore('Q_STR_03', fill('Q_STR_03', 0)), 'certifie', 'Q_STR_03');

const dassMax = calculateScore('Q_STR_04', fill('Q_STR_04', 3));
const dassBoundaries = fill('Q_STR_04', 0);
['Q003', 'Q005', 'Q010', 'Q013', 'Q016', 'Q017'].forEach(id => { dassBoundaries[id] = 2; });
dassBoundaries.Q021 = 2; // Dépression = 14, seuil très sévère harmonisé.
['Q002', 'Q004', 'Q007', 'Q009', 'Q015'].forEach(id => { dassBoundaries[id] = 2; }); // Anxiété = 10.
['Q001', 'Q006', 'Q008', 'Q011', 'Q012'].forEach(id => { dassBoundaries[id] = 3; });
dassBoundaries.Q014 = 2; // Stress = 17.
assertEqual(calculateScore('Q_STR_04', fill('Q_STR_04', 0)).subScores.map(score => score.total), [0, 0, 0], 'Q_STR_04 sous-scores minimaux');
assertEqual(dassMax.subScores.map(score => score.total), [21, 21, 21], 'Q_STR_04 sous-scores maximaux');
assertEqual(dassMax.total, 63, 'Q_STR_04 score total brut maximal');
assertEqual(calculateScore('Q_STR_04', dassBoundaries).subScores.map(score => score.interpretation.label), ['Très sévère', 'Très sévère', 'Très sévère'], 'Q_STR_04 seuils très sévères harmonisés');
assertEqual(optionLabels('Q_STR_04', 'Q001'), ['Ne s’applique pas du tout à moi', 'S’applique un peu à moi, ou une partie du temps', 'S’applique beaucoup à moi, ou une bonne partie du temps', 'S’applique entièrement à moi, ou la grande majorité du temps'], 'Q_STR_04 options DASS21 Drive');
assertEqual(questions('Q_STR_04').map(question => question.id), [
  'Q001', 'Q002', 'Q003', 'Q004', 'Q005', 'Q006', 'Q007',
  'Q008', 'Q009', 'Q010', 'Q011', 'Q012', 'Q013', 'Q014',
  'Q015', 'Q016', 'Q017', 'Q018', 'Q019', 'Q020', 'Q021',
], 'Q_STR_04 identifiants Drive');
assertEqual(questions('Q_STR_04').map(question => question.texte), [
  'J’ai trouvé difficile de décompresser.',
  'J’ai été conscient(e) d’avoir la bouche sèche.',
  'J’ai eu l’impression de ne pas pouvoir ressentir d’émotion positive.',
  'J’ai eu de la difficulté à respirer (par exemple, respirations excessivement rapides, essoufflement sans effort physique).',
  'J’ai eu de la difficulté à initier de nouvelles activités.',
  'J’ai eu tendance à réagir de façon exagérée.',
  'J’ai eu des tremblements (par exemple, des mains).',
  'J’ai eu l’impression de dépenser beaucoup d’énergie nerveuse.',
  'Je me suis inquiété(e) en pensant à des situations où je pourrais paniquer et faire de moi un(e) idiot(e).',
  'J’ai eu le sentiment de ne rien envisager avec plaisir.',
  'Je me suis aperçu(e) que je devenais agité(e).',
  'J’ai eu de la difficulté à me détendre.',
  'Je me suis senti(e) triste et déprimé(e).',
  'Je me suis aperçu(e) que je devenais impatient(e) lorsque j’étais retardé(e) de quelque façon que ce soit (par exemple dans les ascenseurs, aux feux de circulation, lorsque je devais attendre).',
  'J’ai eu le sentiment d’être presque pris(e) de panique.',
  'J’ai été incapable de me sentir enthousiaste au sujet de quoi que ce soit.',
  'J’ai eu le sentiment de ne pas valoir grand-chose comme personne.',
  'Je me suis aperçu(e) que j’étais très irritable.',
  'J’ai été conscient(e) des palpitations de mon cœur en l’absence d’effort physique (sensation d’augmentation de mon rythme cardiaque ou l’impression que mon cœur venait de sauter).',
  'J’ai eu peur sans bonne raison.',
  'J’ai eu l’impression que la vie n’avait pas de sens.',
], 'Q_STR_04 libellés DASS21 Drive');
assert(calculateScore('Q_STR_04', dassBoundaries).note.includes('>14'), 'Q_STR_04 doit documenter les seuils très sévères harmonisés');
assertCertification(calculateScore('Q_STR_04', fill('Q_STR_04', 0)), 'certifie', 'Q_STR_04');

assertEqual(calculateScore('Q_STR_05', fill('Q_STR_05', 1)).total, 10, 'Q_STR_05 score minimal brut');
assertEqual(calculateScore('Q_STR_05', fill('Q_STR_05', 1)).average, 1, 'Q_STR_05 moyenne minimale');
assertEqual(calculateScore('Q_STR_05', fill('Q_STR_05', 7)).total, 70, 'Q_STR_05 score maximal brut');
assertEqual(calculateScore('Q_STR_05', fill('Q_STR_05', 7)).average, 7, 'Q_STR_05 moyenne maximale');
assertCertification(calculateScore('Q_STR_05', fill('Q_STR_05', 1)), 'certifie', 'Q_STR_05');

assertEqual(questions('Q_STR_06').map(question => question.id), [
  'Q001', 'Q002', 'Q003', 'Q004', 'Q005', 'Q006', 'Q007', 'Q008',
  'Q009', 'Q010', 'Q011', 'Q012', 'Q013', 'Q014', 'Q015', 'Q016',
  'Q017', 'Q018', 'Q019', 'Q020', 'Q021', 'Q022', 'Q023', 'Q024',
  'Q025', 'Q026', 'Q027', 'Q028', 'Q029', 'Q030', 'Q031', 'Q032',
], 'Q_STR_06 identifiants Drive');
assertEqual(calculateScore('Q_STR_06', fill('Q_STR_06', 1)).subScores.map(score => score.total), [12, 42, 8, 12], 'Q_STR_06 scores tout à 1 Drive avec inversions');
assertEqual(calculateScore('Q_STR_06', fill('Q_STR_06', 4)).subScores.map(score => score.total), [33, 78, 32, 18], 'Q_STR_06 scores tout à 4 Drive avec inversions');
const karasekIso = fill('Q_STR_06', 1);
['Q010', 'Q011', 'Q012', 'Q014', 'Q015', 'Q016', 'Q017', 'Q018'].forEach(id => { karasekIso[id] = 4; });
karasekIso.Q013 = 1;
['Q001', 'Q003', 'Q004', 'Q005', 'Q007', 'Q008', 'Q009'].forEach(id => { karasekIso[id] = 1; });
karasekIso.Q002 = 4;
karasekIso.Q006 = 4;
assertEqual(calculateScore('Q_STR_06', karasekIso).jobStrain, true, 'Q_STR_06 job strain Drive');
assertEqual(calculateScore('Q_STR_06', karasekIso).isoStrain, true, 'Q_STR_06 isostrain Drive');
assertCertification(calculateScore('Q_STR_06', fill('Q_STR_06', 1)), 'certifie', 'Q_STR_06');

assertEqual(questions('Q_STR_08').length, 25, 'Q_STR_08 doit contenir 25 items');
assertEqual(questions('Q_STR_08').map(question => question.id), [
  'Q001', 'Q002', 'Q003', 'Q004', 'Q005', 'Q006', 'Q007', 'Q008',
  'Q009', 'Q010', 'Q011', 'Q012', 'Q013', 'Q014', 'Q015', 'Q016',
  'Q017', 'Q018', 'Q019', 'Q020', 'Q021', 'Q022', 'Q023', 'Q024', 'Q025',
], 'Q_STR_08 identifiants Drive');
assertEqual(optionLabels('Q_STR_08', 'Q001'), ['Pas du tout vrai', 'Peu souvent vrai', 'Souvent vrai', 'Toujours vrai'], 'Q_STR_08 options Drive');
assertEqual(calculateScore('Q_STR_08', fill('Q_STR_08', 1)).total, 25, 'Q_STR_08 score minimal');
assertEqual(calculateScore('Q_STR_08', fill('Q_STR_08', 4)).total, 100, 'Q_STR_08 score maximal');
assertEqual(calculateScore('Q_STR_08', fill('Q_STR_08', 3)).interpretation.label, 'Addiction élevée au travail', 'Q_STR_08 seuil haut');
assertCertification(calculateScore('Q_STR_08', fill('Q_STR_08', 1)), 'certifie', 'Q_STR_08');

assertEqual(calculateScore('Q_NEU_04', fill('Q_NEU_04', 0)).total, 0, 'Q_NEU_04 score minimal');
assertEqual(calculateScore('Q_NEU_04', fill('Q_NEU_04', 1)).total, 5, 'Q_NEU_04 score maximal');
assertEqual(calculateScore('Q_NEU_04', fill('Q_NEU_04', 1)).interpretation.label, 'Risque de trouble du comportement alimentaire — consultation recommandée', 'Q_NEU_04 seuil positif');
assertCertification(calculateScore('Q_NEU_04', fill('Q_NEU_04', 0)), 'certifie', 'Q_NEU_04');

assertEqual(questions('Q_NEU_07').map(question => question.id), ['Q001', 'Q002', 'Q003', 'Q004', 'Q005', 'Q006', 'Q007', 'Q008', 'Q009', 'Q010'], 'Q_NEU_07 identifiants Drive');
assertEqual(optionLabels('Q_NEU_07', 'Q009'), ['Non', "Oui, mais pas dans l'année passée", "Oui, au cours de l'année dernière"], 'Q_NEU_07 options Q009 Drive');
assertEqual(calculateScore('Q_NEU_07', fill('Q_NEU_07', 0)).total, 0, 'Q_NEU_07 score minimal');
assertEqual(calculateScore('Q_NEU_07', fill('Q_NEU_07', 4)).total, 40, 'Q_NEU_07 score maximal');
const auditFemmeRisque = fill('Q_NEU_07', 0);
auditFemmeRisque.Q001 = 2;
auditFemmeRisque.Q002 = 2;
auditFemmeRisque.Q003 = 2;
auditFemmeRisque.sexe = 'femme';
assertEqual(calculateScore('Q_NEU_07', auditFemmeRisque).interpretation.label, 'Consommation à risque ou à problème', 'Q_NEU_07 seuil femme 6');
const auditHommeFaible = {...auditFemmeRisque, sexe: 'homme'};
assertEqual(calculateScore('Q_NEU_07', auditHommeFaible).interpretation.label, 'Risque faible ou anodin', 'Q_NEU_07 seuil homme 6');
assertEqual(calculateScore('Q_NEU_07', fill('Q_NEU_07', 4)).interpretation.label, 'Alcoolodépendance probable', 'Q_NEU_07 seuil haut');
assertCertification(calculateScore('Q_NEU_07', fill('Q_NEU_07', 0)), 'certifie', 'Q_NEU_07');

assertEqual(calculateScore('Q_INF_01', fill('Q_INF_01', 0)).total, 0, 'Q_INF_01 score minimal');
assertEqual(calculateScore('Q_INF_01', fill('Q_INF_01', 4)).total, 96, 'Q_INF_01 score maximal');
assertCertification(calculateScore('Q_INF_01', fill('Q_INF_01', 0)), 'certifie', 'Q_INF_01');

assertEqual(calculateScore('Q_INF_02', fill('Q_INF_02', 0)).total, 0, 'Q_INF_02 score minimal');
assertEqual(calculateScore('Q_INF_02', fill('Q_INF_02', 4)).total, 52, 'Q_INF_02 score maximal');
assertCertification(calculateScore('Q_INF_02', fill('Q_INF_02', 0)), 'certifie', 'Q_INF_02');

assertEqual(calculateScore('Q_INF_03', fill('Q_INF_03', 0)).total, 0, 'Q_INF_03 score minimal');
assertEqual(calculateScore('Q_INF_03', fill('Q_INF_03', 4)).total, 160, 'Q_INF_03 score maximal');
assertEqual(calculateScore('Q_INF_03', fill('Q_INF_03', 4)).subScores.map(score => score.total), [40, 40, 40, 40], 'Q_INF_03 sous-scores maximaux');
assertCertification(calculateScore('Q_INF_03', fill('Q_INF_03', 0)), 'certifie', 'Q_INF_03');

assertEqual(calculateScore('Q_INF_04', fillByOptionBoundary('Q_INF_04', 'min')).total, 36, 'Q_INF_04 score minimal');
assertEqual(calculateScore('Q_INF_04', fillByOptionBoundary('Q_INF_04', 'max')).total, 78, 'Q_INF_04 score maximal');
assertEqual(questions('Q_INF_04').length, 6, 'Q_INF_04 doit contenir 6 items');
assertEqual(optionLabels('Q_INF_04', 'H1'), ['Jamais', 'Rarement', 'De temps en temps', 'Très souvent', 'Tout le temps'], 'Q_INF_04 options HIT-6');
assertCertification(calculateScore('Q_INF_04', fillByOptionBoundary('Q_INF_04', 'min')), 'certifie', 'Q_INF_04');

assertEqual(calculateScore('Q_INF_05', fill('Q_INF_05', 0)).count, 0, 'Q_INF_05 score minimal');
assertEqual(calculateScore('Q_INF_05', fill('Q_INF_05', 4)).count, 11, 'Q_INF_05 score maximal');
assertEqual(optionLabels('Q_INF_05', 'X1'), ['Pas du tout', 'Un peu', 'Modérément', 'Beaucoup', 'Extrêmement'], 'Q_INF_05 échelle Drive');
assertCertification(calculateScore('Q_INF_05', fill('Q_INF_05', 0)), 'certifie', 'Q_INF_05');

const ecabMax = fill('Q_NEU_08', 1);
ecabMax.EC10 = 0;
assertEqual(calculateScore('Q_NEU_08', fill('Q_NEU_08', 0)).total, 1, 'Q_NEU_08 score tout faux');
assertEqual(calculateScore('Q_NEU_08', fill('Q_NEU_08', 1)).total, 9, 'Q_NEU_08 score tout vrai');
assertEqual(calculateScore('Q_NEU_08', ecabMax).total, 10, 'Q_NEU_08 score maximal avec item 10 inversé');
assertEqual(optionLabels('Q_NEU_08', 'EC1'), ['Faux', 'Vrai'], 'Q_NEU_08 options vrai/faux');
assertCertification(calculateScore('Q_NEU_08', ecabMax), 'certifie', 'Q_NEU_08');

assertEqual(questions('Q_NEU_09').length, 22, 'Q_NEU_09 doit contenir 22 items');
assertEqual(questions('Q_NEU_09').map(question => question.id), [
  'Q001', 'Q002', 'Q003', 'Q004', 'Q005', 'Q006', 'Q007', 'Q008',
  'Q009', 'Q010', 'Q011', 'Q012', 'Q013', 'Q014', 'Q015', 'Q016',
  'Q017', 'Q018', 'Q019', 'Q020', 'Q021', 'Q022',
], 'Q_NEU_09 identifiants Drive');
assertEqual(optionLabels('Q_NEU_09', 'Q001'), ['Jamais', 'Rarement', 'Quelques fois', 'Assez souvent', 'Presque toujours'], 'Q_NEU_09 options Drive');
assertEqual(calculateScore('Q_NEU_09', fill('Q_NEU_09', 0)).total, 0, 'Q_NEU_09 score minimal');
assertEqual(calculateScore('Q_NEU_09', fill('Q_NEU_09', 4)).total, 88, 'Q_NEU_09 score maximal');
assertEqual(calculateScore('Q_NEU_09', fill('Q_NEU_09', 4)).interpretation.label, 'Fardeau sévère', 'Q_NEU_09 seuil haut');
assertCertification(calculateScore('Q_NEU_09', fill('Q_NEU_09', 0)), 'certifie', 'Q_NEU_09');

assertEqual(questions('Q_NEU_02').map(question => question.id), ['Q001', 'Q002', 'Q003', 'Q004', 'Q005', 'Q006', 'Q007', 'Q008', 'Q009', 'Q010'], 'Q_NEU_02 identifiants Drive');
assertEqual(calculateScore('Q_NEU_02', fill('Q_NEU_02', 0)).total, 0, 'Q_NEU_02 score minimal');
assertEqual(calculateScore('Q_NEU_02', fill('Q_NEU_02', 6)).total, 60, 'Q_NEU_02 score maximal');
assertEqual(calculateScore('Q_NEU_02', fill('Q_NEU_02', 0)).interpretation.label, 'Pas de troubles dépressifs', 'Q_NEU_02 seuil bas');
assertEqual(calculateScore('Q_NEU_02', fill('Q_NEU_02', 6)).interpretation.label, 'Dépression sévère', 'Q_NEU_02 seuil haut');
assertCertification(calculateScore('Q_NEU_02', fill('Q_NEU_02', 0)), 'certifie', 'Q_NEU_02');

assertEqual(questions('Q_NEU_05').length, 45, 'Q_NEU_05 doit contenir 45 items');
const uppsMin = calculateScore('Q_NEU_05', fill('Q_NEU_05', 1));
const uppsMax = calculateScore('Q_NEU_05', fill('Q_NEU_05', 4));
assertEqual(uppsMin.subScores.map(s => s.total), [45, 11, 16, 48], 'Q_NEU_05 sous-scores réponse=1');
assertEqual(uppsMax.subScores.map(s => s.total), [15, 44, 34, 12], 'Q_NEU_05 sous-scores réponse=4');
assertCertification(uppsMin, 'certifie', 'Q_NEU_05');

assertEqual(questions('Q_NEU_10').map(question => question.id), ['Q001', 'Q002', 'Q003', 'Q004', 'Q005', 'Q006', 'Q007', 'Q008', 'Q009', 'Q010', 'Q011', 'Q012', 'Q013', 'Q014', 'Q015', 'Q016', 'Q017', 'Q018', 'Q019', 'Q020'], 'Q_NEU_10 identifiants Drive');
assertEqual(calculateScore('Q_NEU_10', fill('Q_NEU_10', 0)).total, 0, 'Q_NEU_10 score minimal');
assertEqual(calculateScore('Q_NEU_10', fill('Q_NEU_10', 5)).total, 100, 'Q_NEU_10 score maximal');
assertEqual(calculateScore('Q_NEU_10', fill('Q_NEU_10', 5)).interpretation.label, 'Situation non maîtrisée ; réaction nécessaire', 'Q_NEU_10 seuil haut');
assertCertification(calculateScore('Q_NEU_10', fill('Q_NEU_10', 0)), 'certifie', 'Q_NEU_10');

const idtasZero = fill('Q_NEU_12', 0);
const idtasMax = fill('Q_NEU_12', 0);
['IA1','IA2','IA3','IA4','IA5','IA6','IA7','IA8','IA9'].forEach(id => idtasMax[id] = 1);
['IG1','IG2','IG3','IG4','IG5','IG6'].forEach(id => idtasMax[id] = 4);
['IS1','IS2','IS3','IS4','IS5','IS6','IS7','IS8','IS9'].forEach(id => idtasMax[id] = 1);
const idtasZeroScore = calculateScore('Q_NEU_12', idtasZero);
const idtasMaxScore = calculateScore('Q_NEU_12', idtasMax);
assertEqual(idtasZeroScore.gssScore, 0, 'Q_NEU_12 GSS minimal');
assertEqual(idtasMaxScore.gssScore, 24, 'Q_NEU_12 GSS maximal');
assertEqual(idtasMaxScore.parts[0].probableMajorDepression, true, 'Q_NEU_12 dépistage dépressif au-delà du seuil');
assertEqual(idtasMaxScore.interpretation.label, 'Forte probabilité de trouble affectif saisonnier clinique', 'Q_NEU_12 seuil GSS haut');
assertCertification(idtasZeroScore, 'certifie', 'Q_NEU_12');

assertEqual(calculateScore('Q_SOM_02', fill('Q_SOM_02', 0)).total, 0, 'Q_SOM_02 score minimal');
assertEqual(calculateScore('Q_SOM_02', fill('Q_SOM_02', 3)).total, 24, 'Q_SOM_02 score maximal');
assertEqual(questions('Q_SOM_02').length, 8, 'Q_SOM_02 doit contenir 8 items');
assertEqual(optionLabels('Q_SOM_02', 'E1'), ['Aucune chance', 'Faible chance', 'Chance moyenne', 'Forte chance'], 'Q_SOM_02 options Epworth');
assertEqual(calculateScore('Q_SOM_02', fill('Q_SOM_02', 3)).interpretation.label, "Somnolence diurne excessive ; syndrome d'apnées du sommeil possible", 'Q_SOM_02 seuil haut');
assertCertification(calculateScore('Q_SOM_02', fill('Q_SOM_02', 0)), 'ambigu', 'Q_SOM_02');

assertEqual(calculateScore('Q_SOM_05', fillByOptionBoundary('Q_SOM_05', 'min')).total, 16, 'Q_SOM_05 score minimal');
assertEqual(calculateScore('Q_SOM_05', fillByOptionBoundary('Q_SOM_05', 'max')).total, 86, 'Q_SOM_05 score maximal');
assertEqual(questions('Q_SOM_05').length, 19, 'Q_SOM_05 doit contenir 19 items');
assertCertification(calculateScore('Q_SOM_05', fillByOptionBoundary('Q_SOM_05', 'min')), 'certifie', 'Q_SOM_05');

assertEqual(calculateScore('Q_SOM_06', fill('Q_SOM_06', 0)).total, 0, 'Q_SOM_06 score minimal');
assertEqual(calculateScore('Q_SOM_06', fill('Q_SOM_06', 4)).total, 32, 'Q_SOM_06 score maximal');
assertEqual(questions('Q_SOM_06').map(question => question.texte), [
  "Je manque d'énergie.",
  'Tout me demande un effort.',
  'Je me sens faible à certains endroits du corps.',
  "J'ai les bras ou les jambes lourdes.",
  'Je me sens fatigué sans raison.',
  "J'ai envie de m'allonger pour me reposer.",
  "J'ai du mal à me concentrer.",
  'Je me sens fatigué, lourd et raide.',
], 'Q_SOM_06 libellés Pichot Drive');
assertEqual(optionLabels('Q_SOM_06', 'P1'), ['Pas du tout', 'Un peu', 'Moyennement', 'Beaucoup', 'Extrêmement'], 'Q_SOM_06 options Pichot');
assertEqual(calculateScore('Q_SOM_06', fill('Q_SOM_06', 4)).interpretation.label, 'Signe de fatigue ; à évoquer avec le médecin ou le thérapeute', 'Q_SOM_06 seuil haut');
assertCertification(calculateScore('Q_SOM_06', fill('Q_SOM_06', 0)), 'certifie', 'Q_SOM_06');

assertEqual(calculateScore('Q_PED_01', fillByOptionBoundary('Q_PED_01', 'min')).total, 10, 'Q_PED_01 score minimal');
assertEqual(calculateScore('Q_PED_01', fillByOptionBoundary('Q_PED_01', 'max')).total, 43, 'Q_PED_01 score maximal');
assertEqual(questions('Q_PED_01').length, 10, 'Q_PED_01 doit contenir 10 items');
assertCertification(calculateScore('Q_PED_01', fillByOptionBoundary('Q_PED_01', 'min')), 'certifie', 'Q_PED_01');

assertEqual(calculateScore('Q_GEO_01', fillByOptionBoundary('Q_GEO_01', 'min')).total, 0, 'Q_GEO_01 score minimal');
assertEqual(calculateScore('Q_GEO_01', fillByOptionBoundary('Q_GEO_01', 'max')).total, 28, 'Q_GEO_01 score maximal');
assertEqual(calculateScore('Q_GEO_01', fillByOptionBoundary('Q_GEO_01', 'max')).subScores.map(score => score.total), [16, 12], 'Q_GEO_01 sous-scores maximaux');
assertEqual(questions('Q_GEO_01').length, 20, 'Q_GEO_01 doit contenir 20 sous-items scorés');
assertEqual(optionLabels('Q_GEO_01', 'TI_EQ3'), ['Impossible sans aide', "Possible après plus d'une tentative", 'Possible après une seule tentative'], 'Q_GEO_01 options Q003 Drive');
assertEqual(optionLabels('Q_GEO_01', 'TI_EQ5'), ['Instable', 'Stable, écart entre les pieds supérieur à 10 cm ou appui des bras', 'Pieds joints, sans appui des bras'], 'Q_GEO_01 options Q005 Drive');
assertEqual(optionLabels('Q_GEO_01', 'TI_MA15'), ["Mouvement prononcé du tronc ou utilisation d'une aide à la marche", 'Pas de mouvement du tronc mais flexion des genoux, du dos ou écartement des bras', 'Droit sans aide à la marche'], 'Q_GEO_01 options tronc Drive');
assertCertification(calculateScore('Q_GEO_01', fillByOptionBoundary('Q_GEO_01', 'min')), 'certifie', 'Q_GEO_01');

assertEqual(calculateScore('Q_GEO_02', fill('Q_GEO_02', 0)).total, 0, 'Q_GEO_02 score minimal');
assertEqual(calculateScore('Q_GEO_02', fill('Q_GEO_02', 2)).total, 10, 'Q_GEO_02 score maximal');
assertEqual(calculateScore('Q_GEO_02', fill('Q_GEO_02', 2)).interpretation.label, 'Sarcopénie supposée — diagnostic approfondi requis', 'Q_GEO_02 seuil sarcopénie');
assertCertification(calculateScore('Q_GEO_02', fill('Q_GEO_02', 0)), 'certifie', 'Q_GEO_02');

assertEqual(calculateScore('Q_GAS_01', fill('Q_GAS_01', 0)).total, 0, 'Q_GAS_01 score minimal');
assertEqual(calculateScore('Q_GAS_01', fill('Q_GAS_01', 3)).total, 93, 'Q_GAS_01 score maximal');
assertEqual(calculateScore('Q_GAS_01', fill('Q_GAS_01', 3)).subScores.map(score => score.total), [24, 21, 15, 18, 15], 'Q_GAS_01 sous-scores maximaux');
assertEqual(questions('Q_GAS_01').length, 31, 'Q_GAS_01 doit contenir 31 items');
assertEqual(optionLabels('Q_GAS_01', 'C1_1'), ['Jamais, cela ne me concerne pas', 'Rarement, occasionnellement', 'Régulièrement', 'Très fréquemment ou invalidant'], 'Q_GAS_01 options Drive');
assertEqual(questions('Q_GAS_01').map(question => question.texte).slice(0, 3), [
  "J'ai la bouche sèche, un manque de salive.",
  "J'ai des aphtes ou des douleurs dans la bouche qui me gênent.",
  "J'ai facilement une mauvaise haleine, une langue chargée.",
], 'Q_GAS_01 premiers libellés Drive');
assertCertification(calculateScore('Q_GAS_01', fill('Q_GAS_01', 0)), 'ambigu', 'Q_GAS_01');

const francisMax = {
  FR_Q001: 'oui',
  FR_Q002: 100,
  FR_Q003: 10,
  FR_Q004: 'oui',
  FR_Q005: 100,
  FR_Q006: 100,
  FR_Q007: 100,
};
assertEqual(calculateScore('Q_GAS_02', {
  FR_Q001: 'non',
  FR_Q002: 0,
  FR_Q003: 0,
  FR_Q004: 'non',
  FR_Q005: 0,
  FR_Q006: 0,
  FR_Q007: 0,
}).total, 0, 'Q_GAS_02 score minimal');
assertEqual(calculateScore('Q_GAS_02', francisMax).total, 500, 'Q_GAS_02 score maximal');
assertEqual(calculateScore('Q_GAS_02', francisMax).components.map(component => component.val), [100, 100, 100, 100, 100], 'Q_GAS_02 composants maximaux');
assertEqual(optionLabels('Q_GAS_02', 'FR_Q001'), ['Oui', 'Non'], 'Q_GAS_02 options filtre douleur');
assertEqual(questions('Q_GAS_02').map(question => question.texte), [
  'Souffrez-vous actuellement de douleurs abdominales ?',
  "Si oui, quelle est l'intensité de ces douleurs abdominales, douleurs au ventre ?",
  'Veuillez indiquer le nombre de jours au cours desquels vous souffrez sur une période de 10 jours.',
  'Souffrez-vous actuellement de problème de distension abdominale, ballonnements, ventre gonflé, tendu ?',
  "Si oui, quelle est l'importance de ces problèmes de distension abdominale ?",
  'Dans quelle mesure êtes-vous satisfait(e) de la fréquence habituelle de vos selles ?',
  'Dans quelle mesure votre syndrome de côlon irritable affecte ou perturbe votre vie en général ?',
], 'Q_GAS_02 libellés Francis Drive');
assertCertification(calculateScore('Q_GAS_02', francisMax), 'certifie', 'Q_GAS_02');

assertEqual(calculateScore('Q_FIB_01', fill('Q_FIB_01', 0)).total, 0, 'Q_FIB_01 score minimal');
assertEqual(calculateScore('Q_FIB_01', fill('Q_FIB_01', 1)).total, 6, 'Q_FIB_01 score maximal');
assertEqual(calculateScore('Q_FIB_01', fill('Q_FIB_01', 1)).interpretation.label, "FiRST positif selon le seuil fourni. Orientation compatible avec un dépistage de fibromyalgie, à intégrer à l'évaluation clinique", 'Q_FIB_01 seuil positif');
assertEqual(questions('Q_FIB_01').map(question => question.texte), [
  'Mes douleurs sont localisées partout dans tout mon corps.',
  "Mes douleurs s'accompagnent d'une fatigue générale permanente.",
  'Mes douleurs sont comme des brûlures, des décharges électriques ou des crampes.',
  "Mes douleurs s'accompagnent d'autres sensations anormales, comme des fourmillements, des picotements, ou des sensations d'engourdissement, dans tout mon corps.",
  "Mes douleurs s'accompagnent d'autres problèmes de santé comme des problèmes digestifs, des problèmes urinaires, des maux de tête ou des impatiences dans les jambes.",
  "Mes douleurs ont un retentissement important dans ma vie, en particulier, sur mon sommeil, ma capacité à me concentrer avec une impression de fonctionner au ralenti.",
], 'Q_FIB_01 libellés FiRST Drive');
assertCertification(calculateScore('Q_FIB_01', fill('Q_FIB_01', 0)), 'certifie', 'Q_FIB_01');

const qifMin = fill('Q_FIB_02', 0);
qifMin.Q12 = 7;
const qifMax = fill('Q_FIB_02', 10);
['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10', 'Q11'].forEach(id => { qifMax[id] = 3; });
qifMax.Q12 = 0;
qifMax.Q13 = 7;
assertEqual(calculateScore('Q_FIB_02', qifMin).total, 0, 'Q_FIB_02 score minimal');
assertEqual(calculateScore('Q_FIB_02', qifMax).total, 99.9, 'Q_FIB_02 score maximal opérationnel');
assertEqual(calculateScore('Q_FIB_02', qifMax).components.map(component => component.val), [9.9, 10, 10, 70], 'Q_FIB_02 composants maximaux');
assertEqual(optionLabels('Q_FIB_02', 'Q1'), ['Toujours', 'La plupart du temps', 'De temps en temps', 'Jamais'], 'Q_FIB_02 options capacité fonctionnelle');
assertEqual(questions('Q_FIB_02').map(question => question.texte).slice(0, 11), [
  'Faire les courses ?',
  'Faire la lessive en machine ?',
  'Préparer à manger ?',
  'Laver la vaisselle à la main ?',
  "Passer l'aspirateur ?",
  'Faire les lits ?',
  'Marcher plusieurs centaines de mètres ?',
  'Aller voir des amis ou la famille ?',
  'Faire du jardinage ?',
  'Conduire une voiture ?',
  'Monter les escaliers ?',
], 'Q_FIB_02 sous-items fonctionnels Drive');
assertCertification(calculateScore('Q_FIB_02', qifMax), 'ambigu', 'Q_FIB_02');

assertEqual(calculateScore('Q_FIB_03', fill('Q_FIB_03', 0)).scored, false, 'Q_FIB_03 ne doit pas produire de score automatique');
assert(calculateScore('Q_FIB_03', fill('Q_FIB_03', 0)).note.includes('non équivalent à la fiche ELFE Drive complète'), 'Q_FIB_03 doit documenter l’écart avec Drive');
assertCertification(calculateScore('Q_FIB_03', fill('Q_FIB_03', 0)), 'ambigu', 'Q_FIB_03');

assertEqual(calculateScore('Q_TAB_01', fillByOptionBoundary('Q_TAB_01', 'min')).total, 0, 'Q_TAB_01 score minimal');
assertEqual(calculateScore('Q_TAB_01', fillByOptionBoundary('Q_TAB_01', 'max')).total, 23, 'Q_TAB_01 score maximal');
assertEqual(calculateScore('Q_TAB_01', fillByOptionBoundary('Q_TAB_01', 'max')).interpretation.label, 'Patient fortement motivé', 'Q_TAB_01 seuil haut');
assertEqual(optionLabels('Q_TAB_01', 'T1'), ['Vous fumerez toujours autant', 'Vous aurez diminué un peu votre consommation de cigarettes', 'Vous aurez beaucoup diminué votre consommation de cigarettes', 'Vous aurez arrêté de fumer'], 'Q_TAB_01 options Q1');
assertCertification(calculateScore('Q_TAB_01', fillByOptionBoundary('Q_TAB_01', 'min')), 'certifie', 'Q_TAB_01');

assertEqual(calculateScore('Q_TAB_02', fillByOptionBoundary('Q_TAB_02', 'min')).total, 0, 'Q_TAB_02 score minimal');
assertEqual(calculateScore('Q_TAB_02', fillByOptionBoundary('Q_TAB_02', 'max')).total, 10, 'Q_TAB_02 score maximal');
assertEqual(calculateScore('Q_TAB_02', fillByOptionBoundary('Q_TAB_02', 'max')).interpretation.label, 'Forte ou très forte dépendance à la nicotine', 'Q_TAB_02 seuil haut');
assertEqual(optionLabels('Q_TAB_02', 'F1'), ['Dans les 5 premières minutes', 'Entre 6 et 30 minutes', 'Entre 31 et 60 minutes', 'Après 60 minutes'], 'Q_TAB_02 options réveil');
assertCertification(calculateScore('Q_TAB_02', fillByOptionBoundary('Q_TAB_02', 'min')), 'certifie', 'Q_TAB_02');

assertEqual(calculateScore('Q_TAB_05', fill('Q_TAB_05', 0)).total, 0, 'Q_TAB_05 score minimal');
assertEqual(calculateScore('Q_TAB_05', fill('Q_TAB_05', 1)).total, 10, 'Q_TAB_05 score maximal');
assertEqual(calculateScore('Q_TAB_05', fill('Q_TAB_05', 1)).interpretation.label, "Perte d'autonomie", 'Q_TAB_05 seuil perte autonomie');
assertEqual(questions('Q_TAB_05').map(question => question.texte).slice(6), [
  "Trouvais-tu qu'il t'était difficile de te concentrer sur quelque chose parce que tu ne pouvais pas fumer ?",
  'Te sentais-tu plus irritable parce que tu ne pouvais pas fumer ?',
  'Ressentais-tu des envies irrésistibles et urgentes de fumer ?',
  'Te sentais-tu nerveux, agité ou anxieux parce que tu ne pouvais pas fumer ?',
], 'Q_TAB_05 ordre des items de manque');
assertCertification(calculateScore('Q_TAB_05', fill('Q_TAB_05', 0)), 'certifie', 'Q_TAB_05');

assertEqual(calculateScore('Q_PNE_01', fill('Q_PNE_01', 0)).total, 0, 'Q_PNE_01 score minimal');
assertEqual(calculateScore('Q_PNE_01', fill('Q_PNE_01', 3)).total, 33, 'Q_PNE_01 score maximal');
assertEqual(calculateScore('Q_PNE_01', fill('Q_PNE_01', 3)).subScores.map(score => score.total), [15, 9, 9], 'Q_PNE_01 sous-scores maximaux');
assertEqual(optionLabels('Q_PNE_01', 'BP1'), ['Jamais', 'Parfois', 'Fréquemment', 'Tous les jours'], 'Q_PNE_01 options Drive');
assertCertification(calculateScore('Q_PNE_01', fill('Q_PNE_01', 0)), 'certifie', 'Q_PNE_01');

assertEqual(calculateScore('Q_URO_01', fillByOptionBoundary('Q_URO_01', 'min')).total, 0, 'Q_URO_01 score minimal');
assertEqual(calculateScore('Q_URO_01', fillByOptionBoundary('Q_URO_01', 'max')).total, 42, 'Q_URO_01 total maximal avec QdV');
assertEqual(calculateScore('Q_URO_01', fillByOptionBoundary('Q_URO_01', 'max')).subScores.map(score => score.total), [36, 6], 'Q_URO_01 sous-scores maximaux');
assertEqual(optionLabels('Q_URO_01', 'U2'), ['Jamais', 'Environ 1 x sur 5', 'Environ 1 x sur 3', 'Environ 1 x sur 2', 'Environ 2 x sur 3', 'Presque toujours'], 'Q_URO_01 cotation Q002 Drive atypique');
assertEqual(questions('Q_URO_01').map(question => question.texte).slice(0, 2), [
  "Au cours du dernier mois, avec quelle fréquence avez-vous eu la sensation que votre vessie n'était pas complètement vidée après avoir uriné ?",
  "Au cours du dernier mois, avec quelle fréquence avez-vous eu besoin d'uriner moins de 2 heures après avoir fini d'uriner ?",
], 'Q_URO_01 libellés IPSS Drive');
assert(calculateScore('Q_URO_01', fillByOptionBoundary('Q_URO_01', 'max')).note.includes('cotation source atypique'), 'Q_URO_01 doit documenter la cotation atypique Q002');
assertCertification(calculateScore('Q_URO_01', fillByOptionBoundary('Q_URO_01', 'min')), 'ambigu', 'Q_URO_01');

const uroJournal = calculateScore('Q_URO_02', fill('Q_URO_02', 0));
assertEqual(uroJournal.scored, false, 'Q_URO_02 ne doit pas produire de score automatique');
assert(uroJournal.note.includes('Recueil de données brutes sur 3 jours'), 'Q_URO_02 note journal');
assertCertification(uroJournal, 'certifie', 'Q_URO_02');

console.log(`[questionnaires] OK — ${ids.length} questionnaires documentés, fixtures scoring certifiées validées.`);
