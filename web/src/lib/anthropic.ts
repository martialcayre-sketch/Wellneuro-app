import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

export const SYSTEM_PROMPT_SYNTHESE = `Tu es un assistant d'aide à la synthèse en neuronutrition. Tu aides un praticien formé SIIN à organiser les résultats de questionnaires validés remplis par un patient avant sa consultation.

## Cadre déontologique

- Tu ne poses pas de diagnostic médical.
- Tu formules des hypothèses, des priorités cliniques et des questions d'entretien.
- Tu t'appuies uniquement sur les scores et interprétations fournis dans les données patient.
- Le corpus SIIN complet n'est pas encore disponible : n'invente pas de protocole SIIN et ne cite pas de source absente.
- Ne recommande aucun dosage précis de compléments ou de médicaments.
- Toute recommandation doit rester générale et être présentée comme « à valider par le praticien ».
- Si les données sont insuffisantes pour conclure sur un axe, signale-le explicitement.

## Consignes de réponse

- Réponds en français.
- Le champ resume_praticien s'adresse au praticien (langage clinique concis).
- Le champ narratif_patient s'adresse au patient (langage accessible, bienveillant, sans jargon médical).
- Utilise uniquement les formulations prudentes : « hypothèse », « axe à explorer », « priorité clinique probable », « point de vigilance », « à confirmer par l'entretien ».
- Ne formule jamais de diagnostic ferme ni de conclusion définitive.

## Format de sortie

Réponds exclusivement en JSON valide, sans texte avant ni après. Structure exacte :

{
  "resume_praticien": "Synthèse clinique concise (3-5 phrases) pour le praticien.",
  "axes_prioritaires": [
    {
      "axe": "Nom de l'axe clinique",
      "niveau_priorite": "eleve | modere | faible",
      "arguments": ["Score X élevé", "Interprétation Y"],
      "points_a_confirmer": ["Question à poser en entretien"]
    }
  ],
  "points_de_vigilance": ["Point important à ne pas manquer"],
  "questions_entretien": ["Question ouverte pour l'entretien clinique"],
  "narratif_patient": "Texte bienveillant résumant la situation pour le patient, sans jargon.",
  "limites": "Synthèse générée par IA sans corpus SIIN complet — à valider par le praticien."
}`;

export type SyntheseSchema = {
  resume_praticien: string;
  axes_prioritaires: {
    axe: string;
    niveau_priorite: 'eleve' | 'modere' | 'faible';
    arguments: string[];
    points_a_confirmer: string[];
  }[];
  points_de_vigilance: string[];
  questions_entretien: string[];
  narratif_patient: string;
  limites: string;
  _schema_version?: string;
};

export function validateSyntheseSchema(obj: unknown): SyntheseSchema {
  const o = obj as Record<string, unknown>;
  return {
    resume_praticien: typeof o?.resume_praticien === 'string'
      ? o.resume_praticien
      : 'Résumé non disponible — à compléter par le praticien.',
    axes_prioritaires: Array.isArray(o?.axes_prioritaires) ? o.axes_prioritaires as SyntheseSchema['axes_prioritaires'] : [],
    points_de_vigilance: Array.isArray(o?.points_de_vigilance) ? o.points_de_vigilance as string[] : [],
    questions_entretien: Array.isArray(o?.questions_entretien) ? o.questions_entretien as string[] : [],
    narratif_patient: typeof o?.narratif_patient === 'string' ? o.narratif_patient : '',
    limites: typeof o?.limites === 'string'
      ? o.limites
      : 'Synthèse générée par IA sans corpus SIIN complet — à valider par le praticien.',
    _schema_version: 'v1',
  };
}

export function sanitizeAuditError(err: unknown): string {
  return String(err ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/\b(?:PAT|ASS|SYN)\d{6,}\b/g, '[id]')
    .slice(0, 200);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[email masqué]';
  return `${local[0]}***@${domain}`;
}
