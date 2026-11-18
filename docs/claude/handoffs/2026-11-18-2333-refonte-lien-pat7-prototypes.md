# Handoff — 2026-11-18 — Refonte Lien / Empreinte, PAT-7 : comparaison aux prototypes

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7-prototypes`, créée depuis `origin/main` (`da125214`, après le merge de PAT-7f #2238 en `25c3f788`). Worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT).
- Documentation seule : un constat, deux renvois et ce handoff. Aucun code, aucune migration, aucun drapeau, aucun texte d'interface.
- La session ne merge pas : c'est l'intégrateur qui merge, sur « prête @<sha> ».

## Objectif

Dernière étape nommée de PAT-7 dans le plan patient : comparer les écrans livrés aux prototypes validés, d'abord en constat. Le responsable l'a demandé le 2026-11-18 (« Passe à la comparaison aux prototypes »).

## Décisions prises

- Pas de décision neuve.
- **Constat** : `docs/claude/propositions/2026-11-11-refonte-lien-etape2/pat7-constat-prototypes.md`. Cinq prototypes comparés :
  - PAT-2 `DrDQvM1L…` ;
  - PAT-3 `GgXXFgPG…` ;
  - PAT-4 itération 2 `89Vu8M7a…` ;
  - PAT-5 `RAM7H81H…` ;
  - PAT-6 `NsqRAGHv…`.
- **Constat principal** : les arbitrages inscrits sont appliqués. Les textes suivent D-488 mot pour mot. Les écarts sont surtout des écarts de forme.
- **Écarts établis, sans texte neuf ni décor**, proposés en deux lots :
  - **PAT-7g** : `print:hidden` sur « Lire la fiche » (`CarteFicheRemise.tsx`) et « J'en ai pris connaissance » (`ConditionsUtilisation.tsx`). Application de Q5a de PAT-5 (D-481, DOC-9).
  - **PAT-7h** :
    - un `h1` sur U09, où « Merci ! » est un `h2` ;
    - la police Lora sur les `h1` en sans de U26, U29 à U34 et U36.
  - La frise coupée de U09 (largeur de la carte de fin) est rangée avec la forme transverse, sur la remarque de PR-Agent.
- **Forme transverse** (variantes de boutons, messages d'erreur et de succès, champs, rayons, radios et accordéons natifs) : aucun lot avant une décision d'ensemble. Ces écarts passent par des composants partagés, et l'app a parfois choisi autrement pour une raison écrite.

## Fichiers modifiés

- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/pat7-constat-prototypes.md` (neuf).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/README.md` et `plan-patient.md` : un renvoi chacun.
- Ce handoff.

## Validations exécutées

- Build de production local de `da125214` : code 0.
- Captures (specs locaux `pat7-proto-a` et `pat7-proto-b`) :
  - deux variantes des specs du constat partiel, gardées dans `side-session-notes/…/pat7-outillage/` ;
  - copiées dans `web/e2e` le temps d'une passe, puis retirées ;
  - 70 tests verts, 35 écrans, 1 280 px Chromium et 390 px iPhone 13.
- Comparaison : une lecture par prototype, sources téléchargées dans le scratchpad. Chaque écart donné pour établi a été relu dans le code par la session.
- État des fixtures locales inchangé par cette passe : aucune écriture hors des helpers des specs.
- `check:rapide` : voir la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- PAT-7g et PAT-7h sont proposés, pas ouverts.
- La forme transverse est à décider en bloc (§3.2 du constat).
- À relire ou à décider (§3.3 du constat) :
  - consigne des agendas rendue en erreur, contre une consigne dans la planche de l'itération 2 de PAT-4 ;
  - « (N questionnaires) » de U41, sans décision écrite ;
  - « Réinitialiser le brouillon local » en rouge.
- PAT-7d attend `20261117-1243-d`.
- Non couverts :
  - U29 (aucune fixture) ;
  - U21 avec un protocole ;
  - U38 sous `WN_PORTAIL_CONDITIONS` ;
  - saisies de U11 et U12 ;
  - états 401, 409, chargement et succès ;
  - impression rendue ;
  - lecteur d'écran et téléphone réels.

## Prochaine action exacte

1. PR documentation, CI (`wn-attendre-ci.mjs`, en tâche de fond), `wn-revue-pr-agent.mjs` → 0, un verdict par remarque.
2. Déclarer « prête @<sha> », ligne `prete` au registre D-503, suivi patient à jour (`lots/PAT-7`, journal).
3. Ensuite, selon la réponse du responsable : PAT-7g, puis PAT-7h (code, T2) ; ou PAT-7d si `1243-d` est tranchée.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488. Aucun décor avant COM-1. Fichiers COM-0 gelés.
- Rien de clinique. Aucun texte de consentement, de droits ni de sécurité modifié, pied d'urgence compris.
- Aucune migration, aucun drapeau. Production en lecture seule ; constat à l'écran en local seulement.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Jamais de merge par la session. Toute écriture ArtifactData épinglée par `if_version`.
- T2 avant tout commit UI ou API, jamais deux T2 en parallèle sur le Mac.
- Branche avancée par `git merge --ff-only origin/main` seulement (D-518).
