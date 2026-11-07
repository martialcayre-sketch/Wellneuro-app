# Handoff — 2026-11-07 — File C, place 8 : migration de l'identité d'auteur (BP-14, F10, D-459)

## Branche et état du dépôt

- Branche `feat/bp14-migration-identite-auteur`, créée depuis `origin/main`
  (`ab7b5257`, qui contient #1922), puis avancée par `--ff-only` jusqu'à
  `8ec63ded` (#1923, #1926, docs seules), avant tout commit propre.
- Worktree `.claude/worktrees/bp14-migration` : session concurrente, cycle
  en `git`/`gh` direct.
- **PR de migration seule, P0.** Elle reste à sa file (D-373) : cette
  session la merge, et la suit jusqu'au constat de la release-db.

## Objectif

Point 2 de « Ordre des PR » de la fiche LOT-14 (D-459 §8) : les deux
colonnes facultatives, la reprise de l'historique avec son refus, le
contrat négatif et sa ligne de CI, le bloc `schema.prisma`. Aucun code
consommateur.

## Décisions prises

- Migration `20261107230000_identite_auteur_protocoles_v1` :
  - garde d'abord : `identite_auteur_praticiens_distincts()` compte les
    e-mails distincts (`lower`, blancs exclus) de `patients` ∪
    `journal_acces_dossiers` ; au-delà d'un, `RAISE EXCEPTION` (`WN459`)
    avant toute écriture ;
  - `cree_par` et `valide_par`, `TEXT NULL`, sans défaut ;
  - reprise par la fonction `identite_auteur_protocoles_reprise()` :
    versions relues et approbations remplies, `draft` nulles, `updated_at`
    intact, praticien blanc → nul ; elle rejoue la garde et refuse si un
    auteur est déjà posé (aucune seconde reprise, D-459 §5) ;
  - EXECUTE retiré à PUBLIC sur les deux fonctions.
- **Choix de forme hors D-459, retenu par le responsable** (2026-11-07,
  après la revue `wn-reviewer`, GO, quatre P2) : la reprise vit dans une
  fonction conservée en base, pour que le contrat l'éprouve elle-même sur
  la base vide du CI (patron de `20260728090000`). Limite nommée dans la
  migration et au journal de F10 : le verrou se rouvrirait si toutes les
  lignes à auteur disparaissaient ; seul un SQL manuel, interdit par D-087,
  s'en servirait.
- Trois retouches retenues par le responsable : commentaire « pré-lecture »
  au lieu d'un constat annoncé ; deux cas au contrat (praticien blanc,
  verrou par l'approbation seule) ; en-tête du contrat honnête sur ce que
  « sans rien écrire » prouve. P2-4 (concurrence théorique garde/insert) :
  écarté, un seul compte en production.
- Branche remise à niveau par rebase du commit local, sur arbitrage
  (#1927 à #1929, sans conflit au `merge-tree`).

## Fichiers modifiés

- `web/prisma/migrations/20261107230000_identite_auteur_protocoles_v1/migration.sql` (neuf).
- `web/prisma/schema.prisma` : `creePar` et `validePar`, alignés à la main.
- `web/prisma/checks/identite_auteur_protocoles_v1_negatif.sql` (neuf).
- `.github/workflows/ci.yml` : une étape, après le contrat du NIR.
- `changelog.d/2026-11-07-bp14-migration-identite-auteur.md` (neuf).
- `docs/claude/plan-journal/F10/2026-11-07-03-migration-identite-auteur.md` (neuf).
- Fiche LOT-14 (statut), ligne BP-14 de `CAMPAGNE.md`, ce handoff.
- Hors dépôt : page BioFlow, ligne p28 ; page de la file C, ligne a08.

## Validations exécutées

- Sonde release-db à 0 avant d'écrire (après la conclusion du run de
  #1920) ; aucune PR ouverte ne porte de migration.
- Base locale jetable construite par `migrate deploy` : contrat vert.
- Sept mutations de la fonction (filtre de statut, seuil de la garde,
  verrou de seconde reprise, casse du journal, casse de l'approbation,
  exclusion des blancs, verrou réduit à `cree_par`) : chacune rougit le
  contrat sur sa promesse.
- `wn-reviewer` : GO sur le premier commit, quatre P2 arbitrés ci-dessus.
- Au constat : comparer les compteurs de la reprise aux attendus (P2-2 a
  et c), qu'aucun banc du CI ne voit.
- Migration répétée sur une base jetable peuplée : refus à deux praticiens
  (ni colonne ni fonction créée), puis 1 version et 1 approbation remplies
  avec un seul, `draft` nulle, rejeu de la reprise refusé.
- `prisma validate` vert. T1 complet, T3 et anti-secrets : voir la PR.

## Problèmes ouverts

- **Préflight `preflight_liens_axe`** : le run release-db de #1920 a
  échoué ce soir sur D-351 §5 (un lien d'axe cite un claim qui n'est plus
  VALIDE). Ce préflight tourne à chaque release-db : il doit être levé
  (re-signature conservatoire, #1926) avant que celle de cette migration
  puisse passer. À constater avant le merge.
- Date seuil et instant de déploiement du code : inconnus jusqu'au constat.

## Prochaine action exacte

1. CI : `node scripts/wn-attendre-ci.mjs <N>` en fond ; seul 0 compte.
2. Revue : `wn-reviewer` sur tout le diff ; CodeRabbit, sinon PR-Agent ;
   passe Codex manuelle (diff préparé pour `$wellneuro-pr-review`). Un
   verdict par remarque ; toute remarque sur la migration en arbitrage.
3. Avant merge : préflight des liens d'axe levé, étape 7 bis,
   `wn-sonde-release-db.mjs <N>` à 0 ; prévenir le responsable, qui choisit
   le créneau et approuve.
4. Après : sentinelle `WN_RELEASE_DB_OK id=<run>`, `migrate status` par
   conteneur agrégé par nom, reprise relue en agrégats, première ligne des
   déploiements = tête de `main` ; date seuil au journal de F10 et à la fin
   de D-459 (PR de doc).

## Interdits encore actifs

- Aucun code applicatif ni lecteur des colonnes avant le constat ; le code
  et ses trois bancs viennent dans la PR suivante.
- `auth.ts` et les rôles intacts ; rien sous `web/src/lib/clinical/` ;
  lecteurs de `approvedBy` inchangés.
- Production en lecture seule, par conteneur, en agrégats ; aucun e-mail,
  identité ni identifiant de dossier au dépôt.
- Ne pas reposer les arbitrages rendus (BP-14, D-459, BP-12b, D-417, D-434,
  D-437, D-353, D-357). La D-xxx de BP-18a et la règle signée sont de la
  main du responsable.
