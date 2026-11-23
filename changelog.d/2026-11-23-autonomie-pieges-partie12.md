### One-off Scalingo recyclé : la sortie d'un one-off se lit pour son seul conteneur, et `logs --filter one-off-…` est refusé depuis la session (autonomie-pieges-restes, partie 12, 2026-11-23)

Scalingo recycle les numéros de one-off. Le 2026-11-09 (constat de #1947),
`logs --filter one-off-6758` a rendu une release-db du 2026-10-03, au même
numéro, tant que le conteneur du jour n'avait rien écrit. Le filtre est en
outre une expression régulière sur le nom : `one-off-635` attrape
`[one-off-6351]`. Relevé le 2026-11-23 sur la production : une fenêtre de
3 000 lignes portait deux conteneurs `one-off-6587` le même matin.

- **Lecteur** `scripts/wn-one-off-logs.mjs`, en lecture seule ; il ne lance
  rien.
  - Il retient le seul démarrage du nom exact daté d'après `--depuis`. Ce
    démarrage est lu sur la ligne `[manager] container [one-off-N] (<id>)
    started …`, et `--depuis`, obligatoire, est l'heure lue avant le
    lancement.
  - Il rend les lignes `[one-off-N]` qui suivent, jusqu'au prochain
    démarrage du même nom sous un autre identifiant, et l'arrêt du même
    identifiant.
  - Un redémarrage du numéro sans arrêt lu du nôtre est ambigu. Un arrêt de
    moins de 10 s ne vaut pas encore « complet ». Une ligne du même nom datée
    plus d'1 s après l'arrêt est écartée et comptée : elle peut venir d'un
    réemploi dont le démarrage est illisible.
  - `--commande` exige en plus le texte lancé, ce qui rattrape un `--depuis`
    pris trop tôt. `--attendre` relit jusqu'à l'arrêt.
  - Codes : 0 arrêté, 1 en cours ou arrêt récent, 2 introuvable, 3 usage,
    4 ambigu. Rien n'est rendu en 2 ni en 4.
- **Refus** dans `.claude/hooks/block-risky-commands.mjs` : `scalingo …
  logs` dont le filtre (`--filter`, `-F`, `=` compris) peut attraper un
  one-off.
  - Valeurs refusées : un métacaractère, une variable, une chaîne entre
    guillemets, ou une sous-chaîne de `one-off-<chiffres>` (`off-3`, `3`).
  - La commande est lue masquée, segment par segment, préfixes de commande
    compris (`env`, `timeout N`, `then`…). Elle n'est pas mise en minuscules,
    puisque `-F` filtre et `-f` suit.
  - Trous assumés, épinglés au banc : `bash -c '…'`, une substitution entre
    guillemets doubles (`X="$(…)"`, avalée par le masque) et l'option
    groupée `-nF`.
- **Revue `wn-reviewer`** : NO-GO sur deux P1, corrigés avec leur cas de
  banc.
  - Un réemploi postérieur du numéro sous une autre commande n'était pas une
    borne. Ses lignes étaient rendues en code 0 avec `--commande`.
  - `--filter="…"` passait le crochet.

  Quatre de ses P2 sont repris : délai de grâce après l'arrêt, sortie datée
  avant le démarrage comptée, `--commande` dans les docs, préfixes et
  valeurs-expressions. La revue de l'écart rend un GO ; ses P2 sont repris
  (lignes tardives après l'arrêt, trou `"$(…)"` épinglé, décalage d'horloge
  nommé dans le message).
- **Hors périmètre** : `release-db.yml` lit aussi `logs --filter`, mais ses
  sentinelles sont liées au run (`id=<run>`). La sortie d'un ancien porteur
  du numéro n'y passe donc pas pour la sienne.
- **Docs** : `db-prisma.md`, `wn-merge`, `RUNBOOK.md` et
  `hooks-garde-fous.md` renvoient au lecteur.
- **Banc** `scripts/wn-one-off-logs.test.mjs`, 18 cas sur des journaux
  synthétiques, inscrit à `bancs-outillage-check`. Le crochet a 24 refus,
  11 passages et 3 trous épinglés. Onze mutations font chacune rougir leur
  cas : huit sur le lecteur, trois sur le crochet.
