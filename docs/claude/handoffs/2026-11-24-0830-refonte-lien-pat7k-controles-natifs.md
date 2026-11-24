# Handoff — 2026-11-24 — Refonte Lien / Empreinte, PAT-7k : contrôles natifs (forme transverse)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7k-controles-natifs`, worktree neuf
  `.claude/worktrees/refonte-lien-pat7k-controles-natifs`, créé sur `origin/main` `db55f70f`
  fraîchement fetché (contient PAT-7j, #2312, `ee81819d`).
- Un commit de lot, une PR. La session ne merge pas : « prête @<sha> » à l'intégrateur.
- Le worktree de PAT-7j (`refonte-lien-pat7j-messages-champs`) est gardé : pas de suppression sans la
  confirmation du responsable.

## Objectif

Troisième lot de code de la forme transverse du portail patient, relancé à la demande du responsable
après le merge de PAT-7j. Décision : « F1a à F7a » (2026-11-21, liste commune `20261121-1633-d`).
PAT-7k applique F5 a :
- options en cartes de 48 px ;
- tuiles de U07 à 48 px ;
- accordéons en volets à chevron ;
- les mêmes éléments natifs dessous ;
- champ fichier natif gardé.

## Décisions prises

- **`PatientVolet`** (nouveau, `components/patient/ui/`, patient seul) habille un `<details>` natif :
  - cadre `rounded` (14 px) `border-border` ;
  - en-tête de 48 px, 15 px en graisse 600, anneau de focus pétrole ;
  - chevron `ChevronDown` décoratif (`aria-hidden`) à droite, qui tourne à l'ouverture ;
  - attribut `open` repris tel quel.

  C'est la forme du volet « Mon accompagnement » du hub, ramenée de 18 à 14 px (planche `.accordeon`).
  Il importe `TRAIT_ICONE` de `components/ui/icone` sans le modifier.
- **Appliqué à** :
  - « Mon accompagnement » et les sections secondaires du hub (« Transmis au praticien »… : plus de
    capitales de 14 px ni de triangle à gauche) — `questionnaires/page.tsx` ;
  - les sections des documents TRUST (conditions, informations, comptes rendus) —
    `trust/DocumentTrust.tsx` ;
  - les choix (U39) — `trust/MesChoix.tsx` : libellé et statut gardés dans l'en-tête.
- **U33** (`collecte/DepotDocuments.tsx`) : cartes de 48 px, bord `control-border`, rayon 14 px,
  15 px ; carte choisie en bord pétrole de 2 px sur `bg-primary/10`, graisse 600. Le radio natif reste
  (`accent-primary`).
  - Le fond teinté reprend `bg-primary/10` des cartes déjà livrées des questionnaires, et non le
    #E3EDEB littéral de la planche, qui n'est pas un jeton (`globals.css` gelé).
- **U07** (`app/portail/[token]/page.tsx`, choix uniques de l'anamnèse) : tuiles de 48 px, 15 px, 500,
  rayon 14 px, bord `control-border`. Pressée : bord pétrole de 2 px, `bg-primary/10`, graisse 600, au
  lieu du fond plein.
- **Hors de ce lot** :
  - les cases multiples de l'anamnèse, qui ne sont pas à l'inventaire de F5 ;
  - le menu « Confort de lecture », un `<details>` servant de menu, pas d'accordéon ;
  - les cartes des questionnaires, déjà conformes.
- **Tests** :
  - deux tests du hub cherchaient le texte direct du `<summary>` ; leur sélecteur passe à
    `summary > span`, sans changer ce qu'ils vérifient ;
  - test neuf `PatientVolet.test.tsx`.

## Fichiers modifiés

- `web/src/components/patient/ui/PatientVolet.tsx` et `PatientVolet.test.tsx` (neufs) ;
- `web/src/app/portail/[token]/questionnaires/page.tsx`, avec `autresEspaces.test.tsx` et
  `page.test.tsx` ;
- `web/src/components/patient/trust/DocumentTrust.tsx`, `trust/MesChoix.tsx` ;
- `web/src/components/patient/collecte/DepotDocuments.tsx` ;
- `web/src/app/portail/[token]/page.tsx` ;
- `changelog.d/2026-11-24-refonte-lien-pat7k-controles-natifs.md`, ce handoff.

Aucun fichier de COM-0, aucun composant praticien, rien de modifié dans `components/ui/`.

## Validations exécutées

- `check:rapide` : 0.
- Vitest ciblé sur le portail : 157 fichiers et 3 485 tests, 0 ; `PatientVolet` : 2 tests, 0.
- T1 complet : 0.
- T2 `--fast` : 0 (Vitest 18 460 tests, E2E 471, Chromium et WebKit).
- **Constat à l'écran en local** : build de production, base du worktree avec seed, fixtures
  seules. Spec local au clavier, jamais versé, copié le temps de la passe puis retiré ; spec
  `pat7-proto-b` pour U39. Chromium à 1 280 px et iPhone 13 à 390 px.
  - U33 : quatre cartes de 48 px, rayon de 14 px. Le Tab atteint le radio, dont le contour de focus
    pétrole fait 3 px ; flèche puis Espace cochent la carte suivante, à bord de 2 px.
  - U37, U38 : les volets ont un en-tête de 48 px, un chevron et un rayon de 14 px. Le focus est un
    anneau pétrole de 2 px ; Entrée déplie, Espace replie.
  - U10 : le volet « Mon accompagnement » se comporte de même.
  - U39 : volets à chevron au téléphone.
  - Non vus :
    - « Transmis au praticien », absent de la fixture (aucune assignation transmise) ;
    - les tuiles de U07, car le parcours de l'anamnèse n'est pas dans les specs de constat.

## Problèmes ouverts

- **Lots suivants, après le merge de celui-ci, depuis `origin/main`** :
  - PAT-7l : F6, entrée à 560 px, fin à 672 px, frise en 3 × 2 au téléphone ;
  - PAT-7m : F7, écarts locaux ; « Réinitialiser » reste rouge.
- La question `20261121-1633-d` passe à `close` au merge de PAT-7m.
- **Toujours ouvert à PAT-7** :
  - lecteur d'écran réel et téléphone réel ;
  - U29 ;
  - la marge `p-8` à 195 px ;
  - l'en-tête de U10 après PAT-3b.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`) ; numéro et sha de tête à la session d'orchestration ; CI par
   `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond.
2. `node scripts/wn-revue-pr-agent.mjs <N>` → 0 ; un verdict par commentaire en ligne.
3. « prête @<sha> » en commentaire, ligne `prete` au registre D-503 (boîte `integrateur`), suivi
   patient (`lots/PAT-7`, journal).
4. Après le merge : PAT-7l sur une branche neuve depuis `origin/main`.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488 ; aucun décor avant COM-1 ; fichiers COM-0 gelés.
- Rien de clinique ; aucun texte de consentement, de droits ni de sécurité modifié (seule leur
  présentation en volets change).
- Aucune migration ni drapeau.
- Production en lecture seule ; constat à l'écran en local seulement, sur Sophie Nicola, Jennifer
  Martin et Michel Dogné.
- Aucun composant praticien ; prévenir l'orchestration avant de toucher un composant `ui/` partagé.
- Jamais de merge par la session ; écritures ArtifactData épinglées par `if_version`.
- T2 jamais en parallèle d'un autre sur le Mac, et toujours dans un environnement sans drapeaux
  exportés.
- Branche avancée par `--ff-only` seulement (D-518).
