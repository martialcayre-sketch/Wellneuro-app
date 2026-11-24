### Focus areas de PR-Agent : l'intégrateur refuse une PR dont une remarque n'a reçu aucun verdict cité (autonomie-pieges-restes, partie 14, 2026-11-24)

Le 2026-11-05, l'intégrateur a renvoyé #1878 : la déclaration disait
« PR-Agent : aucun problème relevé », alors que deux « Recommended focus areas
for review » restaient sans verdict. Rien ne le contrôlait. Relu sur les
déclarations de #2180 à #2312 : #2274 et #2278 ont été mergées avec cinq
focus areas sans aucun verdict.

- **Lecture** `scripts/lib/focus-areas-pr-agent.mjs` (fonctions pures). Les
  titres attendus sont ceux des focus areas affichées dans le commentaire
  persistant (`pr-agent:review:full`) et ceux du bloc d'état (`findings`),
  têtes précédentes et remarques « résolues » comprises, comme le veut la
  règle écrite. Une section ou un bloc illisible rend « illisible », jamais
  « aucune » ; un marqueur de bloc mal délimité, ou deux blocs, aussi. La
  citation se compare normalisée (gras, code, guillemets, apostrophes,
  casse, blancs, ponctuation finale du titre). Un titre d'un ou deux mots ne
  vaut cité qu'en ouvrant une marque (gras, italique, chevrons, guillemets,
  code) et sur une fin de mot : « Tests » ou « Migration » se liraient sinon
  dans la prose d'une déclaration. Un titre contenu dans un autre doit être
  cité pour lui-même.
- **Garde** de `scripts/wn-integrer.mjs`, code **26** : chaque titre doit être
  cité par un commentaire de conversation du propriétaire (`OWNER`) dont
  l'heure de parole ne dépasse pas celle de la déclaration servie (la
  déclaration elle-même comprise), hors commentaires marqués de
  l'intégrateur. Sinon, refus avant tout contrôle coûteux,
  dans tous les modes, filet compris, et le motif nomme chaque titre. Une
  citation postérieure ne compte pas : elle suspend déjà le merge comme
  parole, et la file redéclare.
- **Information** de `scripts/wn-revue-pr-agent.mjs` : la sortie liste les
  titres attendus avant la ligne `REVUE`. Le code de sortie ne change pas ;
  il dit toujours si la revue porte sur la tête.
- **Rejeu en lecture seule** sur les commentaires réels de 128 PR déclarées :
  119 passent. 9 auraient été refusées : #2274 et #2278 (aucun verdict),
  cinq PR dont une remarque de tête précédente n'a jamais été citée (#2223,
  #2245, #2249, #2250, #2302), un titre paraphrasé (#2258) et un « Possible
  Issue » non nommé (#2305). Aucune lecture « illisible ».
- **Docs** : `.claude/rules/pr-revue-et-release-db.md` (§ PR-Agent : citer
  chaque titre tel que PR-Agent l'écrit), `docs/ROLES_MACHINES.md` (cinquième
  garde de l'intégrateur), `docs/claude/REGLES_PR_MERGE.md`.
- **Limites dites** : le contrôle ne juge pas le verdict (une citation sans
  verdict passe), ni que le commentaire soit distinct de la déclaration ;
  deux remarques de même titre se contentent d'une citation ; un verdict
  donné en revue, en réponse en ligne ou dans le corps de la PR ne compte
  pas.
- **Bancs** : `scripts/lib/focus-areas-pr-agent.test.mjs` (24 cas, neuf,
  inscrit à `bancs-outillage-check`), 22 cas neufs dans
  `scripts/wn-integrer.test.mjs` et 3 dans `scripts/wn-revue-pr-agent.test.mjs`.
  Dix-sept mutations inverses rougissent chacune au moins un cas.
- **Revue `wn-reviewer`** : GO, sans P0 ni P1. Corrigés : le commentaire
  marqué de l'intégrateur qui reprend un refus 26 citait le titre à la place
  de la file ; un titre court était « cité » par la prose ; un bloc mal
  délimité se lisait vide ; la ponctuation finale d'un titre ; la ligne
  d'information protégée par son propre `try`. Écrits en limites : titres en
  double, citation sans verdict, commentaire non distinct.
