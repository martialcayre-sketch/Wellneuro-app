# Handoff — 2026-11-23 — Refonte Lien / Empreinte, PAT-7j : messages, états et champs (forme transverse)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7j-messages-champs`, worktree neuf
  `.claude/worktrees/refonte-lien-pat7j-messages-champs`, créé sur `origin/main` `b131df80`
  fraîchement fetché (contient PAT-7i, #2303, `6142fb4c`). La branche de PAT-7i n'est pas
  réutilisée.
- Un commit, une PR. La session ne merge pas : « prête @<sha> » à l'intégrateur.

## Objectif

Deuxième lot de code de la forme transverse du portail patient. Le responsable a répondu
« F1a à F7a » le 2026-11-21 (liste commune `20261121-1633-d`) et a écrit « Relance PAT-7j »
après le merge de PAT-7i. PAT-7j applique F3 (messages et états) et F4 (champs).

## Décisions prises

- **F3 a — messages en ligne** (`patient/ui/PatientInlineMessage.tsx`) :
  - erreur : bord rouge de 2 px, fond surface, texte rouge gras, `role="alert"` gardé ;
  - information : fond sauge (`bg-muted`, jeton « sauge » de Lien ; la planche écrit #E3EDEB,
    qui n'est pas un jeton, et `globals.css` est gelé) ; texte pétrole, 6,3:1 ;
  - succès : fond vert à 10 %, texte vert #166534 gras ;
  - nouveau ton `consigne` : bord `control-border`, fond sauge, texte courant 15 px, sans rôle
    propre — l'appelant fournit la région `role="status"`.
  - Rayon 14 px, padding de la classe `.etat` (14 × 16 px), corps 16 px comme la planche.
- **F3 a — échecs de lecture** (`patient/PatientErrorState.tsx`) : la forme simple est
  retirée du type. Sans `forme`, `onReessayer` présent ⇒ `erreur` (filet rouge de 2 px), absent
  ⇒ `constat` (filet neutre) : c'est la règle que les appelants suivaient déjà (`definitif`).
  Exception explicite : l'agenda du sommeil indisponible (« Réessayez plus tard. », sans bouton)
  passe `forme="erreur"`.
- **U41** (`PropositionPackReevaluation.tsx`) : `<p role="alert">` orange → message d'erreur
  cadré, même texte.
- **U17** (`SaisieJourneeForm.tsx`) : la consigne n'est plus une erreur. Région `role="status"`
  toujours rendue (`sr-only` vide), ton `consigne` dedans : une région vivante insérée avec son
  contenu n'est pas annoncée par tous les lecteurs d'écran. Le défilement de Q12 a est gardé.
- **F4 a — champs** (`patient/ui/PatientField.tsx`) : `patientInputClassName` en 48 px
  (`h-12` pour les listes, WebKit), texte 16 px, `border-control-border`, `rounded` (14 px) ;
  libellé 15 px, 500, couleur du texte. Champs écrits à la main alignés : `QuestionField`
  (liste, nombre), `ConsultationScreen` (commentaire), `DossierDeuxVoixView` (trois zones),
  `SelecteurHeure` (bord à vide).
- **Exclu** : `physio-traitements/FormulaireTraitement.tsx` (COM-0, partagé praticien) ; les
  encarts d'urgence et de réponse suicide (textes et forme de sécurité, hors F3).
- **Rendu côté praticien, sans composant praticien touché** : `BibliothequePanel` (aperçu inerte
  d'un questionnaire) rend `QuestionField`, et `PatientPreview` rend `ConsultationScreen`. Ils
  montrent la forme patient, ce qui est leur rôle.

## Fichiers modifiés

- `web/src/components/patient/ui/PatientInlineMessage.tsx`, `ui/PatientField.tsx` ;
- `web/src/components/patient/PatientErrorState.tsx` (+ `PatientErrorState.test.tsx`, neuf) ;
- `web/src/components/patient/PropositionPackReevaluation.tsx` ;
- `web/src/components/patient/agenda-alimentaire/SaisieJourneeForm.tsx` (+ test) ;
- `web/src/components/patient/agenda-sommeil/AgendaSommeilJournal.tsx`, `SelecteurHeure.tsx` ;
- `web/src/components/patient/QuestionField.tsx`, `ConsultationScreen.tsx` ;
- `web/src/components/patient-companion/DossierDeuxVoixView.tsx` ;
- `changelog.d/2026-11-23-refonte-lien-pat7j-messages-champs.md`, ce handoff.

Aucun fichier de COM-0, aucun composant praticien, rien dans `components/ui/`.

## Validations exécutées

- `check:rapide` : 0.
- Vitest ciblé (portail patient, compagnon, observation alimentaire, aperçus) : 160 fichiers,
  3 556 tests, 0 ; plus les deux tests neufs (19 tests sur les deux fichiers), 0.
- T1 complet : 0, rejoué après l'avance `--ff-only` sur `origin/main` 57f04ba0 (outillage seul).
- T2 `--fast` : 0 (Vitest 18 458 tests, E2E 471, Chromium et WebKit), sur b131df80 avec le lot.

## Problèmes ouverts

- **Référence visuelle** : la connexion patient (`visual.spec.ts`, Chromium et iPhone) porte des
  champs : ses deux images changent, à régénérer par `visual-baselines` et à relire.
- **Lots suivants, après le merge de celui-ci, depuis `origin/main`** :
  - PAT-7k : F5 (options en cartes, tuiles de U07, volets à chevron ; champ fichier natif gardé) ;
  - PAT-7l : F6 (entrée 560 px, fin 672 px, frise 3 × 2) ;
  - PAT-7m : F7 (écarts locaux ; « Réinitialiser » gardé en rouge). La question
    `20261121-1633-d` passe à `close` au merge de PAT-7m.
- **Hors de ce lot** : l'agenda du sommeil garde ses messages écrits à la main
  (`SaisieNuitForm.tsx:582, :857, :864`) ; les libellés écrits à la main hors `PatientField`
  gardent leur forme. Ni l'un ni l'autre n'est à l'inventaire de F3 ou F4.
- **Toujours ouvert à PAT-7** : lecteur d'écran réel, téléphone réel, U29, marge `p-8` à 195 px,
  en-tête de U10 après PAT-3b.

## Prochaine action exacte

1. Commit, push, PR (`--body-file`) ; CI par `node scripts/wn-attendre-ci.mjs <N>` en tâche de
   fond ; références visuelles de la connexion par `visual-baselines`, relues image par image.
2. `node scripts/wn-revue-pr-agent.mjs <N>` → 0, sinon `wn-reviewer` ; un verdict par commentaire
   en ligne.
3. « prête @<sha> » en commentaire, ligne `prete` au registre D-503 (boîte `integrateur`), suivi
   patient (`lots/PAT-7`, journal).
4. Après le merge : PAT-7k sur une branche neuve depuis `origin/main`.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488 ; aucun décor avant COM-1 ; fichiers COM-0 gelés.
- Rien de clinique ; aucun texte de consentement, de droits ni de sécurité modifié.
- Aucune migration ni drapeau. Production en lecture seule ; constat à l'écran en local seulement,
  sur Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucun composant praticien ; prévenir l'orchestration avant de toucher un composant `ui/` partagé.
- Jamais de merge par la session ; écritures ArtifactData épinglées par `if_version`.
- T2 jamais en parallèle d'un autre sur le Mac, toujours dans un environnement sans drapeaux
  exportés. Branche avancée par `--ff-only` seulement (D-518).
