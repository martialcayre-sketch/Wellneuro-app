# Handoff — J1-base : la minute d'après nomme la priorité retenue

## Branche et état Git

- Branche `j1-minute-apres-libelle`, partie de `origin/main` 9df1f20d.
  Worktree `d281-lot3-portail`. Un commit, PR à ouvrir. #1555 (libellé du
  menu) est ouverte en parallèle : conflit attendu sur `SESSION_LOG.md` au
  second merge, à résoudre en gardant les deux entrées.

## Objectif

Dette du plan (« La minute d'après affiche l'identifiant brut de la priorité
retenue ») portée dans J1-base (H43) : afficher le libellé.

## Décisions prises

- Le libellé se relit à sa source, sans recalcul : règle de
  `PRIORITY_RULES_V1` pour `priority:<id>` (même libellé que la carte de
  décision, `chaineC1.ts`) ; pour `libre:<domaine>:<empreinte>`, la ligne de
  `decisionPrioritySelection` qui porte CET identifiant (pas la tête du fil :
  le praticien a pu changer de priorité depuis la version enregistrée).
- Libellé introuvable : `null`, l'écran garde l'identifiant (aucun texte
  inventé).
- Module serveur `lib/copilote/libellePrioriteCloture.ts` : le registre
  importe `node:crypto`, il ne doit pas entrer dans le composant client ; le
  composant n'importe de `minuteApres` que des types.

## Fichiers modifiés

- `web/src/lib/copilote/libellePrioriteCloture.ts` (nouveau).
- `web/src/lib/copilote/minuteApres.ts` : `libellePriorite` dans la version
  active (optionnel) et dans la décision.
- `web/src/app/api/praticien/copilote/cloture/route.ts` : lecture du libellé.
- `web/src/components/copilote/ClotureMinuteApresPanel.tsx` : affichage.
- Bancs : `minuteApres.test.ts`, `route.test.ts` (trois cas : moteur, libre,
  introuvable), `ClotureMinuteApresPanel.test.tsx` (libellé, repli).
- Plan (H43, dette soldée), changelog, SESSION_LOG.

## Validations exécutées

- Vitest des quatre fichiers : 54/54 ; six gardes qui citent le registre :
  93/93.
- T1 rapide vert ; T1 complet et T2 : voir la PR.

## Problèmes ouverts

- Liste des restes J1-base (8 gestes, jetons, K-10, NF-6, NU-2a) : le
  responsable la colle.
- Suite file A : repli `localhost`, t16, t09, t08 (arbitrages du
  2026-10-18 en mémoire).

## Prochaine action exacte

PR, CI, revue CodeRabbit sur le sha de tête, merge après #1555 (un merge à
la fois, déploiement constaté), avec `--match-head-commit`.

## Interdits encore actifs

- Aucune migration ni modification de `schema.prisma` sans accord explicite.
- Aucune décision clinique sans D-xxx et fragment `changelog.d/`.
- Aucune identité réelle dans le dépôt ; production en lecture seule par
  conteneur.
