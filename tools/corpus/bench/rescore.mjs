// Re-score les dosages depuis les transcriptions déjà sauvegardées (out/txt)
// et la couche texte (pdftotext), SANS rappeler les API, puis RÉÉCRIT chaque
// JSON de page (dosagesManquants / perdusDesDeux) avec la version courante des
// invariants. Les autres champs (tokens, couverture) sont conservés. Relancer
// ensuite `node bench.mjs` (sans --force) régénère le RAPPORT à coût API nul.

import fs from 'node:fs/promises';
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { lectureA } from './lib/lecteurs.mjs';
import { extraireDosages, dosagesManquants } from './lib/invariants.mjs';

const pagesDir = path.join(CONFIG.outDir, 'pages');
const txtDir = path.join(CONFIG.outDir, 'txt');

let dA = 0, manqB = 0, manqC = 0, perdusDesDeux = 0;
const alertes = [];

for (const pdf of CONFIG.pdfs) {
  const pdfPath = path.join(CONFIG.pdfDir, pdf.file);
  const fichiers = (await fs.readdir(pagesDir)).filter((f) => f.startsWith(`${pdf.id}-p`) && f.endsWith('.json'));
  for (const f of fichiers.sort()) {
    const jsonPath = path.join(pagesDir, f);
    const r = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    const A = await lectureA(pdfPath, r.page);
    const dosagesA = extraireDosages(A);
    dA += dosagesA.length;
    const base = f.replace('.json', '');
    const lire = async (suffixe) => {
      try { return await fs.readFile(path.join(txtDir, `${base}-${suffixe}.md`), 'utf8'); }
      catch { return ''; }
    };
    const B = await lire('B');
    const C = await lire('C');
    const mB = B ? dosagesManquants(dosagesA, B) : dosagesA.slice();
    const mC = C ? dosagesManquants(dosagesA, C) : dosagesA.slice();
    manqB += mB.length; manqC += mC.length;
    const deux = mB.filter((d) => mC.includes(d));
    perdusDesDeux += deux.length;

    // Réécriture in place : on rafraîchit la vérité des nombres et les manques.
    r.A.dosages = dosagesA;
    if (!r.B.erreur) r.B.dosagesManquants = mB;
    if (!r.C.erreur) r.C.dosagesManquants = mC;
    r.perdusDesDeux = deux;
    await fs.writeFile(jsonPath, JSON.stringify(r, null, 2));

    if (mB.length || mC.length) alertes.push({ page: `${pdf.id} p${r.page}`, B: mB, C: mC, deux });
  }
}

const pct = (n, d) => (d ? (100 * n / d).toFixed(1) + ' %' : '—');
console.log(`Dosages couche texte : ${dA}`);
console.log(`Restitution B : ${pct(dA - manqB, dA)}  (${manqB} manquants)`);
console.log(`Restitution C : ${pct(dA - manqC, dA)}  (${manqC} manquants)`);
console.log(`Perdus des DEUX : ${perdusDesDeux}`);
if (alertes.length) {
  console.log('\nAlertes restantes :');
  for (const a of alertes) console.log(` - ${a.page} | B:${JSON.stringify(a.B)} C:${JSON.stringify(a.C)} deux:${JSON.stringify(a.deux)}`);
}
console.log('\nJSONs réécrits. Relancer `node bench.mjs` (sans --force) pour régénérer RAPPORT.md.');
