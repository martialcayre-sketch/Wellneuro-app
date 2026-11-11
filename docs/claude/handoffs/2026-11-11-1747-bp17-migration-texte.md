# Handoff — 2026-11-11 — BP-17, PR 2 : migration du texte d'accompagnement

## Branche et état Git

- Branche `feat/bp17-migration-texte`, worktree `bp17-migration`, créée
  depuis `origin/main` (`226c9fc8`, #1988).
- Migration seule, de la file C. C'est cette session qui la merge, pas
  l'intégrateur (D-373). La PR 3 (structure) avance en parallèle dans une
  autre session, sans dépendance.

## Objectif

Créer les deux tables du texte d'accompagnement de la bibliothèque des
options (D-480 §3), vides et en ajout seul. Aucun code consommateur.

## Décisions prises

Le responsable a confirmé le plan dans la session le 2026-11-11, avec trois
arbitrages :
- **Neuf rubriques**, liste fermée de D-480 §1 : `produit_statut_reglementaire`
  (une seule rubrique), `dose`, `duree`, `precautions`, `contre_indications`,
  `interactions`, `surveillance`, `critere_arret`, `role_praticien`.
- **`auteur` seul**, obligatoire, au plus 320 caractères : le compte qui
  saisit, y compris quand la file B transcrit. Aucune colonne de modèle. La
  validation du responsable est tracée dans les actes (`validateur`).
- **Dernière version seule** : le trigger refuse tout acte (validation ou
  retrait) sur une version dépassée du couple option × rubrique, sous le
  même verrou consultatif (espace 480) que la création des versions, en
  READ COMMITTED seul.
- **Contrat de lecture pour la PR 5** (exigence du responsable) : une version
  neuve sans acte masque l'ancienne version validée. Une rubrique est validée
  si le dernier acte, par `ordre`, de sa DERNIÈRE version est `validee`.
- « À relire » après une re-signature : la version étant figée, un acte seul
  ne lève pas l'état. Il faut une version neuve (même texte, empreinte de
  structure à jour) puis son acte, sur le patron des libellés que cite
  D-480 §3. Constat de `wn-reviewer` (C3) : les commentaires sont corrigés.
- L'identifiant d'option n'a aucun format imposé (texte sans espace, 1 à
  128 caractères) : c'est la PR 3 qui le fixe.

## Fichiers modifiés

- `web/prisma/migrations/20261111120000_bibliotheque_options_textes_v1/migration.sql`
- `web/prisma/schema.prisma` : bloc `BibliothequeOptionTexte` et
  `BibliothequeOptionTexteActe`, édité à la main.
- `web/prisma/checks/bibliotheque_options_textes_v1_negatif.sql` : 13
  promesses ; la treizième se joue dans deux transactions à part,
  REPEATABLE READ puis SERIALIZABLE.
- `.github/workflows/ci.yml` : étape « Bibliotheque options textes negative
  tests ».
- `changelog.d/2026-11-11-bp17-migration-texte-bibliotheque.md`, fragment
  F11 `2026-11-11-03-migration-texte-bibliotheque.md`, ligne BP-17 de
  `CAMPAGNE.md` (passée à en_cours), ce handoff.

## Validations exécutées

- Base locale du worktree (`scripts/wn-dev-db.sh --migrate`) : toutes les
  migrations appliquées.
- Contrat négatif vert, par psql (NOTICE des 13 promesses et refus en
  REPEATABLE READ) et par `prisma db execute`, la forme du CI.
- `prisma validate` : schéma valide. `prisma generate` lancé une fois.
- T1 complet : code 0 (831 tests réussis, 0 échec, 1 sauté) ; anti-secrets OK.
- T3 `test:worktree` et `wn-reviewer` : résultats consignés dans la PR.

## Problèmes ouverts

- Aucun banc à deux sessions (le patron des positions en a un). Le verrou
  et la garde READ COMMITTED sont éprouvés en une session seulement. Selon
  `wn-reviewer` (N1), aucun test ne rougirait si la clé du verrou différait
  entre les deux triggers, si la lecture précédait le verrou dans le
  trigger d'acte, ou si ce verrou y était retiré. Risque accepté : les
  tables restent vides jusqu'à la PR 5, qui porte le banc sur base réelle,
  version contre acte, avec le verrou constaté en attente.
- La base ne vérifie ni que l'option existe à la structure, ni que
  `structure_sha256` est l'empreinte signée : cela revient à la route et à
  la lecture (PR 5).

## Prochaine action exacte

Après le CI vert et la revue sur la tête : `wn-sonde-release-db.mjs <N>` à
0, créneau choisi avec le responsable, merge. Si la PR 3 vient d'être
mergée et que sa release-db attend, ne pas merger. Le responsable approuve
la release-db. Constat par conteneur : `migrate status` agrégé par nom,
tables présentes et vides, triggers en place, puis première ligne de
`scalingo deployments` égale à la tête de main. Constat au journal F11.
La PR 5 attend ce constat.

## Interdits encore actifs

- Aucun code consommateur (lecture, écriture, atelier) avant le constat : PR 5.
- Aucune option, dose, durée, précaution, contre-indication, interaction ni
  libellé dans la migration ou les bancs (porte 23, DC-11). Fixtures
  neutres seulement.
- Aucun lecteur de `creePar` ni de `validePar` (D-459 §7).
- Ne pas reposer D-480, ses trois points de forme, le découpage ni les
  trois arbitrages ci-dessus.
- Production en lecture seule, par conteneur, en agrégats. Aucune
  approbation de release-db par la session.
