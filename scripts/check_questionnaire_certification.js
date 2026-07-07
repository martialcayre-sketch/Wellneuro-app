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
    .replace(/^export\s+(const|function|class|let|var)\b/gm, '$1')
    .replace(/^export\s+default\s+/gm, '');
}

function localImportPaths(source, dir) {
  const re = /import\s+[^;]*?from\s+['"](\.[^'"]*)['"]/g;
  const out = [];
  let match;
  while ((match = re.exec(source))) {
    let abs = path.resolve(dir, match[1]);
    if (!abs.endsWith('.ts')) abs += '.ts';
    out.push(abs);
  }
  return out;
}

function inlineModule(file, seen, parts) {
  const abs = path.resolve(file);
  if (seen.has(abs)) return;
  seen.add(abs);
  const source = fs.readFileSync(abs, 'utf8');
  for (const dep of localImportPaths(source, path.dirname(abs))) inlineModule(dep, seen, parts);
  parts.push(stripModuleSource(source));
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
  'Q_NEU_03',
  'Q_PED_03',
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

console.log(`[questionnaires] OK — ${ids.length} questionnaires documentés, fixtures scoring certifiées validées.`);
