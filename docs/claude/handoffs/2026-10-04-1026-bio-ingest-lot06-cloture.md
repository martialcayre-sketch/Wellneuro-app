# Handoff — 2026-10-04 — BIO-INGEST LOT-06 clos (D-261, D-263, D-264) ; lot suivant LOT-03

## Branche et état Git

- `docs/bio-ingest-lot06-cloture-finale`, partie de `origin/main` à `5a3fa7d2` (merge de #1302),
  puis à niveau de `main` après #1303. PR de clôture : #1304.
- Campagne `2026-09-30-bio-ingest` : LOT-06 **terminé**, lot actif **LOT-03**.
- **#1303** (corrections du cadrage BIO-PARCOURS et dette nommée) est mergée : la dette à laquelle
  renvoie la fiche du LOT-06 est sur `main`.

## Objectif

Clore le LOT-06 : rattacher et rendre validables les analyses d'un compte rendu courant.

## Décisions prises

- **[[D-261]]** (#1296) : 36 analytes au catalogue (85 au total), une unité SI chacun ;
  « mL/min/1,73 m² » entre au vocabulaire.
- **[[D-263]]** (#1299) :
  - le resolver est re-signé `be9a463c…8fc3` (145 entrées) ;
  - l'unité lue départage un libellé ambigu ;
  - cinq notations équivalentes sont admises.
- **[[D-264]]** (#1302) : l'hémoglobine et la CCMH passent en g/dL, les folates érythrocytaires en
  ng/mL, comme le laboratoire les imprime. C'est une dérogation à la règle SI, limitée à ces trois
  analytes, arbitrée par le responsable (« caler sur l'impression »).
- **Revue Copilot de #1302** : une course possible entre la garde de migration et une saisie en
  vol. Le constat est **écarté avec motif**, sur arbitrage du responsable. L'invariant en base
  « unité du résultat = unité du catalogue » devient une dette nommée (`FILE_ATTENTE.md`, via #1303).
- **Lot suivant arbitré : LOT-03** (photo ou scan), qui portera aussi le bouton « Relancer la
  lecture ».
- **Audit BIO-PARCOURS** : versé comme proposition de cadrage **non arbitrée**
  (`CADRAGE_BIO_PARCOURS_2026-10-04.md`, #1301).
  - Quatre constats P2 d'une contre-revue Codex, puis quatre constats Copilot, sont corrigés
    dans #1303.
  - Les 19 questions du §7 attendent le responsable.

## Fichiers modifiés (cette PR)

- La fiche `LOT-06-catalogue-compte-rendu-courant.md` (statut, étapes, résultats) et `CAMPAGNE.md`
  (lot courant LOT-03, renvoi « Relancer la lecture »).
- `.wn/state.json` et `ACTIVE_CAMPAIGN.md`, régénérée par `wn-cycle --appliquer`.
- Une entrée dans `SESSION_LOG.md`, et ce fragment de handoff.

## Validations exécutées

- **#1302** :
  - T1 complet vert ;
  - T3 vert (Vitest : 11 520 ; intégration : 1 623 ; E2E : 225 ; dérive schéma ↔ migrations nulle) ;
  - CI verte sur la tête mergée.
- **`release-db`** run 37188072447 : approuvé par le responsable, conclusion `success`, sentinelle
  `WN_RELEASE_DB_OK id=37188072447-1`.
- **Constat par conteneur** (2026-10-04, one-off-6795, en lecture seule) :
  - les deux migrations du 2026-10-03 sont appliquées ;
  - les trois unités sont en vigueur ;
  - les quatre CHECK d'unité sont identiques (même empreinte) et portent « g/dL » ;
  - aucun résultat des trois codes n'a une autre unité que celle du catalogue ;
  - le catalogue compte 85 analytes.
- **Déploiement Scalingo** : le dernier est `5a3fa7d2` = tête de `main`, sans recul.
- **Constat PAT030** (2026-10-03) : 55 lignes sur 58 rattachées, 40 validables. Le banc passe à 43
  sur 58 avec D-264.
- **#1301 et #1303** : `check:rapide` vert, CI verte (#1303 en attente de son dernier run).

## Problèmes ouverts

- Les trois lignes de PAT030 (hémoglobine, CCMH, folates) sont désormais validables. Leur
  validation reste un geste du praticien, **non constaté**.
- « Fer » seul et « Aspect » restent non rattachés : c'est voulu (D-263).
- Un import `extrait` n'a pas de bouton « Relancer la lecture » : routé au LOT-03.
- Rien en base n'impose que l'unité d'un résultat soit celle du catalogue (dette nommée).
- Le document Claude Docs de l'audit porte la version d'avant les corrections. La version qui
  fait foi est celle du dépôt après #1303.

## Prochaine action exacte

1. #1304 : CI verte sur sa tête, commentaires de revue traités, merger.
2. `/clear`, puis LOT-03 en mode Plan, avec le bouton « Relancer la lecture ».

## Interdits encore actifs

- Aucune conversion d'unité (D-157). Une notation équivalente demande un arbitrage par paire.
- Le resolver ne se retouche jamais sans re-signature `D-xxx` ; son SHA reste un littéral.
- Aucune plage, borne ou indication au catalogue (D-059). `release-db` reste un geste humain.
- Changer l'unité d'un analyte qui porte déjà des résultats exige d'abord l'invariant en base.
- BIO-PARCOURS n'est pas ouverte : rien ne lit une valeur biologique tant que les questions du §7
  ne sont pas arbitrées (D-122).
- Les dossiers réels se désignent uniquement par leur identifiant.
