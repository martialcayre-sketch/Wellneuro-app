// Configuration du banc qualité d'extraction du corpus WellNeuro.
// Aucune valeur secrète ici : les clés sont lues depuis l'environnement
// (ANTHROPIC_API_KEY, OPENAI_API_KEY), chargées via `node --env-file`.

import os from 'node:os';
import path from 'node:path';

const home = os.homedir();

export const CONFIG = {
  // Répertoire des PDF échantillons (hors dépôt, non versionné).
  pdfDir: path.join(home, '.wellneuro', 'corpus-bench', 'pdf'),

  // Sorties du banc (hors dépôt).
  outDir: path.join(home, '.wellneuro', 'corpus-bench', 'out'),

  // Les 3 PDF de l'échantillon réel (cf. BENCH_COUTS_EXTRACTION_CORPUS.md).
  pdfs: [
    { id: 'acides-gras', file: 'acides-gras.pdf', titre: '21 Les acides gras et les lipides' },
    { id: 'melatonine', file: 'melatonine.pdf', titre: '7 La mélatonine' },
    { id: 'ingredients-1a', file: 'ingredients-1a.pdf', titre: '1 Les ingrédients fonctionnels 1A' },
  ],

  // Rendu image : 1536 px sur le grand côté (hypothèse de la note de coûts).
  renderLongEdge: 1536,

  // Modèles de lecture croisée (scénario 2 : Sonnet 5 + GPT-5.4).
  claudeModel: process.env.WN_BENCH_CLAUDE_MODEL || 'claude-sonnet-5',
  openaiModel: process.env.WN_BENCH_OPENAI_MODEL || 'gpt-5.4',

  // Effort/raisonnement bas : transcription, pas de raisonnement lourd.
  claudeEffort: 'low',
  openaiReasoningEffort: 'low',

  maxOutputTokens: 4096,
};

// Unités à risque clinique — un écart de dosage est le risque n°1.
// La couche texte (lecture A) est la vérité des nombres ; chaque nombre+unité
// détecté doit survivre à l'identique dans les lectures B et C.
export const UNITES_DOSAGE = [
  'mg', 'µg', 'mcg', 'g', 'kg', 'ng',
  'ml', 'cl', 'dl', 'l',
  'kcal', 'cal', 'kj',
  'ui', 'iu',
  'mmol', 'µmol', 'nmol', 'mol',
  '%',
];

export const PROMPT_TRANSCRIPTION = `Tu transcris fidèlement une diapositive d'un cours de neuronutrition, en Markdown français.

Règles strictes :
- Transcris TOUT le texte visible, dans l'ordre de lecture, sans rien résumer ni paraphraser.
- Reproduis chaque nombre et chaque unité EXACTEMENT tels qu'affichés (ex. « 1,5 g », « 100 mg », « 30 % ») — un dosage faux est une faute grave.
- Restitue les tableaux en Markdown ; conserve toutes les cellules.
- Pour une figure/schéma non transcriptible en texte, écris « [FIGURE — non transcrite] » sans l'inventer.
- N'ajoute aucun commentaire, titre, ou méta-texte : uniquement le contenu de la diapositive.`;
