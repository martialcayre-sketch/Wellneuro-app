# Handoff — 2026-10-23 — J3-12h, lot 1 de D-345 : contrat, table signée, garde pure

## Branche et état Git

- Branche `lot/j3-12h-lot1-contrat`, worktree `.claude/worktrees/j3-12h-lot1`
  (session concurrente, cycle en git/gh direct), tirée d'`origin/main`
  a5932f99, puis `origin/main` fusionnée le 2026-10-23 (garde de fraîcheur).
- Une PR, sans migration ni `schema.prisma`.
- Le cadrage #1651 est mergé (a5932f99) : quatre commentaires CodeRabbit
  corrigés, verdicts postés.

## Objectif

Poser G0 à G3 de la fiche de cadrage
(`docs/claude/propositions/2026-10-22-j3-12h-garde-complement-cible/README.md` §5) :
- la nature du complément au contrat du protocole ;
- la table signée des déclencheurs ;
- le prédicat pur du courrier.

## Décisions prises

- Champs `natureComplement` (« cible » | « multivitamine_vente_libre ») et
  `situationsComplement` : V4 seule, action `supplement_exploration` seule,
  liste fermée à l'écriture et à la relecture. L'absence passe à l'écriture ;
  son refus se fera au clic (lot 3).
- Table `declencheursComplementCibleV1.ts` :
  - signée par le responsable le 2026-10-23, sur sa déclaration « signe la
    table pour moi » ;
  - sha `709ab44c…6a2e`, enrôlée au garde des littéraux et à `FEATURE_FLAGS.md` ;
  - provenance en codes (BP-01 interdit les phrases). S-MG-1 et S-MG-2 ont été
    lus en P6 v0.4 §2 au dossier privé ; S-MG-1 est appuyée sur un claim
    signé, qui n'est pas nommé.
- Garde `courrierComplementRequis` :
  - ordre : nature, table, âge, situations, déclencheurs, accord ;
  - un déclencheur atteint l'emporte sur un critère à établir ;
  - seul le dernier mot du praticien lève un « oui » (P1-2 de `wn-reviewer`) ;
  - dates ISO canoniques seulement.
- La route de version accepte déjà les deux champs. Aucun lecteur ne les
  consomme avant le lot 3, et c'est dit dans le fragment.

## Fichiers modifiés

- `web/src/lib/clinical-engine/` :
  - `complementCible.ts` (module feuille) ;
  - `types.ts`, `protocolDraft.ts` ;
  - `natureComplement.test.ts`.
- `web/src/lib/clinical/` :
  - `declencheursComplementCibleV1.ts` et son `.guard.test.ts` ;
  - `gardeComplementCible.ts` et son `.test.ts` ;
  - `shaPerimetreLitteral.guard.test.ts`.
- `docs/FEATURE_FLAGS.md`.
- `changelog.d/2026-10-23-j3-12h-lot1-contrat-predicat.md`.
- `docs/claude/PLAN_WELLNEURO.md` (ligne J3-12h).
- `docs/claude/SESSION_LOG.md`.

## Validations exécutées

- T1 (`check:rapide`) après chaque édition : vert. T1 complet (`check`) avant
  le premier commit : vert.
- T2 (`test:worktree -- --fast`) : rouge au premier passage, sur deux gardes
  de doctrine :
  - `verrousSignatureDocumentes` : la table manquait dans `FEATURE_FLAGS.md` ;
  - `aucunePhraseStructureSignee` : la provenance était rédigée en phrases.

  Les deux sont corrigés, et leurs bancs ciblés sont verts.
- T3 (`test:worktree`) complet après la signature : séquence verte en 7 min 18 s,
  282 E2E passés.
- Revue `wn-reviewer` sur 45f0a4e8 : GO sous conditions, aucun P0.
  - P1-1 (clôture) : posée.
  - P1-2 : corrigé.
  - P2-2 : corrigé.
  - P2-1 : documenté.
  - P2-3 : routé au lot 3.
  - Tests manquants : ajoutés, sauf celui de la route.

## Problèmes ouverts

- Lot 3 :
  - passer à la garde les têtes de fil physiologiques, retraits exclus ;
  - garantir des déclarations datées : un « oui » non daté ne se lève jamais.
- Lot 3 : l'appelant du clic n'injecte ni table ni signature (valeurs par
  défaut du module) et calcule l'âge depuis le dossier (revue CodeRabbit de
  #1662, comparaison au littéral écartée avec motif).
- Lot 3 : la case « ciblé / multivitaminé » dans `ProtocolMiniBuilder` avant
  l'ouverture du drapeau. Un test de route sur les deux champs reste à écrire
  avec cette case.

## Prochaine action exacte

PR, CI par `wn-attendre-ci` en fond, CodeRabbit sur le sha de tête, merge.
Puis lot 2 : migration seule de la trace de remise (G5), release-db et
constat par conteneur.

## Interdits encore actifs

- Aucune migration ni `schema.prisma` avant le lot 2.
- Aucun claim ni libellé de situation au dépôt.
- Une ligne de la table modifiée exige une décision, un fragment et une
  nouvelle signature.
- Aucun appelant de production de la garde hors du lot 3 sous drapeau.
