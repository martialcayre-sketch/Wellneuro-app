// Banc qualité d'extraction du corpus WellNeuro.
//
// Pour chaque page de chaque PDF échantillon :
//   1. lecture A (pdftotext) → vérité des nombres ;
//   2. rendu image + lectures B (Claude) et C (GPT) en parallèle ;
//   3. invariants déterministes : dosages A survivant dans B/C, couverture
//      caractères, comptage de cellules de tableau ;
//   4. écriture incrémentale d'un JSON par page (reprise idempotente) ;
//   5. rapport Markdown de synthèse à la fin.
//
// Prérequis : ANTHROPIC_API_KEY et OPENAI_API_KEY dans l'environnement.
//   node --env-file=../../../web/.env.local bench.mjs [--pages N] [--pdf id]
//
// Aucune donnée patient, aucune valeur secrète. Sorties hors dépôt.

import fs from 'node:fs/promises';
import path from 'node:path';
import { CONFIG } from './config.mjs';
import { lectureA, lectureB, lectureC, rendrePage } from './lib/lecteurs.mjs';
import {
  extraireDosages,
  dosagesManquants,
  couvertureCaracteres,
  compterCellulesTableau,
} from './lib/invariants.mjs';

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { pages: Infinity, pdf: null, force: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--pages') opts.pages = Number(a[++i]);
    else if (a[i] === '--pdf') opts.pdf = a[++i];
    else if (a[i] === '--force') opts.force = true;
  }
  return opts;
}

async function nbPages(pdfPath) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { stdout } = await promisify(execFile)('pdfinfo', [pdfPath]);
  return Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
}

function exigeCles() {
  const manque = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'].filter((k) => !process.env[k]);
  if (manque.length) {
    console.error(`Clés absentes : ${manque.join(', ')}. Lancer avec --env-file pointant sur web/.env.local.`);
    process.exit(1);
  }
}

async function traiterPage(pdf, page, dirs) {
  const jsonPath = path.join(dirs.pages, `${pdf.id}-p${String(page).padStart(3, '0')}.json`);
  const pngPath = path.join(dirs.png, `${pdf.id}-p${String(page).padStart(3, '0')}.png`);

  const pdfPath = path.join(CONFIG.pdfDir, pdf.file);

  const texteA = await lectureA(pdfPath, page);
  const dosagesA = extraireDosages(texteA);
  const { base64, octets } = await rendrePage(pdfPath, page, pngPath);

  const [B, C] = await Promise.allSettled([lectureB(base64), lectureC(base64)]);
  const okB = B.status === 'fulfilled' ? B.value : { erreur: String(B.reason?.message || B.reason) };
  const okC = C.status === 'fulfilled' ? C.value : { erreur: String(C.reason?.message || C.reason) };

  const manquantsB = okB.texte ? dosagesManquants(dosagesA, okB.texte) : dosagesA.slice();
  const manquantsC = okC.texte ? dosagesManquants(dosagesA, okC.texte) : dosagesA.slice();
  // Dosages perdus par LES DEUX lectures : signal fort d'artéfact (ou de dosage
  // porté par un schéma qu'aucun modèle ne lit).
  const perdusDesDeux = manquantsB.filter((d) => manquantsC.includes(d));

  const resultat = {
    pdf: pdf.id,
    page,
    imageOctets: octets,
    A: { dosages: dosagesA, chars: texteA.length },
    B: okB.texte
      ? {
          usage: okB.usage,
          ms: okB.ms,
          chars: okB.texte.length,
          couverture: Number(couvertureCaracteres(texteA, okB.texte).toFixed(3)),
          tableau: compterCellulesTableau(okB.texte),
          dosagesManquants: manquantsB,
        }
      : { erreur: okB.erreur },
    C: okC.texte
      ? {
          usage: okC.usage,
          ms: okC.ms,
          chars: okC.texte.length,
          couverture: Number(couvertureCaracteres(texteA, okC.texte).toFixed(3)),
          tableau: compterCellulesTableau(okC.texte),
          dosagesManquants: manquantsC,
        }
      : { erreur: okC.erreur },
    perdusDesDeux,
  };

  await fs.writeFile(jsonPath, JSON.stringify(resultat, null, 2));
  // Transcriptions brutes pour inspection humaine.
  if (okB.texte) await fs.writeFile(path.join(dirs.txt, `${pdf.id}-p${String(page).padStart(3, '0')}-B.md`), okB.texte);
  if (okC.texte) await fs.writeFile(path.join(dirs.txt, `${pdf.id}-p${String(page).padStart(3, '0')}-C.md`), okC.texte);

  return resultat;
}

