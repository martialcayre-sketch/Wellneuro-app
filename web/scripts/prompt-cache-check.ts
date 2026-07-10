import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import {
  CLAUDE_MODEL,
  CORPUS_CLINIQUE_ACTIF,
  SYSTEM_PROMPT_SYNTHESE,
  VERSION_CORPUS_SYNTHESE,
  VERSION_PROMPT_SYNTHESE,
  VERSION_SCHEMA_SYNTHESE,
} from '@/lib/anthropic';
import { CORPUS_CLINIQUE_METADATA, CORPUS_CLINIQUE_SHA256 } from '@/lib/clinical/corpusSyntheseV1';

type CountResult = { input_tokens: number };

const MIN_CACHE_TOKENS_BY_MODEL: Record<string, number> = {
  'claude-sonnet-4-6': 1024,
};

function seuilModele(model: string): number | null {
  return MIN_CACHE_TOKENS_BY_MODEL[model] ?? null;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[prompt-cache-check] ANTHROPIC_API_KEY absente.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const model = CLAUDE_MODEL;

  const minimalMessage = [{ role: 'user' as const, content: 'Validation technique du préfixe stable.' }];

  const total = (await client.messages.countTokens({
    model,
    system: [{ type: 'text', text: SYSTEM_PROMPT_SYNTHESE, cache_control: { type: 'ephemeral' } }],
    messages: minimalMessage,
  })) as CountResult;

  const variableOnly = (await client.messages.countTokens({
    model,
    messages: minimalMessage,
  })) as CountResult;

  const prefixeStable = Math.max(0, total.input_tokens - variableOnly.input_tokens);
  const seuil = seuilModele(model);
  const okSeuil = typeof seuil === 'number' ? prefixeStable >= seuil : null;

  const report = {
    model,
    versionPrompt: VERSION_PROMPT_SYNTHESE,
    versionSchema: VERSION_SCHEMA_SYNTHESE,
    versionCorpus: VERSION_CORPUS_SYNTHESE,
    corpusSha256: CORPUS_CLINIQUE_SHA256,
    corpusActif: CORPUS_CLINIQUE_ACTIF,
    corpusValidationExterne: CORPUS_CLINIQUE_METADATA.validationExterne,
    corpusDateValidation: CORPUS_CLINIQUE_METADATA.dateValidation,
    stablePrefixTokens: prefixeStable,
    cacheThreshold: seuil,
    thresholdKnownForModel: typeof seuil === 'number',
    thresholdSatisfied: okSeuil,
    cacheControlConfiguredInRuntime: fs
      .readFileSync(path.join(process.cwd(), 'src/app/api/praticien/synthese/route.ts'), 'utf8')
      .includes('cache_control: { type: \'ephemeral\' }'),
  };

  console.log(JSON.stringify(report, null, 2));

  if (okSeuil === false) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error('[prompt-cache-check] Erreur:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
