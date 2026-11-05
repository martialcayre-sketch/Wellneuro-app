- **Mise à jour (2026-11-05), clôture de la semaine de journal** : lecture seule du journal `.claude/logs/git-freshness.log` de la copie principale.
  - **Fenêtre** : du 2026-10-27 à 12:31 UTC au 2026-11-03 à 12:31 UTC, les bornes de la fiche. La première ligne retenue (12:31:13) précède de 22 s le merge de #1733 (12:31:35), et la dernière date de 12:29:48.
  - **Lignes** : 2 135, aucune illisible. Les 40 lignes antérieures sont écartées. Les 819 lignes postérieures au moment de la lecture sont hors comptage : le crochet continue d'écrire.
  - Agrégats seulement : aucun `HEAD`, aucun nom de branche.
  - **Verdicts par type** :
    - autorisations, toutes à jour : 1 807 (`Edit` 1 070, `Write` 737) ;
    - refus pour retard : 176 (`Edit` 88, `Write` 88) ;
    - constats au démarrage : 152, dont 97 en retard et 55 à jour ;
    - mode dégradé, `HEAD` illisible, fetch jamais abouti : 0.
  - **Cibles** :
    - autorisations : 1 165 internes au worktree du répertoire courant, 642 externes ;
    - refus : 74 internes, 102 externes.
    - Le journal ne nomme pas la cible. « Externe » couvre par exemple la mémoire, le scratchpad, un autre worktree ou la copie principale vue depuis un worktree.
  - **Refus par `HEAD`** : 113 `HEAD` distincts.
    - 83 refus, sur 50 `HEAD`, tombent sur un commit de `main` : une copie ou un worktree restés sur un ancien `main`. La remise à niveau y est une avance, pas une fusion.
    - 93 refus, sur 63 `HEAD`, tombent sur une branche de lot. 53 d'entre eux portent sur le `HEAD` de départ d'une fusion de `main` comptée ci-dessous.
    - Jour le plus chargé : le 2026-11-01, avec 73 refus.
  - **Fusions de `main` de la semaine** : mêmes bornes UTC que le journal, appliquées à la date de merge des PR et à la date du commit de fusion.
    - 105 PR mergées dans la fenêtre. #1733, dont le merge ouvre la semaine, en est exclue.
    - 351 commits de branche, dont 73 fusions de `main`. 69 sont datées dans la semaine, dans 45 PR.
    - Ventilées par la règle de la mesure de référence (fragment `2026-10-27-02`) :
      - crochet présumé : 37 ;
      - numéro de décision : 18, toutes sur `docs/DECISIONS.md` (avec le plan trois fois et le registre des sources du corpus trois fois) ;
      - conflit de texte : 10 (plan 3, `docs/FEATURE_FLAGS.md` 2, registre des sources du corpus 2, `web/package.json` 1, une route API 1, le workflow release-db 1) ;
      - autre : 4.
    - Soit 41 fusions sans conflit et 28 avec un conflit réel entre la branche et `main`.
  - **Confrontation au journal** : on cherche un verdict sur le `HEAD` de départ de chaque fusion (son premier parent), au plus tard deux minutes après la date du commit de fusion. Le journal observe une **succession** (un verdict, puis une fusion), pas une cause. Six groupes disjoints :

    | Groupe | Sans conflit | Avec conflit |
    |---|---|---|
    | a. un refus ou un constat de retard sur le `HEAD` de départ | 24 | 14 |
    | b. autorisations seulement sur ce `HEAD` | 2 | 3 |
    | c. aucune ligne sur ce `HEAD`, mais un refus pour retard sur un autre commit de la PR dans l'heure qui précède | 5 | 1 |
    | d. aucune ligne avant la fusion, mais le commit de fusion apparaît ensuite comme `HEAD` : une fusion spontanée, dans une session qui journalisait | 8 | 7 |
    | e. une ligne sur un autre commit de la PR, sans refus dans l'heure | 1 | 0 |
    | f. aucune ligne sur aucun commit de la PR | 1 | 3 |
    | Total | 41 | 28 |

    Par catégorie de la règle de référence :
    - crochet présumé : 22 en (a), 1 en (b) et 14 sans ligne (c à f) ;
    - numéro de décision : 8 en (a), 3 en (b), 7 sans ligne ;
    - conflit de texte : 6 en (a), 4 sans ligne ;
    - autre : 2 en (a), 1 en (b), 1 sans ligne.
  - **Ce que la tolérance de D-375 §2 peut retirer** : elle n'atteint que les fusions sans conflit, puisqu'elle refuse toujours en cas de chevauchement ou de conflit. Mesure « avant » pour H92 :
    - **24 fusions sur 69 (35 %)** suivent un verdict de retard sans conflit. C'est la part mesurée ;
    - 29 sur 69 (42 %) en ajoutant le groupe (c), où le lien avec le crochet est plus lâche ;
    - le plafond est de 41 sur 69 (59 %), toutes les fusions sans conflit. Il ne vaut que si l'on compte au crochet les fusions spontanées du groupe (d), faites sans refus préalable, peut-être par habitude de le devancer. C'est une définition à arbitrer, pas une mesure ;
    - les 28 fusions avec conflit (41 %) restent hors de portée de la tolérance, qu'elles aient suivi ou non un verdict de retard. La fusion y révèle un conflit qui existe de toute façon.
  - **Verdict sur les 43 fusions « crochet présumé » de la mesure de référence** :
    - Elles ne se confirment pas une à une : elles précèdent le journal.
    - Leur règle n'est **pas validée**. Elle classe chaque fusion par sa conséquence (conflit ou non, commit suivant), alors que le journal observe ce qui la précède, et les deux ne se recouvrent pas.
    - Sur les 37 fusions présumées de la semaine, 22 suivent un verdict de retard, une seule ne suit que des autorisations, et 14 ne sont pas attribuables.
    - À l'inverse, 16 fusions rangées ailleurs par la règle suivent aussi un verdict de retard. La part voisine (43 sur 80, soit 54 %) ne mesure donc pas la même chose que les fusions sans conflit qui suivent un retard (35 %).
  - **Délais question → réponse des arbitrages** : non mesurables depuis le dépôt (`git`, `gh`, journal), comme le constatait la mesure de référence. Depuis H89, la liste commune de questions, tenue hors dépôt, horodate l'arrivée et la réponse de chaque question. Le renvoi à H92 est inscrit à son journal (`2026-11-05-01`).
  - **Limites** :
    - La date d'une fusion est celle du commit, posée par la machine locale.
    - Les fusions des PR mergées après la fenêtre, ou encore ouvertes, sont hors comptage.
    - Ce crochet ne juge pas les écritures par `Bash`. Une session qui n'écrit que par `Bash` ne laisse aucune ligne.
    - La ventilation par catégorie rejoue `git merge-tree --write-tree` sur les deux parents de chaque fusion.
  - **H86 close** au regard de ses critères de fin :
    - consigne écrite et journal en service, avec banc vert et revue faite (#1733) ;
    - mesure de référence publiée (#1737) ;
    - semaine de journal close, dates de début et de fin écrites ci-dessus ;
    - délais question → réponse renvoyés à H92 et nommés comme tels.

    Cette mesure sert d'« avant » à H92 (D-375 §2, tolérance du crochet).
