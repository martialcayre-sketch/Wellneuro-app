// Phase 2b — Étage CLAIMS (rédaction assistée LLM → EN_ATTENTE_VALIDATION).
//
// Modèle à deux couches (A9/D-004) : à partir du verbatim (chunks), on RÉDIGE des
// claims — affirmations cliniques normalisées, atomiques, chacune adossée à son
// chunk source. Deux IA, jamais fusionnées (A6/A7) :
//   - Sonnet 5 RÉDIGE les claims à partir du seul verbatim ;
//   - GPT-5.4 CONTRE-VÉRIFIE la fidélité de chaque claim à son verbatim source
//     (rien d'ajouté, dosages exacts, pas de sur-affirmation). Désaccord → claim
//     EXCLU du lot et versé dans la file de revue.
// Tous les claims retenus entrent EN_ATTENTE_VALIDATION : la validation praticien
// (D-003) reste l'ultime porte, hors de cet outil.
//
// Sorties HORS DÉPÔT (~/.wellneuro/corpus/claims/). Aucune écriture base ici.
// Clés lues dans l'environnement (ANTHROPIC_API_KEY, OPENAI_API_KEY).
//
//   node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
//     tools/corpus/claims/draft.mjs --pilote WN-SRC-0056,… [--batch 001]

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { chunksDeSource, batchId } from '../chunk/chunk.mjs';

const { parseRagClaimsIngestPayload } = await import('@/lib/rag/claims/validation');
const { normalizeWellneuroText, sha256WellneuroText } = await import('@/lib/rag/validation');

const home = os.homedir();
const EXTRACTED = path.join(home, '.wellneuro', 'corpus', 'extracted');
const MANIFEST = path.join(home, '.wellneuro', 'corpus', 'manifest.json');
const OUTDIR = path.join(home, '.wellneuro', 'corpus', 'claims');

const CLAUDE_MODEL = process.env.WN_CLAIMS_CLAUDE_MODEL || 'claude-sonnet-5';
const OPENAI_MODEL = process.env.WN_CLAIMS_OPENAI_MODEL || 'gpt-5.4';
const MODELE_REVISEUR = `${CLAUDE_MODEL} (rédaction) + ${OPENAI_MODEL} (fidélité)`;
const TYPOLOGIES = new Set(['déclaré', 'observé', 'vécu', 'interprété']);

const anthropic = new Anthropic();
const openai = new OpenAI();

const PROMPT_REDACTION = `Tu es documentaliste clinique. À partir du SEUL extrait verbatim d'un cours de neuronutrition ci-dessous, rédige les affirmations cliniques (« claims ») qu'il énonce.

Règles STRICTES :
- Extrais UNIQUEMENT les affirmations cliniques SUBSTANTIELLES et non redondantes — AU PLUS 8 par extrait. Privilégie ce qui porte du sens clinique (dosages, seuils, mécanismes d'action, recommandations, définitions clés) ; ignore le remplissage. Ne fragmente pas une même assertion en plusieurs claims et ne répète pas une même idée.
- Une affirmation = UNE assertion atomique, autoportante, en français clair, entièrement soutenue par l'extrait. N'ajoute AUCUNE information absente de l'extrait.
- Reproduis chaque nombre et unité EXACTEMENT (un dosage faux est une faute grave). N'arrondis pas, ne convertis pas.
- N'invente rien, ne généralise pas au-delà de l'extrait, ne conclus pas ce que l'extrait ne conclut pas.
- Ignore les titres seuls, les renvois de figure, les fragments sans contenu assertif → dans ce cas renvoie une liste vide.
- Pour chaque claim, classe la « typologie de lecture » :
    • "déclaré" : l'extrait énonce un fait, une donnée, une définition ;
    • "observé" : un résultat mesuré/observé (étude, dosage constaté) ;
    • "vécu" : une expérience subjective rapportée (rare dans un cours) ;
    • "interprété" : une interprétation, une conclusion, une recommandation raisonnée.
- "prescriptif" = true si le claim recommande une action, une dose, une conduite ; sinon false.
- "classe_autorite" et "niveau_preuve" : optionnels, uniquement si l'extrait les qualifie explicitement ; sinon omets-les.

Réponds UNIQUEMENT par un tableau JSON valide (sans texte autour, sans bloc de code), chaque élément :
{"texte": "...", "typologie_lecture": "déclaré|observé|vécu|interprété", "prescriptif": true|false, "classe_autorite": "..."?, "niveau_preuve": "..."?}
Liste vide [] si l'extrait ne contient aucune affirmation clinique.`;

