# Handoff — 2026-11-15 — Cockpit en seconde page de la page de suivi, réponses en lignes neuves (lot `cockpit-seconde-page`)

## Branche et état du dépôt

- Branche `docs/cockpit-reponses`, créée depuis `origin/main@424f736b` (merge de #2156) dans le worktree `.claude/worktrees/orch-ci` (session Orchestration, file D).
- Un commit, posé juste avant le push. PR de documentation seule ; « prête @<sha> » pour l'intégrateur.
- Le lot est `pris` au carnet (ordre 81).
- La page elle-même vit hors dépôt : artefact privé de la page de suivi de la file D, version 12. Son adresse est dans la mémoire des sessions, jamais dans le dépôt.

## Objectif

Exécuter la réponse à `20261113-2355-d` (« Seconde page dans le même artefact »). D'abord un essai à blanc : une page de test qui n'écrit rien doit prouver qu'une page annexe reçoit la même base. Ensuite, construire le cockpit. La forme des réponses a été tranchée en séance : `20261115-1525-d`, « Réponse dans une ligne neuve ».

## Décisions prises

- Essai à blanc réussi, constaté à l'écran par la session (Chrome) :
  - la page annexe, ouverte par un lien relatif depuis la page de suivi, a compté les quatre collections ;
  - items et questions donnent exactement les comptes attendus ; messages et lots en ont un de plus chacun, écrit par d'autres sessions entre-temps ;
  - adresse servie : `/_f/<version>/<fichier>.html`.
  La page de test et son lien ont été retirés (version 11).
- `20261115-1525-d`, réponse du responsable en séance :
  - le cockpit n'écrit jamais dans une question ;
  - chaque confirmation crée une ligne neuve dans `reponses` ;
  - bouton réservé aux questions ordinaires ;
  - pas de « Retirer » ;
  - la session reporte la réponse dans la question.
  L'identifiant de la ligne de question porte une heure fausse (15 h 25 au lieu de 21 h 58). Il est gardé, puisqu'une ligne ne se supprime jamais, et ses horodatages ont été corrigés.
- Le cockpit enregistre l'identifiant opaque du compte (`par`), jamais un nom. Les sessions écrivent sous le même compte : la base ne distingue toujours pas un clic du responsable d'une écriture de session (limite connue, 1943-d).
- La page de suivi n'est pas touchée au-delà de l'onglet « Cockpit » : ses boutons « Retenir » et « Retirer » restent. Les retirer serait un autre lot.

## Fichiers modifiés

- `docs/ROLES_MACHINES.md` : puce « Réponse depuis le cockpit » dans « La liste commune de questions et le guichet ».
- `changelog.d/2026-11-15-cockpit-reponses.md`.
- Ce handoff.
- Hors dépôt : `cockpit.html` publié dans l'artefact de la page de suivi, et l'onglet « Cockpit » de sa navigation (version 12).

## Validations exécutées

- Script du cockpit : `node --check` vert.
- Constat à l'écran (Chrome) de la version 12 :
  - l'onglet « Cockpit » ouvre la page ;
  - les tuiles se remplissent, et les lots sont groupés par file avec le signal « sans nouvelles » ;
  - « À trancher » affiche son état vide : aucune question ouverte au moment du constat.
- `reponses` relue après publication : vide, la page n'écrit rien au chargement.
- Non exercé : l'écriture d'une réponse. Aucune question ordinaire n'était ouverte, et aucune ligne de test n'a été écrite dans un registre qui ne se purge pas.

## Problèmes ouverts

- Le chemin d'écriture (« Retenir », puis « Confirmer ») sera éprouvé à la première question ordinaire ouverte. La session qui reporte la première ligne vérifie ses champs contre la consigne.
- `wn-registres.mjs` ne lit pas encore `reponses`. Une ligne `envoyee` restée sans report n'est donc signalée par aucune machine. Lot possible : l'ajouter aux actions dues.
- Retirer les boutons « Retenir » et « Retirer » de la page de suivi (constat de 1943-d) n'est pas fait ; c'est un lot à inscrire si le responsable le veut.

## Prochaine action exacte

1. Pousser et ouvrir la PR (`--body-file`). Puis `node scripts/wn-attendre-ci.mjs <N>` en fond. À `0`, déclarer « prête @<sha> » à l'intégrateur, en nommant la question `20261115-1525-d`.
2. Au merge : passer le lot `cockpit-seconde-page` à `fait`, et clore `20261113-2355-d` et `20261115-1525-d`.
3. Lot suivant de la file D : `licences-tierces-bundle` (ordre 83).

## Interdits encore actifs

- Ne jamais supprimer une ligne des registres (`questions`, `messages`, `lots`, `reponses`).
- Pas de ligne de test dans `reponses`.
- Le cockpit ne répond jamais à une question `clinique` ou `migration`.
- Aucune adresse d'artefact dans le dépôt.
