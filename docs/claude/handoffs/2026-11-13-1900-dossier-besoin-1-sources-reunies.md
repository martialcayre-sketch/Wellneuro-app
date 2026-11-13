# Handoff — 2026-11-13 — dossier de preuve du besoin 1, étape 3 : sources réunies (D-312, H15), lot de la file B

## Branche et état Git

- La branche `docs/besoin1-dossier-etape3` vit dans le worktree `.claude/worktrees/b-bp17-cadre`.
- Elle a été recréée deux fois sur `origin/main` alors qu'elle était encore vide, sans fusion ni rebase. La dernière tête est 7aa77bc3 (#2063).
- Session concurrente de la file B : `git` et `gh` en direct, sans `/wn-*`.

## Objectif

Étape 3 du dossier du besoin 1 :
- reporter au dossier privé les arbitrages des six questions de l'étape 2 ;
- réunir, sur accord et envoi par envoi, les sources manquantes de l'instrument et des biomarqueurs ;
- inscrire ces sources au registre ;
- laisser au responsable la signature, puis l'étiquetage.

## Décisions prises

- **Arbitrages du 2026-11-13, à ne pas rouvrir** :

  | Question | Réponse |
  |---|---|
  | `20261113-1030-b` | A |
  | `20261113-1031-b` | A |
  | `20261113-1032-b` | A |
  | `20261113-1033-b` | A, amendée (voir ci-dessous) |
  | `20261113-1034-b` | C |
  | `20261113-1035-b` | A |

  Le détail est dans la liste commune et au dossier privé.
- **Choix des sources, faits en session** :
  - pour un biomarqueur, une seule source d'autorité ;
  - pour le troisième, le résumé de la publication primaire et une revue en libre accès ;
  - une source sous licence interdisant la reproduction et le text-mining est écartée.
- **Amendement de `20261113-1033-b`** : sur un fait nouveau (aucune autorité ne fixe de seuil ; une recommandation française déconseille l'usage individuel), un biomarqueur reste « non évalué », avec sa raison sourcée. La liste commune porte l'amendement.
- **Trois envois en production, sur accord, tous constatés par conteneur en lecture seule** :

  | Envoi | Sources | Passages | Claims | Constat |
  |---|---|---|---|---|
  | Instrument | `WN-SRC-0470`, `0471` (déjà en base) | aucun nouveau | 68 | one-off-2659 |
  | `LOT_058` | `0654` à `0656` | 4 | 10 | one-off-6665 |
  | `LOT_059` | `0657` à `0659` | 4 | 4 | one-off-5780 |

  Les 82 claims sont tous en attente de validation, sans aucune clé de lien.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : six notices, de `WN-SRC-0654` à `0659`.
- `docs/claude/corpus/README.md` : décompte, plages et droits.
- `docs/claude/plan-journal/H15/2026-11-13-02-dossier-besoin-1-sources-reunies.md`.
- `changelog.d/2026-11-13-dossier-besoin-1-sources-reunies.md` ; ce handoff.
- Hors dépôt :
  - le dossier privé du besoin 1 (Claude Doc, rév. 20, lien hors dépôt) ;
  - la liste commune (amendement de `20261113-1033-b`) et le carnet de lots (`besoin1-dossier-etape3`) ;
  - la mémoire de session ;
  - les scripts d'ingestion dans le bloc-notes de la session.

## Validations exécutées

- Les charges ont été validées contre les contrats des routes d'ingestion du dépôt avant chaque envoi.
- Au registre : aller-retour JSON identique avant l'ajout, puis 631 notices.
- Banc identifiant–rubrique, anti-secrets et T1 complet : résultats donnés dans la PR.

## Problèmes ouverts

- La signature des 82 claims revient au responsable, dans l'atelier.
- La signature du repère sur les claims internes revient aussi au responsable (`20261113-1034-b` = C).
- La plage du biomarqueur retenu est à signer au dossier.
- L'étiquetage au besoin 1 se fera sur accord, après la signature.
- Les droits de trois sources restent à vérifier (registre, README).
- La lecture de la mesure dérivée n'a pas de source : elle reste descriptive.

## Prochaine action exacte

1. Lancer le CI de la tête en tâche de fond (`wn-attendre-ci.mjs`) ; seul `0` vaut. Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`), avec un verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » ; l'intégrateur merge.
2. Après la signature : étiquetage du besoin 1 sur accord (liste au dossier privé), puis positions et contre-revue.

## Interdits encore actifs

- Ni texte de claim, ni dose, ni seuil, ni nom de rubrique au dépôt, dans les tests ou dans les messages de commit (`D-325` §5, banc de #2043).
- Aucune règle, aucun seuil, aucun poids et aucune borne inventés. Aucun code clinique : il part avec J3-12f, après la signature et la décision clinique (`D-312` §3).
- Aucune ingestion, aucun étiquetage et aucune signature sans accord. La signature ne se délègue pas.
- Aucune migration. Aucune écriture en base hors de la route d'ingestion. Pas de `prisma format`.
- L'URL du dossier privé reste hors dépôt.
