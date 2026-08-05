// Drapeau de l'agenda alimentaire 21 jours (Q_ALI_09).
//
// Fail-closed : seule la chaîne exacte « true » active. Une variable absente,
// vide, « 1 » ou « TRUE » laisse l'instrument fermé — même doctrine que
// WN_AGENDA_RELANCE / WN_C4_ENABLED / WN_CB_ENABLED.
//
// Le paramètre par défaut est délibéré : c'est lui qui rend le drapeau testable
// sans toucher à `process.env`.
//
// ── CE QU'IL PILOTE ─────────────────────────────────────────────────────────
// Le champ `actif` de l'entrée `Q_ALI_09` de `questionnaires-catalog.ts`, et
// rien d'autre. `IDS_SUSPENDUS` en étant DÉRIVÉ, éteindre ce drapeau ferme d'un
// seul geste les DEUX surfaces : la route d'assignation (via `IDS_SUSPENDUS`)
// et la bibliothèque praticien (via `IDS_ASSIGNABLES` / `listeBibliotheque`).
// « Invisible et assignable » est la pire des combinaisons, et c'est celle
// qu'un retrait de l'écran seul produit — cf. le commentaire de Q_GEO_04 dans
// `questionnaires-catalog.ts`.
//
// ── CE QU'IL N'EST PAS ──────────────────────────────────────────────────────
// Ce n'est PAS un drapeau de FORME, contrairement à `WN_ALI_01_SIIN57` qui
// choisit entre deux définitions complètes du même instrument. Ici il n'y a pas
// de forme B : l'instrument est présent ou absent. Ne pas l'ajouter à
// `DRAPEAUX_DE_FORME` du banc `certify` (tools/corpus/certify/lib/servi.mjs) —
// ce banc compare un servi à sa source, et il n'y a rien à comparer entre une
// forme et son absence.
//
// ── L'ANGLE MORT QU'IL CRÉE, ET SA CONTREPARTIE ─────────────────────────────
// `extraireIdsSuspendus` (scripts/lib/verifier_registre_instruments.js) parse le
// TEXTE SOURCE du catalogue à la recherche du littéral `actif: false`. Un appel
// de fonction lui est invisible : Q_ALI_09 n'entre donc dans `idsSuspendus`
// d'aucune des deux positions du drapeau, et la règle « actif: false ⟹
// statutCertification terminal » ne s'y applique jamais. Ce n'est pas un échec
// CI, c'est un silence — la classe de défaut exacte contre laquelle ce garde est
// écrit. La contrepartie est `agendaAlimentaireDrapeau.guard.test.ts`, qui
// épingle ce que l'extracteur statique ne voit plus, dans les deux positions.
export function isAgendaAlimentaireEnabled(value = process.env.WN_AGENDA_ALI): boolean {
  return value === 'true';
}
