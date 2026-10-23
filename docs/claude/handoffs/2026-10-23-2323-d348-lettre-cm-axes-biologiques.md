# Handoff — 2026-10-23 — Lettre cm signée : D-348, axes biologiques (F51)

## Branche et état du dépôt

- Branche `docs/d348-axes-biologiques`, partie de `origin/main` (99166e2d),
  worktree `bio-ingest-cloture`. Session concurrente, cycle en `git`/`gh`
  direct. Documentation seule : aucune migration, aucun code.

## Objectif

Rédiger le brouillon de la lettre cm (F51) à partir des claims certifiés lus
en production, le faire corriger et signer par le responsable, puis verser
la décision au dépôt en forme opaque. La migration du référentiel (F52) suit
dans sa propre PR.

## Décisions prises

- Lettre cm signée le 2026-10-23 sur le Claude Doc privé (`1df877ff-…`,
  rev 50). Vingt arbitrages sur questions à options : dix-sept sur la
  recommandation, trois contre (deux axes pour la barrière intestinale et
  l'axe microbiote-cerveau ; un fondateur retiré au corticotrope ; un
  fondateur réintégré à l'énergie mitochondriale).
- D-348 : dix codes sans préfixe, une ligne de mécanisme par code, liste
  plate des cinquante fondateurs, limites écrites. Le texte des claims et
  leur rattachement par axe restent au Claude Doc.
- Trois claims certifiés contiennent une erreur de fait : WN-CL-0030-020,
  WN-CL-0007-006 et WN-CL-0021-003. Ils sont retirés des fondateurs et
  renvoyés à l'atelier des claims (D-348 §6).

## Fichiers modifiés

- `docs/DECISIONS.md` (D-348 en tête).
- `docs/claude/PLAN_WELLNEURO.md` (mises à jour de F51 et F52).
- `changelog.d/2026-10-23-d348-axes-biologiques.md`.
- Ce handoff.

## Validations exécutées

- Production en lecture seule, transaction `READ ONLY` close par
  `ROLLBACK`, par conteneur détaché (one-off-5536, 4329, 4044, 1780) :
  8 564 claims certifiés actifs, dont 5 913 non prescriptifs ; claims cités
  relus ; 0 ligne dans `biology_analyte_links`.
- Contre-lecture par un relecteur indépendant (lecture seule) et un second
  avis externe ; chaque divergence a été examinée dans le Claude Doc.
- Forme opaque : la D-348 a été cherchée pour des analytes, des sources
  externes, des populations et des médicaments, sans résultat. Les 53
  identifiants cités (50 fondateurs, 3 claims à relire) ont été comparés aux
  listes signées.

## Problèmes ouverts

- La correspondance d'un panel à un axe, que D-296 §4 renvoyait à la lettre
  cm, n'est pas fixée : elle reste ouverte (D-348 §7).
- Le renvoi des trois claims à l'atelier n'est pas encore fait.
- WN-SRC-0236 reste à classer au registre des sources.
- La mémoire de l'assistant sur la lettre cm n'est pas encore mise à jour :
  le contrôle de fraîcheur Git la bloquait sur l'ancienne tête.

## Prochaine action exacte

F52 dans une session neuve. D'abord, relire en production les cinquante
fondateurs de D-348 §3 (`VALIDE`, actifs, non supplantés). Ensuite, une
migration seule dans sa PR : `cible_code IN (…)` sur les dix codes de
D-348 §2 quand `cible_type = 'axe'`, avec un contrat SQL négatif (axe
inconnu, lien sans claim). Puis passe Codex, T3, release-db approuvée et
constat par conteneur (0 lien).

## Interdits encore actifs

- Production en lecture seule ; écriture seulement par migration relue, puis
  release-db approuvée, une seule à la fois.
- Aucun pull, merge ni rebase sans l'arbitrage du responsable.
- Aucun merge sans une revue de CodeRabbit sur le sha de tête.
- Ne pas éteindre `WN_DOCUMENT_MEDECIN_PATIENT` ; jamais `err.message` dans
  les logs.
- Aucun texte clinique, libellé d'hypothèse ni identité réelle dans le
  dépôt : seule la forme opaque y entre.
