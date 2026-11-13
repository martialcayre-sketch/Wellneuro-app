// Le cœur pur de la rédaction des fiches d'usage ([[D-314]] §4). Texte
// SYNTHÉTIQUE seulement ; aucun modèle appelé.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  axesDeLaFiche,
  claimsDeLaFiche,
  claimsDuTerme,
  contexteDeRubrique,
  designationsDeLaFiche,
  lireReponseFiche,
  lireReponseLibelle,
  MARQUE_RESERVE,
  messageContreLecture,
  messageRedactionFiche,
  rubriquesRedigees,
  sourcesDc03,
  verdictDEnsemble,
} from './preparation.mjs';

const FICHE = {
  id: 'FU_SYNTH_A',
  population: 'POP_SYNTH',
  hypotheses: ['HYP_SYNTH_1'],
  codesAnalyte: ['BIO_SYNTH'],
  claims: [{ claimId: 'WN-CL-9999-001', versionClaim: 'v1.0' }],
  rubriques: ['question', 'limites'],
};
const CLAIMS = new Map([['WN-CL-9999-001::v1.0', { sourceId: 'WN-SRC-9999', texte: 'Claim synthétique.' }]]);

test('un claim épinglé absent de l’instantané arrête la fiche, et l’erreur ne nomme que sa clé', () => {
  assert.deepEqual(claimsDeLaFiche(FICHE, CLAIMS), [{ cle: 'WN-CL-9999-001::v1.0', texte: 'Claim synthétique.', sousReserve: false }]);
  assert.throws(() => claimsDeLaFiche({ ...FICHE, claims: [{ claimId: 'WN-CL-9999-002', versionClaim: 'v2.0' }] }, CLAIMS), /WN-CL-9999-002::v2\.0/);
});

test('les claims d’un terme : ceux des fiches qui le citent, sans doublon', () => {
  const structure = { fiches: [FICHE, { ...FICHE, id: 'FU_SYNTH_B', hypotheses: [] }], hypotheses: ['HYP_SYNTH_1'], populations: ['POP_SYNTH'] };
  assert.deepEqual(claimsDuTerme('HYP_SYNTH_1', structure, CLAIMS).fiches, ['FU_SYNTH_A']);
  const pop = claimsDuTerme('POP_SYNTH', structure, CLAIMS);
  assert.deepEqual(pop.fiches, ['FU_SYNTH_A', 'FU_SYNTH_B']);
  assert.equal(pop.claims.length, 1);
});

test('le message ne porte que la structure et les claims', () => {
  const m = messageRedactionFiche(FICHE, claimsDeLaFiche(FICHE, CLAIMS));
  assert.match(m, /FICHE : FU_SYNTH_A/);
  assert.match(m, /RUBRIQUES À RÉDIGER, DANS CET ORDRE : question, limites/);
  assert.match(m, /"WN-CL-9999-001::v1\.0" : Claim synthétique\./);
});

test('les rubriques rédigées : exactement celles attendues, non vides, rognées', () => {
  assert.deepEqual(rubriquesRedigees({ rubriques: { question: ' Q. ', limites: 'L.' } }, FICHE.rubriques), { question: 'Q.', limites: 'L.' });
  assert.throws(() => rubriquesRedigees({ rubriques: { question: 'Q.' } }, FICHE.rubriques), /manquantes : limites/);
  assert.throws(() => rubriquesRedigees({ rubriques: { question: 'Q.', limites: 'L.', options: 'O.' } }, FICHE.rubriques), /en trop : options/);
  assert.throws(() => rubriquesRedigees({ rubriques: { question: 'Q.', limites: '  ' } }, FICHE.rubriques), /vide\(s\) : limites/);
  assert.throws(() => rubriquesRedigees({ libelle: 'x' }, FICHE.rubriques), /rubriques/);
});

test('le contexte d’une rubrique : les autres, jamais elle-même', () => {
  const c = contexteDeRubrique({ question: 'Q.', limites: 'L.' }, 'question');
  assert.equal(c, '[limites]\nL.');
});

