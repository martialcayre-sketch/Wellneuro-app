// Le cœur pur de la rédaction des fiches d'usage ([[D-314]] §4). Texte
// SYNTHÉTIQUE seulement ; aucun modèle appelé.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  claimsDeLaFiche,
  claimsDuTerme,
  contexteDeRubrique,
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
  assert.deepEqual(claimsDeLaFiche(FICHE, CLAIMS), [{ cle: 'WN-CL-9999-001::v1.0', texte: 'Claim synthétique.' }]);
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

test('les sources DC-03 sont exactement ce que le rédacteur a reçu', () => {
  const cites = claimsDeLaFiche(FICHE, CLAIMS);
  const m = messageRedactionFiche(FICHE, cites);
  assert.deepEqual(sourcesDc03(m, cites), [m, 'Claim synthétique.']);
});
