# Handoff — autonomie-pieges-restes, partie 21 : la numérotation des sources au contrôle de fusion (2026-11-27)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie21`, tirée d'`origin/main` à 1f47a0a0 après le merge de la partie 20
  (#2380, squash e546903d), puis avancée deux fois par `--ff-only` (b8fffd69, puis 4abe2383 ; garde de fraîcheur),
  dans le worktree `.claude/worktrees/orch-ci`. La branche de la partie 20 n'a pas été avancée.
- Commit tardif, juste avant le push (D-518).
- `merge_fait` de #2380 (`20261126-2349-integrateur-d-2380`) trouvé déjà à `traite` (accusé par la passe cloud
  `20261126-2309-orch`). Aucune autre ligne `emis` adressée à la boîte D.

## 2. Objectif

Restes des parties 13-14 (arbitrage 7 du 2026-11-25, dans ce lot, après les pièges) : `sources-check` hors
`GARDES_NODE` ; `wn-integrer` sans preuve PR-Agent ; fixture E2E `WN-SRC-0998` ; dossiers `wn-repro-imp-*`. Un reste
par partie si le diff grossit.

## 3. Décisions prises

- **Partie 21 = `sources-check` seul.** Le garde `sources` (`scripts/lib/sources-numerotation.mjs`) entre dans
  `GARDES_NODE` de `scripts/wn-controle-fusion.mjs`, `sansVerdict: [2]` comme la numérotation des décisions. Il joue
  en local : sans `--pr`, et `GITHUB_EVENT_NAME` est déjà retiré de l'environnement par le contrôle, donc aucune
  lecture de base ni de réservations. Vérifié sur l'arbre réel : `OK : 831 notices, jusqu'à WN-SRC-0859`.
- `signaturesNode` ne retient plus le rang de notice (`notice 7 :`, `(notices 40 et 611)`) : sans cela, une source
  insérée plus haut par la PR ferait passer un doublon préexistant de `main` pour une violation de plus.
- Le texte de `D-373` §4 n'est pas touché (« liste explicite », historique) ; la liste fait foi dans le code.
- **Arbitrages du responsable, en session, le 2026-11-27** (questions posées en bloc, recommandations retenues) :
  - `wn-integrer` : **garde + repli déclaré**. Il lance `wn-revue-pr-agent <N>` et `wn-attendre-ci <N> --sha
    <sha>` ; si PR-Agent ne rend pas 0, il n'accepte que si la déclaration du propriétaire cite « D-448 » et
    « wn-reviewer GO @<sha> » sur ce sha ; sinon, code de refus neuf. Partie dédiée (22).
  - Fixture `WN-SRC-0998` : **tag posé**. `refs/tags/reserve/WN-SRC-0998` créé par l'API sur la tête de `main`
    (4abe2383), le 2026-11-27 au soir (avant 21:12Z) ; `wn-reserver-source` le sautera. Reste clos.
  - tmpdir : **les deux `wn-repro-imp-*` seuls**. Constatés absents (`find` sous `/var/folders` et `/private/tmp`) :
    rien à supprimer, reste clos. Les `wn-codex-p0-test-*` attendent le lot du rang 131.

## 4. Fichiers modifiés

- `scripts/wn-controle-fusion.mjs` : garde `sources`, en-tête et commentaires, `signaturesNode`.
- `scripts/wn-controle-fusion.test.mjs` : fixture du dépôt (fichier du garde), simulateur (`sources`), trois cas
  neufs (signature sans rang, garde inscrit, doublon imputable sur l'arbre fusionné).
- `changelog.d/2026-11-27-autonomie-pieges-partie21.md`, ce handoff.

## 5. Validations exécutées

- `node --test scripts/wn-controle-fusion.test.mjs` : 47 sur 47.
- Mutations : garde retiré de `GARDES_NODE` → 2 tests rouges ; normalisation du rang retirée → rouge. Fichier
  restauré à l'identique (`cmp`).
- `node scripts/lib/sources-numerotation.mjs` sur l'arbre réel : code 0.
- T1 complet (`npm run check`) : joué avant le commit ; son résultat est dans la déclaration de la PR.

## 6. Problèmes ouverts

- Partie 22 : la garde de preuve de revue dans `wn-integrer` (forme arbitrée au §3). Points à trancher dans le
  code, pas à reposer : nouveau code de sortie (27 ; 24 évité), place de l'étape (avant le déploiement), lecture du
  repli dans la déclaration servie seulement.
- Toujours hérités : banc `wn-codex-avis.test.mjs` contre les restes de `gate-codex-p0.test.mjs` (rang 131) ;
  conversion des 25 sites patient (rang 132) ; `mergeable=false` périmé après un changement de tête.
- Limite assumée du garde `sources` au contrôle : l'avertissement « source sans réservation » n'y joue pas (mode
  local) ; il reste au CI de la PR.

## 7. Prochaine action exacte

1. T1 complet à 0, commit, push, PR (`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond.
2. `node scripts/wn-revue-pr-agent.mjs <N>` → 0, verdict par focus area, puis « prête @<sha> » sur la PR et au
   registre (boîte `integrateur`). Plus aucune écriture sur la PR ensuite (D-546).
3. Partie 22 sur `origin/main` après le merge : la garde de `wn-integrer` (§3), puis clôture du lot si rien d'autre
   ne reste.

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne jamais supprimer une ligne des registres. Pas de compaction du journal (gel `D-372` §2).
- `orchestrateur/arret` : seule la parole du responsable le change.
- Aucune adresse de page privée dans le dépôt. Horodater en lisant l'heure système.
- Ne tuer aucun processus. Ne supprimer aucun reste de tmpdir sans accord (les `wn-codex-p0-test-*` n'en ont pas).
