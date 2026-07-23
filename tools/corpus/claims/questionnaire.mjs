// Phase 2c — Générateur de QUESTIONNAIRE de restitution (Atelier v2, voie
// rapide). La procédure « validation à deux vitesses » (actée le 2026-07-23)
// exige un questionnaire « généré depuis les claims, couverture de chaque
// chunk garantie ». Cet outil produit ce questionnaire à partir d'un draft de
// claims (sortie de draft.mjs) : UNE question de restitution par chunk
// atteignable, rédigée depuis les seuls claims de ce chunk.
//
// La couverture est garantie PAR CONSTRUCTION : un chunk cité par au moins un
// claim reçoit exactement une question dont les claims attendus sont ceux du
// chunk — quand le praticien la joue sur le corpus (route
// /api/praticien/corpus/claims/recherche), la restitution cite ces claims,
// donc couvre ce chunk. La conformité reste un verdict praticien, jamais un
// seuil automatique ; la couverture est revérifiée côté serveur à la signature.
//
// Sortie HORS DÉPÔT (~/.wellneuro/corpus/claims/). Aucune écriture base.
// Clé lue dans l'environnement (ANTHROPIC_API_KEY).
//
//   node --env-file=web/.env.local \
//     tools/corpus/claims/questionnaire.mjs \
//     --draft ~/.wellneuro/corpus/claims/draft-LOT_001_2026-07-22.json [--source WN-SRC-0056]

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const OUTDIR = path.join(os.homedir(), '.wellneuro', 'corpus', 'claims');
const CLAUDE_MODEL = process.env.WN_CLAIMS_CLAUDE_MODEL || 'claude-sonnet-5';

const anthropic = new Anthropic();

const PROMPT_QUESTION = `Tu génères UNE question de restitution pour un praticien qui valide un corpus de neuronutrition. On te donne les affirmations cliniques (« claims ») tirées d'UN même extrait de cours.

Rédige UNE seule question, en français, qui :
- porte sur le CONTENU CLINIQUE central de ces claims (ce qu'ils affirment : mécanisme, dosage, définition, recommandation) ;
- est assez précise pour qu'une bonne réponse DOIVE mobiliser ces claims, pas des généralités ;
- reste ouverte (pas un oui/non), pour tester la restitution réelle du corpus.

Ne cite aucun numéro de claim. N'invente rien au-delà des claims. Réponds UNIQUEMENT par un objet JSON : {"question": "…"}.`;

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { draft: null, source: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--draft') o.draft = a[++i];
    else if (a[i] === '--source') o.source = a[++i];
  }
  return o;
}

function parseJsonLache(txt) {
  let s = (txt || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.search(/[[{]/);
  if (start > 0) s = s.slice(start);
  return JSON.parse(s);
}

/** chunkId d'un claim : la source épinglée fait foi, metadata en repli. */
function chunkDuClaim(claim) {
  if (Array.isArray(claim.sources) && claim.sources[0]?.chunkId) return claim.sources[0].chunkId;
  return claim.metadata?.source_chunk ?? null;
}

async function genererQuestion(claims) {
  const liste = claims.map((c, i) => `${i + 1}. ${c.texteNormalise}`).join('\n');
  const rep = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: PROMPT_QUESTION,
    messages: [{ role: 'user', content: `CLAIMS D'UN MÊME EXTRAIT :\n${liste}` }],
  });
  const txt = rep.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const v = parseJsonLache(txt);
  return String(v.question || '').trim();
}

async function main() {
  const o = parseArgs();
  if (!o.draft) { console.error('Usage : --draft <draft-*.json> [--source WN-SRC-0056]'); process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY absent (lancer avec --env-file=web/.env.local).');
    process.exit(1);
  }

  const draft = JSON.parse(await fs.readFile(o.draft, 'utf8'));
  const claims = (draft.claims || []).filter((c) => !o.source || c.sourceId === o.source);
  if (claims.length === 0) { console.error('Aucun claim (filtre source trop restrictif ?).'); process.exit(1); }

  // Un questionnaire par source ; à l'intérieur, une question par chunk
  // atteignable (regroupement des claims du chunk).
  const parSource = new Map();
  for (const claim of claims) {
    const src = parSource.get(claim.sourceId) ?? new Map();
    const chunk = chunkDuClaim(claim);
    if (!chunk) continue;
    const duChunk = src.get(chunk) ?? [];
    duChunk.push(claim);
    src.set(chunk, duChunk);
    parSource.set(claim.sourceId, src);
  }

  const sorties = [];
  for (const [sourceId, parChunk] of parSource) {
    const questions = [];
    for (const [chunkId, duChunk] of parChunk) {
      let question;
      try {
        question = await genererQuestion(duChunk);
      } catch (e) {
        console.error(`  ${sourceId}/${chunkId} : génération échouée — ${e.message}`);
        continue;
      }
      if (!question) {
        console.error(`  ${sourceId}/${chunkId} : question vide — ignorée`);
        continue;
      }
      questions.push({
        chunkId,
        question,
        claimsCitesAttendus: duChunk.map((c) => c.claimId),
      });
      console.log(`  ${sourceId}/${chunkId} : ${duChunk.length} claim(s) → question générée`);
    }
    // Un chunk sans question (échec de génération) romprait la couverture : on
    // le signale bruyamment plutôt que de livrer un questionnaire trompeur.
    const chunksManques = [...parChunk.keys()].filter(
      (ch) => !questions.some((q) => q.chunkId === ch),
    );
    if (chunksManques.length) {
      console.error(`  ⚠ ${sourceId} : ${chunksManques.length} chunk(s) sans question — couverture INCOMPLÈTE : ${chunksManques.join(', ')}`);
    }
    sorties.push({ sourceId, couvertureComplete: chunksManques.length === 0, questions });
  }

  await fs.mkdir(OUTDIR, { recursive: true });
  const suffixe = o.source ? `-${o.source}` : '';
  const dest = path.join(OUTDIR, `questionnaire-${draft.batchId}${suffixe}.json`);
  await fs.writeFile(dest, JSON.stringify({ batchId: draft.batchId, sources: sorties }, null, 2));

  const totalQuestions = sorties.reduce((n, s) => n + s.questions.length, 0);
  const complet = sorties.every((s) => s.couvertureComplete);
  console.log(`\n=== Bilan ===`);
  console.log(`  sources : ${sorties.length}, questions : ${totalQuestions}`);
  console.log(`  couverture complète : ${complet ? 'oui' : 'NON — voir avertissements'}`);
  console.log(`  → ${dest}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
