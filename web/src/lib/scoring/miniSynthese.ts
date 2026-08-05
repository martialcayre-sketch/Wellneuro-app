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
 * Libellé sans son maximum, la valeur le portant déjà : les rubriques du QIF
 * s'appellent « Absentéisme (/10) », celles de Tinetti « Équilibre (/16) », et
 * « Équilibre (/16) 16/16 » dit deux fois la même chose. Le dépouillement ne
 * dépend PAS de `maxOrigine` — sur Tinetti le maximum vient du champ ET du
 * libellé, et ne regarder que `libelle` laissait passer le seul instrument où
 * la redondance subsistait.
 */
function libelleLisible(r: RubriqueScore): string {
  return r.label.replace(/\s*\(\s*\/\s*[\d.,]+\s*\)\s*$/, '').trim() || r.label;
}

/**
 * Minuscule initiale pour enchaîner « Axe : interprétation », SAUF quand le
 * libellé s'ouvre sur une lettre isolée : le TFD SIIN grade ses sous-échelles
 * A / B / C, et « b — troubles fonctionnels modérés » n'est pas un grade
 * clinique, c'est une coquille.
 */
function enMinusculeInitiale(label: string): string {
  if (/^\p{Lu}(?:\P{L}|$)/u.test(label)) return label;
  return label.charAt(0).toLowerCase() + label.slice(1);
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
  const contientNonCalcule = rubriques.some((r) => !r.binaire && r.valeur === null);
  if (contientNonCalcule) {
    return `Détail — ${rubriques.map((r) => `${libelleLisible(r)} ${valeurLisible(r)}`).join(', ')}.`;
  }

  // Une rubrique dont l'interprétation EST l'interprétation globale ne dit rien
  // de plus : sur l'IDTAS-AE, le score GSS porte le verdict du questionnaire
  // entier, et le répéter derrière lui ne fait que doubler la phrase.
  //
  // MAIS DÉDUPLIQUER NE DOIT JAMAIS PROMOUVOIR. Une revue adversariale a
  // reproduit le cas sur le TFD SIIN : quatre sous-échelles en « C — troubles
  // fonctionnels majeurs » (le verdict global) et une en « B ». Le filtre
  // retirait les quatre, et « Rubriques à noter » nommait la SEULE qui n'était
  // pas majeure. Même motif sur l'inventaire de plaintes, et jusque dans le
  // prompt de la synthèse IA.
  //
  // Dès qu'une rubrique perturbée porte le verdict global, on ne hiérarchise
  // plus du tout : on énumère. Le tri ne connaît que la couleur, et `danger`
  // couvre plusieurs bandes sur ces instruments — il n'a pas de quoi classer.
  const global = labelGlobal.trim().toLowerCase();
  const perturb = perturbees(rubriques);
  const porteLeVerdictGlobal = perturb.some(
    (r) => r.interpretation!.label.trim().toLowerCase() === global,
  );
  if (perturb.length > 0 && !porteLeVerdictGlobal) {
    const nommees = perturb
      .slice(0, 3)
      .map((r) => `${libelleLisible(r)} : ${enMinusculeInitiale(r.interpretation!.label)}`)
      .join(' ; ');
    return `Rubriques à noter — ${nommees}.`;
  }

  // Pas de hiérarchie possible : on énumère sans classer.
  if (rubriques.some((r) => r.binaire)) {
    const positives = rubriques.filter((r) => r.positif).map((r) => libelleLisible(r));
    return positives.length > 0
      ? `Catégories positives : ${positives.join(', ')}.`
      : 'Aucune catégorie positive.';
  }

  // Une rubrique que le moteur n'a pas su calculer RESTE dans l'énumération,
  // marquée « non calculé ». La retirer laissait lire un détail qu'on croyait
  // exhaustif — six domaines sur sept, sans le moindre signal.
  return `Détail — ${rubriques.map((r) => `${libelleLisible(r)} ${valeurLisible(r)}`).join(', ')}.`;
}

/**
 * Construit une mini-synthèse déterministe (1 phrase) à partir d'un résultat de scoring déjà
 * calculé. Aucune logique clinique nouvelle : la fonction ne fait que reformuler les
 * interprétations définies dans `questions.ts` / `questionnaires/*`. Retourne '' si aucune
 * matière exploitable.
 */
export function buildMiniSynthese(scores: ScoreInput): string {
  if (!scores || typeof scores !== 'object') return '';
  const conduite =
    typeof scores.conduite === 'string' && scores.conduite.trim() ? scores.conduite.trim() : '';

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
    } else if (conduite) {
      phrase = `${base} — Orientation : ${conduite}`;
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
    const contientNonCalcule = rubriques.some((r) => !r.binaire && r.valeur === null);
    if (contientNonCalcule) {
      return clauseRubriques(rubriques);
    }
    const perturb = perturbees(rubriques);
    if (perturb.length > 0) {
      return perturb
        .slice(0, 3)
        .map((r) => `${libelleLisible(r)} : ${enMinusculeInitiale(r.interpretation!.label)}`)
        .join(' ; ');
    }
    // Une rubrique interprétée mais non perturbée : le propos existe, il est
    // rassurant. Une seule rubrique non interprétée : énumérer plutôt que
    // conclure « peu perturbé » sur un axe qu'on n'a pas su lire.
    //
    // `every` et non `some`, corrigé le 2026-08-04. Le commentaire ci-dessus
    // décrivait déjà la bonne règle ; le code implémentait la faible, et la
    // phrase dit « TOUS les axes explorés » — elle généralise donc à des axes
    // dont l'un au moins n'a aucune bande. Inoffensif tant que les seuls axes
    // sans bande étaient des trous de grille ; la garde de recueil partiel du
    // TFD rend le cas systématique, un axe partiel gardant son total et perdant
    // son étiquette. Mesuré sur `Q_GAS_01` : quatre axes complets à 0 plus un
    // `C5` renseigné à un item sur cinq, coté au MAXIMUM (« crampes
    // intestinales douloureuses — très fréquemment »), produisaient « Tous les
    // axes explorés sont peu perturbés » et effaçaient les cinq totaux.
    //
    // Le repli `clauseRubriques` énumère : il ne peut qu'en dire PLUS, jamais
    // rassurer davantage.
    if (rubriques.every((r) => r.interpretation)) {
      return 'Tous les axes explorés sont peu perturbés.';
    }
    return clauseRubriques(rubriques);
  }

  return '';
}
