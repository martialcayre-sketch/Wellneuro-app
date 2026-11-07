# Handoff — file D, k01 / H27 : seconde lecture de la re-mesure (LOT-02)

## Branche et état Git

`docs/file-d-k01-seconde-lecture`, créée depuis `origin/main` puis avancée en
`--ff-only` sur b5b4c040. Documentation seulement : aucun code, aucune
migration, aucun chemin déclencheur de release-db.

## Objectif

Jouer la seconde lecture de `REMESURE_ADHESION.sql` (k01, H27), relancer la
comparaison `c_apres` contre `a_avant` sur fenêtres échues, et verser la
lecture en agrégats.

## Décisions prises

- Arbitrage du responsable du 2026-11-07 (`20261107-2120-d`, liste commune) :
  lecture avancée du 2026-11-12 au 2026-11-07. Motif : un comptage préalable
  en agrégat donnait deux fenêtres `c_apres` échues ce jour-là comme le
  2026-11-12, la troisième ne s'achevant pas avant le 2026-11-13. Pas de D-xxx
  (la date était un choix de calendrier de la fiche).
- Clôture du LOT-02 et levée de la porte 16 non décidées : question
  `20261107-2125-d`, ouverte, option recommandée « clore maintenant ».

## Fichiers modifiés

- `docs/claude/campagnes/2026-10-07-agenda-sommeil-adhesion/lots/LOT-02-remesure.md`
  (statut, calendrier, section « Seconde lecture »)
- `docs/claude/plan-journal/H27/2026-11-07-01-seconde-lecture.md`
- ce handoff

## Validations exécutées

- Comptage préalable et requête complète joués à blanc sur la base locale du
  worktree, puis en production par `scalingo run -d` (requête en base64 dans
  `WN_Q`, `BEGIN READ ONLY; … ROLLBACK;`, sortie gzip base64 entre marqueurs),
  bornes `av` 2026-10-07, `ap` 2026-10-09, horloge de la base 2026-11-07
  20:22 UTC. Sortie brute non versée.
- R07 conforme ; référence `a_avant` relue avant comparaison, identique à la
  première lecture ; comptes réconciliés à la main (lignes / nuits, heures
  5 h - 11 h).
- T1 complet et CI : voir la PR.

## Problèmes ouverts

- Mouvement de la référence entre le 2026-10-09 et le 2026-10-29 (R02, R04)
  toujours sans cause établie ; `b_transition` a gagné une nuit sur fenêtres
  échues depuis le 2026-10-29 (9 → 10 / 63), sans cause établie. Pour R01
  seul, la part mécanique de `assignes_7j` (compté au jour de la lecture) est
  consignée dans la fiche.
- Piège de lecture des journaux : la ligne `[manager] … started with the
  command` contient elle-même le marqueur de fin ; la détection doit exiger un
  contenu base64 entre les marqueurs.

## Prochaine action exacte

PR, CI en tâche de fond (`node scripts/wn-attendre-ci.mjs <N>`), revue
(CodeRabbit, sinon PR-Agent, sinon `wn-reviewer`), verdicts, « prête @sha ».
Puis, selon la réponse à `20261107-2125-d` : clôture du LOT-02 et porte 16
(option 1, d53 jouable ensuite — geste `env-set` + `restart` du
responsable), ou troisième lecture au 2026-11-13 au plus tôt (option 2).

## Interdits encore actifs

Rien sous `web/src/lib/clinical/` ni dans `indicationsBiologieV1.ts` ; ni
migration ni `schema.prisma` ; aucune écriture en production, aucun `env-set`
par la session ; aucune valeur, seuil ou délai proposés par la session ;
aucune D-xxx sans arbitrage ; aucun identifiant ni nom de dossier dans le
dépôt ; pas de merge (intégrateur, `D-454`). `WN_AGENDA_RELANCE` reste absente
jusqu'à la réponse à `20261107-2125-d`. En attente : d31, d03, d37 ; hors
file D : d22, d56, d57, d58/H98.
