# Handoff — 2026-11-04 — Besoin 2, iode et sélénium : sources externes au registre (LOT_053)

## Branche et état Git

`docs/registre-iode-selenium`, worktree `.claude/worktrees/registre-iode-selenium`,
partie de `origin/main` c5fa8304. PR de documentation seule : aucune
migration, aucun `schema.prisma`, aucun code.

## Objectif

Sixième et dernier dossier de preuve des minéraux et vitamines du besoin 2
(ordre H15) : verser au registre public, en forme opaque (D-251 §4), les
sources externes dont des extraits ciblés ont été ingérés en base.

## Décisions prises

- Huit notices `WN-SRC-0631` à `0638`, titre seul ; `0635`, `0636` (résumés
  des caractéristiques du produit) et `0637` (Ciqual) `rightsStatus: verified`
  (Licence Ouverte), comme les précédents RCP `0517`, `0520`, `0572` ; les
  cinq autres `to_verify`. Trace du lot `LOT_053_2026-11-02` sur `WN-SRC-0521`.
- `0628` à `0630` restent libres : marge prise le 2026-11-02, jour où le
  registre avançait vite (aucune réservation de numéros entre sessions).
- Le contenu clinique du dossier (verdicts, arbitrages A1-A13, positions) vit
  dans le dossier privé du responsable ; rien n'en est versé ici.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` (610 notices), `docs/claude/corpus/README.md`
- `changelog.d/2026-11-04-besoin2-iode-selenium-sources-externes.md`

## Validations exécutées

- Avant d'écrire : maximum `WN-SRC-0627` sur `origin/main` ; une seule PR
  ouverte, qui ne touche pas le corpus.
- En base, par conteneur, en lecture seule : 22 passages actifs du lot
  (`0521` : 3, `0631` à `0638` : 19) ; 36 claims VALIDE (8 sur `0521`,
  28 sur `0631` à `0638`) ; aucun passage ni claim sous `0628` à `0630` ni
  au-delà de `0638` ; base entière : 8641 VALIDE, 26 REJETE, 0 en attente.
- `bash scripts/check_no_secrets.sh` ; bancs `verifier_registre_instruments`,
  `verifier_registre_interventions` et `changelog-collate` (114/114). Le
  worktree n'a pas de `node_modules` : type-check, lint et vitest tournent en CI.

## Problèmes ouverts

- Aucune réservation des numéros `WN-SRC-` entre sessions.
- La mention « claims en attente de signature » des lots magnésium et B9/B12
  sur `WN-SRC-0521` est périmée ; non retouchée (hors périmètre).

## Prochaine action exacte

Étape 5 du dossier, sur accord : test « un claim retenu sans être servi ne
l'est ni dans sa rubrique ni par la recherche », puis liste d'étiquetage en
lot (D-325) au dossier privé, jamais au dépôt.

## Interdits encore actifs

Aucune migration ni `schema.prisma` ; aucune écriture en base hors de la
route d'ingestion et de l'atelier ; aucun seuil ni dose inventés ; ni
`BESOIN_SOURCES`, ni `versionScore`, ni logique clinique ; forme opaque au
dépôt ; ne pas reposer A1 à A13 ; essai D-373 : déclarer « prête », ne pas
merger.
