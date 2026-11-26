# Handoff — autonomie-pieges-restes, partie 20 : cliquet des erreurs journalisées en clair (2026-11-26)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie20`, tirée d'`origin/main` à 3b565ba5 après le merge de la partie 19
  (#2369, squash e108e793), puis avancée par `--ff-only` à 7c1a9c59 (garde de fraîcheur), dans le worktree
  `.claude/worktrees/orch-ci`. La branche de la partie 19 n'a pas été avancée : elle porte un commit propre.
- Commit tardif, juste avant le push (D-518).
- `merge_fait` de #2369 trouvé déjà à `traite` (accusé par une passe de l'orchestrateur). Message d'hygiène
  `20261126-0710-orchestrateur` de la boîte D passé à `lu`.

## 2. Objectif

Arbitrage 4 du responsable (2026-11-25) : relevé en lecture seule des objets d'erreur bruts journalisés dans
`web/src`, rendu avant toute règle. Puis la règle qu'il a choisie : question `20261126-0758-d`, réponse « C.
Comme B, en cliquet ».

## 3. Décisions prises

- **Relevé** (AST TypeScript, hors tests, 439 appels `console.*` ou `logger.*`) :
  - A, `console` + objet brut : 10 sites, tous dans `app/api/internal` ;
  - B, `console` + `err.message` ou `String(err)` : 141 sites, dont 25 dans des routes patient ;
  - C, `messageJournalisable` : 12 sites ;
  - D, `logger({ error })` : 33 sites. `sanitizeError` y garde le message tronqué ;
  - 126 sites déjà sûrs.

  Le message d'un `PrismaClientValidationError` recopie les arguments de l'appel, car `errorFormat` n'est pas
  fixé. Les journaux vont dans Scalingo seul : Sentry supprime les fils `console`, et il n'y a aucun drain Better
  Stack (liste des sources lue).
- **Règle (option C)** : banc `journalErreurBrute.guard.test.ts` et cliquet `journalErreurBrute.cliquet.json`,
  qui gèle 151 sites dans 109 fichiers, dont 25 dans des routes patient.
  - Le compte d'un fichier ne peut pas monter, et une baisse doit être écrite.
  - La portée est la variable du `catch` ou du rappel `.catch()` englobant, jamais un nom usuel : `reason` et
    `raison` étaient les faux positifs du relevé.
  - Les neutres sont `classeEtCode`, `signature`, `signatureErreur`, `nomErreur`, `traceErreur`,
    `messageJournalisable`, ainsi que `.name`, `.code`, `instanceof` et `typeof`.
  - Les propriétés comptées comme fuites sont `message`, `stack`, `meta` et `cause`.
  - Exemption motivée : `// wn-journal-erreur-sur : <motif ≥ 10 caractères>` sur la ligne qui précède l'appel.
- **Verdicts sur les trois focus areas de PR-Agent** (#2380) :
  - « Cliquet relâchable » : **corrigé**. Le mode d'écriture refuse toute hausse et tout fichier absent du gel ;
    il ne sait qu'abaisser.
  - « Convention WN_ » : **corrigé**. `WN_CLIQUET_JOURNAL_ECRIRE=true`, comme les drapeaux `WN_*` du code.
  - « Contournement possible » : **corrigé en partie**. Sont désormais lus :
    - `console['error']` et `console . error`, sur l'arbre et non plus sur le texte ;
    - le `catch ({ message })` déstructuré, pour `message`, `stack`, `meta` et `cause`.

    **Écarté avec motif** : la variable intermédiaire (`const detail = err.message`). La suivre demanderait une
    analyse du flot des valeurs, hors de portée d'un banc d'arbre. La limite est écrite en tête du banc, et la
    revue la garde.
- **Hors périmètre, non fait** :
  - `logger.*`, puisque l'option C ne porte que sur `console` ;
  - le correctif de `sanitizeError` pour les erreurs `PrismaClient*`, proposé à part et non retenu dans la
    réponse ;
  - aucun site existant converti.
- **Risque** : P2. Un banc Vitest et un JSON, sans code de production. Revue : PR-Agent.
- **Correction au registre** : j'avais horodaté `reponse_le` à 07:05Z sans lire l'horloge. Corrigé à 20:40Z, qui
  est l'heure de l'écriture.

## 4. Fichiers modifiés

- `web/src/lib/observability/journalErreurBrute.guard.test.ts` (nouveau) : détecteur, cliquet, témoins.
- `web/src/lib/observability/journalErreurBrute.cliquet.json` (nouveau) : comptes gelés.
- `changelog.d/2026-11-26-cliquet-journal-erreur-brute.md`.

## 5. Validations exécutées

- Banc : 4 sur 4 verts.
- Mutations, toutes rouges :
  - M1 : fuite neuve dans `portail/date-naissance` ;
  - M2 : site converti sans abaisser le cliquet ;
  - M3 : `sanitizeAuditError` admise comme neutre. Elle passait d'abord ; j'ai ajouté le témoin
    `sanitizeAuditError(err)` ;
  - M4 : `meta` retiré des fuites ;
  - M5 : exemption sans motif minimal ;
  - M6 : portée perdue ;
  - M7 : le mode d'écriture gèle une fuite neuve. Il échoue, et le gel n'est pas réécrit ;
  - M8 : `console['error']` non reconnu ;
  - M9 : champs déstructurés ignorés.
- Après les deux fusions d'`origin/main` (jusqu'à 32380ddf), le compte est inchangé : 151 sites.
- Fichiers restaurés après mutation (`cmp`).
- T1 rapide : code 0. T1 complet : joué avant le commit.

## 6. Problèmes ouverts

- 151 sites à résorber, routes patient d'abord (25). Candidat au carnet de la file D : un lot de conversion vers
  `classeEtCode`. À chaque conversion, réécrire le cliquet (`WN_CLIQUET_JOURNAL_ECRIRE=1`).
- Les 33 `logger({ error })` gardent un message tronqué (`sanitizeError`). Cela reste à arbitrer si le
  responsable le souhaite.
- Toujours hérités : un `mergeable=false` périmé après un changement de tête (à constater) ; `--sha` depuis
  l'intégrateur (reste 13-14).
- **Constaté sur #2380 le 2026-11-26** (matière pour le lot `gh-rest-rerun-check-runs`, file D, ordre 101) :
  - Le premier CI a échoué : `typage-tests` était rouge sur `main` depuis 10:00Z. La cause est une fixture
    clinique datée du 2026-11-05, prise sur l'horloge réelle avec une fenêtre de 21 jours. L'intégrateur l'a
    corrigée par #2379.
  - Après le correctif, j'ai fermé puis rouvert la PR pour recalculer la fusion. Le nouveau run a tout passé
    (45896808088), et `mergeState` est revenu à `CLEAN`.
  - Mais `wn-attendre-ci` a rendu 1, avec « verify → SUCCESS/FAILURE » : sur la même tête, il agrège l'ancien
    `verify` en échec et le nouveau réussi.
  - Seule une tête neuve en sort. Le responsable a arbitré : fusion d'`origin/main` dans la branche (exception à
    D-518 pour #2380, 2026-11-26).

## 7. Prochaine action exacte

1. T1 complet, commit, push, PR (`--body-file`), puis `node scripts/wn-attendre-ci.mjs <N>` en fond.
2. `node scripts/wn-revue-pr-agent.mjs <N>` doit rendre 0, avec un verdict par focus area. Puis « prête @<sha> »
   sur la PR et au registre (boîte `integrateur`, ligne du lot). Ensuite, plus aucune écriture sur la PR (D-546).
3. Partie 21, les restes 13-14 :
   - `sources-check` hors `GARDES_NODE` ;
   - `wn-integrer` sans preuve PR-Agent, en passant `--sha` à `wn-attendre-ci` ;
   - la fixture E2E `WN-SRC-0998` ;
   - les dossiers `wn-repro-imp-*`.

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne jamais supprimer une ligne des registres. Pas de compaction du journal (gel `D-372` §2).
- `orchestrateur/arret` : seule la parole du responsable le change.
- Aucune adresse de page privée dans le dépôt. Horodater en lisant l'heure système.
- Ne tuer aucun processus.
