# Handoff — 2026-11-13 — dossier de preuve du besoin 1 signé (D-312, H15), lot de la file B

## Branche et état Git

- La branche `docs/besoin1-dossier-signe` vit dans le worktree `.claude/worktrees/b-bp17-cadre`. Elle part de `origin/main` à 62418456 (#2065), sans fusion ni rebase.
- La PR précédente du dossier, #2066, est mergée (0b96978a).
- Session concurrente de la file B : `git` et `gh` en direct, sans `/wn-*`.

## Objectif

Mener le dossier du besoin 1 jusqu'à la signature :
- vérifier la signature des claims entrés à l'étape 3 ;
- étiqueter les claims au besoin 1 ;
- rédiger les positions ;
- les soumettre à une contre-revue ;
- les faire signer par le responsable.

## Décisions prises

- **Délégation permanente de l'étiquetage** (`D-325` §5), donnée en session le 2026-11-13. Elle ne s'applique qu'à des claims validés. **La signature reste au responsable** (`DC-16`) : il a refusé de la déléguer, et l'assistant a refusé de signer sur demande.
- **Signature des 82 claims** de l'étape 3, faite par le responsable dans l'atelier et constatée par conteneur (one-off-2200).
- **Deux lots d'étiquetage**, faits par délégation et constatés par conteneur :

  | Lot | Claims | Constat |
  |---|---|---|
  | 1 — claims de l'étape 3 | 78 au besoin 1, 4 au besoin 3 (`20261113-1032-b`) | one-off-3451 |
  | 2 — claims de cours déjà validés | 89 étiquetés, besoins existants conservés, 7 candidats écartés avec motif | one-off-1567 |

  Le besoin 1 compte 167 claims validés et étiquetés.
- **Contre-revue Codex** : pièces au dépôt privé des revues (`besoin1-assiette/`), consigne en treize affirmations à réfuter. Verdict : NO-GO pour la v0.1. Sept constats (cinq P1, deux P2), vérifiés sur les pièces et tous retenus. La table des verdicts est au dossier privé. Aucune seconde passe : rien ne la signale.
- **Positions v0.2** : vingt positions, dont une position d'éligibilité. L'étiquetage ne vaut pas autorisation : seuls les claims cités par une position signée fondent un constat ou un conseil. La liste des claims de provenance seule est au dossier.
- **Les vingt positions sont signées par le responsable le 2026-11-13** (cases cochées, texte inchangé, constat par lecture du dossier).

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-13-03-dossier-besoin-1-signe.md`.
- `changelog.d/2026-11-13-dossier-besoin-1-signe.md` ; ce handoff.
- Hors dépôt :
  - le dossier privé du besoin 1 (Claude Doc, rév. 29, onglets v0.1 et v0.2 ; lien hors dépôt) ;
  - le dépôt privé des revues (`besoin1-assiette/`) ;
  - la mémoire de session ;
  - les scripts et sorties de lecture, dans le bloc-notes de la session.

## Validations exécutées

- Avant chaque lot, les clés en place ont été relues en production, pour éviter tout écrasement : l'atelier remplace les clés.
- Chaque lot a été vérifié dans l'aperçu de l'atelier (aucune erreur), puis constaté par conteneur.
- Chaque identifiant cité par les positions a été contrôlé parmi les 167 claims : aucun absent.
- Chaque constat Codex a été relu sur le texte des claims : les sept sont confirmés.
- Banc identifiant–rubrique, anti-secrets et T1 complet : résultats donnés dans la PR.

## Problèmes ouverts

- La décision clinique qui ouvre J3-12f est à rédiger (`D-312` §3).
- J3-12f doit appliquer la liste d'éligibilité à la sélection des claims, sous un banc, en plus de la mesure dérivée et de la lecture des deux biomarqueurs retenus.
- Trois usages de population restent déclarés non évalués, et une rubrique reste non documentée : il faudra des sources avant toute conduite qui les exigerait.
- Les droits de trois sources restent à vérifier (registre, README).

## Prochaine action exacte

1. Lancer le CI de la tête en tâche de fond (`wn-attendre-ci.mjs`) ; seul `0` vaut.
2. Obtenir la revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`), et donner un verdict à chaque remarque.
3. Relire la boîte B, puis déclarer « prête @<sha> » ; l'intégrateur merge.
4. Ensuite : proposer la décision clinique de J3-12f au responsable.

## Interdits encore actifs

- Ni texte de claim, ni dose, ni seuil, ni nom de rubrique au dépôt, dans les tests ou dans les messages de commit (`D-325` §5, banc de #2043).
- Aucune règle, aucun seuil, aucun poids ni aucune borne inventés. Aucun code clinique avant la décision clinique (`D-312` §3).
- Aucune signature par l'assistant (`DC-16`). L'étiquetage délégué ne porte que sur des claims validés.
- Aucune migration. Pas de `prisma format`. L'URL du dossier privé reste hors dépôt.
