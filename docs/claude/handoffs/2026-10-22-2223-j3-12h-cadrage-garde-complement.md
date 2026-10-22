# Handoff — J3-12h, cadrage de la garde sur le complément ciblé (D-345)

## Branche et état Git

`worktree-cadrage-j3-12h` (worktree `.claude/worktrees/cadrage-j3-12h`),
partie de `origin/main` à `5e39a737`. Session concurrente : la copie
principale porte l'écriture de la structure des fiches d'usage, non touchée.
PR de documents seuls.

## Objectif

Cadrer J3-12h : chez le mineur et la personne enceinte ou allaitante, un
complément ciblé n'entre au programme qu'après la remise tracée d'un
courrier au médecin, sans attendre sa réponse. Aucun code, aucune migration.

## Décisions prises

D-345, huit arbitrages du responsable du 2026-10-22 : case « ciblé » ou
« multivitaminé » sur l'action `supplement_exploration`, seule « ciblé »
gardée ; remise au patient dans le clic de diffusion, refus fail-closed
avant l'embranchement ; accord de partage exigé (régime fermé) ; courrier
neuf pour tout complément ciblé ajouté ; grossesse et allaitement : un
« oui » déclenche, seul un « non » du praticien lève, sans déduction par le
sexe ; date manquante ⇒ « date requise », mineur refusé jusqu'à
J3-mineurs ; `S-MG-2` devient « courrier, puis complément » (P6 v0.4 à
signer) ; `S-MG-1` et `S-MG-2` déclarés par case du praticien.

## Fichiers modifiés

- `docs/claude/propositions/2026-10-22-j3-12h-garde-complement-cible/README.md`
  (fiche de cadrage, forme opaque) ;
- `docs/DECISIONS.md` (D-345) ;
- `docs/claude/PLAN_WELLNEURO.md` (ligne J3-12h, gestes des positions du
  fer et du magnésium, h2, constat D.2) ;
- `changelog.d/2026-10-22-j3-12h-cadrage-garde-complement.md`.

## Validations exécutées

- Constat de production par conteneur `one-off-6093`, `READ ONLY`, agrégats
  (section 3 de la fiche).
- Contre-revue `wn-reviewer` : NO-GO (un P0, cinq P1), tout vérifié au code
  puis corrigé avant les questions.
- `decisions-numerotation` (D-001 à D-345), `wn-ancres-doctrine`,
  `check_no_secrets` verts ; grep de forme opaque sans fuite.
- `check:rapide` : type-check rouge par environnement (worktree sans
  `node_modules` ni client Prisma généré), sans lien avec ce diff de
  documents.

## Problèmes ouverts

- P6 v0.4 du magnésium à signer (geste du responsable, dossier privé) avant
  que `S-MG-2` n'entre dans la table des déclencheurs.
- Aucune entrée `SESSION_LOG.md` : deux PR ouvertes (#1648, #1649) y
  ajoutent déjà la leur ; éviter le conflit d'ajout en fin de fichier.
- Le chemin transactionnel du clic dépend de `WN_FICHES_ASSIETTE` : son
  état en production est à constater avant le lot du refus.

## Prochaine action exacte

Lot 1 de J3-12h (sans migration) : contrat du protocole (case « ciblé » et
situations sur `supplement_exploration`), table signée des déclencheurs,
prédicat `courrierRequis`, bancs ; revue `wn-reviewer`, palier T3. Puis
lot 2, migration seule de la trace de remise.

## Interdits encore actifs

- Production en lecture seule, par conteneur ; aucune migration ni
  modification de `schema.prisma` sans demande explicite.
- Aucun seuil, aucune dose, aucune durée tirés de la mémoire ; forme opaque
  au dépôt (aucun claim rattaché à une situation).
- « ordonnance » interdit ; courrier sous `assertRenduMedecinNonPrescriptif`.
- Ne pas toucher `web/src/lib/fiches-usage/` (autre session).
