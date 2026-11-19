# Handoff — 2026-11-19 — Refonte Lien / Empreinte, PRA-6f : contraste du statut des phases

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra6f-contraste-phases-9b589b`, worktree `.claude/worktrees/refonte-lien-pra6f-contraste-phases-9b589b`. Partie de `da125214e` (#2245). Un premier commit (`724f7054c`), poussé tôt pour lancer `visual-baselines`, a été dépassé par `main` (5 commits de documentation, sans fichier commun). Le crochet de fraîcheur bloquait alors toute écriture (D-518 §2). Le responsable a autorisé la remise à niveau (« oui, PRA-6f peut refaire sa branche et pousser en force-with-lease », relayé le 2026-11-19). La branche a été refaite sur `0ffd9d202` (#2252) : cherry-pick, puis `reset --soft`, un seul commit, push `--force-with-lease`.
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454).

## Objectif

Lot PRA-6f du constat PRA-6 (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/pra6-constat.md`, §3.6, axe `color-contrast`) : le statut de la phase « en attente » du rail des phases de la fiche doit atteindre 4,5:1, avec un jeton existant, sans changer ni la taille ni la graisse.

## Décisions prises

- **Fond réel.** Le rail est posé sur la sauge du conteneur de la fiche (`bg-muted`, `#e6ebdd`), et pas sur l'ivoire de la page. Le fond argile `bg-accent/10` composé sur la sauge donne `rgb(226,224,209)`, et `bg-accent/[.14]` au survol donne `rgb(224,220,205)`.
- **Rapports calculés** (WCAG 2.x, valeurs de `globals.css`) :

  | Texte | sauge | sauge + accent/10 | sauge + accent/14 (survol) | carte active (surface) |
  |---|---|---|---|---|
  | `text-muted-foreground` (`#52676c`) | 4,92 | **4,51** | **4,35** | 5,84 |
  | `text-foreground` (`#233b42`) | 9,74 | 8,93 | 8,61 | 11,56 |
  | `text-accent-ink` (`#80523e`) | 5,41 | 4,96 | 4,79 | 6,42 |
  | `text-primary` (`#205b63`) | 6,32 | 5,79 | 5,59 | 7,49 |

- **Retenu : `text-foreground`**, seulement pour une phase en attente qui n'est pas affichée (l'état qui porte le fond argile). C'est l'encre du libellé de la même ligne, avec la plus large marge. `text-accent-ink` passe aussi, mais de peu au survol (4,79), et il ajouterait une couleur à la ligne. Écarté.
- **Autres états, inchangés et conformes** : phase faite ou à venir, gris atténué sur la sauge, 4,92:1 (le survol ne change que la couleur du libellé, pas le fond) ; phase affichée, gris atténué sur `bg-surface`, 5,84:1. Le thème praticien n'a pas de mode sombre (`globals.css`, « sans mode sombre »).
- Ni taille, ni graisse, ni texte, ni décor.

## Fichiers modifiés

- `web/src/components/FichePatientPanel.tsx` : `classesStatut` dans le rail des phases.
- `web/src/components/FichePatientPanel.test.tsx` : banc « LE STATUT D'UNE PHASE EN ATTENTE EST EN ENCRE, PAS EN GRIS ATTÉNUÉ ».
- `web/e2e/visual.spec.ts-snapshots/fiche-cockpit-Desktop-Chromium-linux.png`, `fiche-tiroir-besoins-Desktop-Chromium-linux.png`.
- `changelog.d/2026-11-18-refonte-lien-pra6f-contraste-phases.md`, ce handoff.

## Validations exécutées

- Banc Vitest : vert dans le fichier complet (187/187), **rouge sur le mutant** (gris atténué rétabli). Première version rouge dans le fichier complet : la phase initiale est la première phase due (D5), donc affichée. Le banc choisit maintenant la phase 1 avant de regarder.
- T1 complet (`npm run check`) : 0, avant et après la remise à niveau.
- T2 (`npm run test:worktree -- --fast`) : **0 à la troisième passe**, sur `724f7054c`. Vitest : 18 274 passent, 60 ignorés. E2E : 423 passent, 37 ignorés. Il n'a pas été rejoué après la remise à niveau : l'avance ne touche aucun fichier du diff, ni les jetons, ni les captures.
  - Passe 1 : rouge sur `masquage.test.ts`, la borne de 1,5 s de « reste linéaire sur un texte qui répète l'identifiant », dépassée de 41 ms (1 541 ms).
  - Passe 2 : rouge sur quatre tests à budget de temps : deux timeouts de 5 s de `ProtocolMiniBuilder.test.tsx`, plus les bornes de 200 ms et de 1,5 s de `masquage.test.ts` (205 ms et 1 864 ms).
  - Instruction : charge du Mac entre 26 et 47, due aux suites des sessions PRA-6g et PRA-6h. Joués seuls, les deux fichiers passent (272/272, environ 0,37 s par motif de masquage). Ils sont hors du diff. Passe 3 jouée sur une machine au repos (charge 1,3, aucun Playwright).
- Captures de référence : `visual-baselines`, run 44416962928, sur `724f7054c`, au code identique à la tête. Les runs 44413190701 et 44415061437 ont échoué à l'installation des navigateurs (10 minutes dépassées, miroir apt d'Ubuntu à quelques dizaines de Ko/s) : aucun test n'avait tourné. Deux captures changent, les six autres sont identiques à l'octet. Relues avec un calque de différence : 259 et 253 pixels, tous dans une boîte de 46 × 8 px à (442, 446) qui couvre le seul libellé « à traiter » de la phase due, passé du gris à l'encre. Rien d'autre.

## Problèmes ouverts (restes)

- `masquage.test.ts` et `ProtocolMiniBuilder.test.tsx` rougissent T2 quand la machine est chargée (bornes de temps réel). Hors lot, à instruire à part si cela se reproduit sans charge.
- `visual-baselines` n'a pas de cache de navigateurs (le CI en a un) : sa réussite dépend du débit du miroir apt.
- Sur iPhone 13, les captures ne changent pas : dans le rail horizontal, la phase due ne figure pas hors affichage sur les vues capturées. Le correctif s'y applique pourtant (même classe).
- Leçon déjà en mémoire (D-518) : un commit poussé tôt pour lancer un workflow est exposé au §2. Pour la prochaine fois : pousser sur une branche jetable, ou lancer le workflow juste avant la PR.

## Prochaine action exacte

Attendre le merge par l'intégrateur. Lots suivants de l'ordre retenu : PRA-6g, PRA-6h.

## Interdits encore actifs

- Ni route, ni garde, ni drapeau, ni schéma, ni règle clinique.
- Aucun jeton ni texte neuf, aucun décor avant COM-1 ; identités de fixture seulement.
- Ne pas toucher `ImportCompteRenduPanel.tsx` ni P46 (PRA-6g).
- La session ne merge pas.
