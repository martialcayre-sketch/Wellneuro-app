# Handoff — 2026-09-16 — La clause `DC-19` mesurée plutôt que gardée

## Ce qui était ouvert

Le finding P0 de la passe Codex rétroactive sur #1098 : la clause `synthese-v30`
est l'unique contrôle du contenu produit, `analyserSortieSynthese` ne lisant que
la structure. Correction proposée : filtrer la sortie avant persistance.

## La mesure

| Version | Synthèses | Avec formulation de durée |
| --- | --- | --- |
| `v29` | 31 | 27 |
| `v30` | 6 | 6 |

Le 6/6 n'est pas un échec : le motif attrape toute durée. Les six relèvent des
trois cas autorisés — déclaratif patient, question d'entretien, durée de recueil
de l'agenda portée par la donnée. **Aucune fenêtre de rappel d'instrument.**

## Le finding évité de peu

Deux synthèses citent « < 14 nuits exploitables » — un seuil servi comme une
règle, ce qui est du `DC-19` et pire qu'une fenêtre inventée puisque le chiffre
est juste.

Chaîne remontée : `MIN_NUITS_INDICE = 14` existe ; le moteur ne transmet qu'un
drapeau binaire ; `interpretation` est NULL ; **mais `scores_json` porte la note
en toutes lettres**, et `scoresPourPrompt` ne la retire pas. Restitution, pas
invention.

Une alerte remontée à l'avant-dernière étape aurait été fausse.

## La décision

**Pas de filtre de sortie.** Sans gain mesuré, et coûteux : « 14 nuits » de
l'agenda et « 14 nuits » du seuil sont la même chaîne servie pour deux raisons.
Aucun détecteur lexical ne les sépare — il censurerait les six occurrences
légitimes pour zéro fabriquée.

## Comment rejouer la mesure

Un one-off agrégé sur `syntheses_ia`, groupé par `version_prompt`, comptant les
occurrences d'un motif de durée dans `synthese_json::text`. Aucun texte clinique
ne sort pour le comptage ; l'extraction de fragments, elle, en sort et se demande.

## Limites, à lire avec le constat

Six synthèses ne prouvent pas un comportement — c'est la population réelle depuis
la mise en service de `v30`, pas un échantillon. Et une seule dimension a été
mesurée : les durées.
