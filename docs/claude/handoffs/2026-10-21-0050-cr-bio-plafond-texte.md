# Handoff — Compte rendu biologique : texte du refus du plafond ; restes d'ACT-4

## Branche et état Git

`lot/cr-bio-plafond-texte` (worktree `act4-ouverture`), partie de `origin/main` 3e6ea922. Sans migration ni `schema.prisma`.

## Objectif

Rendre exact le refus du plafond du compte rendu biologique, et poser les arbitrages restants d'ACT-4.

## Décisions prises

- Refus du plafond : « Trois documents attendent déjà d’être traités par votre praticien. Vous pourrez en déposer un autre ensuite. » (D-269, précision du 2026-10-21). L'ancien « les ouvre » était faux pour les documents « reçus », que le plafond compte aussi.
- L'encart d'urgence quitte l'écran de dépôt. Il est remplacé par une aide permanente du portail : un lien « Urgence » sur toutes les pages, qui mène aux numéros. Les textes sont à valider avant la PR, qui amendera D-293 §3 et fera les deux changements ensemble. « Mes échanges » garde son encart.
- Gestes du responsable sur un dossier de test, à constater par conteneur : retirer le PDF de test (motif « déposé par erreur ») ; déposer une photo pour constater le réencodage en production.

## Fichiers modifiés

`web/src/lib/biology-library/import/transmissionStatut.ts`, `web/src/components/patient/biologie/TransmissionCompteRendu.test.tsx`, `docs/DECISIONS.md`, `changelog.d/2026-10-21-cr-bio-plafond-texte.md`, `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

T1 et T2 `--fast` : résultats dans la PR.

## Problèmes ouverts

- Aide permanente du portail : textes et emplacement à valider, puis PR.
- Constats par conteneur du retrait du PDF et du réencodage de la photo : à verser dans la PR de l'aide, en agrégats.

## Prochaine action exacte

Soumettre au responsable les textes de l'aide permanente (libellé du lien, contenu de la page, phrase du délai de lecture), puis écrire la PR.

## Interdits encore actifs

- Aucune fenêtre, aucun seuil, aucune règle clinique changés.
- Aucune migration ni `schema.prisma` sans accord du responsable.
- Fixtures neutres seulement.
- Production lue par conteneur et par identifiant seulement ; agrégats seuls dans les fichiers durables.
