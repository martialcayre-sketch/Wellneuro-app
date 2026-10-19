# Handoff — t15 : constructeur rechargé depuis la version en vigueur, rail lu

## Branche et état du dépôt

- Branche `t15-reviser-protocole`, partie de `origin/main` 2a247af2. Worktree
  `d281-lot3-portail`. Sans migration.

## Objectif

Dette t15 du plan : (1) le constructeur de protocole n'est pas réhydraté depuis
la version active ; (2) `versionsLues` n'est pas remonté au rail. Arbitrage du
responsable (2026-10-19) : corriger les deux.

## Décisions prises

- Rechargement dans `ProtocolMiniBuilder` (prop `versionActive`), par le patron
  « état ajusté au rendu » déjà employé pour l'orientation : une fois par
  `versionId`, seulement si le brouillon est vierge ET intact
  (`editedSinceSave` faux). Un brouillon vidé à la main ne se recharge pas.
- L'action `ACTION_ID_ORIENTATION` est filtrée : elle repart en tête à la
  soumission depuis la carte ([[D-257]] §8). Le prochain identifiant suit le
  plus grand `action-N` repris. Aucune coupe à la borne : une version valide ne
  la dépasse pas.
- Le contrat V4 est aussi demandé quand une action porte un statut
  d'intervention : sans cela, une version V4 rechargée partait en V1 et la
  route rendait `version_contrat_incompatible` ([[D-130]] : l'écran demande sur
  ce qu'il porte).
- `EtatRuntimeClinique.versionsLues` ; rail (`FichePatientPanel.tsx`, phase
  Actions) : `inconnu` tant que la lecture n'a pas abouti, épisode confirmé.
- Revue CodeRabbit (4 remarques, toutes corrigées) : la coche « relu » retombe
  au rechargement ; « Réinitialiser » interdit tout rechargement ultérieur,
  version neuve comprise ; le contrat V4 suit la VERSION EN VIGUEUR (pas
  seulement le brouillon rechargé) ; `versionsLues` est celui de la carte
  courante (`versionsLuesPour`), et une réponse de versions arrivée pour une
  autre carte est écartée.
- Revue CodeRabbit hors diff (P1) : le constructeur porte une `key` par carte
  (une carte neuve dans le même montage le remonte, il se recharge de SA
  version) et `versionActive` n'est servie qu'après la lecture des versions de
  la carte courante. Le brouillon d'une carte ne s'enregistre plus comme
  révision d'une autre ; sans carte le formulaire est fermé, rien ne se perd.
- Seconde remarque hors diff (P1) : au changement de carte, versions, version
  active et témoin de lecture sont vidés — une lecture échouée de la nouvelle
  carte laisse un état inconnu, jamais les versions de l'ancienne (rail
  « fait », Historique, Diffusion). Rien n'est vidé à la relecture de la même
  carte.
- Troisième remarque hors diff (P1) : une réponse de versions n'est acceptée
  que pour la carte attendue, `null` compris — une lecture arrivée après que
  la carte a cessé d'être prête ne rétablit pas ses versions. Tous les
  appelants tournent sur une carte prête : aucun ne perd sa lecture.

## Fichiers modifiés

- `web/src/components/patient-cockpit/ProtocolMiniBuilder.tsx` + test (6 cas).
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` + test (2 cas).
- `web/src/components/FichePatientPanel.tsx` (rail).
- `web/src/components/patient-cockpit/ArbitrageBiologiquePanel.tsx` (commentaire).
- Plan, changelog, SESSION_LOG.

## Validations exécutées

- Vitest constructeur, cockpit, arbitrage, fiche patient : verts.
- T1 complet, T2 : voir la PR.

## Problèmes ouverts

- Le rail n'a pas de banc propre (logique dans `FichePatientPanel`) : la
  remontée est testée côté cockpit.

## Prochaine action exacte

PR, CI, CodeRabbit, merge ; t15 → fait sur la page de suivi de la file A.

## Interdits encore actifs

- Aucune décision clinique sans D-xxx ; pas de `prisma format`.
