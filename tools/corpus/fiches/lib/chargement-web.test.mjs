// Garde du branchement sur web/src (lot 5 de D-251) : l'outil rejoue le VRAI
// contrat et les VRAIS contrôles, importés par le hook d'alias — jamais une
// copie. Ce banc les charge comme l'outil (node --import register-alias, depuis
// la racine du dépôt) et les fait tourner sur un brouillon SYNTHÉTIQUE.
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
const { lireBrouillonFiche } = await import('@/lib/fiches-assiette/contrat');
const { controlerFiche } = await import('@/lib/fiches-assiette/invariants');
const { clesSecuriteDeLAssiette } = await import('@/lib/fiches-assiette/securite');
const { controlerBrouillon } = await import('./tools/corpus/fiches/lib/controles.mjs');
const securite = clesSecuriteDeLAssiette('ASSIETTE_PROTEINEE');
const claims = new Map([...securite.map(c => [c, { sourceId: 'WN-SRC-0288', texte: 'Réserve synthétique.' }]),
  ['WN-CL-0300-001::v1.0', { sourceId: 'WN-SRC-0300', texte: 'Claim synthétique.' }]]);
const brouillon = (precautions) => ({
  sourceId: 'WN-SRC-0300', plateCode: 'ASSIETTE_PROTEINEE',
  texteSource: '<!-- page 1 (lecture B) -->\\n\\nUne source synthétique pour le banc.\\n',
  sourceSha256: 'a'.repeat(64), modeleRedaction: 'redacteur-fictif', modeleFidelite: 'relecteur-fictif',
  versionConsigne: 'fiche-assiette-v1+0000000000000000',
  contenu: { titre: 'Titre', precautions,
    sections: [{ titre: 'Section', blocs: [
      { texte: 'une source synthétique', provenance: { type: 'verbatim' } },
      { texte: 'Reformulation.', provenance: { type: 'claims', claims: ['WN-CL-0300-001::v1.0'] } }] }] },
});
const serveur = { lireBrouillonFiche, controlerFiche };
const complet = controlerBrouillon(serveur, brouillon([{ texte: 'Parlez-en à votre praticien.', claims: securite }]), claims, securite);
const sans = controlerBrouillon(serveur, brouillon([]), claims, securite);
const valide = controlerBrouillon(serveur, { ...brouillon([]), acte: 'validee' }, claims, securite);
console.log(JSON.stringify({ securite: securite.length, complet: complet.anomalies.map(a => a.code),
  sans: sans.anomalies.map(a => a.code), valide: valide.anomalies.map(a => a.code) }));
`;

test('le vrai contrat et les vrais contrôles se chargent par le hook, et mordent', () => {
  const r = executer(PROGRAMME);
  assert.ok(r.securite > 0, 'la protéinée porte des réserves de sécurité');
  assert.deepEqual(r.complet, []);
  assert.ok(r.sans.includes('precaution_manquante'));
  // Un brouillon qui prétend se valider est arrêté par le contrat (DC-16).
  assert.deepEqual(r.valide, ['contrat']);
});