function agrege(resultats) {
  const s = {
    pages: resultats.length,
    dosagesA: 0,
    manqB: 0,
    manqC: 0,
    perdusDesDeux: 0,
    tokensInB: 0, tokensOutB: 0, tokensInC: 0, tokensOutC: 0,
    couvBSum: 0, couvCSum: 0, couvN: 0,
    erreursB: 0, erreursC: 0,
  };
  for (const r of resultats) {
    s.dosagesA += r.A.dosages.length;
    if (r.B.erreur) s.erreursB++;
    else {
      s.manqB += r.B.dosagesManquants.length;
      s.tokensInB += r.B.usage.input; s.tokensOutB += r.B.usage.output;
      s.couvBSum += r.B.couverture;
    }
    if (r.C.erreur) s.erreursC++;
    else {
      s.manqC += r.C.dosagesManquants.length;
      s.tokensInC += r.C.usage.input; s.tokensOutC += r.C.usage.output;
      s.couvCSum += r.C.couverture;
    }
    if (!r.B.erreur && !r.C.erreur) {
      s.couvN++;
    }
    s.perdusDesDeux += r.perdusDesDeux.length;
  }
  return s;
}

function rapportMarkdown(resultats, parPdf) {
  const g = agrege(resultats);
  const pct = (n, d) => (d ? (100 * n / d).toFixed(1) + ' %' : '—');
  const moy = (somme, n) => (n ? (somme / n).toFixed(3) : '—');

  let md = `# Banc qualité — extraction corpus WellNeuro\n\n`;
  md += `Modèles : **${CONFIG.claudeModel}** (B) + **${CONFIG.openaiModel}** (C). `;
  md += `Rendu ${CONFIG.renderLongEdge} px grand côté.\n\n`;
  md += `## Synthèse (${g.pages} pages)\n\n`;
  md += `| Métrique | Lecture B (Claude) | Lecture C (GPT) |\n|---|---|---|\n`;
  md += `| Pages en erreur | ${g.erreursB} | ${g.erreursC} |\n`;
  md += `| Dosages A restitués | ${pct(g.dosagesA - g.manqB, g.dosagesA)} | ${pct(g.dosagesA - g.manqC, g.dosagesA)} |\n`;
  md += `| Dosages A manquants | ${g.manqB} / ${g.dosagesA} | ${g.manqC} / ${g.dosagesA} |\n`;
  md += `| Couverture caractères (moy.) | ${moy(g.couvBSum, resultats.length - g.erreursB)} | ${moy(g.couvCSum, resultats.length - g.erreursC)} |\n`;
  md += `| Tokens entrée/page (moy.) | ${Math.round(g.tokensInB / Math.max(1, resultats.length - g.erreursB))} | ${Math.round(g.tokensInC / Math.max(1, resultats.length - g.erreursC))} |\n`;
  md += `| Tokens sortie/page (moy.) | ${Math.round(g.tokensOutB / Math.max(1, resultats.length - g.erreursB))} | ${Math.round(g.tokensOutC / Math.max(1, resultats.length - g.erreursC))} |\n\n`;
  md += `**Dosages perdus par les DEUX lectures : ${g.perdusDesDeux}** — file de revue humaine prioritaire (risque clinique).\n\n`;

  md += `## Par PDF\n\n`;
  for (const [id, rs] of parPdf) {
    const s = agrege(rs);
    md += `### ${id} (${s.pages} pages)\n\n`;
    md += `- Dosages couche texte : ${s.dosagesA}\n`;
    md += `- Restitution B / C : ${pct(s.dosagesA - s.manqB, s.dosagesA)} / ${pct(s.dosagesA - s.manqC, s.dosagesA)}\n`;
    md += `- Perdus des deux : ${s.perdusDesDeux}\n`;
    md += `- Tokens entrée moy. B / C : ${Math.round(s.tokensInB / Math.max(1, s.pages - s.erreursB))} / ${Math.round(s.tokensInC / Math.max(1, s.pages - s.erreursC))}\n\n`;
  }

  // Projection de coût sur 11 000 pages (batch −50 %), tarifs de la note de coûts.
  const inB = g.tokensInB / Math.max(1, resultats.length - g.erreursB);
  const outB = g.tokensOutB / Math.max(1, resultats.length - g.erreursB);
  const inC = g.tokensInC / Math.max(1, resultats.length - g.erreursC);
  const outC = g.tokensOutC / Math.max(1, resultats.length - g.erreursC);
  const PAGES = 11000;
  // $/M : Sonnet 5 intro 2/10 ; GPT-5.4 2,50/15. Batch −50 %.
  const coutB = (inB * PAGES / 1e6 * 2 + outB * PAGES / 1e6 * 10) * 0.5;
  const coutC = (inC * PAGES / 1e6 * 2.5 + outC * PAGES / 1e6 * 15) * 0.5;
  md += `## Projection 11 000 pages (batch −50 %, tokens réels mesurés)\n\n`;
  md += `- Lecture B (${CONFIG.claudeModel}, tarif intro 2/10 \\$/M) : **~${coutB.toFixed(0)} \\$**\n`;
  md += `- Lecture C (${CONFIG.openaiModel}, 2,50/15 \\$/M) : **~${coutC.toFixed(0)} \\$**\n`;
  md += `- Croisé B+C : **~${(coutB + coutC).toFixed(0)} \\$**\n\n`;
  md += `> Rappel : la note de cadrage estimait ~107 \\$ pour le croisé intégral. Ce chiffre recale la colonne « tokens image réels ».\n`;

  return md;
}

