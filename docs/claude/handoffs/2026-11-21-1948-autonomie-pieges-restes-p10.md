# Handoff — lot `autonomie-pieges-restes`, partie 10 : release-db sur 504 (2026-11-21)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie10`, tirée d'`origin/main` à 6142fb4c (#2303), après le merge de la
  partie 9 (#2301, b229dac2). Elle vit dans le worktree `.claude/worktrees/orch-ci`. L'ancienne
  `chore/autonomie-pieges-partie9` est périmée et n'a pas été touchée.
- Le commit est fait tard, juste avant le push (D-518).
- Carnet : le lot `autonomie-pieges-restes` (ordre 35) reste pris par cette session. `branche` et `tenu_le` ont été
  mis à jour avec `if_version`, en version 35.
- Boîte D lue au démarrage :
  - `merge_fait` de #2301 : déjà « lu » par la passe cloud ;
  - un message `emis` de l'orchestrateur cloud (lot `superviseur-protection-fusion` rangé « bloque », 403,
    troisième passe d'affilée) : passé à « lu ». Il ne demande aucun geste à la file D : le geste revient au
    responsable (sources de la routine).
- **Fait signalé au responsable** : des passes de l'orchestrateur cloud tournent à 16:02, 17:21 et 18:09 UTC le
  2026-11-21. Or le handoff de la partie 9 disait « aucune routine » et `orchestrateur/arret` à `true`. Cette
  session n'a rien touché à la routine.

## 2. Objectif

Le piège « release-db sur 504 » (mémoire `release-db-rouge-sur-verification-posterieure`, 2026-08-24). Un 504 de
l'API Scalingo au lancement de la contre-épreuve rend le run rouge alors que la release est appliquée. Ce rouge se
lit « base non migrée », et pousse à relancer une release.

## 3. Décisions prises

- **Risque P0** : `release-db.yml` est dans la liste P0 de `POLITIQUE_REVUE.md` (D-520 §7). Revue : contre-revue
  Codex P0 (`wn-codex-avis.mjs`, D-505) et `wn-reviewer` sur la tête, puis PR-Agent.
- **Cause** : sous `bash -e` (shell par défaut des étapes, sans `pipefail`), `SORTIE=$(scalingo … run …)` en échec
  fait sortir l'étape sans un mot, la sortie du CLI restant captive. Les deux étapes qui lancent un one-off ont ce
  défaut.
- **Contre-épreuve** : trois lancements au plus, `sleep 20` entre deux. Ce one-off est en lecture seule (`prisma
  migrate status`), donc un doublon né d'un 504 trompeur est sans effet. Le refus final, faute de conteneur ou de
  sentinelle, rappelle que la release a eu lieu (l'étape ne tourne qu'après le vert de la précédente, sans `if:`)
  et qu'il ne faut pas la relancer. Le refus `WN_STATUT_DB_ECHEC` reste sans ce rappel.
- **Release** : aucune nouvelle tentative, par décision. Un 504 peut mentir, et un second lancement serait une
  seconde release. Seul le message change : la sortie du CLI est montrée, l'état est dit INCONNU, avec quoi lire
  avant tout geste. Le code de sortie reste 1.
- Le rappel de la contre-épreuve pointe la sortie que laisse la sonde. Un run dont la contre-épreuve rougit se
  classe `inconnu` (`classerRunReleaseDb`) ; sa migration reste alors au reliquat de la sonde, et les chemins
  déclencheurs gèlent jusqu'à un `workflow_dispatch` humain ou un revert (règle §5 piège 2, D-520 §3 bis). Le
  message dit donc « ne pas relancer à l'aveugle ; constater, puis dispatch humain », et non « ne pas relancer ».
  Pour la machine, le rouge reste `inconnu` : seul le lecteur humain n'y lit plus une release ratée.
- Ni `docs/DEPLOIEMENT_RELEASE_DB.md` ni la règle `pr-revue-et-release-db.md` ne sont modifiés : la règle décrit
  déjà la conséquence (piège 2), et le message du workflow porte la consigne.

## 4. Fichiers modifiés

- `.github/workflows/release-db.yml` : les étapes « Release en one-off » et « Vérification — migrate status sur
  conteneur ».
- `scripts/release-db-comportement.test.mjs` : cinq cas neufs et un `scalingo` factice.
- `changelog.d/2026-11-21-autonomie-pieges-partie10.md`, ce handoff.

## 5. Validations exécutées

- Premier commit (6ecb53f7) : banc à 41 sur 41, dont 5 cas neufs. Mutation de référence avec le workflow
  d'`origin/main` : 4 cas rouges sur 5 ; « base PAS à jour » est une garde de non-régression.
- Contre-revue Codex P0 (`wn-codex-avis.mjs`, avis conforme) : un P2, corrigé. « Non lancé » devient « aucun
  identifiant obtenu », car un 504 peut mentir.
- `wn-reviewer` sur 6ecb53f7 : NO-GO pour un P1, plus quatre P2. Tous sont corrigés dans le commit de revue :
  - P1 : le rappel citait `WN_RELEASE_DB_OK id=$WN_RELEASE_ID`, ce qui gardait vert l'invariant « sentinelles
    liées au run » même avec un `grep -q` nu. Le rappel ne nomme plus la sentinelle, l'invariant est ancré sur
    `grep -q "…"`, et un cas joue la sentinelle d'un autre run ;
  - P2-1 : le rappel pointe la sortie du gel (§3) ;
  - P2-2 : une release sans identifiant dit l'état INCONNU, et un cas le couvre ;
  - P2-3 : `|| true` sur l'extraction de l'identifiant ;
  - P2-4 : la sortie et le code du CLI sont montrés à chaque essai en échec.
- `wn-reviewer` sur l'écart 6ecb53f7..ee22c197 : GO, avec deux P2 résiduels.
  - Le rappel surestime le gel : écarté. Le gel ne vaut que si le run porte une migration non attestée ; l'erreur
    va dans le sens prudent, et un dispatch n'écrit rien sur une base à jour.
  - Pas de cas « sentinelle d'un autre run » côté contre-épreuve : corrigé par un cas neuf. La mutation
    `grep -q "WN_STATUT_DB_OK"` nu rougit ce cas et l'invariant, puis le fichier est rétabli.
  - Bancs à 74 sur 74.
- Après les corrections du NO-GO : comportement et invariants à 73 sur 73. Mutation du P1 rejouée (`grep -q "WN_RELEASE_DB_OK"`
  nu dans la release) : deux rouges, le cas « autre run » et l'invariant ; le fichier est rétabli ensuite.
- T1 complet (`npm run check`) : vert (code 0), anti-secrets compris. T2 n'est pas joué : aucun E2E n'est concerné.
- Aucun chemin déclencheur de `release-db` n'est touché : le merge ne lance aucun run.

## 6. Problèmes ouverts

- Non éprouvé contre la vraie API : le format de sortie de `scalingo run --detached` après un 504 qui aurait
  quand même créé le conteneur. Le banc suppose « code non nul, pas d'identifiant ». Si un identifiant sort
  malgré l'erreur, l'étape le suit, ce qui est le bon comportement.
- Signalé par l'intégrateur (`merge_fait` de #2301) : `web/src/lib/bibliotheque-options/importeurs.guard.test.ts`
  rougit sur `main` dans quatre contrôles de fusion d'affilée et passe rejouée seule. C'est probablement un délai
  sous charge. Candidat pour ce lot.
- Pièges encore à traiter dans le lot :
  - one-off Scalingo recyclé ;
  - réservation WN-SRC ;
  - focus areas de PR-Agent ;
  - SESSION_LOG réordonné ;
  - sessions concurrentes ;
  - crochets de la copie principale en retard ;
  - `wn-attendre-ci` ;
  - statut « transféré » (décision requise) ;
  - lint « objet d'erreur brut ».

## 7. Prochaine action exacte

1. Commit, push et PR (`--body-file`). Ensuite `wn-attendre-ci` en fond.
2. Contre-revue Codex P0 sur le diff poussé, avis déposé sur la PR. Puis `wn-reviewer` sur la tête et PR-Agent → 0.
   Chaque remarque reçoit un verdict.
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`). La PR touche `release-db.yml` : la sonde la gèle
   pendant un run en attente, ce qui ne change rien au régime de merge. Ensuite, plus aucune écriture sur la PR
   (D-546).
4. Ensuite, le piège suivant : « one-off Scalingo recyclé », ou la garde `importeurs` si le responsable la préfère.

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Fixtures neutres seulement. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune routine créée, rallumée ni lancée. `orchestrateur/arret` reste à `true`. La phase 3 (pilote) attend le
  feu vert du responsable.
- Ne pas déclarer la porte 24 levée. Aucune adresse de page privée dans le dépôt.
- Horodater en lisant l'heure système.