test('tout ou rien : un refus, un échec technique ou un DC-03 négatif fait échouer l’ensemble', () => {
  const ok = { ok: true, inconnus: { identifiants: [], nombres: [] } };
  const fidele = { fidele: true, raison: '' };
  assert.deepEqual(verdictDEnsemble([{ id: 'question', verdict: fidele, dc03: ok }]), { issue: 'garde' });
  const r = verdictDEnsemble([
    { id: 'question', verdict: fidele, dc03: ok },
    { id: 'limites', verdict: { fidele: false, raison: 'r' }, dc03: ok },
    { id: 'options', verdict: { fidele: false, technique: true, raison: 't' }, dc03: ok },
    { id: 'precautions', verdict: fidele, dc03: { ok: false, inconnus: { identifiants: [], nombres: ['42'] } } },
  ]);
  assert.equal(r.issue, 'echec');
  assert.deepEqual(r.exclusions.map(x => [x.id, x.motif]), [
    ['limites', 'contre_lecture'],
    ['options', 'contre_lecture_incomplete'],
    ['precautions', 'dc03'],
  ]);
});

// [[D-501]] : les axes signés partent avec la fiche, la réserve marque ses claims.
test('v2 : le message porte les axes signés, et la marque des seuls claims sous réserve', () => {
  const fiche = {
    ...FICHE,
    nature: 'information_contributive',
    usageDecisionnel: 'departager_options',
    securiteAdmissibilite: true,
    statutUsage: 'preuves_limitees',
    niveauMesure: 'exploration_fonctionnelle',
    claims: [...FICHE.claims, { claimId: 'WN-CL-9999-002', versionClaim: 'v1.0' }],
  };
  const claims = new Map([...CLAIMS, ['WN-CL-9999-002::v1.0', { texte: 'Second claim.' }]]);
  const cites = claimsDeLaFiche(fiche, claims, ['WN-CL-9999-002']);
  assert.deepEqual(cites.map(c => c.sousReserve), [false, true]);
  const m = messageRedactionFiche(fiche, cites);
  assert.match(m, /NATURE DU LIEN : information_contributive\n/);
  assert.match(m, /USAGE DÉCISIONNEL : departager_options\n/);
  assert.match(m, /MARQUEUR SÉCURITÉ \/ ADMISSIBILITÉ : oui\n/);
  assert.match(m, /STATUT D'USAGE : preuves_limitees\n/);
  assert.match(m, /NIVEAU DE MESURE : exploration_fonctionnelle\n/);
  assert.match(m, /"WN-CL-9999-001::v1\.0" : Claim synthétique\./);
  assert.ok(m.includes(`"WN-CL-9999-002::v1.0" ${MARQUE_RESERVE} : Second claim.`));
  // Sans liste de réserve, aucune marque.
  assert.ok(!messageRedactionFiche(fiche, claimsDeLaFiche(fiche, claims)).includes(MARQUE_RESERVE));
  // Le contre-lecteur reçoit les mêmes axes et la même marque ; un libellé n'a pas d'axes.
  const cl = messageContreLecture({ nature: 'rubrique « question »', texte: 'T.', contexte: null, claimsCites: cites, axes: axesDeLaFiche(fiche) });
  assert.match(cl, /AXES SIGNÉS DE LA FICHE :\nNATURE DU LIEN : information_contributive/);
  assert.ok(cl.includes(MARQUE_RESERVE));
  assert.ok(!messageContreLecture({ nature: 'libellé', texte: 'T.', contexte: null, claimsCites: cites }).includes('AXES SIGNÉS'));
});

// [[D-501]] §5 : désignations approuvées, refus avant tout appel si l'une manque.
test('v3 : les désignations de la fiche, ou une erreur qui nomme ce qui manque', () => {
  const fiche = { ...FICHE, usageDecisionnel: 'departager_options' };
  const designations = { termes: { POP_SYNTH: 'Population synthétique', HYP_SYNTH_1: 'Hypothèse synthétique' }, analytes: { BIO_SYNTH: 'Analyte synthétique' } };
  const bloc = designationsDeLaFiche(fiche, designations);
  assert.match(bloc, /population d'usage POP_SYNTH : « Population synthétique »/);
  assert.match(bloc, /hypothèse rattachée HYP_SYNTH_1 : « Hypothèse synthétique »/);
  assert.match(bloc, /analyte BIO_SYNTH : « Analyte synthétique »/);
  assert.match(bloc, /usage décisionnel departager_options : « départager des options »/);
  assert.match(designationsDeLaFiche({ ...fiche, hypotheses: [] }, designations), /hypothèses rattachées : \(aucune\)/);
  // Un identifiant sans désignation ne se nomme pas : la fiche ne part pas.
  assert.throws(() => designationsDeLaFiche(fiche, { ...designations, termes: { HYP_SYNTH_1: 'H' } }), /absente\(s\) : POP_SYNTH\./);
  assert.throws(() => designationsDeLaFiche(fiche, { termes: designations.termes, analytes: {} }), /BIO_SYNTH/);
  assert.throws(() => designationsDeLaFiche(fiche, { termes: { ...designations.termes, HYP_SYNTH_1: '  ' }, analytes: designations.analytes }), /HYP_SYNTH_1/);
  assert.throws(() => designationsDeLaFiche({ ...fiche, usageDecisionnel: 'inconnu' }, designations), /inconnu/);
  assert.throws(() => designationsDeLaFiche(fiche, null), /POP_SYNTH, HYP_SYNTH_1, BIO_SYNTH/);
  // Le rédacteur et le contre-lecteur reçoivent le même bloc.
  const cites = claimsDeLaFiche(fiche, CLAIMS);
  const m = messageRedactionFiche(fiche, cites, bloc);
  assert.ok(m.includes(`DÉSIGNATIONS APPROUVÉES — POUR NOMMER, JAMAIS POUR ÉTABLIR UN FAIT :\n${bloc}\n`));
  assert.match(m, /CLAIMS — SEULE BASE ADMISE POUR TOUT FAIT :/);
  const cl = messageContreLecture({ nature: 'rubrique « population »', texte: 'T.', contexte: null, claimsCites: cites, axes: 'A', designations: bloc });
  assert.ok(cl.includes(bloc));
  assert.match(cl, /CLAIMS — SEULE BASE ADMISE POUR TOUT FAIT :/);
});

test('v3 : la réponse du rédacteur — rubriques, ou refus motivé', () => {
  assert.deepEqual(lireReponseFiche({ refus: ' Contradiction. ' }, FICHE.rubriques), { refus: 'Contradiction.' });
  assert.throws(() => lireReponseFiche({ refus: ' ' }, FICHE.rubriques), /refus sans motif/);
  assert.deepEqual(lireReponseFiche({ rubriques: { question: 'Q.', limites: 'L.' } }, FICHE.rubriques), { rubriques: { question: 'Q.', limites: 'L.' } });
  assert.throws(() => lireReponseFiche({ rubriques: { question: 'Q.' } }, FICHE.rubriques), /manquantes : limites/);
});

test('la réponse du rédacteur pour un libellé — objet JSON, ou libellé nu sur une ligne', () => {
  assert.deepEqual(lireReponseLibelle('{"libelle": "État synthétique"}'), { libelle: 'État synthétique' });
  assert.deepEqual(lireReponseLibelle('```json\n{"libelle": "État synthétique"}\n```'), { libelle: 'État synthétique' });
  // Le libellé seul, en texte nu (constaté sur HYP_MG_1) : lu comme le libellé.
  assert.deepEqual(lireReponseLibelle('  État synthétique \n'), { libelle: 'État synthétique' });
  // Plusieurs lignes, un JSON cassé, une clôture ou rien : refusés.
  assert.throws(() => lireReponseLibelle('État synthétique\nJustification.'), /illisible/);
  for (const sep of ['\r', '\u2028', '\u2029']) {
    assert.throws(() => lireReponseLibelle(`État synthétique${sep}Justification.`), /illisible/);
  }
  assert.throws(() => lireReponseLibelle('{"libelle": "État synthétique"'), /illisible/);
  assert.throws(() => lireReponseLibelle('```État synthétique```'), /illisible/);
  assert.throws(() => lireReponseLibelle('   '), /illisible/);
});

test('les sources DC-03 sont exactement ce que le rédacteur a reçu', () => {
  const cites = claimsDeLaFiche(FICHE, CLAIMS);
  const m = messageRedactionFiche(FICHE, cites);
  assert.deepEqual(sourcesDc03(m, cites), [m, 'Claim synthétique.']);
});