async function main() {
  exigeCles();
  const opts = parseArgs();

  const dirs = {
    pages: path.join(CONFIG.outDir, 'pages'),
    png: path.join(CONFIG.outDir, 'png'),
    txt: path.join(CONFIG.outDir, 'txt'),
  };
  for (const d of Object.values(dirs)) await fs.mkdir(d, { recursive: true });

  const cibles = CONFIG.pdfs.filter((p) => !opts.pdf || p.id === opts.pdf);
  const resultats = [];
  const parPdf = new Map();

  for (const pdf of cibles) {
    const pdfPath = path.join(CONFIG.pdfDir, pdf.file);
    const total = await nbPages(pdfPath);
    const jusqua = Math.min(total, opts.pages);
    const rs = [];
    for (let page = 1; page <= jusqua; page++) {
      const jsonPath = path.join(dirs.pages, `${pdf.id}-p${String(page).padStart(3, '0')}.json`);
      let r;
      if (!opts.force) {
        try {
          r = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
        } catch { /* pas encore traité */ }
      }
      if (!r) {
        process.stdout.write(`  ${pdf.id} p${page}/${jusqua}… `);
        r = await traiterPage(pdf, page, dirs);
        const badge = r.perdusDesDeux.length ? `⚠ ${r.perdusDesDeux.length} perdus` : 'ok';
        process.stdout.write(`${badge}\n`);
      }
      rs.push(r);
      resultats.push(r);
    }
    parPdf.set(pdf.id, rs);
  }

  const md = rapportMarkdown(resultats, parPdf);
  const rapportPath = path.join(CONFIG.outDir, 'RAPPORT.md');
  await fs.writeFile(rapportPath, md);
  console.log(`\nRapport : ${rapportPath}`);
  console.log(md.split('\n').slice(0, 20).join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
