# Handoff — 2026-11-06 — File D, d58 et d61 : les questions de D-443 tranchées (D-450), fiche H98 du lot de graduation

## Branche et état du dépôt

- Branche `docs/plan-d443-graduation-arbitrages`, depuis `origin/main` (avancée en `--ff-only` pendant la session).
- Worktree `.claude/worktrees/plan-d443-lot-code` : session concurrente, cycle en `git`/`gh` direct.
- PR de documentation et de décision : `docs/decisions/D-450.md` (neuve), paragraphe d'amendement daté sous `docs/decisions/D-443.md`, `docs/claude/PLAN_WELLNEURO.md`, trois fragments de journal (H95, H96, H97), un fragment `changelog.d/`, ce handoff. Aucun code, aucun `schema.prisma`, aucune table signée, aucun texte de consigne.
- **Pas de release-db attendue** : aucun chemin déclencheur touché.
- Essai `D-373` : la PR est déclarée « prête @<sha> », l'intégrateur la merge.

## Objectif

Débloquer le lot de code de D-443. La production a été relue en agrégats (préalable Q5). Les quatre questions de D-443 §8 et la question `20261106-1200-d` ont été présentées au responsable, puis consignées. D-443 est amendée, et le lot a reçu une fiche et un rang.

## Décisions prises

- Le responsable a tranché le 2026-11-06, et chaque réponse est consignée dans la liste commune de « Suivi de la file D » :
  - `0200-d` : l'anamnèse reste une famille distincte ;
  - `0202-d` : option C, après un audit (page privée `RjuPEZT7zEH7y6EWw9VN2n`, v3) et un avis Codex qui retenait A. Une condition atteinte compte sur un axe où une règle a déclenché. Précision : une règle dont la source ne compte pas (`R2-ALI-01`) ouvre l'axe ;
  - `0203-d` : la convergence entre dans la synthèse dès le lot de graduation ;
  - `1200-d` : le contexte de lecture est celui de BP-05.
- `0201-d` a été **reposée** le même jour. La première présentation décrivait mal `R-SOM-01` (c'est le PSQI) et donnait `needIds` pour le besoin du signal. Or `needIds` désigne le besoin que l'exploration vise. Réponse retenue : un rattachement propre de chaque condition au besoin qu'elle mesure, à poser par une décision avant le lot.
- D-450 consigne ces réponses et amende D-443 §1, §7 et §8 ; elle n'apporte aucune valeur nouvelle. Le tableau de son §5 est donné comme provisoire, puisqu'il est compté par `needIds`.
- Plan :
  - H98 neuve, au rang 4 [Hypothese] ;
  - H95 : la part A ne garde que les besoins, la part B passe au rang 6 sans migration ;
  - H96 et H97 passent au rang 7 ;
  - D/45, §5 et §10 sont mis à jour.

## Fichiers modifiés

- `docs/decisions/D-450.md`, `docs/decisions/D-443.md` (paragraphe d'amendement daté).
- `docs/claude/PLAN_WELLNEURO.md` : tableaux des rangs 4 à 7, fiches H98 (neuve), H95, H96 et H97 (Rang, et pour H95 Portes, Migration, Décisions, Critère), D/45, ordre des release-db du §5, §10.
- `docs/claude/plan-journal/H95/2026-11-06-01-…`, `H96/2026-11-06-01-…`, `H97/2026-11-06-01-…`.
- `changelog.d/2026-11-06-d450-convergence-anamnese-grain-synthese.md`, ce handoff.

## Validations exécutées

- Production lue depuis quatre conteneurs `scalingo run -d`, en lecture seule, avec le code déployé : 34 dossiers, agrégats masqués sous cinq, aucun identifiant. Les deux passages de la première lecture donnent des comptes identiques. Scripts et sorties : dossier privé `/private/tmp/wellneuro-revues/audit-orientation-d58/` (hors dépôt).
- Contre-lecture externe (Codex, `AVIS-CODEX-GRAIN.md`, privé) : deux erreurs de l'audit corrigées, l'une dans la page, l'autre dans D-450 §3.
- `wn-plan-fiche` lit H95 et H98. Pour T1 rapide, T1 complet, CI et revue : voir la PR.

## Problèmes ouverts

- **La D-xxx de rattachement** (D-450 §2) : chaque condition déclencheuse doit être rattachée au besoin qu'elle mesure, dictée par le responsable sous provenance. `BESOIN_SOURCES` ne couvre ni `Q_MOD_01/SOMMEIL`, ni `Q_MOD_03`, ni `Q_INF_03`, ni les drapeaux. Cette décision relit l'ouverture d'axe par `R2-ALI-01`, puis les distributions se recalculent.
- Deux lecteurs des constats, nommés par Codex et non constatés : la projection du cockpit, qui omet la graduation, et le chargeur des préconditions T0. Ils sont à vérifier par le lot H98.
- Le décompte du §0 n'est pas recompté (H93 à H98).
- La biologie reste hors de la convergence (D-443 §4), et les dossiers de preuve en cours ne changent aucune des réponses du jour. Deux points sont toutefois à tenir :
  - le rattachement doit s'écrire après inventaire des vocabulaires d'axe existants (packs `axeId`, politique de conflit de D-103, F53, F79) ;
  - la clause de consigne de H98 doit laisser sa place au bloc de biologie de H95 part B.
- Si la biologie entre un jour dans la convergence, une décision propre devra dire comment une source sans règle d'orientation ouvre un axe ou y compte (D-450 §3 suppose une règle déclenchée).

## Prochaine action exacte

1. CI (`node scripts/wn-attendre-ci.mjs <N>`, code 0), revue PR-Agent sur la tête, trois sorties lues, puis « prête @<sha> ».
2. Lignes d58 et d61 de « Suivi de la file D ».
3. Suite d58 : préparer la D-xxx de rattachement (proposition par condition, avec sa provenance, que le responsable dicte), puis le lot H98.

## Interdits encore actifs

- Pas de merge par cette session (essai D-373). Pas de pull, merge ou rebase sans arbitrage.
- Ne pas reposer les arbitrages d58 (2026-11-04, 2026-11-05, 2026-11-06) ni les huit de d61.
- Aucune valeur, aucun seuil, aucun rattachement proposé au dépôt public sans la main du responsable (forme opaque, D-251 §4).
- Production en lecture seule, par conteneur.
