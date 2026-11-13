# Handoff — 2026-11-13 — Refonte Lien PRA-3b, micro-lot Q18 : la diffusion n'approuve qu'une version en vigueur

## Branche et état du dépôt

- Branche `worktree-refonte-lien-pra3b-q18-diffusion`, créée depuis `origin/main` (avec la PR 6a mergée ; la PR 6b, #2078, est prête et attend l'intégrateur).
- Worktree `.claude/worktrees/refonte-lien-pra3b-q18-diffusion`. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».

## Objectif

Q18 du prototype PRA-3b, réponse « a » du responsable (« Toutes en a », 2026-11-13) : le serveur refuse (409) une empreinte qui n'est plus celle de la version en vigueur, avec le message existant de l'aperçu périmé, et le client recharge versions et aperçu. Micro-lot serveur avec ses tests, posé avant la PR 4 (Actions et protocole).

## Décisions prises

- « Version en vigueur » = `resolveActiveVersion` sur les versions de la même décision et du même dossier, exactement ce que le GET montre. La comparaison porte sur l'empreinte (`inputHash`), celle que le clic envoie.
- Le contrôle se place juste après le 404 et AVANT la validation d'approbation, le rejeu de la carte et toute écriture : un clic périmé ne coûte aucun rejeu.
- Aucune version lisible sur la décision : refus aussi (fail-closed), jamais une approbation à l'aveugle.
- Motif neuf `version_plus_en_vigueur`, message existant `ERREUR_APERCU_PERIME` (aucun texte neuf). Le cockpit traite ce motif comme `apercu_fiches_perime` : il recharge versions et état de diffusion.
- Aucun verrou pris : une version enregistrée dans la même fraction de seconde que le clic n'est pas couverte. Q18 vise l'onglet resté ouvert, pas la course à la milliseconde ; la route d'enregistrement ne partage aucun verrou avec celle-ci.

## Fichiers modifiés

- `web/src/app/api/praticien/protocoles/diffusion/route.ts` (contrôle de la version en vigueur).
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` (le motif neuf recharge versions et aperçu).
- Tests : `route.test.ts` (version en vigueur par défaut ; trois bancs « deux onglets » : V1 remplacée refusée sans écriture ni rejeu, V2 approuvée, aucune version refusée), `route.complement.test.ts` (la lecture de la version en vigueur ne lit pas le contrat), `diffusionFiches.guard.test.ts` (rechargement sur le motif neuf).
- `changelog.d/2026-11-13-refonte-lien-pra3b-q18-version-en-vigueur.md`, ce handoff.

## Validations exécutées

- Vitest ciblé : `app/api/praticien/protocoles`, `diffusionFiches.guard`, `ClinicalRuntimeSection` — 10 fichiers, 280 tests verts.
- Revue renforcée `wn-reviewer` (lecture seule) : GO, aucun P0/P1. Même définition « en vigueur » au POST, au GET et à la route des versions ; refus avant toute écriture, drapeaux ouverts ou fermés ; aucun appelant cassé (cockpit, E2E `portail-signalement-designation`) ; fenêtre sans verrou jugée acceptable. P2-1 (mock par défaut manquant au bloc « fiches d'assiette », couplage d'ordre) et P2-2 (refus drapeau ouvert non prouvé) corrigés ; P2-3 (cockpit prouvé par la garde de source seulement) laissé, optionnel.
- Après correctifs : `diffusion/*.test.ts` 105 verts, bloc « fiches d'assiette » seul vert (32).
- T1, T2 : voir la PR.

## Problèmes ouverts

- Fenêtre résiduelle sans verrou (voir Décisions) ; la fermer demanderait un verrou partagé avec la route d'enregistrement des versions.
- Suite du plan PRA-3b : PR 4 (Actions et protocole) débloquée par ce micro-lot, puis PR 1, 3, 7, 8. Hérités : « Activer la décision JA » sous T-63 (PR 5) ; titre des portes biologiques lié à « Assiettes indiquées » (PR 6b).

## Prochaine action exacte

Revue renforcée (route de diffusion) puis fusion par l'intégrateur ; ensuite la PR suivante que désigne le responsable, depuis un worktree neuf sur `origin/main`.

## Interdits encore actifs

- Rien de clinique ; aucun texte hors de D-488 ; aucune migration, aucun drapeau.
- Identités fictives seulement ; production en lecture seule.
