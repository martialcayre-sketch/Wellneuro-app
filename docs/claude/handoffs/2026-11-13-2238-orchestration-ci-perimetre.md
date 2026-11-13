# Handoff — 2026-11-13 — Orchestration (2) : périmètre du CI, documentation lue par le code, plafonds de durée

## Branche et état Git

- Branche `chore/ci-allegement`, dans le worktree `.claude/worktrees/orch-ci`, partie de `origin/main` puis avancée
  deux fois en avance rapide (d7dd3b50, puis 904caeed) avant le premier commit, branche encore vide.
- Session concurrente « Orchestration » : `git` et `gh` en direct. La PR se déclare « prête » ; l'intégrateur merge.
- Lot du carnet `orchestration-2` (D-510), file D, ordre 41.

## Objectif

Consigne du responsable du 2026-11-13 : alléger le CI au maximum en toute sécurité, rester public pour l'instant.
Mesures préalables (30 jours) : environ 53 000 minutes par mois. Sur les 300 dernières PR mergées : 158 applicatives,
139 purement documentaires, 3 d'outillage seul.

## Décisions prises

- Aucune D-xxx : le lot ne retire aucun contrôle exigé ni par `verify` ni par une décision. `controles`, `verify` et la
  protection de branche sont inchangés.
- La mesure a trouvé un trou, fermé en priorité sur l'allègement : 57 des 300 dernières PR touchaient une documentation
  que le code lit (décisions, propositions de textes patients, corpus, supports de campagne) en jouant zéro test. Elles
  jouent désormais `typage-tests` (sortie `unitaires`), sans build ni E2E.
- Allègement retenu, seul jugé sûr : une PR qui ne touche que `scripts/`, `.claude/`, `changelog.d/` et de la
  documentation non lue saute `typage-tests` et `e2e` ; `controles` joue toujours leurs bancs.
  `scripts/wn-playwright-apt.mjs`, exécuté par `e2e`, reste du code.
- Plafonds de durée par job (25, 25, 40, 5 min), sur des durées mesurées de 7, 8, 14 et 0,1 min.
- Écartés, car ils retirent de la couverture : E2E retiré du push de `main` (amenderait D-248), WebKit hors des PR,
  sonde de déploiement ralentie (recul détecté plus tard). Le cron de la sonde reste à quinze minutes.
- Le passage en privé est différé par le responsable ; la licence open source est à évaluer (lot à part).

## Fichiers modifiés

- `.github/workflows/ci.yml` : deux sorties neuves du périmètre (`unitaires`, `e2e`), conditions de `typage-tests` et
  `e2e` rebranchées, `timeout-minutes` sur les quatre jobs, deux commentaires mis à jour.
- `scripts/ci-invariants.test.mjs` : invariant du cache Next rebranché sur `e2e` ; deux cas neufs (le bloc du périmètre
  exécuté sur quinze diffs fabriqués ; chaque job suit sa sortie et porte un plafond).
- `changelog.d/2026-11-13-ci-perimetre-documentation-lue.md` ; ce handoff.

## Validations exécutées

- `node --test scripts/ci-invariants.test.mjs scripts/parite-check-ci.test.mjs` : 67/67, code 0. Le premier essai a
  rougi sur une erreur du banc neuf (motif sans chiffres, « e2e » lu « e ») ; corrigé.
- `ci.yml` analysé par `js-yaml` : quatre jobs, plafonds présents, `controles` sur `docs_only`, `typage-tests` sur
  `unitaires`, `e2e` sur `e2e`.
- `npm run check` (T1 complet), avant la seconde avance rapide : code 0 — 906 tests, 905 passés, 0 échec, 1 sauté ;
  anti-secrets propre. Rejoué après elle : voir la PR.
- Simulation de la nouvelle règle sur les 300 dernières PR mergées : 158 inchangées, 57 gagnent leurs tests unitaires,
  82 restent légères, 3 deviennent légères.
- T2 non joué : ni UI ni API touchées.

## Problèmes ouverts

- Bilan en minutes proche de zéro, voire légèrement positif : aucun allègement sûr ne change l'ordre de grandeur. La
  question du passage en privé reste ouverte côté coût (serveur CI dédié ou dépassement payé).
- La liste des documentations lues par le code est écrite à la main dans le périmètre. Un test qui se mettrait à lire un
  autre dossier de `docs/` ne serait pas rattrapé : la lister par recherche automatique serait un lot à part.
- L'E2E ne joue pas sur une PR de décisions seule ; la route praticien qui lit les décisions n'y est couverte que par
  ses gardes unitaires.
- Le comportement réel sur GitHub ne se constate qu'au CI de cette PR (diff à `ci.yml` : périmètre « code », tout joue).

## Prochaine action exacte

1. Ouvrir la PR, attendre `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond, puis
   `node scripts/wn-revue-pr-agent.mjs <N>`. Lot P1 (orchestration CI) : passer aussi `wn-reviewer`, mission « la PR
   retire-t-elle une couverture ? ».
2. Relire la boîte `orchestration` et la ligne `orchestration-2`, puis déclarer « prête @<sha> ».
3. Constater sur la première PR de décisions seule mergée après ce lot que `typage-tests` y a tourné.

## Interdits encore actifs

- Ne pas merger depuis la session : l'intégrateur merge (D-373, D-454).
- Ne retirer aucun contrôle exigé par `verify`, ne pas toucher la protection de branche ni `controles` dans ce lot.
- Ne pas basculer le dépôt en privé : décision différée par le responsable.
