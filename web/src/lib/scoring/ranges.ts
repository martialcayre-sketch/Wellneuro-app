import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';

export type ScoreRange = { min: number; max: number; label: string; color?: string };

type SubscaleInterpretation = { subscale?: string; ranges?: ScoreRange[] };

/**
 * Bornes d'interprétation des sous-scores d'un questionnaire, lues depuis le
 * catalogue (`lib/questions.ts`) — jamais ré-encodées ici (A5-R1, CHANGELOG
 * « scoring et seuils inchangés »). Usage serveur uniquement : le catalogue
 * complet ne doit pas entrer dans un bundle client (il n'est aujourd'hui
 * importé que par les routes API).
 * Retourne null si le questionnaire n'expose pas de bornes par sous-score.
 */
export function getSubScoreRanges(
  idQuestionnaire: string | null | undefined
): Record<string, ScoreRange[]> | null {
  if (!idQuestionnaire) return null;
  const q = (QUESTIONNAIRE_CATALOGUE as Record<string, { scoring?: unknown }>)[idQuestionnaire];
  const sc = q?.scoring as
    | { type?: string; interpretation?: unknown; domains?: { id?: string }[] }
    | undefined;
  if (!sc || !Array.isArray(sc.interpretation) || sc.interpretation.length === 0) return null;

  // Scoring de type « subscore » : interpretation = [{ subscale, ranges }]
  const first = sc.interpretation[0] as SubscaleInterpretation;
  if (first && typeof first === 'object' && 'subscale' in first) {
    const out: Record<string, ScoreRange[]> = {};
    for (const entry of sc.interpretation as SubscaleInterpretation[]) {
      if (entry?.subscale && Array.isArray(entry.ranges)) out[entry.subscale] = entry.ranges;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  // Scoring « plaintes_actuelles » : bornes communes à tous les domaines (/10)
  if (sc.type === 'plaintes_actuelles' && Array.isArray(sc.domains)) {
    const communes = sc.interpretation as ScoreRange[];
    const out: Record<string, ScoreRange[]> = {};
    for (const d of sc.domains) {
      if (d?.id) out[d.id] = communes;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  return null;
}
