# Handoff — 2026-10-05 — BIO-INGEST LOT-08 : borne totale réelle de l'extraction

## Branche et état Git

`fix/bio-ingest-borne-totale-extraction`, partie de `main` (099d0f42). La PR
#1315 a été mergée le 2026-10-05 par auto-merge (0510b2b7) et ses checks
`verify`, `controles` et `e2e` étaient verts. Ce handoff et l'entrée
`SESSION_LOG` sont versés par une PR de rattrapage depuis `main`. La clôture
manquait à #1315, et Copilot l'a relevé.

## Objectif

Rendre vrai l'invariant « pire cas d'un appel d'extraction sous la péremption
d'un import en cours (5 min) ». Le `timeout` du SDK Anthropic 0.107.0 ne borne
que l'arrivée des en-têtes ; un flux dont le corps ne finit jamais n'était
borné par rien.

## Décisions prises

- `DUREE_TOTALE_EXTRACTION_MS = 240_000` : un `AbortController` propre est
  passé en `signal`, et la lecture du flux est comprise dans la borne.
  `DELAI_EXTRACTION_MS` (180 s) reste la borne des en-têtes.
- Un abandon est classé `delai_depasse`, y compris `APIUserAbortError`.
- TEMPS 3 (les lignes) reçoit un délai explicite,
  `DELAI_TRANSACTION_LIGNES_MS = 20_000`, posé dans `verrou.ts` (module pur).
  L'attente du verrou entame ces 20 s ; une expiration se range aujourd'hui en
  `reponse_invalide` (documenté, reclassement reporté).
- Invariant testé : 240 s + 20 s + une marge de 30 s ≤ 5 min.
- Inchangés : la consigne, le schéma de sortie et `bio-extraction-v1`. Ni
  worker, ni queue, ni retry.

## Fichiers modifiés

- `web/src/lib/biology-library/import/` : `extraction.ts`, `verrou.ts` et
  `lancerExtraction.ts`, avec leurs tests ; `extraction.borne.test.ts` est
  neuf (vrai client SDK, fetch simulé).
- La fiche `LOT-08-borne-totale-extraction.md` et `CAMPAGNE.md` ; la
  correction 120 s / 180 s dans la fiche LOT-02.
- `changelog.d/2026-10-05-bio-ingest-borne-totale-extraction.md`.

## Validations exécutées

- Défaut démontré : le test du flux sans fin était rouge avant le correctif
  (toujours pendant après 5 min) et vert après.
- Preuve hors dépôt avec le vrai fetch Node (undici) et un serveur SSE sans
  fin : `APIUserAbortError` à ~1 s et connexion fermée côté serveur.
- T1 complet vert ; T2 `--fast` vert (11 678 tests, E2E Chromium et WebKit).
- Revue `wn-reviewer` : GO, sans P0 ni P1. Les trois P2 sont traités ou
  acceptés (fiche LOT-08).
- Commentaire Copilot sur #1315 (clôture absente) : **corrigé** par cette PR
  de rattrapage.

## Problèmes ouverts

- Non constaté sur Scalingo : que le fetch de Next 15 dans `after()` honore
  bien l'abort (prouvé sous undici seulement).
- Un compte rendu dont la lecture dépasse 240 s échoue désormais
  `delai_depasse` (la mesure du 2026-10-02 était de ~36 s pour trois pages).
- L'expiration de TEMPS 3 est classée `reponse_invalide` et non
  `delai_depasse`.
- L'auto-merge a fusionné #1315 sans le contrôle de clôture de `wn-merge`
  (étape 7), qui n'est pas un check.

## Prochaine action exacte

Clôture de BIO-INGEST LOT-03 : le bouton « Relancer la lecture » part vers une
fiche dédiée. Ensuite, `BIOFLOW_ROADMAP.md` (PR de doc séparée), puis la
décision préalable D-267.

## Interdits encore actifs

- Pas de code LOT-07 avant D-267 mergée et une vérification de `main`.
- Ne pas modifier `ResultatBiologique`. Pas de worker ni de queue avant
  l'ADR asynchrone.
- Aucune valeur biologique ni aucun contenu de compte rendu dans les journaux ;
  aucune identité réelle.
