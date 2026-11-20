# Handoff — H95 part B : évaluation rejouée de D-545 §7 (2026-11-20)

## Branche et état Git

- Worktree `b-h95-second-appel`, branche `b-h95-d545-rejeu`, ouverte depuis `origin/main` après le merge de #2272 (squash 6f1b2735), avancée par `--ff-only` jusqu'à 61b7f54c.
- Diff de la PR : documentation seule. Un fragment de journal H95 et ce handoff ; aucun code.

## Objectif

Après le merge de #2272 et la release-db constatée : rejouer en entier l'évaluation de D-545 (§6 et §7), avec la clé de dev de ce Mac. Ajouter une lecture indépendante par Codex, puis rendre un verdict motivé sur chaque désaccord, sans interpréter les résultats.

## Décisions prises

- **Release-db de #2272 constatée** : run 44632828580 vert, `migrate status` vert sur conteneur, déploiement Scalingo de 6f1b2735 au statut `success`.
- **Rejeu sur 8c1d3bde** : #2273, entrée entre-temps, ne touche ni `web/src`, ni `web/prisma`, ni le banc.
- **Lecture de la session** : cinq lectures, une par paquet, contre la grille recopiée par `paquets-codex.mjs`. Relevés fermes et doutes séparés ; les doutes sont tranchés ensuite par la session, motif écrit.
- **Verdicts** :
  - Désaccords que le texte de la grille tranche : verdict motivé, avec la ligne citée.
  - Désaccords qu'il ne tranche pas : trois questions au responsable (`20261120-1855`, `-1856` et `-1857-b-h95`), chacune avec un avis Codex à l'aveugle (D-505).
  - Aucun n'a été tranché par défaut.
- **Verdict** : non conforme pour les deux appels, indépendamment des trois questions. Le détail est au journal H95, fragment `2026-11-20-01`.

## Fichiers modifiés

- `docs/claude/plan-journal/H95/2026-11-20-01-part-b-evaluation-d545-rejouee.md` (neuf) : compte rendu opaque, en agrégats.
- `docs/claude/handoffs/2026-11-20-2000-h95b-d545-evaluation-rejouee.md` (neuf).
- **Hors dépôt public** :
  - le dépôt privé des revues, dossier `h95-d545-evaluation-2026-11-20/`, avec `COTATION-SESSION.md`, `resume.json` et `pieces-brutes.tar.gz` ;
  - le registre D-503 : trois questions, un message lu, le lot `h95-b-d545-code` mis à jour.

## Validations exécutées

- `lancer.sh <sortie hors dépôt> --confirme` → 0 :
  - 72 générations, toutes en HTTP 200, entrées conformes 72/72 ;
  - aucune relance, ni à l'appel principal ni au second appel.
- `extraire.mjs` : phrase du §5 conforme 72/72.
- `paquets-codex.mjs` : cinq paquets.
- `wn-codex-avis.mjs --mode revue` : cinq avis conformes, code 0.
- `wn-codex-avis.mjs --mode question` : avis conforme, code 0.
- Pièces relues avant dépôt : ni secret ni adresse e-mail, dépôt des revues vérifié privé.

## Problèmes ouverts

- **Trois questions au responsable** (`1855`, `1856`, `1857`) : elles changent les comptes, pas le verdict.
- **`synthese-v39` (D-543, #2282)** est entrée sur `main` après le rejeu. Le banc `web/scripts/eval-d539/` exige encore `synthese-v38` et échoue sous v39 tant qu'il n'est pas repris. Une évaluation à venir se joue en entier, sous les consignes en vigueur.

## Prochaine action exacte

Au responsable :
- répondre aux trois questions ;
- décider de la suite après ce second « non conforme ».

La session ne propose aucune retouche des consignes ni aucune lecture de la grille.

## Interdits encore actifs

- Ne pas poser `WN_SYNTHESE_BIOLOGIE_ENABLED`, ne pas ouvrir.
- Aucun dossier réel visé, aucune donnée patient envoyée au fournisseur.
- Forme opaque au dépôt public (D-251 §4) : extraits de sorties au dépôt privé seulement.
- Aucune règle, aucun seuil, aucun texte clinique inventés ; aucune retouche des textes validés de D-545.
- Aucune interprétation des résultats.
- Pas de merge : l'intégrateur merge.
