# Handoff — 2026-10-10 — AGENDA-SOMMEIL : clôture du LOT-10, annonce aux patients libérée

## Branche et état Git

`docs/agenda-sommeil-cloture-lot-10`, partie de `main` 83f13327 (#1387 inclus). Uniquement de la documentation et de l'état. Clôture faite depuis la copie principale : le LOT-10 a été mergé
depuis une session distante (#1386), sans handoff.

## Objectif

Clore le LOT-10 et laisser la campagne `2026-10-07-agenda-sommeil-adhesion` dans
son état d'attente : plus aucun lot de code, LOT-02 (re-mesure) seul ouvert.

## Décisions prises

- LOT-10 (#1386) terminé. Le trou nommé au LOT-08 est fermé : la clôture d'un agenda
  « je ne sais pas » est suivie jusqu'au dossier exporté (`AGD_LAT_MED` « Non
  calculé », jamais 0), avec un témoin à endormissement connu ; tests seuls.
- Recette sur appareil faite le 2026-10-10 (#1387 : Android, simulateur iOS).
  **Plus rien ne retient l'annonce aux patients du nouvel agenda.**
- Lot courant inchangé : LOT-02, inscrit en `parallel_campaigns`.

## Fichiers modifiés

Fiche LOT-10 (statut), `CAMPAGNE.md` (statut de tête), `.wn/state.json` et
`ACTIVE_CAMPAIGN.md` (resynchronisés), ce fragment et `SESSION_LOG.md`.

## Validations exécutées

`wn-cycle --appliquer` ; `npm run check:rapide` ; `wn-campaign-audit.mjs` avec
les codes bloquants du CI.

## Problèmes ouverts

- Sonnerie du rappel et ouverture depuis une messagerie sur un **vrai iPhone** :
  inconnues, faute de preuve (seul le simulateur a été vu).
- Agendas de test commencés, à relever pour le 2026-10-29.

## Prochaine action exacte

1. Annonce aux patients : un geste du responsable, qui ne dépend plus d'aucun lot.
2. Le 2026-10-29 (rappel programmé), lecture du LOT-02 avec `REMESURE_ADHESION.sql`, au conteneur, en agrégats. Compter les
   deux textes du refus d'ordre du soir (« doit suivre la mise au lit » / « doit
   suivre l'heure du coucher »). L'annonce tombe dans la fenêtre mesurée : la
   dater dans la lecture. Seconde lecture le 2026-11-12.

## Interdits encore actifs

- Aucun seuil, barème ni contrat de l'agenda modifié sans `D-xxx` (un ordre
  « coucher seul » exigerait D-xxx et un contrat v5).
- Dossiers réels : lecture par identifiant seulement, sans nom ni métrique dans un
  fichier durable ; aucun seed ni E2E sur eux.
- Pas d'auto-merge sur une PR de lot.
