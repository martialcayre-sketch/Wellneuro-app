# Handoff — file D, d53 : `WN_AGENDA_RELANCE` reposée et constatée

## Branche et état Git

`docs/file-d-d53-relance-posee`, créée depuis `origin/main` (52587a9a) dans
le worktree `file-d1-suite`. Documentation seulement : aucun code, aucune
migration, aucun chemin qui déclenche une release-db.

## Objectif

Consigner au registre des drapeaux la repose de `WN_AGENDA_RELANCE` (d53) et
son constat, après la clôture du LOT-02 (#1971, mergée le 2026-11-10 à
23:45 UTC).

## Décisions prises

- Aucune nouvelle décision. La repose avait été décidée par le responsable
  le 2026-10-24. La condition « après k01 » a été levée avec la clôture du
  LOT-02 (`20261107-2125-d`, option 1).
- Geste du responsable, pas de la session : `env-set` puis `restart`, le
  2026-11-11 à 08:24:43 UTC.

## Fichiers modifiés

- `docs/FEATURE_FLAGS.md` (ligne `WN_AGENDA_RELANCE`)
- `changelog.d/2026-11-11-d53-agenda-relance-reposee.md`
- ce handoff

## Validations exécutées

- Chronologie Scalingo lue : « WN_AGENDA_RELANCE added », puis
  « user restart », à 08:24:43 UTC.
- `scalingo ps` : web-1, web-2 et worker-1 créés à 08:24:43.
- Constat du responsable, sans clic : bouton « Relancer ce patient » visible
  au tableau de bord, et `relanceActive: true` dans la réponse de
  `GET /api/praticien/agenda-sommeil/suivi`.
- Aucune sonde de la session sur la route d'envoi : c'est un POST, et sans
  session il répond 401 avant de lire le drapeau.
- T1 complet et CI : voir la PR.

## Problèmes ouverts

- Aucun pour d53. Les relances envoyées désormais ne sont plus mesurées
  relance fermée : toute nouvelle lecture d'adhésion doit les compter à part.

## Prochaine action exacte

PR, CI en tâche de fond (`node scripts/wn-attendre-ci.mjs <N>`), revue
(CodeRabbit, sinon PR-Agent, sinon `wn-reviewer`), un verdict par remarque,
commentaire « prête @sha », sans merge (intégrateur, `D-454`). Côté file D,
il n'y a plus de geste jouable : #1868 attend l'intégrateur, d31 la
prochaine recette sur téléphone, d03 l'intégrateur et d37 l'avocat.

## Interdits encore actifs

Rien sous `web/src/lib/clinical/` ni dans `indicationsBiologieV1.ts` ; ni
migration ni `schema.prisma` ; aucune écriture en production, aucun `env-set`
par la session ; jamais de clic sur la relance (elle envoie un e-mail au
patient) ; aucune valeur, aucun seuil, aucun délai proposés par la session ;
aucune D-xxx sans arbitrage ; aucun identifiant ni nom de dossier dans le
dépôt ; pas de merge (intégrateur, `D-454`).
