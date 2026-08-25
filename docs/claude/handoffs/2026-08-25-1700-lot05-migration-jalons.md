# Handoff — 2026-08-25 — Alliance 6.0-B, LOT-05 : la migration des jalons

## Branche et état Git

`feat/lot05-jalons-evaluation`, worktree `alliance-6b-lot05`, depuis
`origin/main` `d0bea3cf`. **PR 1 sur 2** : la migration seule, qui ne consomme
rien et n'est consommée par rien (`D-087`). Le code du lot suit dans une PR
distincte, après approbation `release-db` et **application constatée par
conteneur**.

## Objectif

Donner un lieu à la réponse d'étape du patient — où il en est **par rapport à la
version exacte de son objectif**, aux jalons J21/J42/J90.

## Décisions prises — `D-111`

**La première question du lot n'était pas celle que la fiche posait.** Elle
proposait d'arbitrer « route dédiée vs extension de la route dossier » ; la vraie
question était en amont — **aucune table ne pouvait porter l'événement**.

`protocol_checkins`, le seul candidat, est ancrée à un PROTOCOLE
(`protocol_draft_id` et `id_assignation` NOT NULL) : une réponse portant sur un
objectif, qui n'a ni l'un ni l'autre, y serait inécrivable sans relâcher deux
colonnes porteuses. Et sa taxonomie est **J7/J14/J21**, quand les jalons de
l'objectif sont ceux de `JOURS_JALON` (**J21/J42/J90**) — la fusionner l'aurait
rendue bilingue sur ses DEUX axes, un `J21` y désignant deux moments différents
selon la ligne. C'est le raisonnement de `D-094` §2 pour l'amendement, retrouvé
au même endroit.

**`T0` est refusé comme jalon, et ce refus a demandé sa propre garde.** `T0` est
l'ANCRE des fenêtres, le moment où l'objectif se pose : demander à cet instant
« où en êtes-vous par rapport à votre objectif » n'a pas de sens. Or `T0` est une
valeur parfaitement légitime de `JOURS_JALON` — son exclusion ne se déduit
d'aucun cas négatif, puisque ceux-ci testent des valeurs REFUSÉES. Le contrat lit
donc la **définition** de la contrainte : un CHECK élargi à `T0` aurait laissé
tous les cas verts. C'est la leçon du LOT-01
(`dispositions_proposition_geste_check`), appliquée d'avance plutôt que
découverte en revue.

**L'EVA ne conclut rien.** Bornes 0-10 **purement techniques**, identifiées comme
telles (`DC-19`/`DC-20`) : aucune bande, aucun seuil, aucune direction, aucune
moyenne, aucun moteur ne la lit. Régime de `D-088`, appliqué **sans l'élargir**.
Facultative, nullable, sans DEFAULT. Le texte, lui, est obligatoire : sans quoi
une ligne serait un **chiffre nu déposé dans un dossier**.

**Aucune contrainte d'unicité**, et le contrat asserte cette ABSENCE (contrainte
ET index) : répondre deux fois au même jalon fait deux lignes. Un `UNIQUE`
transformerait un second geste en erreur technique, ou pousserait à l'`upsert` —
c'est-à-dire à écraser ce que le patient avait écrit.

## Fichiers modifiés

- `schema.prisma` : modèle `ReponseJalonObjectif` + relation sur `Patient`
- `migrations/20260825150000_alliance_jalons_objectif_v1/migration.sql`
- `checks/alli_jalons_objectif_v1_negatif.sql` (neuf)
- `.github/workflows/ci.yml` : le contrat inscrit — **T3 extrait sa liste de ce
  fichier**, un contrat non inscrit ne serait jamais joué localement
- `effacement.ts` + son banc : la table couverte nommément (FK RESTRICT)
- `DECISIONS.md` (`D-111`), fragment de changelog, fiche de lot

## Validations exécutées

- **T1 vert** (`npm run check`, code 0).
- **T3** : 5 934 Vitest + 418 bancs de contrat, contrats SQL joués contre
  PostgreSQL — le contrat neuf compris.
- **Quatre mutations vues rouges** sur le contrat neuf, base jetable, témoin vert
  avant et après : `T0` légalisé ; **la taxonomie élargie à `J180`**, valeur
  qu'aucun cas négatif ne teste — c'est la seule mutation qui prouve que
  l'assertion sur la DÉFINITION n'est pas décorative ; un index unique posé ; la
  borne haute de l'EVA portée à 100.

## Revue `wn-reviewer` de la migration : **GO**, quatre points moyens traités

Elle a joué **dix mutations de plus** que les miennes, toutes rouges (RLS
désactivée, FK en CASCADE, `DEFAULT 5` sur l'EVA, colonne `taux_atteinte`, CHECK
renommé…), et confirmé la parité schéma↔migration (`migrate diff` → *No
difference detected*).

