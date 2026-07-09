import type { ScoreInterpretation, ScoreResultBase, ScoreSubScore } from './types';

// Entrée : résultat de scoring tel que stocké dans `scoresJson` / exposé via `scoresParsed`.
// Typage défensif : le JSON stocké n'est pas garanti conforme à ScoreResultBase.
type ScoreInput = (Partial<ScoreResultBase> & Record<string, unknown>) | null | undefined;

// Sévérité déduite de la couleur d'interprétation (partagée par tous les questionnaires).
const SEVERITE: Record<string, number> = { danger: 3, warning: 2, success: 1 };

function estPerturbe(interp?: ScoreInterpretation | null): boolean {
  return interp?.color === 'danger' || interp?.color === 'warning';
}

/**
 * Construit une mini-synthèse déterministe (1 phrase) à partir d'un résultat de scoring déjà
 * calculé. Aucune logique clinique nouvelle : la fonction ne fait que reformuler les
 * interprétations définies dans `questions.ts` / `questionnaires/*`. Retourne '' si aucune
 * matière exploitable.
 */
export function buildMiniSynthese(scores: ScoreInput): string {
  if (!scores || typeof scores !== 'object') return '';

  // 1. Interprétation globale présente (ex. BDI, stress, HIT-6…)
  const interp = scores.interpretation as ScoreInterpretation | null | undefined;
  if (interp && typeof interp.label === 'string' && interp.label.trim()) {
    const base = interp.label.trim();
    if (typeof interp.detail === 'string' && interp.detail.trim()) {
      return `${base}. ${interp.detail.trim()}`;
    }
    if (typeof interp.protocol === 'string' && interp.protocol.trim()) {
      return `${base} — Orientation : ${interp.protocol.trim()}`;
    }
    return base;
  }

  // 2. Multi-axes (ex. DNSM : Dopamine / Noradrénaline / Sérotonine / Mélatonine)
  if (Array.isArray(scores.subScores) && scores.subScores.length > 0) {
    const axes = scores.subScores as ScoreSubScore[];
    const perturbes = axes
      .filter(a => estPerturbe(a.interpretation) && a.interpretation?.label)
      .sort((a, b) => (SEVERITE[b.interpretation?.color ?? ''] ?? 0) - (SEVERITE[a.interpretation?.color ?? ''] ?? 0));

    if (perturbes.length === 0) {
      return 'Tous les axes explorés sont peu perturbés.';
    }
    return perturbes
      .slice(0, 3)
      .map(a => `${a.label} : ${a.interpretation!.label.toLowerCase()}`)
      .join(' ; ');
  }

  return '';
}
