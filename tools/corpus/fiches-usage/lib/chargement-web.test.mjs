// Garde du branchement sur web/src ([[D-314]] §4) : l'outil rejoue le VRAI
// contrat, le VRAI contrôle contre la structure et le VRAI vérificateur DC-03,
// importés par le hook d'alias — jamais une copie. Ce banc les charge comme
// l'outil (node --import register-alias, depuis la racine du dépôt) et les fait
// tourner sur des brouillons SYNTHÉTIQUES, contre une structure injectée.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';

const RACINE = path.resolve(import.meta.dirname, '../../../..');

function executer(code) {
  const r = spawnSync(
    process.execPath,
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      '--disable-warning=ExperimentalWarning',
      '--import',
      './tools/corpus/lib/register-alias.mjs',
      '--input-type=module',
      '-e',
      code,
    ],
    { cwd: RACINE, encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout.trim().split('\n').at(-1));
}

const PROGRAMME = `
const { lireBrouillonVersionUsage, lireBrouillonLibelle } = await import('@/lib/fiches-usage/contrat');
const { controlerVersionContreStructure, controlerLibelleContreStructure } = await import('@/lib/fiches-usage/controle');
const { verifierDc03 } = await import('@/lib/bio-parcours/verifierDc03');
const { FICHES_USAGE_BESOIN2_V1 } = await import('@/lib/fiches-usage/ficheUsageBesoin2V1');
const structure = {
  fiches: [{ id: 'FU_SYNTH_A', population: 'POP_SYNTH', hypotheses: ['HYP_SYNTH'], codesAnalyte: [], claims: [], rubriques: ['question', 'limites'] }],
  hypotheses: ['HYP_SYNTH'], populations: ['POP_SYNTH'],
};
const contexte = { structure, empreinte: 'e'.repeat(64) };
const commun = { structureSha256: 'e'.repeat(64), modeleRedaction: 'modele-a', modeleContreLecture: 'modele-b', versionConsigne: 'fiche-usage-v1+0000000000000000' };
const version = lireBrouillonVersionUsage({ ficheId: 'FU_SYNTH_A', contenu: { question: 'Q synthétique.', limites: 'L synthétique.' }, ...commun });
const libelle = lireBrouillonLibelle({ termeId: 'HYP_SYNTH', libelle: 'Libellé synthétique', ...commun });
let refusNature = false;
try { lireBrouillonLibelle({ termeId: 'HYP_SYNTH', nature: 'hypothese', libelle: 'x', ...commun }); } catch { refusNature = true; }
console.log(JSON.stringify({
  versionConforme: controlerVersionContreStructure({ ...version, rubriques: Object.keys(version.contenu) }, contexte),
  versionAmputee: controlerVersionContreStructure({ ficheId: 'FU_SYNTH_A', rubriques: ['question'], structureSha256: 'e'.repeat(64) }, contexte).map(a => a.code),
  libelleNature: libelle.nature,
  libelleConforme: controlerLibelleContreStructure(libelle, contexte),
  refusNature,
  dc03Invente: verifierDc03('Une dose de 500 mg.', ['Aucun nombre ici.']).ok,
  dc03Cite: verifierDc03('Voir WN-CL-9999-001.', ['WN-CL-9999-001']).ok,
  structureDuDepot: FICHES_USAGE_BESOIN2_V1.fiches.length,
}));
`;

test('le vrai contrat, le vrai contrôle et le vrai DC-03 se chargent et tranchent', () => {
  const r = executer(PROGRAMME);
  assert.deepEqual(r.versionConforme, []);
  assert.deepEqual(r.versionAmputee, ['rubriques_non_conformes']);
  assert.equal(r.libelleNature, 'hypothese');
  assert.deepEqual(r.libelleConforme, []);
  assert.equal(r.refusNature, true, 'le contrat refuse une nature fournie : l’outil doit la retirer avant dépôt');
  assert.equal(r.dc03Invente, false);
  assert.equal(r.dc03Cite, true);
  assert.equal(typeof r.structureDuDepot, 'number');
});
