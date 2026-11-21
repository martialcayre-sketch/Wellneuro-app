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
- Ni `docs/DEPLOIEMENT_RELEASE_DB.md` ni la règle `pr-revue-et-release-db.md` ne sont modifiés : aucun des deux ne
  décrit cette étape en échec, et le message du workflow porte la consigne.

## 4. Fichiers modifiés

- `.github/workflows/release-db.yml` : les étapes « Release en one-off » et « Vérification — migrate status sur
  conteneur ».
- `scripts/release-db-comportement.test.mjs` : cinq cas neufs et un `scalingo` factice.
- `changelog.d/2026-11-21-autonomie-pieges-partie10.md`, ce handoff.

## 5. Validations exécutées

- `node --test scripts/release-db-comportement.test.mjs` : 41 sur 41, dont les 5 neufs.
- Mutation de référence, le workflow d'`origin/main` rétabli puis remis : les cas 37, 38, 39 et 41 rougissent. Le
  cas 40 (« base PAS à jour ») est une garde de non-régression, verte des deux côtés.
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
