# Handoff — H89 PR (d) : liste commune de questions et guichet

## Branche et état Git

- Branche `lot/h89-d-regles`, tirée de `origin/main` à 63c5b5c8 (#1761).
- Lot de texte seul, sans migration, sans code, sans fichier de crochet.

## Objectif

Quatrième et dernière PR du critère de fin de H89 (D-373) : écrire la liste
commune de questions et le guichet, en consigne sans décision. Les
arbitrages du responsable sont ceux du 2026-10-25 (Q7, variante B, sans
heure fixe) et du 2026-10-26 (collection « questions » de la page privée de
suivi de la file D). La contre-revue a ajouté trois points : la réponse
directe est permise, le guichet prépare sans autoriser, et la liste porte
les horodatages.

## Décisions prises

- Aucune décision neuve (fiche H89 : « consigne sans décision »).
- La consigne vit dans `docs/ROLES_MACHINES.md`, dans une sous-section après
  « La copie principale et l'intégrateur ». `CLAUDE.md` n'y ajoute qu'un
  renvoi de deux lignes, pour que toute session la trouve.
- Le merge s'horodate ainsi : la déclaration « prête @<sha> » nomme sa
  ligne (`question <identifiant>`), et celui qui merge horodate le merge.
  La phrase est dans `REGLES_PR_MERGE.md`. `wn-merge` reste inchangé.
- Le dépôt est public : on écrit le nom de la page, jamais son lien.
- CodeRabbit a sauté la PR. La revue de substitution de PR-Agent (D-393 §2,
  quatre conditions vérifiées sur 725af755) a fait trois remarques, toutes
  corrigées :
  - une réponse qui n'appelle ni décision ni PR passe à `close` dès
    qu'elle est écrite ;
  - le numéro de décision se réserve à la rédaction, par la session qui
    rédige, une fois par question, puis s'inscrit dans la ligne ;
  - une question qui touche une règle, un seuil, un texte ou une donnée
    cliniques est `clinique`, et l'est aussi en cas de doute ; c'est la
    session qui pose la question qui juge si elle est complète.

  La page en est à sa version 4, qui ajoute « Clore sans PR ».

## Fichiers modifiés

- `docs/ROLES_MACHINES.md` : sous-section « La liste commune de questions et
  le guichet ».
- `docs/claude/REGLES_PR_MERGE.md` : dans le paragraphe de l'intégrateur,
  une phrase sur la ligne nommée et son horodatage au merge.
- `CLAUDE.md` : renvoi sous « Ne questionner l'utilisateur… ».
- `docs/claude/plan-journal/H89/2026-10-28-05-pr-d.md` : la mise à jour
  datée.
- `changelog.d/2026-10-28-h89-d-liste-questions.md`.

Hors dépôt, la page privée de suivi de la file D est en version 3. Elle
gagne une section « Questions », branchée sur la collection `questions` :
- compteurs par statut, médiane du délai entre question et réponse,
  plafond de huit par séance ;
- « Retenir » sur une option ordinaire ;
- « Noter le merge » ;
- les questions cliniques et de migration n'ont pas de bouton.

La collection est vide. Le schéma des lignes est noté dans la mémoire des
sessions.

## Validations exécutées

- `npm run check:rapide` : vert, 16 étapes, 3 sautées.
- `npm run check` (T1 complet) : vert.
- `scripts/lib/plan-journal.test.mjs` : 27 sur 27.
- `check_no_secrets.sh` : rien.
- Page : syntaxe JavaScript vérifiée, puis rendu dans jsdom avec une base
  factice. Les trois statuts s'affichent, une question clinique n'a pas de
  bouton, et les deux écritures (réponse, merge) portent leurs horodatages.
  Après la publication, la collection `questions` a été listée : elle
  répond, vide.

## Problèmes ouverts

- Personne n'a écrit de vraie question pour l'instant. La première écriture
  par une session (`ArtifactData set` sans `if_version`) éprouvera le
  chemin.
- Questions candidates à y verser, à la décision de leur session : l'audit
  des drapeaux (Q1 à Q5) et le doublon d'actions (D/55).
- La question laissée à D-373 §5 reste ouverte : qui merge quand aucun
  intégrateur ne tourne.

## Prochaine action exacte

1. PR, puis CI en fond : `node scripts/wn-attendre-ci.mjs <N>`.
2. Revue de bot sur la tête (CodeRabbit, ou PR-Agent en substitution selon
   D-393), avec un verdict par remarque.
3. `node scripts/wn-sonde-release-db.mjs <N>` à 0, puis le merge.
4. Ensuite, l'essai de H89 : sept jours actifs et trente PR ordinaires, dans
   une session « intégrateur » neuve sur la copie principale.

## Interdits encore actifs

- Dépôt public : aucun lien d'artefact, aucun identifiant interne de page,
  aucun coût, aucune identité réelle.
- La clôture de la semaine de journal de H86 et le temps 2 de H91 ne
  commencent pas avant le 2026-11-03.
- Ne pas reposer Q1 à Q8 de l'audit des quatre files, ni les arbitrages du
  2026-10-26.