const PROMPT_FIDELITE = `Tu es vérificateur adversarial. On te donne un EXTRAIT verbatim et un CLAIM censé en dériver. Détermine si le claim est INTÉGRALEMENT soutenu par l'extrait : rien d'ajouté, aucun nombre/unité altéré, aucune sur-affirmation ni généralisation au-delà de l'extrait.

En cas de doute réel, réponds fidele=false. Réponds UNIQUEMENT par un objet JSON : {"fidele": true|false, "raison": "…"}.`;

function stripFrontMatter(content) {
  if (!content.startsWith('---\n')) return content;
  const end = content.indexOf('\n---\n', 4);
  return end < 0 ? content : content.slice(end + 5);
}

function parseJsonLache(txt) {
  let s = (txt || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.search(/[[{]/);
  if (start > 0) s = s.slice(start);
  return JSON.parse(s);
}

async function redigerClaims(verbatim, section) {
  const rep = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: PROMPT_REDACTION,
    messages: [{ role: 'user', content: `Section : ${section}\n\nEXTRAIT VERBATIM :\n"""\n${verbatim}\n"""` }],
  });
  const txt = rep.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const arr = parseJsonLache(txt);
  // Filet de sécurité : borne dure même si le modèle déborde la consigne.
  return Array.isArray(arr) ? arr.slice(0, 8) : [];
}

async function verifierFidelite(verbatim, claimTexte) {
  const rep = await openai.responses.create({
    model: OPENAI_MODEL,
    reasoning: { effort: 'low' },
    max_output_tokens: 1024,
    instructions: PROMPT_FIDELITE,
    input: [{ role: 'user', content: [{ type: 'input_text', text: `EXTRAIT :\n"""\n${verbatim}\n"""\n\nCLAIM :\n"${claimTexte}"` }] }],
  });
  const v = parseJsonLache(rep.output_text || '{}');
  return { fidele: v.fidele === true, raison: String(v.raison || '') };
}

async function construireChunks(sourceIds, bId) {
  const man = JSON.parse(await fs.readFile(MANIFEST, 'utf8')).manifeste;
  const reg = JSON.parse(await fs.readFile(path.resolve('docs/claude/corpus/source_registry.json'), 'utf8'));
  const byId = Object.fromEntries(reg.map((n) => [n.sourceId, n]));
  const out = [];
  for (const sid of sourceIds) {
    let canonicalMd;
    try { canonicalMd = await fs.readFile(path.join(EXTRACTED, sid, 'canonical.md'), 'utf8'); }
    catch { console.error(`  ${sid} : canonical.md absent — ignoré`); continue; }
    const notice = byId[sid] || {};
    const chunks = chunksDeSource({
      batchId: bId, sourceId: sid, notebook: notice.primaryNotebook || '',
      titre: notice.title || sid, canonicalMd, registre: notice,
    });
    out.push({ sid, notice, chunks });
  }
  return out;
}

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { pilote: [], batch: '001', date: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--pilote') o.pilote = a[++i].split(',').map((s) => s.trim());
    else if (a[i] === '--batch') o.batch = a[++i];
    else if (a[i] === '--date') o.date = a[++i];
  }
  return o;
}

