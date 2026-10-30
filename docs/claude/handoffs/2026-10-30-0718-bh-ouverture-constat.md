# Handoff — bh : ouverture de l'imprimable constatée (H69)

## Branche et état Git

- Worktree `act5-mineurs`, branche `docs/bh-ouverture-constat`, PR #1779.
  Session concurrente : cycle en `git`/`gh` direct, l'intégrateur merge
  ([[D-373]]).
- `origin/main` fusionné le 2026-10-30 : conflit sur `docs/FEATURE_FLAGS.md`.
  La ligne bh vient de la branche, et la ligne `WN_PORTAIL_BIBLIOTHEQUE` de
  main (#1784). On a vérifié avant de résoudre que chaque côté n'avait
  touché que sa propre ligne.
- PR renvoyée par l'intégrateur le 2026-10-29 : il manquait un handoff créé
  par la PR. C'est ce fichier.

## Objectif

Consigner l'ouverture de `WN_PORTAIL_PROTOCOLE_IMPRIMABLE` et son constat
sur un vrai dossier, puis clore H69.

## Décisions prises

- Hors porte 18, par arbitrage du responsable du 2026-10-29 : bh n'a pas
  de rang dans la file C ([[D-392]] §5). La réserve de
  `WN_PORTAIL_APPUI_RENVOI` reste entière.
- Le constat a été fait sur un dossier de test majeur ([[D-075]]). On l'a
  choisi par lecture en conteneur, parce que le détail de sa version servie
  était déjà ouvert. Le responsable l'a observé au portail.
- Remarque de revue écartée avec motif : « dossier fictif ». Les dossiers
  de test sont réels ([[D-075]]).
- L'en-tête et le pied que le navigateur ajoute impriment l'adresse de la
  page. C'est un réglage du navigateur, hors de l'application.

## Fichiers modifiés

- `docs/FEATURE_FLAGS.md` (ligne `WN_PORTAIL_PROTOCOLE_IMPRIMABLE`) ;
- `docs/claude/plan-journal/H69/2026-10-29-01-ouverture-constatee.md`.

## Validations exécutées

- Merge 46798be1 contenu dans le déploiement en service a4bb77ee, avant la
  pose du drapeau.
- Drapeau posé par le responsable, valeur relue à `true`. Après le
  redémarrage, les deux conteneurs web et le worker sont `running`, et la
  route répond 401 sans session.
- Constat au portail :
  - lien à l'accueil ;
  - page identique au détail : trois plans, critère, encart ;
  - pied daté ;
  - numéros d'urgence imprimés ;
  - ni « Jour difficile ? » ni bouton à l'impression ;
  - aucune anomalie.
- T1 rejoué après la fusion de main. Le CI et la revue de bot sont attendus
  sur la nouvelle tête.

## Problèmes ouverts

- Aucun pour bh.
- File C : le constat de la place 7 se fait dans la fenêtre du 1er au
  7 novembre. La bibliothèque (place 10) s'active ensuite, sur l'accord du
  responsable (#1784).

## Prochaine action exacte

CI et revue de bot (CodeRabbit, ou PR-Agent prouvé par [[D-393]]) sur la
nouvelle tête, puis « prête @<sha> » à l'intégrateur.

## Interdits encore actifs

- Aucun drapeau posé par l'assistant.
- Production en lecture seule par conteneur, en agrégats.
- Dans le dépôt, écrire « un dossier de test », jamais un identifiant
  accompagné de mesures.
- Aucun lien d'artefact dans le dépôt.
- La file C ne merge aucune PR ordinaire ([[D-373]]).
