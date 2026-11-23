# Handoff — H95 part B : D-556, le second appel en pause, le périmètre du verdict et du drapeau

## 1. Branche et état Git

- Worktree `b-h95-second-appel`, branche `b-h95-perimetre-verdict`, née de `origin/main` (avancée par `--ff-only` jusqu'à `b131df80`).
- Lot `h95-b-perimetre-verdict` (file B, carnet du registre D-503), documentation seule. Lot précédent `h95-b-d545-code` : fait (#2272, puis #2286 mergée `8f39f398`).

## 2. Objectif

Après le rejeu non conforme de D-545 §7 (#2286), consigner les arbitrages du responsable : trois lectures de la grille, l'ordre de la suite, le périmètre du verdict qui ouvre `WN_SYNTHESE_BIOLOGIE_ENABLED`, la règle de rejeu, et la porte propre de l'appel principal.

## 3. Décisions prises

- **Lectures de la grille** : `20261120-1855-b-h95` A (ligne 7), `20261120-1856-b-h95` A (ligne 10), `20261120-1857-b-h95` B (un diagnostic déclaré n'est pas une conclusion biologique).
- **Ordre de la suite** (`20261121-1622-b-h95`) : celui de Fable 5.2. D'abord le second appel en pause, puis le périmètre, puis la correction et le rejeu. Codex préférait corriger et rejouer.
- **Drapeau** (`20261123-1152-b-h95`, B) : il s'ouvre sur une évaluation conforme du second appel seul.
- **Rejeu** (`20261123-1153-b-h95`, B) : une modification fait rejouer l'appel qu'elle touche, seul, en entier.
- **Appel principal** :
  - `20261123-1154-b-h95`, A : la ligne 10 forme un lot propre, évalué avant le merge ;
  - `20261123-1205-b-h95`, B : ensuite, chaque version rejoue après son merge, à la charge de la file B. Codex préférait A, une porte bloquante pour toute version.
- **D-556 acceptée** le 2026-11-23 (« Valider tel quel »). Avis Codex à l'aveugle joint à chaque question ; contre-revue Codex : un P2 retenu.

## 4. Fichiers modifiés

- `docs/decisions/D-556.md` (nouveau, numéro réservé par `wn-reserver-decision.mjs`).
- `docs/decisions/D-539.md`, `docs/decisions/D-545.md` : un amendement daté ajouté à la fin, aucun texte validé touché.
- `docs/claude/plan-journal/H95/2026-11-23-01-part-b-d556-perimetre-verdict.md`.
- `changelog.d/2026-11-23-h95b-d556-perimetre-verdict.md`.
- Ce handoff.

## 5. Validations exécutées

- **Lecture de la production par conteneur**, le 2026-11-23, en lecture seule, agrégats seuls : la table `syntheses_ia` compte 84 lignes, dont la dernière date du 2026-10-28 (`synthese-v30`). Aucune synthèse n'a été générée depuis.
- **Avis Codex** (`wn-codex-avis.mjs`), tous code 0 :
  - la suite, en mode question : option 1, confiance moyenne ;
  - le périmètre, en mode question : B/B/A, confiance forte ;
  - la porte de l'appel principal, en mode question : A, confiance moyenne ;
  - D-556, en mode revue : un P2, corrigé.
- **Avis Fable** : agent `wn-fable`, sans lecture des avis de Codex.
- Les paquets et les avis sont hors du dépôt, dans `~/Developer/wn-eval/h95-d545-2026-11-20/questions/`.
- **Contrôles du dépôt** : `check_no_secrets` et `npm run check:rapide`, joués avant le commit.

## 6. Problèmes ouverts

- Le banc `web/scripts/eval-d539/` exige encore `synthese-v38`, alors que `synthese-v39` est servie depuis le 2026-11-20. Il ne sait pas non plus jouer l'appel principal seul.
- Pour l'étape 3, il reste au responsable la voie d'une vigilance posée par le code (une G partielle, écartée par D-539 §2), proposée par Fable.
- D-556 ne dit rien d'un changement de modèle, de constructeur ou d'assemblage : la question sera posée au responsable le moment venu.

## 7. Prochaine action exacte

Lot suivant de la file B, documentation seule : une décision qui propose les textes de la retouche de la ligne 10 dans la consigne principale, à valider mot pour mot par le responsable. Ensuite, le lot de code sous `release-db`, sans migration : la consigne retouchée, le banc mis à la version en service et en mode appel principal seul. La version retouchée est évaluée sur sa branche avant le merge.

## 8. Interdits encore actifs

- Ne pas poser `WN_SYNTHESE_BIOLOGIE_ENABLED`. Ne retoucher ni `synthese-biologie-v2` ni le contrôle de D-545 §4 avant l'étape 3.
- Aucune règle, aucun seuil, aucun texte clinique inventé. Une consigne n'est servie qu'avec des textes validés mot pour mot.
- Aucun dossier réel visé par une évaluation. Aucune donnée patient envoyée au fournisseur. Forme opaque au dépôt (D-251 §4).
- Ne pas merger : l'intégrateur merge sur « prête @sha ».