async function main() {
  const o = parseArgs();
  if (!o.pilote.length) { console.error('Usage : --pilote WN-SRC-0056,…'); process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
    console.error('ANTHROPIC_API_KEY / OPENAI_API_KEY absents (lancer avec --env-file).'); process.exit(1);
  }
  const dateISO = o.date || new Date().toISOString().slice(0, 10);
  const bId = batchId(o.batch, dateISO);
  const parSource = await construireChunks(o.pilote, bId);

  const claims = [];
  const revue = [];
  for (const { sid, chunks } of parSource) {
    const num = /WN-SRC-(\d{4})/.exec(sid)[1];
    let seq = 0;
    console.log(`\n=== ${sid} — ${chunks.length} chunks ===`);
    for (const chunk of chunks) {
      const verbatim = stripFrontMatter(chunk.content).trim();
      let brouillons;
      try { brouillons = await redigerClaims(verbatim, chunk.section); }
      catch (e) { console.error(`  ${chunk.chunkId} : rédaction échouée — ${e.message}`); continue; }

      // Normalisation + filtre de forme, puis contre-vérification de fidélité EN
      // PARALLÈLE (une IA distincte, GPT-5.4) — le goulot n'est plus séquentiel.
      const candidats = brouillons
        .map((b) => ({ b, texte: normalizeWellneuroText(String(b.texte || '').trim()) }))
        .filter(({ b, texte }) => {
          if (!texte.trim()) return false;
          if (!TYPOLOGIES.has(b.typologie_lecture)) {
            revue.push({ chunkId: chunk.chunkId, texte, motif: `typologie invalide : ${b.typologie_lecture}` });
            return false;
          }
          return true;
        });
      const verdicts = await Promise.all(candidats.map(({ texte }) =>
        verifierFidelite(verbatim, texte).catch((e) => ({ fidele: false, raison: `vérif échouée : ${e.message}` }))));

      let retenusChunk = 0;
      candidats.forEach(({ b, texte }, i) => {
        const verdict = verdicts[i];
        if (!verdict.fidele) { revue.push({ chunkId: chunk.chunkId, texte, motif: `infidèle : ${verdict.raison}` }); return; }
        seq += 1; retenusChunk += 1;
        claims.push({
          claimId: `WN-CL-${num}-${String(seq).padStart(3, '0')}`,
          sourceId: sid,
          versionClaim: 'v1.0',
          texteNormalise: texte,
          contentSha256: sha256WellneuroText(texte),
          typologieLecture: b.typologie_lecture,
          prescriptif: b.prescriptif === true,
          ...(b.classe_autorite ? { classeAutorite: String(b.classe_autorite) } : {}),
          ...(b.niveau_preuve ? { niveauPreuve: String(b.niveau_preuve) } : {}),
          modeleReviseur: MODELE_REVISEUR,
          metadata: { source_chunk: chunk.chunkId, section: chunk.section, page: chunk.metadata?.page_source ?? null },
          sources: [{ chunkId: chunk.chunkId, versionChunk: chunk.versionChunk }],
          patientIdentifiable: false,
          compartment: 'ACTIF',
        });
      });
      console.log(`  ${chunk.chunkId} : ${brouillons.length} brouillon(s) → ${retenusChunk} retenu(s) (${seq} cumulés)`);
    }
  }

  // Contrôle de conformité au VRAI contrat serveur avant écriture (par lots ≤ 64).
  for (let i = 0; i < claims.length; i += 64) {
    parseRagClaimsIngestPayload({ claims: claims.slice(i, i + 64) });
  }

  await fs.mkdir(OUTDIR, { recursive: true });
  const draftPath = path.join(OUTDIR, `draft-${bId}.json`);
  const revuePath = path.join(OUTDIR, `revue-${bId}.json`);
  await fs.writeFile(draftPath, JSON.stringify({ batchId: bId, modeleReviseur: MODELE_REVISEUR, claims }, null, 2));
  await fs.writeFile(revuePath, JSON.stringify({ batchId: bId, exclus: revue }, null, 2));

  console.log(`\n=== Bilan ===`);
  console.log(`  claims retenus : ${claims.length}`);
  console.log(`  exclus (file de revue) : ${revue.length}`);
  console.log(`  → ${draftPath}`);
  console.log(`  → ${revuePath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
