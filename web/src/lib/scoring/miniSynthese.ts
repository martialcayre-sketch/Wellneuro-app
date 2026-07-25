import type { ScoreInterpretation, ScoreResultBase } from './types';
import { type RubriqueScore, rubriquesDuScore } from './rubriques';

// Entrée : résultat de scoring tel que stocké dans `scoresJson` / exposé via `scoresParsed`.
// Typage défensif : le JSON stocké n'est pas garanti conforme à ScoreResultBase.
type ScoreInput = (Partial<ScoreResultBase> & Record<string, unknown>) | null | undefined;

// Sévérité déduite de la couleur d'interprétation (partagée par tous les questionnaires).
const SEVERITE: Record<string, number> = { danger: 3, warning: 2, success: 1 };

function estPerturbe(interp?: ScoreInterpretation | null): boolean {
  return interp?.color === 'danger' || interp?.color === 'warning';
}

// ─── Rubriques ───────────────────────────────────────────────────────────────
//
// LE SENS D'UNE RUBRIQUE N'EST DÉCLARÉ NULLE PART. Sur le PSQI, une composante
// haute est un mauvais signe ; sur le test des 5 mots, un rappel haut est un bon
// signe ; sur le QIF, « Absentéisme » et « Jours ressentis bien » vont en sens
// contraires dans le même questionnaire. Classer les rubriques par valeur
// reviendrait donc à inventer une direction que le moteur ne donne pas — et à
// écrire « ressort surtout » sur ce qui va le mieux.
//
// Conséquence tenue ici : on ne hiérarchise QUE sur l'interprétation, quand elle
// existe (c'est elle qui porte le sens, via sa couleur). Sinon on énumère dans
// l'ORDRE DE L'INSTRUMENT, qui est le seul ordre dont on soit sûr.

function valeurLisible(r: RubriqueScore): string {
  if (r.binaire) return r.positif ? 'positif' : 'négatif';
  if (r.valeur === null) return 'non calculé';
  return r.max !== null ? `${r.valeur}/${r.max}` : `${r.valeur}`;
}

/**
 * Libellé sans son maximum quand c'est de LÀ qu'on l'a tiré : les rubriques du
 * QIF s'appellent « Absentéisme (/10) », et « Absentéisme (/10) 2.9/10 » dit
 * deux fois la même chose.
 */
function libelleLisible(r: RubriqueScore): string {
  return r.maxOrigine === 'libelle' ? r.label.replace(/\s*\(\s*\/\s*[\d.,]+\s*\)\s*$/, '').trim() : r.label;
}

/** Rubriques perturbées, les plus sévères d'abord. Vide si aucune n'est interprétée. */
function perturbees(rubriques: readonly RubriqueScore[]): RubriqueScore[] {
  return rubriques
    .filter((r) => estPerturbe(r.interpretation) && r.interpretation?.label)
    .sort(
      (a, b) =>
        (SEVERITE[b.interpretation?.color ?? ''] ?? 0) - (SEVERITE[a.interpretation?.color ?? ''] ?? 0),
    );
}

/**
 * Clause de détail par rubrique, à accrocher derrière l'interprétation globale.
 * '' quand le questionnaire n'a qu'un score global, ou une seule rubrique : la
 * répéter n'apprendrait rien.
 */
function clauseRubriques(rubriques: readonly RubriqueScore[], labelGlobal = ''): string {
  if (rubriques.length < 2) return '';

  // Une rubrique dont l'interprétation EST l'interprétation globale ne dit rien
  // de plus : sur l'IDTAS-AE, le score GSS porte le verdict du questionnaire
  // entier, et le répéter derrière lui ne fait que doubler la phrase.
  const global = labelGlobal.trim().toLowerCase();
  const perturb = perturbees(rubriques).filter(
    (r) => r.interpretation!.label.trim().toLowerCase() !== global,
  );
  if (perturb.length > 0) {
    const nommees = perturb
      .slice(0, 3)
      .map((r) => `${libelleLisible(r)} : ${r.interpretation!.label.toLowerCase()}`)
      .join(' ; ');
    return `Rubriques à noter — ${nommees}.`;
  }

  // Aucune interprétation par rubrique exploitable : on énumère sans classer.
  if (rubriques.some((r) => r.binaire)) {
    const positives = rubriques.filter((r) => r.positif).map((r) => libelleLisible(r));
    return positives.length > 0
      ? `Catégories positives : ${positives.join(', ')}.`
      : 'Aucune catégorie positive.';
  }

  const chiffrees = rubriques.filter((r) => r.valeur !== null);
  if (chiffrees.length === 0) return '';
  return `Détail — ${chiffrees.map((r) => `${libelleLisible(r)} ${valeurLisible(r)}`).join(', ')}.`;
}

/**
 * Construit une mini-synthèse déterministe (1 phrase) à partir d'un résultat de scoring déjà
 * calculé. Aucune logique clinique nouvelle : la fonction ne fait que reformuler les
 * interprétations définies dans `questions.ts` / `questionnaires/*`. Retourne '' si aucune
 * matière exploitable.
 */
export function buildMiniSynthese(scores: ScoreInput): string {
  if (!scores || typeof scores !== 'object') return '';

  const rubriques = rubriquesDuScore(scores);

  // 1. Interprétation globale présente (ex. BDI, stress, HIT-6…), suivie du
  //    détail par rubrique quand le questionnaire en a plusieurs. C'est ce
  //    détail qui manquait : PSQI, Berlin, IDTAS-AE, QIF et le test des 5 mots
  //    ont une interprétation globale et s'arrêtaient là, leurs sept
  //    composantes ou leurs deux phases restant invisibles.
  const interp = scores.interpretation as ScoreInterpretation | null | undefined;
  if (interp && typeof interp.label === 'string' && interp.label.trim()) {
    const base = interp.label.trim();
    let phrase: string;
    if (typeof interp.detail === 'string' && interp.detail.trim()) {
      phrase = `${base}. ${interp.detail.trim()}`;
    } else if (typeof interp.protocol === 'string' && interp.protocol.trim()) {
      phrase = `${base} — Orientation : ${interp.protocol.trim()}`;
    } else {
      phrase = base;
    }
    const detail = clauseRubriques(rubriques, base);
    if (!detail) return phrase;
    return /[.!?]$/.test(phrase) ? `${phrase} ${detail}` : `${phrase}. ${detail}`;
  }

  // 2. Pas d'interprétation globale : les rubriques portent seules le propos
  //    (ex. DNSM : Dopamine / Noradrénaline / Sérotonine / Mélatonine).
  if (rubriques.length > 0) {
    const perturb = perturbees(rubriques);
    if (perturb.length > 0) {
      return perturb
        .slice(0, 3)
        .map((r) => `${r.label} : ${r.interpretation!.label.toLowerCase()}`)
        .join(' ; ');
    }
    // Une rubrique interprétée mais non perturbée : le propos existe, il est
    // rassurant. Aucune rubrique interprétée du tout : énumérer plutôt que
    // conclure « peu perturbé » sur des axes qu'on n'a pas su lire.
    if (rubriques.some((r) => r.interpretation)) {
      return 'Tous les axes explorés sont peu perturbés.';
    }
    return clauseRubriques(rubriques);
  }

  return '';
}
