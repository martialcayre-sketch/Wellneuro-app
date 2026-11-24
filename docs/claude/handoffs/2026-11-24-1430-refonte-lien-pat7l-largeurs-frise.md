# Handoff — 2026-11-24 — Refonte Lien / Empreinte, PAT-7l : largeurs et frise (forme transverse)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7l-largeurs-frise`, worktree neuf
  `.claude/worktrees/refonte-lien-pat7l-largeurs-frise`, créé sur `origin/main` `4ca99cfd`
  fraîchement fetché (contient PAT-7k, #2315, `45b0e981`).
- Un commit de lot, une PR. La session ne merge pas : « prête @<sha> » à l'intégrateur.
- Les worktrees de PAT-7j et PAT-7k sont gardés : pas de suppression sans la confirmation du
  responsable.

## Objectif

Quatrième lot de code de la forme transverse du portail patient, relancé à la demande du
responsable après le merge de PAT-7k. Décision : « F1a à F7a » (2026-11-21, liste commune
`20261121-1633-d`). PAT-7l applique F6 a : entrée à 560 px, fin (U09) à 672 px, frise de U09
en 3 × 2 au téléphone, six étapes visibles.

## Décisions prises

- **Colonnes de l'entrée à 560 px** (`max-w-[35rem]`, valeur de `.colonne` de la planche
  PAT-2 ; aucune clé ajoutée à `tailwind.config.ts`, fichier de COM-0) :
  - connexion (U01), `portail/connexion/page.tsx` ;
  - lien indisponible (U02), `portail/lien/indisponible/page.tsx` ;
  - date de naissance, à l'entrée (`[token]/page.tsx`) et depuis le hub (`questionnaires/page.tsx`,
    D-284 §3 : même écran) ;
  - circuit mineur à l'entrée (`[token]/page.tsx`).
- **Les cartes de la date et du circuit mineur** (`DateNaissanceEcran.tsx`) perdent leur
  `maxWidth="md"` : leur colonne décide. Effet de bord assumé : sur le hub, l'écran du circuit
  mineur suit la colonne du hub (672 px), comme toutes les cartes du hub (ligne « Autres
  pages 672 px » de F6). `EncartUrgenceMineur` n'est pas touché.
- **U09** : carte et colonne en `max-w-2xl` (672 px), comme consentement, fiche et situation.
- **Frise** (`PatientJourneyProgress.tsx`) : grille 3 × 2 sous 768 px, liaisons masquées,
  libellés centrés qui peuvent passer sur deux lignes ; à partir de 768 px, la ligne reliée
  d'avant. `overflow-x-auto` et `tabIndex` gardés à partir de 768 px : dernier recours en
  grand texte. Seuil `md` plutôt que `sm` : à 640 px, la ligne aurait frôlé sa colonne.
- **Hors de ce lot** :
  - la frise navigable du hub (`frise/FriseEtapesNavigable.tsx`, drapeau
    `WN_PORTAIL_FRISE_NAVIGABLE`, posé en production, servie aux majeurs) : absente de
    l'inventaire de F6, elle garde sa ligne qui défile au téléphone ;
  - la carte de chargement de l'entrée (448 px), les pages d'erreur et « page absente » ;
  - la marge `p-8` à 195 px (toujours ouverte à PAT-7) ;
  - les repères `/70` de la frise (F7, PAT-7m).
- **Test** : `PatientJourneyProgress.test.tsx` gagne un cas (3 × 2, liaisons masquées sous
  768 px).

## Fichiers modifiés

- `web/src/components/patient/PatientJourneyProgress.tsx` et son test ;
- `web/src/app/portail/[token]/page.tsx`, `web/src/app/portail/[token]/questionnaires/page.tsx` ;
- `web/src/app/portail/connexion/page.tsx`, `web/src/app/portail/lien/indisponible/page.tsx` ;
- `web/src/components/patient/DateNaissanceEcran.tsx` ;
- `changelog.d/2026-11-24-refonte-lien-pat7l-largeurs-frise.md`, ce handoff.

Aucun fichier de COM-0, aucun composant praticien, rien de modifié dans `components/ui/`.

## Validations exécutées

- `check:rapide` : 0 ; T1 complet : 0.
- T2 `--fast` : 0 (Vitest 18 464 tests, E2E 471, Chromium et WebKit).
- **Constat à l'écran en local** : build de production, base du worktree avec seed, fixture
  Sophie Nicola seule. Spec local jamais versé, copié le temps de la passe puis retiré. Les
  étapes de l'entrée (date, mineur, consentement, fin) sont obtenues en réécrivant la réponse
  de session dans le navigateur, sans écriture en base. Chromium à 1 280 px, iPhone 13 à
  390 px, et U09 à 640, 767, 768 et 1 024 px.
  - Colonnes : U01, U02, date et mineur à 560 px ; consentement et U09 à 672 px ; 358 px au
    téléphone ; aucune page ne déborde.
  - Frise : à 768 px et au-delà, une ligne, six étapes dans la colonne, sans défilement ; à
    767 et 640 px et au téléphone, deux rangées de trois, sans liaison ni défilement,
    « Analyse du praticien » et « Restitution » entiers.
  - Non vu : la frise d'avant au hub (le hub sert la frise navigable au dossier majeur de la
    fixture) ; couverte par le code et le test.

## Problèmes ouverts

- **Lot suivant, après le merge de celui-ci, depuis `origin/main`** : PAT-7m, F7, écarts
  locaux ; « Réinitialiser » reste rouge.
- La question `20261121-1633-d` passe à `close` au merge de PAT-7m.
- **Toujours ouvert à PAT-7** :
  - lecteur d'écran réel et téléphone réel ;
  - U29 ;
  - la marge `p-8` à 195 px ;
  - l'en-tête de U10 après PAT-3b ;
  - la frise navigable du hub au téléphone (une ligne qui défile), hors de F6.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`) ; numéro et sha de tête à la session d'orchestration ; CI par
   `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond.
2. `node scripts/wn-revue-pr-agent.mjs <N>` → 0 ; un verdict par commentaire en ligne.
3. « prête @<sha> » en commentaire, ligne `prete` au registre D-503 (boîte `integrateur`), suivi
   patient (`lots/PAT-7`, journal).
4. Après le merge : PAT-7m sur une branche neuve depuis `origin/main`.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488 ; aucun décor avant COM-1 ; fichiers COM-0 gelés.
- Rien de clinique ; aucune migration ni drapeau.
- Production en lecture seule ; constat à l'écran en local seulement, sur Sophie Nicola,
  Jennifer Martin et Michel Dogné.
- Aucun composant praticien ; prévenir l'orchestration avant de toucher un composant `ui/` partagé.
- Jamais de merge par la session ; écritures ArtifactData épinglées par `if_version`.
- T2 jamais en parallèle d'un autre sur le Mac, et toujours dans un environnement sans drapeaux
  exportés.
- Branche avancée par `--ff-only` seulement (D-518).
