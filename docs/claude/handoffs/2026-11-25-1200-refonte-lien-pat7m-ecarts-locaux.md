# Handoff — 2026-11-25 — Refonte Lien / Empreinte, PAT-7m : écarts locaux (forme transverse)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7m-ecarts-locaux`, worktree neuf
  `.claude/worktrees/refonte-lien-pat7m-ecarts-locaux`, créé sur `origin/main` `bacfdf7f`
  fraîchement fetché (contient PAT-7l, #2323, `5fd9439a`), avancé par `--ff-only` à `c8508321`
  en cours de lot (branche sans commit propre ; `main` n'avait touché que des docs).
- Un commit de lot, une PR. La session ne merge pas : « prête @<sha> » à l'intégrateur.
- Les worktrees de PAT-7j, PAT-7k et PAT-7l sont gardés : pas de suppression sans la
  confirmation du responsable.

## Objectif

Cinquième et dernier lot de code de la forme transverse du portail patient, lancé à la
demande du responsable (« Lancer PAT-7m ») après le merge de PAT-7l. Décision : « F1a à F7a »
(2026-11-21, liste commune `20261121-1633-d`). PAT-7m applique F7 a, plus la frise cliquable
du hub, rattachée à PAT-7m par le responsable le 2026-11-25 (« Oui, dans PAT-7m », relayé
par la session d'orchestration) : la forme seule, le drapeau ne bouge pas.

## Décisions prises

- **Repères** : les dix-sept `text-muted-foreground/70` du portail patient passent en
  `text-muted-foreground` (5,84:1). Il n'en reste aucun dans `app/portail` ni
  `components/patient`. La garde `opaciteTailwind.guard.test.ts` gèle les classes non
  générées au compte près : son gel passe de 18 à 1 (reste la connexion praticien,
  `app/login/page.tsx`, hors périmètre).
- **Titres** : `h1` des pages de questionnaire (`[idAssignation]/page.tsx`) et « Merci ! »
  (U09) en `font-display text-2xl leading-tight`, la convention des autres pages ; titres de
  U34 (`TransmissionCompteRendu.tsx`) et U35 (`renseignements/page.tsx`) sortis de leur carte.
  U33 l'était déjà.
- **Badge d'état** des pages de questionnaire : pastille `rounded-full` à bord
  `control-border` (taille gardée à 12 px).
- **Avis daté** (`AvisLectureDatee.tsx`) : `bg-muted` sans bord.
- **« En pause »** : encart `bg-lien-sand` bordé sur `CarteFicheRemise` et
  `FicheRemiseLecture` ; sur U21 (`DetailDuProtocole.tsx`), la carte de l'action en pause
  passe en sable, les autres en `bg-surface` ; cartes d'action, critère et encart de conduite
  à bord `control-border` (planche PAT-3) ; filets intérieurs `border-border`.
- **U24** (`ComprehensionView.tsx`) : synthèse sur `bg-voice-practitioner`, comme le dossier à
  deux voix (même habillage d'impression).
- **U22** (`PatientFoodObservationPanel.tsx`, planche PAT-4) :
  - bandeaux « Aucune action… » (calibrage et sans cycle) en encart sable ;
  - « Décision active du praticien » sur fond sauge (`bg-muted`) ;
  - la question du jour entre dans la carte de la trace, au-dessus d'un filet (une carte) ;
    ses `data-testid` restent ;
  - « Question du jour », « Décrire la journée… », « Partager avec mon praticien »,
    « Solutions… », « Historique local » en `h2` de casse normale ; « Couverture de la
    semaine » en repère ;
  - « Réinitialiser le brouillon local » en bas, **toujours en `danger-text`** (décision).
- **Entrée** :
  - « Étape n sur 4 » au-dessus du titre (`AvantDeCommencer.tsx`) ;
  - indicateur de brouillon dans une région `role="status"` toujours présente (fiche et
    situation, `[token]/page.tsx`) ; `SaveStatusIndicator` lui-même inchangé ;
  - ligne de version du consentement sous le titre, hors du bloc sable : `DocumentTrust`
    gagne `versionAilleurs` et exporte `LigneVersion` ; la version reste toujours visible.
- **Frise cliquable du hub** (`FriseEtapesNavigable.tsx`) : 3 × 2 sous 768 px, liaisons
  masquées, étapes rétrécissables ; ligne dès `md`. Même seuil que la frise de l'entrée
  (PAT-7l).
- **Laissé tel quel** : Précédent / Suivant de U11 et U12 côte à côte au téléphone — la
  planche PAT-4 (U12, téléphone) les montre ainsi ; la ligne d'inventaire n'avait pas de
  planche.
- **Tests** : frise du hub en 3 × 2, étape à venir sans `/70`, ligne de version
  (`DocumentTrust.test.tsx`, neuf), gel de la garde d'opacité.

## Fichiers modifiés

- Repères : `app/portail/layout.tsx`, `[token]/page.tsx`, `questionnaires/page.tsx`,
  `PatientJourneyProgress.tsx`, `GenericQuestionnaire.tsx`, `MonEquilibreAccueil.tsx`,
  `ConsultationScreen.tsx`, `PlaintesForm.tsx`, `QuestionField.tsx`, `ui/PatientField.tsx` ;
- `[idAssignation]/page.tsx`, `renseignements/page.tsx`, `AvisLectureDatee.tsx`,
  `CarteFicheRemise.tsx`, `FicheRemiseLecture.tsx`, `DetailDuProtocole.tsx`,
  `ComprehensionView.tsx`, `TransmissionCompteRendu.tsx`,
  `food-observation/PatientFoodObservationPanel.tsx`, `trust/AvantDeCommencer.tsx`,
  `trust/DocumentTrust.tsx`, `frise/FriseEtapesNavigable.tsx` ;
- tests : `PatientJourneyProgress.test.tsx`, `FriseEtapesNavigable.test.tsx`,
  `DocumentTrust.test.tsx`, `lib/opaciteTailwind.guard.test.ts` ;
- `changelog.d/2026-11-25-refonte-lien-pat7m-ecarts-locaux.md`, ce handoff.

Aucun fichier de COM-0, aucun composant praticien, rien de modifié dans `components/ui/`.
Aucun texte d'interface modifié (aucun DOC-n).

## Validations exécutées

- Vitest du portail (patient, compagnon, alimentation, portail) : 160 fichiers, 3 538 tests, 0.
- `check:rapide` : 0 ; T1 complet : 0.
- T2 `--fast` : une première passe rouge sur la seule garde d'opacité (gel à abaisser, fait) ;
  seconde passe : 0 (Vitest 18 555, E2E 471, Chromium et WebKit).
- **Constat à l'écran en local** : build de production, base du worktree avec seed, fixture
  Sophie Nicola seule ; spec local jamais versé, retiré après la passe ; étapes de l'entrée
  par réécriture de la réponse de session dans le navigateur. Chromium à 1 280 px, iPhone 13.
  - Aucun repère à 70 % sur les pages visitées ; aucune page ne déborde.
  - Titres à 24 px en Lora partout ; U22, U34 et U35 hors de la carte.
  - U22 : sable, carte unique, titres en casse normale, « Réinitialiser » en bas, rouge.
  - Entrée : « Étape 1 sur 4 » avant le titre ; version du consentement hors du sable.
  - Frise : 3 × 2 au téléphone (entrée, U09, hub cliquable), une ligne au bureau.
  - Non vus (aucune donnée de fixture) : page de questionnaire (titre, badge), avis daté,
    U21 protocole, « En pause » des fiches, synthèse de U24, décision active de U22 ;
    couverts par le code et les tests.

## Problèmes ouverts

- La question `20261121-1633-d` passe à `close` au merge de ce lot (dernier de la forme
  transverse).
- **Toujours ouvert à PAT-7** : lecteur d'écran réel et téléphone réel ; U29 ; la marge `p-8`
  à 195 px ; l'en-tête de U10 après PAT-3b.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`) ; numéro et sha de tête à la session d'orchestration ; CI par
   `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond.
2. `node scripts/wn-revue-pr-agent.mjs <N>` → 0 ; un verdict par commentaire en ligne.
3. « prête @<sha> » en commentaire, ligne `prete` au registre D-503 (boîte `integrateur`), suivi
   patient (`lots/PAT-7`, journal).
4. Au merge : question `20261121-1633-d` à `close`.

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
