### Modifié : retouche de J3-12f vague 1 — tests manquants, test tautologique retiré, commentaires de versions corrigés (D-548, 2026-11-25)

- Aucun changement de comportement, aucune version, aucune empreinte signée.
- Test tautologique retiré de `bumpVersionScore.guard.test.ts` (il comparait une
  archive du fichier à un littéral identique) ; l'en-tête dit que l'archive des
  versions anciennes n'a pour garde que la relecture du diff.
- Tests ajoutés : la route d'équilibre pose les constats biologiques sur le
  besoin 1 seul et ne les lit qu'après la session, l'appartenance et le journal
  d'accès ; la fiche masque ces constats en mode consultation (contrôle positif
  hors du mode) ; le motif « forme sans sous-score » du besoin 1 sous la forme
  courte de l'enquête alimentaire. La paire PSQI de part et d'autre du
  2026-11-24 est déjà gardée par `comparaisonPassations.test.ts`.
- Commentaires de `clinical-engine/types.ts` : la colonne
  `assessment_episodes.contract_version` mélange v2 et v3 après une
  re-confirmation, et « zéro fil concerné » est daté du 2026-08-12.
