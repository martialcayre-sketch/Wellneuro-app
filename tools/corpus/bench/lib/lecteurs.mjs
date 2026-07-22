// Les trois lectures d'une page.
//   A — pdftotext (couche texte, gratuite, déterministe) : la vérité des nombres.
//   B — Claude vision (SDK officiel Anthropic).
//   C — GPT vision (SDK officiel OpenAI).

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { CONFIG, PROMPT_TRANSCRIPTION } from '../config.mjs';

const execFileP = promisify(execFile);

let _anthropic;
let _openai;
function anthropic() {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}
function openai() {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

// Lecture A : couche texte de la page N (1-indexée), mise en page préservée.
export async function lectureA(pdfPath, page) {
  const { stdout } = await execFileP('pdftotext', [
    '-layout', '-f', String(page), '-l', String(page), pdfPath, '-',
  ]);
  return stdout.replace(/\f/g, '').trim();
}

// Rendu de la page N en PNG (grand côté = CONFIG.renderLongEdge). Renvoie le
// data-URI base64 prêt pour les API vision.
export async function rendrePage(pdfPath, page, pngPath) {
  const prefixe = pngPath.replace(/\.png$/, '');
  await execFileP('pdftoppm', [
    '-png', '-r', '150',
    '-scale-to', String(CONFIG.renderLongEdge),
    '-f', String(page), '-l', String(page),
    '-singlefile',
    pdfPath, prefixe,
  ]);
  const buf = await fs.readFile(pngPath);
  return { base64: buf.toString('base64'), octets: buf.length };
}

// Lecture B : Claude vision.
export async function lectureB(base64) {
  const t0 = performance.now();
  const rep = await anthropic().messages.create({
    model: CONFIG.claudeModel,
    max_tokens: CONFIG.maxOutputTokens,
    thinking: { type: 'adaptive' },
    output_config: { effort: CONFIG.claudeEffort },
    system: PROMPT_TRANSCRIPTION,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
          { type: 'text', text: 'Transcris cette diapositive selon les règles.' },
        ],
      },
    ],
  });
  const texte = rep.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return {
    texte,
    usage: {
      input: rep.usage.input_tokens,
      output: rep.usage.output_tokens,
      cache_read: rep.usage.cache_read_input_tokens ?? 0,
    },
    ms: Math.round(performance.now() - t0),
  };
}

// Lecture C : GPT vision (API Responses, adaptée aux modèles gpt-5.x).
export async function lectureC(base64) {
  const t0 = performance.now();
  const rep = await openai().responses.create({
    model: CONFIG.openaiModel,
    reasoning: { effort: CONFIG.openaiReasoningEffort },
    max_output_tokens: CONFIG.maxOutputTokens,
    instructions: PROMPT_TRANSCRIPTION,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Transcris cette diapositive selon les règles.' },
          { type: 'input_image', image_url: `data:image/png;base64,${base64}`, detail: 'high' },
        ],
      },
    ],
  });
  return {
    texte: (rep.output_text || '').trim(),
    usage: {
      input: rep.usage?.input_tokens ?? 0,
      output: rep.usage?.output_tokens ?? 0,
    },
    ms: Math.round(performance.now() - t0),
  };
}
