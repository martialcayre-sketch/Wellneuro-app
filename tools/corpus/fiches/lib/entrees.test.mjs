// Bancs des entrées vérifiées (lot 5 de D-251), sur un corpus SYNTHÉTIQUE
// écrit dans un dossier temporaire — jamais ~/.wellneuro.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { sha256WellneuroText } from '../../lib/wellneuro-text.mjs';
import { chargerClaimsLocaux, chargerSource } from './entrees.mjs';

async function corpus({ pdf = 'PDF synthétique', empreinte, pages = 2, marqueurs = 2 } = {}) {
  const racine = await mkdtemp(path.join(os.tmpdir(), 'wn-fiches-'));
  const cheminPdf = path.join(racine, 'fiche.pdf');
  await writeFile(cheminPdf, pdf);
  const sha = empreinte ?? createHash('sha256').update(pdf).digest('hex');
  await writeFile(
    path.join(racine, 'manifest.json'),
    JSON.stringify({ manifeste: { 'WN-SRC-9999': { localPath: cheminPdf, sha256: sha, matchConfidence: 'exact' } } }),
  );
  const dossier = path.join(racine, 'extracted', 'WN-SRC-9999');
  await mkdir(dossier, { recursive: true });
  const md = Array.from({ length: marqueurs }, (_, i) => `<!-- page ${i + 1} (lecture B) -->\n\nTexte synthétique ${i + 1}.\n`).join('\n');
  await writeFile(path.join(dossier, 'canonical.md'), `${md}\n`);
  for (let i = 1; i <= pages; i++) await writeFile(path.join(dossier, `p${String(i).padStart(3, '0')}.json`), '{}');
  return racine;
}

test('la source se charge entière, marqueurs compris, avec l’empreinte du PDF recalculée', async () => {
  const racine = await corpus();
  const s = await chargerSource('WN-SRC-9999', racine);
  assert.equal(s.pages, 2);
  assert.match(s.texteSource, /^<!-- page 1 \(lecture B\) -->/);
  assert.equal(s.sourceSha256, createHash('sha256').update('PDF synthétique').digest('hex'));
});

test('un PDF qui ne redonne plus l’empreinte du manifeste fait échouer la fiche', async () => {
  const racine = await corpus({ empreinte: 'a'.repeat(64) });
  await assert.rejects(chargerSource('WN-SRC-9999', racine), /ne correspond plus à l'empreinte/);
});

test('une page extraite sans marqueur, ou l’inverse, ou aucun marqueur, fait échouer la fiche', async () => {
  await assert.rejects(chargerSource('WN-SRC-9999', await corpus({ pages: 3, marqueurs: 2 })), /3 page\(s\) extraite\(s\) pour 2 marqueur/);
  await assert.rejects(chargerSource('WN-SRC-9999', await corpus({ pages: 2, marqueurs: 3 })), /2 page\(s\) extraite\(s\) pour 3 marqueur/);
  await assert.rejects(chargerSource('WN-SRC-9999', await corpus({ pages: 0, marqueurs: 0 })), /0 page\(s\) extraite\(s\) pour 0 marqueur/);
});

// Constat de revue : un JSON.parse en échec cite la ligne fautive — du texte.
test('un instantané de claims illisible échoue sans recopier une ligne de son contenu', async () => {
  const racine = await mkdtemp(path.join(os.tmpdir(), 'wn-claims-'));
  const fichier = path.join(racine, 'draft.json');
  await writeFile(fichier, '{\n  "claims": [\n    { "texteNormalise": "TEXTE SYNTHETIQUE PROPRIETAIRE');
  await assert.rejects(chargerClaimsLocaux(fichier), err => {
    assert.equal(err.name, 'ErreurOutil');
    assert.ok(!err.message.includes('SYNTHETIQUE'));
    return true;
  });
});

test('une source absente du manifeste est refusée', async () => {
  const racine = await corpus();
  await assert.rejects(chargerSource('WN-SRC-0001', racine), /absent du manifeste/);
});

test('un claim dont le texte ne redonne pas son empreinte est écarté, et compté', async () => {
  const racine = await mkdtemp(path.join(os.tmpdir(), 'wn-claims-'));
  const fichier = path.join(racine, 'draft.json');
  const bon = 'Claim synthétique.';
  await writeFile(
    fichier,
    JSON.stringify({
      claims: [
        { claimId: 'WN-CL-9999-001', versionClaim: 'v1.0', sourceId: 'WN-SRC-9999', texteNormalise: bon, contentSha256: sha256WellneuroText(bon) },
        { claimId: 'WN-CL-9999-002', versionClaim: 'v1.0', sourceId: 'WN-SRC-9999', texteNormalise: 'Retouché.', contentSha256: sha256WellneuroText('Original.') },
      ],
    }),
  );
  const { claims, empreintesFausses } = await chargerClaimsLocaux(fichier);
  assert.deepEqual([...claims.keys()], ['WN-CL-9999-001::v1.0']);
  assert.deepEqual(empreintesFausses, ['WN-CL-9999-002::v1.0']);
});
