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
    // `conduite` d'abord (format courant), `interpretation.protocol` ensuite :
    // les réponses enregistrées avant le 2026-07-26 portent l'ancienne forme et
    // doivent continuer de s'afficher à l'identique. Sans ce repli, la fiche
    // perdrait l'orientation sur les passations déjà en base.
    const conduite = typeof scores.conduite === 'string' && scores.conduite.trim()
      ? scores.conduite.trim()
      : typeof interp.protocol === 'string' && interp.protocol.trim()
        ? interp.protocol.trim()
        : '';
    if (conduite) {
      return `${base} — Orientation : ${conduite}`;
    }
    return base;
  }

  // 2. Multi-axes (ex. DNSM : Dopamine / Noradrénaline / Sérotonine / Mélatonine)
  if (Array.isArray(scores.subScores) && scores.subScores.length > 0) {
    const axes = scores.subScores as ScoreSubScore[];
    const perturbes = axes
      .filter(a => estPerturbe(a.interpretation) && a.interpretation?.label)
      .sort((a, b) => (SEVERITE[b.interpretation?.color ?? ''] ?? 0) - (SEVERITE[a.interpretation?.color ?? ''] ?? 0));

    // ÉCHELLES ORIENTÉES (EORTC) — aucune ne porte de bande, et le manuel n'en
    // définit aucune. Sans ce cas, l'inbox praticien restait VIDE sur un
    // questionnaire complet : ni score principal, ni bande, ni synthèse. Le
    // résumé ci-dessous est strictement FACTUEL — il nomme les deux extrêmes
    // avec leur sens, et n'invente aucun verdict là où la source n'en donne pas.
    const orientees = axes.filter(a => a.sens && typeof a.total === 'number');
    if (perturbes.length === 0 && orientees.length > 0) {
      const symptomes = orientees
        .filter(a => a.sens === 'symptome')
        .sort((a, b) => (b.total as number) - (a.total as number));
      const fonctions = orientees
        .filter(a => a.sens !== 'symptome')
        .sort((a, b) => (a.total as number) - (b.total as number));
      const bouts: string[] = [];
      if (symptomes[0] && (symptomes[0].total as number) > 0) {
        bouts.push(`symptôme le plus marqué — ${symptomes[0].label.toLowerCase()} ${symptomes[0].total}/100`);
      }
      if (fonctions[0]) {
        bouts.push(`fonctionnement le plus bas — ${fonctions[0].label.toLowerCase()} ${fonctions[0].total}/100`);
      }
      return bouts.length
        ? `${orientees.length} échelles 0-100 : ${bouts.join(' ; ')}.`
        : '';
    }

    if (perturbes.length === 0) {
      // Une absence de bande n'est PAS une bande basse.
      //
      // Depuis que le moteur ne replie plus sur la dernière bande (2026-07-29),
      // un score hors grille arrive ici sans interprétation — et cette phrase
      // affirmait alors « peu perturbés » sur des axes dont rien n'a été
      // constaté. Elle part dans la fiche praticien ET dans le prompt de
      // synthèse : ce serait la même faute que le repli, retournée en
      // réassurance. Il faut donc qu'au moins un axe porte une bande pour que
      // « tous » veuille dire quelque chose.
      const auMoinsUneBande = axes.some(a => a.interpretation?.label);
      return auMoinsUneBande ? 'Tous les axes explorés sont peu perturbés.' : '';
    }
    return perturbes
      .slice(0, 3)
      .map(a => `${a.label} : ${a.interpretation!.label.toLowerCase()}`)
      .join(' ; ');
  }

  return '';
}
