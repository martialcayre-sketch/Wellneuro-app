# Handoff — 2026-11-13 — Refonte Lien PRA-3b, PR 4 : Actions et protocole (P15 à P18)

## Branche et état du dépôt

- Branche `worktree-refonte-lien-pra3b-pr4-actions`, créée depuis `origin/main` après le merge du micro-lot Q18 (#2083, 9092b281), puis avancée en `--ff-only` sur `origin/main` (d9c4f769, #2084, documentation seule) sur arbitrage du responsable : le crochet de fraîcheur bloquait l'édition, il n'a pas été contourné.
- Worktree `.claude/worktrees/refonte-lien-pra3b-pr4-actions`. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

PR 4 de PRA-3b (matrice des huit PR) : phase Actions, sous-vues Protocole, Historique et Diffusion (P15 à P18), selon les réponses « a » du responsable (« Toutes en a », 2026-11-13) à Q3, Q13 et Q14 ; Q18 est livrée par le micro-lot #2083.

## Décisions prises

- Q13 a : raison d'être et trois plans en zones de texte qui grandissent (gabarit CSS par pseudo-élément `data-valeur`, sans nœud de texte en double) ; les plans restent d'une ligne logique (sauts de ligne retirés, comme le champ d'une ligne qu'ils remplacent) ; « Intitulé » et « Critère observable à J21 » restent des champs d'une ligne. Sommaire d'ancres « Action N » sous 1 024 px dès deux actions, nommé par le titre h4 « Actions (n/max) », focus sur le `fieldset` de l'action, sans fragment d'URL. Barre basse collante sous 1 024 px : état du brouillon, « Enregistrer la version » et « Réinitialiser » (bordé) dans la même rangée ; `bottom-16` au téléphone (barre de navigation), `bottom-0` à la tablette, à plat au bureau ; `scroll-margin-bottom` de 11 rem sur les champs, boutons et ancres (relecture ui-ux-pro-max, « Focus Not Obscured (Minimum) », WCAG 2.4.11 : les boutons n'y étaient pas).
- Q14 a : « saisie hors du serveur » = frappe depuis l'enregistrement, ou `saveState` à `saving`, `error` ou `stale`, ou refus de registre en attente de confirmation. Le constructeur le signale (`onModificationsLocales`) ; le cockpit suspend le bouton (et la fonction) ; le panneau affiche le texte existant juste au-dessus, relié par `aria-describedby`. Position de défilement notée au départ d'une sous-vue, rendue au retour par le sélecteur seulement (pas à l'entrée dans la phase).
- Q3 a : P15-P18 n'avaient déjà qu'une action pleine par zone ; rien à rendre bordé. Anneaux de focus ajoutés.
- Ordre au bureau : la coche « J'ai relu ce contenu » passe au-dessus de l'état du brouillon (elle était dessous), pour que la barre collante tienne l'état et le geste ensemble.

## Fichiers modifiés

- `web/src/components/patient-cockpit/ProtocolMiniBuilder.tsx` (champs extensibles, ancres, barre collante, signal de saisie locale, focus).
- `web/src/components/patient-cockpit/ProtocolDiffusionPanel.tsx` (`modificationsLocales`, focus).
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` (position au retour de sous-vue, saisie locale vers la diffusion, garde dans `approveForDiffusion`).
- Tests : `ProtocolMiniBuilder.test.tsx` (300 caractères par plan, saut de ligne, h4 et sommaire, focus d'ancre, barre collante, signal), `ProtocolDiffusionPanel.test.tsx` (suspension, aperçu sans requête), `ClinicalRuntimeSection.test.tsx` (saisie locale → Diffusion suspendue, aller-retour).
- `changelog.d/2026-11-13-refonte-lien-pra3b-pr4-actions-protocole.md`, ce handoff.

## Validations exécutées

- Vitest ciblé (constructeur, diffusion, cockpit, garde de diffusion) : vert hors un dépassement de délai sous charge 26 à 32 sur les bancs de barème du constructeur, verts seuls (moins d'une seconde) — le fichier ne nettoie pas son DOM entre les bancs.
- T1, T2, CI, revues : voir la PR.

## Problèmes ouverts

- Les bancs de `ProtocolMiniBuilder.test.tsx` accumulent leur DOM (pas de `cleanup`) : sous forte charge, les derniers dépassent 5 s. Hors du périmètre ; un `afterEach(cleanup)` global serait à vérifier banc par banc.
- Planche « Diffusion, validation et retour » : deux colonnes à 834 px et focus sur le message d'état après validation ne sont pas dans la réponse Q14 a ; non faits.
- Après un échec d'enregistrement suivi de « Réinitialiser », la validation reste suspendue jusqu'au prochain enregistrement réussi (le `saveState` est tenu par le cockpit).
- Hérités : « Activer la décision JA » sous T-63 (PR 5) ; titre des portes biologiques lié à « Assiettes indiquées » (PR 6b) ; fenêtre sans verrou de Q18.

## Prochaine action exacte

Revue (PR-Agent, et `wn-reviewer` si demandée) puis fusion par l'intégrateur ; ensuite la PR suivante que désigne le responsable (PR 1, 3, 7 ou 8), depuis un worktree neuf sur `origin/main`.

## Interdits encore actifs

- Rien de clinique ; aucun texte hors de D-488 ; aucune migration, aucun drapeau.
- Identités fictives seulement ; production en lecture seule ; crochet de fraîcheur jamais contourné.
