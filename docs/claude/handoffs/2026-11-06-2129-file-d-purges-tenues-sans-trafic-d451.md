# Handoff — file D, purges tenues sans trafic ni worker (D-451)

## Branche et état Git

- Branche `fix/file-d-purges-independantes`, worktree `file-d1-suite`, issue
  de `origin/main` @0e576389 (avance `--ff-only`, aucun commit local avant).
- #1891 (D-449) mergée (f1943140). #1868 (d33) reste chez l'intégrateur.
- D-451 réservée (`refs/tags/reserve/D-451`).
- Pas de migration ni de release-db. Rien sous `web/src/lib/clinical/`.

## Objectif

Corriger les deux purges relevées le 2026-11-06 (handoff
`2026-11-06-1338-file-d-d37-avis-gpt-d449.md`, « Problèmes ouverts »). Leur
tenue doit dépendre ni du trafic ni du processus de fond, sans changer
aucune durée.

## Décisions prises

Quatre arbitrages du responsable du 2026-11-06, consignés en D-451 :

- **Q1** : les trois purges opportunistes sont jointes au cron horaire
  existant. La purge à l'écriture reste.
- **Q2** : la purge à l'échéance clôt un travail encore ouvert. Le délai se
  compte depuis J30 et vaut une période du cron (premier passage toléré,
  second clôt), soit `GRACE_TRAVAIL_OUVERT_MS` = 1 h.
- **Q3** : une nouvelle lecture d'un dépôt de 30 jours est refusée à la
  demande (`document_echu`), avec un texte validé (brouillon retenu tel
  quel).
- **Q4** : le motif est `document_purge`, et il n'y a pas de motif neuf (pas
  de migration).
- Écartés : ligne cron dédiée, ne rien changer ; alerte seule, aucun délai,
  vie d'un travail sain ; refus aussi à la réclamation ; motif neuf.

## Fichiers modifiés

- Code :
  - `web/src/lib/biology-library/import/purge.ts` (borne du report,
    `ECHEANCE_DEPOT_JOURS`, `GRACE_TRAVAIL_OUVERT_MS`, compteur
    `travauxClos`) ;
  - `fileExtraction.ts` (refus `document_echu`) ;
  - la route `api/praticien/biologie/import/extraction` (message) ;
  - `web/src/lib/conservation/purgeTraces.ts` (neuf) ;
  - `web/scripts/purgeComptesRendusEcheance.ts`, où les trois blocs sont
    désormais indépendants.
- Commentaires seuls : `lib/praticien/journalAcces.ts`,
  `app/portail/google/retour/route.ts`.
- Tests : `purge.test.ts`, `fileExtraction.test.ts`,
  `conservation/purgeTraces.test.ts` (neuf), `extraction/route.test.ts`,
  `web/scripts/banc-purge-echeance.test.ts` (cas 0, 4 bis, 4 ter, 8 ; cas 4
  dans la grâce).
- Docs :
  - `docs/decisions/D-451.md` ;
  - lignes datées sous `D-282.md` et `D-318.md` ;
  - `docs/DOSSIER_RGPD.md`, rubrique 8 ;
  - `changelog.d/2026-11-06-d451-purges-tenues-sans-trafic.md` ;
  - ce handoff.

## Validations exécutées

- T1 rapide : code 0. T1 complet : code 0.
- Vitest ciblé (4 fichiers) : 34 verts.
- `banc-purge-echeance` sur la base locale du worktree (`wn-dev-db`) : 11 cas
  verts. Il n'est pas dans T2 `--fast`, mais il est joué en CI.
- `banc-file-extraction-deux-sessions` : vert.
- T2 `npm run test:worktree -- --fast` : séquence verte en 8 min 39 s, E2E
  compris.

## Problèmes ouverts

- Le commentaire de `PortailConnexionGoogle` dans `schema.prisma` dit « PAS DE
  PURGE AUTOMATIQUE » : il était déjà périmé (purge à l'écriture), et il l'est
  davantage maintenant. Non touché, car `schema.prisma` est interdit sans
  demande explicite.
- Une lecture vivante coupée à J30 + grâce a pu être facturée par le
  fournisseur (D-451 §3, assumé). Aucune occurrence connue.
- Aucun constat de production sur le premier passage du cron après le
  déploiement. À lire par conteneur, en agrégats, seulement si le
  responsable le demande : `[purge traces]` dans les logs du cron.

## Prochaine action exacte

PR ouverte, `wn-attendre-ci` en fond (code 0 seul), puis la revue :
CodeRabbit, sinon `node scripts/wn-revue-pr-agent.mjs N`, sinon
`wn-reviewer` (D-448). Ensuite un verdict par remarque, puis « prête @sha ».
L'intégrateur merge. Mettre à jour la ligne d37 de la page de suivi de la
file D.

## Interdits encore actifs

Ni migration, ni `schema.prisma`, ni `web/src/lib/clinical/`, ni
`indicationsBiologieV1.ts`. Aucune écriture en production. Lecture prod par
conteneur, en agrégats, sur demande seulement. Aucune durée, valeur ni
délai proposés par la session. Aucune identité réelle. Ne pas merger (essai
D-373). En attente, à ne pas commencer : d25, d31 ; d58, d56, d59, d53 (pas
avant le 2026-11-13), d22.
