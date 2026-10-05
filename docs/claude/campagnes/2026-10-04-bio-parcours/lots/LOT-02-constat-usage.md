---
id: "LOT-02"
titre: "BP-02 — Constat d'usage et ligne de base"
statut: "terminé (2026-10-05)"
dépend_de: "—"
---

# LOT-02 (BP-02) — Constat d'usage et ligne de base

## But

Mesurer l'usage réel avant toute surface : c'est la ligne de base du verrou
d'ouverture (`D-266` §12).

## Résultat observable

Une note datée, en agrégats et sans identifiant, mesurée par conteneur.

## Périmètre

La note compte :
- les résultats par source, les lignes candidates par statut, les refus
  d'unité et les imports non décidés ;
- les attentes `conditionnelle_biologie` des deux véhicules ;
- les diffusions, les check-ins et les comptes ;
- les lignes de `clinical_rules` et de `biology_analyte_links` ;
- `SAF-EI-01`, et l'état de `WN_EI_INTERRUPTION` et de `WN_C4_ENABLED`.

La mémoire « aucun protocole 21 jours servi en production » est rafraîchie.

## Hors périmètre

Toute écriture, tout code, toute lecture par nom.

## Fichiers probables

- `docs/claude/campagnes/2026-10-04-bio-parcours/` (note datée)

## Interdits

- Lecture seule depuis un conteneur `scalingo run -d` ; jamais par nom ni par
  e-mail.
- Session hors mode auto : le classifieur refuse `run -d` avec `psql`.
- Aucune note dans `lots/` (dossier fermé aux fiches).

## Dépendances

Aucune : seul lot à ne pas attendre BP-00 (lecture seule). La décision du
2026-10-21 (`D-265`) couvre aussi les lectures postérieures à cette date.

## Étapes

- [x] Écrire les requêtes d'agrégats.
- [x] Lire au conteneur.
- [x] Rédiger la note datée.

## Tests

Aucun banc ; relecture des agrégats.

## Critères de done

Note datée versée ; aucun identifiant ni nom dans le dépôt.

## Résultats

Note versée : `CONSTAT_USAGE_2026-10-05.md` (script `CONSTAT_USAGE_BP02.sql`).
Le constat « aucun protocole 21 jours servi » est périmé : deux V4 ont été
diffusés, sans check-in. `clinical_rules` et `biology_analyte_links` sont
vides ; il n'y a aucune attente `conditionnelle_biologie`.
