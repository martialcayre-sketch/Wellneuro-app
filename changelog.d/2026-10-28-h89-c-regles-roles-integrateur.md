### H89, PR (c) : les règles et les rôles décrivent le régime de l'intégrateur (D-373 §2, §3 et §7, 2026-10-28)

- `D-290` §1 et `D-287` §2 reçoivent chacun une ligne datée qui renvoie à
  D-373, sans réécrire leur texte : le merge change de porteur pendant
  l'essai, et « un merge à la fois, déploiement constaté » se borne aux lots
  de migration, hors phase 1 de D-374. Aucun numéro nouveau.
- `CLAUDE.md` (§ « PR, CI, merge » et « Début de session »),
  `docs/claude/REGLES_PR_MERGE.md` (« L'intégrateur », « Cycle PR
  complet »), `docs/ROLES_MACHINES.md` (« La copie principale et
  l'intégrateur ») et `.claude/rules/pr-revue-et-release-db.md` (§1.10, §2)
  nomment les gestes d'avant merge : l'étape 7 bis de `wn-merge`
  (déploiement, contrôle sur l'arbre fusionné, registre, chevauchement,
  `main` inchangé), puis la 7 ter (sonde release-db). Ils renvoient au skill
  sans en recopier le détail (point M7 de la revue de la PR (b)).
- La déclaration « prête @<sha> » porte le chemin du handoff et les
  exceptions ; migration, authentification et `.coderabbit.yaml` restent
  mergés par leur file. Une remarque CodeRabbit arrivée après « prête »
  revient à la file.
- L'intégrateur avance la copie principale par `git merge --ff-only`, après
  T1 si le lot touche les crochets ; un refus s'arbitre.
- Texte seul : aucune décision nouvelle, aucun code, aucune migration ;
  `wn-merge` est inchangé (livré par la PR (b), #1756).
