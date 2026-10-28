### H89, PR (b) : `wn-merge` joue les sondes et le contrôle avant chaque merge (D-373 §2, §4 et §7, 2026-10-28)

- Nouvelle étape 7 bis de `wn-merge`, quatre gestes dans cet ordre, avant la
  sonde release-db (devenue 7 ter, toujours juste avant le merge) :
  - **Sonde du déploiement** : `node scripts/wn-deploiement-observation.mjs`,
    le module d'observation existant, en lecture seule. `1` (recul) ou `2`
    (illisible) : pas de merge, arrêt et question au responsable. `0` : une
    PR ordinaire merge sans attendre le déploiement (D-373 §1). Une seule
    retenue : une migration de `main` pas encore en service. Si son run
    release-db attend l'approbation (phase 1), les PR non gelées mergent ;
    sinon (appliquée mais pas déployée, run rejeté, état inconnu), arrêt et
    question au responsable (« un merge à la fois »). Aucun script nouveau :
    le déployeur écrit et n'est pas une sonde.
  - **Contrôle sur l'arbre fusionné** : `node scripts/wn-controle-fusion.mjs
    <N>` (PR (a), #1753). `0` seul autorise ; `1` renvoie la PR à sa file ;
    `2` (indéterminé) arrête et pose la question au responsable, jamais lu
    comme un sain.
  - **Relecture de la tête de `docs/DECISIONS.md`** : le diff du registre
    depuis la base de la PR, lu en entier (titres nouveaux et textes
    amendés) ; une décision qui amende le régime du merge ou le domaine de
    la PR arrête et pose la question.
  - **Signal de chevauchement** : `node scripts/wn-chevauchement.mjs <N>`,
    affiché, jamais bloquant.
- Le merge vise la tête contrôlée : le `tete=` du contrôle est le préfixe du
  sha passé à `--match-head-commit`. Si `main` a bougé depuis le contrôle
  (`git ls-remote`, lu juste avant la sonde release-db), toute l'étape 7 bis
  se rejoue, puis la sonde : elle reste le dernier geste avant le merge.
- Bancs : le câblage du skill (commandes et leur ordre, codes 1 et 2, signal
  non bloquant, tête et `main` contrôlés, rejeux, conditions de l'étape 9)
  dans `scripts/wn-controle-fusion.test.mjs` ; la ligne « En service » de
  chaque état conforme, les codes de la sonde et la retenue de migration
  dans `scripts/wn-deploiement-observation.test.mjs`. Dix-sept mutations du
  skill jouées, dix-sept tuées.
- Aucune décision nouvelle, aucune migration, aucun chemin clinique. Les
  règles, les rôles et `CLAUDE.md` relèvent de la PR (c).
