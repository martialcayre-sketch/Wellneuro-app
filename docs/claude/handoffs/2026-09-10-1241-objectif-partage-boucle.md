# Handoff — l'objectif partagé est bouclé, et la phase 3 cesse de mentir

## Branche et état Git

`main` à `7ae9336a`. **Aucune PR ouverte.** Douze PR fusionnées depuis le
handoff de la nuit (#982), dans l'ordre : #983 (les deux pièces Codex entrent au
dépôt), #984 (rail de la phase 3), #985 (signé / non signé séparés), #986 (file
mise à jour), #987 (`D-164`, F1), #988 (F2), #989 (e-mail), #990 (jalons),
#991 (carte du Fil), #992 (`D-165`), #993 (table des accords attestés —
migration seule), #994 (lecture de l'accord).

Travail mené sous la délégation du 2026-09-10, consignée jusqu'au 2026-09-17,
**production exclue** : les deux migrations ci-dessous ont chacune été
approuvées explicitement en séance, une par une.

## Objectif actuel

Fermer tout ce que l'artefact laissait ouvert sur l'objectif négocié à deux
voies et sur la phase 3 « Compréhension ». **C'est fait** — la file ne porte
plus aucune réparation de ce périmètre en attente.

## Décisions prises

- **`D-162`** — la borne du 2026-10-04 de `D-093` est **abrogée**. Elle
  conditionnait la levée d'une restriction à un délai, alors que ce qui manquait
  était un travail non fait : le délai serait passé sans que rien ne change, et
  la restriction serait tombée toute seule. Une restriction n'a pas besoin de
  terme, elle a besoin d'une condition.
- **`D-163`** — le périmètre de `D-093` s'ouvre à **tous** les dossiers, et rien
  n'y réclame de provenance certifiée.
- **`D-164`** — `G7-1` s'amende une **seconde** fois, par un **second adaptateur
  borné** (`lib/praticien/plainteVerifiee.ts`), pour que la restitution
  d'instrument soit relue au serveur. La porte reste étroite : quatre imports,
  nommés un par un dans la garde.
- **`D-165`** — les quatre colonnes de déclaration de date sont **assumées
  vides**, pas oubliées — écrit pour qu'aucune relecture future ne les
  « répare ».

`D-160` (deux listes citables) et `D-161` (fin de chaîne, deux formes d'accord)
étaient posées la veille : toute la mise en œuvre de cette session en découle.

## Fichiers modifiés

- **Deux migrations, appliquées et CONSTATÉES par conteneur.**
  `20260910120000_alliance_fin_objectif_v1` (run `34414718699` — 12 colonnes,
  10 CHECK, 0 unicité, RLS deny-all, 0 ligne) et
  `20260910180000_alliance_accord_atteste_v1` (run `34457695686` — 6 colonnes,
  `convenu_le` NOT NULL, **0 colonne interdite**, 2 CHECK, FK RESTRICT,
  0 unicité, RLS deny-all, 0 ligne). Contrats négatifs joués contre une base
  jetable : `alli_fin_objectif_v1_negatif.sql`, `alli_accord_atteste_v1_negatif.sql`.
- **`lib/praticien/objectifNegocie.ts`** — `etatDeChaine`, `tetesDeChaine`,
  `tetesActives`, `paroleQuiPrevaut`, `preparerFin`, `accordDeVersion`.
- **Quatre routes praticien neuves** — `objectifs/fin`, `objectifs/relance`,
  `objectifs/etat-phase`, `objectifs/accord`.
- **`lib/praticien/plainteVerifiee.ts`** (`D-164`) et
  **`lib/fil/cartes.ts`** (`geste_objectif`, câblée dans `construireFil`).
- **Écrans** — `ObjectifNegociePanel` (départage, relance, attestation, fenêtres
  de jalon ; le champ `objectif-negocie-le` **retiré**), `FichePatientPanel`
  (le rail lit `etat-phase`), `DossierDeuxVoixView` (ratification sur version
  supplantée, forme de l'accord).
- **`registreGabarits.ts`** — `objectif_propose@2`, empreinte `f15fa027…`.

## Validations exécutées

- Suite complète sur la dernière branche : **515 fichiers, 7 229 bancs**,
  `tsc` et `eslint` propres ; CI verte sur les douze PR.
- **Test de mutation sur chaque banc ajouté** — c'est le standard tenu toute la
  session, et il a mordu : désarmer la préséance de la preuve fait tomber trois
  bancs ; supprimer **un seul** des six appels à `viderDeclarations` n'en faisait
  tomber aucun (les six se couvraient), il a fallu les retirer tous pour prouver
  la couverture.
- Deux gardes du dépôt m'ont attrapé et **avaient raison** : `G7-2` sur un
  `scoresJson` lu depuis la route (corrigé en descendant la lecture dans
  l'adaptateur), et la déclaration RGPD des deux tables filles de `Patient`
  (déclarées en rubrique 5 plutôt qu'ajoutées à la liste d'échappement datée,
  ce qui l'aurait falsifiée).

## Problèmes ouverts

1. **`objectif_propose@2` n'est pas validé** (`valideLe: null`) — et c'est le
   seul point qui vous appartient. La v1 porte sa validation du 2026-09-08 ; ce
   qui part réellement au patient est la v2, qui attend la vôtre.
2. **`main` local diverge d'`origin` (behind 24)** : il est détenu par le
   worktree `courrier-corps-null`, verrouillé par une **session Claude vivante**
   (pid 91588, démarrée le 2026-09-03). Rien n'a été forcé. Réconcilier est un
   geste humain, pas automatique.
3. **`SESSION_LOG.md` n'a plus d'entrée depuis le 2026-09-09** — deux sessions du
   2026-09-10 n'y figurent pas. Seul `/wn-finish` la pose.
4. **Run `release-db` 34421234666 en échec** (2026-09-10 00:25) : la tête de
   `main` a bougé pendant ses cinq heures d'attente d'approbation. Étapes 10/11
   sautées, **rien écrit** — vérifié : ce run n'avait rien à appliquer
   (changement de commentaire seul, `shaPerimetre` identique au bit près).
5. **Trois entrées restent « à cadrer » en file**, débloquées par `D-160` mais
   non écrites : moitié praticien par citation, amorçage de la synthèse par les
   mots du patient, moitié patient citable.

## Prochaine action exacte

`/wn-finish` — l'entrée `SESSION_LOG.md` de ces deux sessions n'est pas écrite,
et ce skill est le seul à la poser. Ce handoff ne l'a pas fait (le skill
l'interdit).

## Interdits encore actifs

- Autorisation GitHub (commit, push, PR, merge) jusqu'au **2026-09-17** ; elle
  n'a jamais couvert le **force-push**. La production, les arbitrages `D-xxx` et
  tout ce qui atteint un patient réel se redemandent **à chaque fois**.
- Production : lecture seule par `scalingo run -d` **par identifiant**, écriture
  par migration relue puis `release-db` approuvée, puis **constatée** par
  conteneur.
- Aucune identité réelle au dépôt : fixtures seules, dossiers réels par
  identifiant (`PAT0xx`).
- Un numéro de décision ne se réserve pas : il s'acquiert **au merge**.
- `scripts/changelog-collate.mjs` **sans argument est destructeur** — il replie
  puis **supprime** les fragments, et n'a pas de mode `--check`. Jamais dans un
  `||`.
