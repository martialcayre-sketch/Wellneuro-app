// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════════════════
// Wellneuro — Helpers partagés du catalogue de questionnaires
// ═══════════════════════════════════════════════════════════════════════════════
// Jeux d'options standards et fabriques d'items (`q`, `qn`, `qs`) extraits de
// `web/src/lib/questions.ts` (lot 7 — découpage du catalogue par domaine).
// Aucune logique clinique ni scoring ici : uniquement des primitives de
// construction réutilisées par les modules de domaine et par `questions.ts`.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── OPTION SETS STANDARDS ───────────────────────────────────────────────────

export const O_RPS  = [{v:0,l:'Rarement'},{v:1,l:'Parfois'},{v:2,l:'Souvent'}];
export const O_JPT  = [{v:0,l:'Jamais'},{v:1,l:'Parfois / rarement'},{v:2,l:'Régulièrement'},{v:3,l:'Fréquemment'},{v:4,l:'Invalidant'}];
export const O_04   = [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Très souvent'}];
export const O_03jt = [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Régulièrement'},{v:3,l:'Très fréquemment'}];
export const O_YN   = [{v:0,l:'Non'},{v:1,l:'Oui'}];
export const O_UPPS = [{v:1,l:'Tout à fait\nen désaccord'},{v:2,l:'Plutôt en\ndésaccord'},{v:3,l:'Plutôt\nd\'accord'},{v:4,l:'Tout à fait\nd\'accord'}];
export const O_YOUNG= [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'De temps en temps'},{v:3,l:'Régulièrement'},{v:4,l:'Souvent'},{v:5,l:'Toujours'}];
export const O_BMS  = [{v:1,l:'Jamais'},{v:2,l:'Presque jamais'},{v:3,l:'Rarement'},{v:4,l:'Parfois'},{v:5,l:'Souvent'},{v:6,l:'Très souvent'},{v:7,l:'Toujours'}];
export const O_CUNGI= [{v:0,l:'Non pas du tout'},{v:1,l:'Faiblement'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'},{v:5,l:'Extrêmement'}];
export const O_PAS  = [{v:0,l:'Jamais'},{v:1,l:'Presque jamais'},{v:2,l:'Parfois'},{v:3,l:'Assez souvent'},{v:4,l:'Très souvent'}];
export const O_ZARIT= [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Quelques fois'},{v:3,l:'Assez souvent'},{v:4,l:'Presque toujours'}];
export const O_DASS = [{v:0,l:'Ne s’applique pas du tout à moi'},{v:1,l:'S’applique un peu à moi, ou une partie du temps'},{v:2,l:'S’applique beaucoup à moi, ou une bonne partie du temps'},{v:3,l:'S’applique entièrement à moi, ou la grande majorité du temps'}];
export const O_CONNERS = [{v:0,l:'Pas vrai du tout — Jamais ou rarement'},{v:1,l:"Un peu vrai — À l'occasion"},{v:2,l:'Assez vrai — Souvent'},{v:3,l:'Très vrai — Très souvent'}];

// ─── FABRIQUES D'ITEMS ───────────────────────────────────────────────────────
// meta : objet optionnel — ex. {conditionnel:'BR4>=2'} pour items conditionnels
export function q(id, texte, opts, meta)  { const o={id:id,texte:texte,type:'likert',options:opts}; if(meta) Object.assign(o,meta); return o; }
export function qn(id, texte, min, max, step, unit, meta) { const o={id:id,texte:texte,type:'number',min:min,max:max,step:step||1,unit:unit||''}; if(meta) Object.assign(o,meta); return o; }
export function qs(id, texte, opts, meta) { const o={id:id,texte:texte,type:'select',options:opts}; if(meta) Object.assign(o,meta); return o; }
