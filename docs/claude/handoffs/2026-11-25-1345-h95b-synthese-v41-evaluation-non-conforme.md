# Handoff — H95 part B : `synthese-v41` (D-559), évaluation de l'appel principal seul non conforme

## 1. Branche et état Git

- Worktree `b-h95-second-appel`, branche `b-h95-ligne10-v41`, née d'`origin/main` après le merge de #2338 (`03f9c3a9`). `origin/main` y a été fusionnée deux fois, sans fichier commun (consigne du lot).
- Commit du code évalué : `70f134e4`. Lot `h95-b-ligne10-v41` (file B, carnet D-510), **rangé `bloque`** : le verdict est non conforme et la suite revient au responsable.
- PR en brouillon, **non déclarée « prête »** : rien de ce lot ne se merge en l'état.

## 2. Objectif

Servir `synthese-v41` (D-559 §3) après une évaluation conforme de l'appel principal seul (D-559 §4) : consigne, empreinte, gardes et banc, puis évaluation et cotation.

## 3. Décisions prises

- Les sept textes (D-557 §2, D-559 §3) ont été insérés par script, recopiés des décisions ; la garde reconstruit la section à partir des citations et vérifie la place de chaque texte.
- `20261125-1220-b-h95` : **C**. Aucun des 24 dossiers ne déclarait un examen demandé. Un 25e dossier s'ajoute, ce qui donne 75 sorties ; c'est consigné en D-559 §6, qui recopie aussi les lectures 1425 et 1426 pour le banc.
  - Raison : `ci.yml` refusait la lecture du journal depuis `web/` (invariant `lus`), et la modification de `ci.yml` a été refusée par le mode auto.
- **Verdict : non conforme.** 34 générations sur 75 sont en violation, dont 26 communes aux deux lectures. La forme dominante est l'état de messagers du libellé d'un questionnaire, dit à l'indicatif (1109 B).
- `20261125-1333-b-h95` A, `1334-b-h95` A, `1335-b-h95` A : lectures de la grille pour la suite (journal H95, `2026-11-25-03`).

## 4. Fichiers modifiés

- `web/src/lib/anthropic.ts` : les textes, `synthese-v41` et le commentaire de version.
- Gardes : `promptBiologie.guard.test.ts`, `promptAlimentaire.guard.test.ts`, `anthropic.corpusActif.guard.test.ts`, `biologie.generation.test.ts`.
- Banc `web/scripts/eval-d539/` : `dossiers.ts` (dossier 25), `evaluation.eval.ts` (v41), `paquets-codex.mjs` (lectures de D-559).
- `docs/decisions/D-559.md` (statut et §6).
- Journal H95 `2026-11-25-03-part-b-evaluation-synthese-v41.md`, `changelog.d/2026-11-25-h95b-synthese-v41-code.md`, et ce handoff.

## 5. Validations exécutées

- `npm run check:rapide`, puis `npm run check` (T1 complet), verts avant le commit. Un premier T1 était rouge sur l'invariant `lus` ; il a été corrigé par D-559 §6.
- Essai de fumée (dossier 25, 1 passage), puis les 75 générations : 75 HTTP 200, entrées conformes 75/75, aucun second appel.
- Cotation : quatre lectures de la session, indépendantes ; quatre avis Codex (code 0) ; avis Codex à l'aveugle sur les quatre questions.
- Pièces au dépôt privé des revues, sous `h95-d559-evaluation-2026-11-25/`. Copie locale : `~/Developer/wn-eval/h95-d559-2026-11-25/`.
- Pas de T3 : rien ne doit être mergé.

## 6. Problèmes ouverts

- `synthese-v41` est non conforme. Selon D-559 §4, la suite passe par une nouvelle décision de retouche, puis par un nouveau rejeu de l'appel principal en entier (75 sorties, D-559 §6).
- La forme dominante a augmenté par rapport à `synthese-v40` : le texte 3 ne la ferme pas. Les formes a, b, e et g sont presque fermées (une seule génération dit un examen « disponible »). Les formes c, d, f et h restent, en petit nombre.
- Questions `1220`, `1333`, `1334` et `1335-b-h95` : `repondue`, à passer à `close` avec la décision suivante.
- Le banc de la branche (dossier 25, lectures de D-559) peut servir au prochain rejeu ; il n'est pas sur `main`.

## 7. Prochaine action exacte

Au responsable :
- lire le constat (journal H95, fragment `2026-11-25-03`) ;
- dire la suite : une nouvelle décision de retouche (D-559 §4), ou une autre voie.

La PR de ce lot reste en brouillon d'ici là.

## 8. Interdits encore actifs

- Ne pas merger ni déclarer « prête » la PR de ce lot : `synthese-v41` n'est pas servie.
- Ne pas poser `WN_SYNTHESE_BIOLOGIE_ENABLED`. Ne retoucher ni `synthese-biologie-v2` ni le contrôle de D-545 §4. Le second appel reste en pause (D-556 §7).
- Aucun texte clinique hors D-557 §2 et D-559 §3, et aucune retouche de ces textes sans décision.
- Aucun dossier réel visé, aucune donnée patient envoyée au fournisseur, forme opaque au dépôt (D-251 §4).