- **M2, le seul défaut réel, corrigé pendant que la fenêtre était ouverte.**
  `btrim/1` ne retire QUE l'espace ASCII : un texte fait d'une tabulation et
  d'un retour ligne passait le CHECK censé l'interdire. Mesuré en base, pas
  supposé. La migration n'étant **pas encore appliquée**, le CHECK est resserré
  en `btrim(texte, E' \t\r\n')`, avec un septième cas négatif vu rouge sous
  l'ancienne rédaction. **Le trou existe dans les CHECK de texte déjà en
  production** (`amendements_objectif`, 6.0-A) — dette nommée à `D-111`, sans
  porteur.
- **M3, l'ancre, tranchée plutôt que reportée** (`D-111` §6) : celle de toute la
  chaîne, le `dateT0` du cycle, sans colonne ni copie. Compter « J21 » depuis la
  naissance de la version aurait fabriqué un **second calendrier** — la
  bilinguité que la Décision 1 reproche à `protocol_checkins`, déplacée d'un
  cran. Le jalon est la cadence du suivi, pas l'anniversaire de l'objectif.
- **M1, nommé comme préalable de la PR 2** : la taxonomie et les bornes
  n'existent qu'en SQL, et `resoudreJalonDu` rend `T0` pour un patient sans cycle
  confirmé — l'INSERT lèverait un 23514, donc un 500 patient, sur un chemin
  invisible de T1 et T2.
- **M4, la fenêtre d'effacement, écrite** (`D-111`, dette 4) : entre le merge et
  l'application, tout effacement de dossier échoue en 500. Fail-closed, aucune
  perte. Ne pas la « protéger » par un `try/catch` — ce serait ouvrir un
  effacement partiel.
- **La mutation qui manquait à ma liste** a été jouée : retirer la ligne
  `deleteMany` d'`effacement.ts` fait rougir la garde de complétude, nommément.

Finitions traitées : le libellé « index unique de lecture » (piège de relecture
dans un lot qui interdit tout index unique), le flottement « six CHECK » pour
sept cas et trois contraintes, et la justification de l'absence de passe Codex.

Nommées, non corrigées — toutes antérieures ou hors périmètre : les assertions
par nom de contrainte ne joignent pas `conrelid` (deux tables homonymes
tromperaient la lecture) ; l'ensemble des CHECK n'est pas **fermé** (rien
n'interdit un quatrième CHECK porteur de sémantique) ; aucune borne de longueur
sur `texte` en base ; l'index de lecture n'est prouvé que par le drift check.
Les trois premiers sont des limitations du patron, identiques au LOT-01.

## Problèmes ouverts

- **La migration n'est pas appliquée** : approbation `release-db` puis constat
  par conteneur avant toute PR de code. Ne pas écrire la route avant.
- Pas de CHECK « date non future » sur `repondu_le` (Postgres refuse `now()` dans
  un CHECK) — la borne se garde à la route, dette reconduite de 6.0-A et du
  LOT-01.
- `repondu_le` reste la colonne de DÉCLARATION du patron de campagne, sœur
  d'`exprime_le` et de `geste_le` : nulle tant que personne ne déclare de date.
- **La forme de la surface reste à arbitrer** en PR 2 : route dédiée ou extension
  de `api/portail/dossier`. Le POST de celle-ci porte déjà deux gestes ; un
  troisième la chargerait, mais la fenêtre de jalon est une condition d'affichage
  qui vit là où le dossier est assemblé. À trancher sur mesure, pas d'avance.
- **L'EVA décimale est arrondie par le cast `INTEGER` avant tout CHECK** (`5.5`
  devient `6`). Aucune contrainte ne peut voir la valeur d'avant le cast :
  l'exposition réelle est le SQL brut ou un import, et la garde appartient à la
  route (400 explicite, jamais un arrondi). Prisma refuse déjà le décimal côté
  client (`Int?`).
- **Aucun objectif ratifié ni amendé n'existe encore en production** : la surface
  du LOT-05 n'aura de sujet que lorsque la boucle du LOT-04 aura tourné une fois.

## Prochaine action exacte

PR 1. **Aucune passe Codex sur cette PR** — elle n'ouvre aucune surface
d'écriture patient neuve ; la classe P0 vaut pour la PR 2. (Elle touche bien le
chemin d'effacement RGPD, ce que la première rédaction de cette phrase passait
sous silence.) Après merge : approbation `release-db`, puis **constat par
conteneur** — et seulement ensuite la PR 2.

## Interdits encore actifs

- Aucun calcul sur l'EVA : ni moyenne, ni cumul, ni courbe, ni taux d'atteinte.
- L'absence de réponse à un jalon n'est jamais rendue comme un manquement
  (`DC-24`).
- Le portail reste en pull : aucune relance, aucune notification.
