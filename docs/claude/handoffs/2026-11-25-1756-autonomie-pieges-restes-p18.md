# Handoff — autonomie-pieges-restes, partie 18 : `wn-attendre-ci`, e2e lent et tête périmée (2026-11-25)

## 1. Branche et état Git

- Branche `chore/autonomie-pieges-partie18`, tirée d'`origin/main` à 97e0d72d (après le merge de #2347, partie 17,
  619d9068), dans le worktree `.claude/worktrees/orch-ci`.
- Commit tardif, juste avant le push (D-518).

## 2. Objectif

Convertir en contrôle les deux pièges de `scripts/wn-attendre-ci.mjs` (lot `autonomie-pieges-restes`, file D,
ordre 35), dont le code `0` seul autorise « prête » :

1. **e2e lent** : `verify` a `needs: [controles, typage-tests, e2e]` et n'existe qu'à leur fin. Un e2e qui traîne
   (#1649, 2026-10-22) faisait sortir le script en `2` « JAMAIS créé, non diagnosticable », lu comme un dispatch
   manqué ;
2. **tête périmée** : lancé avec le `git push`, le script lisait l'ancienne tête et rendait un verdict sur elle
   (#1338, 2026-10-06 : `2` CONFLICTING).

## 3. Décisions prises

- **Arbitrage du responsable (2026-11-25, question 3)** : les deux correctifs ; `0` reste seul à autoriser
  « prête ». Ordre des parties suivantes : « transféré » (19), relevé du lint (20), puis les restes 13-14.
- **e2e lent** : à l'expiration, après les causes (conflit, Copilot, squash), si un job d'un run `ci.yml` du
  commit de tête n'est pas conclu, sortie `3` qui nomme job, statut et étape. Même règle pour un `verify` annulé
  dont le remplaçant tourne. Jobs illisibles (`null`) ou aucun en cours (`[]`) : `2` inchangé.
- **Tête attendue** : `--sha` (ou `--sha=`) prime ; sinon HEAD local si la branche courante
  (`git branch --show-current`) est celle de la PR et que la PR est du dépôt même (`isCrossRepository === false`).
  Avant tout verdict, on attend que GitHub la porte ; à l'expiration, `3` avec les deux sha. Verrou : atteinte, ou
  dépassée par un descendant (`compare` → `ahead`/`identical`), elle tombe et la tête GitHub refait foi.
- **Risque** : P1 outillage du merge (le code `0` gouverne « prête »), sans nouveau chemin vers `0`.
- **Verdicts de la revue adverse `wn-reviewer`** (GO sous réserve, « aucun nouveau chemin ne mène à 0 ») :
  1. tête figée au départ → attente vaine si la session pousse son handoff pendant l'attente ou si un tiers
     pousse par-dessus : **corrigé** (verrou + descendant admis, `shaAttenduApres`) ;
  2. runs de tous les workflows comptés (PR-Agent sur le même sha masquerait un vrai dispatch manqué du CI) :
     **corrigé** (filtre `ci.yml`) ;
  3. HEAD local non poussé → 25 min avant le `3` : **corrigé** par un avertissement au départ (`@{u}` ≠ HEAD) ;
  4. PR de fourche au même nom de branche : **corrigé** (`isCrossRepository === false` exigé) ;
  5. `rev-parse --abbrev-ref` rend `heads/<nom>` avec un tag homonyme : **corrigé** (`branch --show-current`) ;
  6. `--sha=<sha>` ignoré : **corrigé** (lu et validé) ;
  7. doc : action du `3` scindée selon le sous-cas : **corrigé** ;
  8. job `queued` sans fin : **corrigé**, le statut est nommé ;
  9. lectures N+1 : **corrigé**, les jobs ne se lisent que si le verdict reste `2` sans cause à l'expiration.
  - Tests manquants signalés : `headRefName` au banc de `gh-rest`, `--sha=`, annulé + conflit + job en cours :
    **ajoutés**. Le câblage (verrou, filtre) n'est pas au banc par construction du fichier (« rien ici n'est
    testé ») : prouvé en réel (§5).
  - Questions de la revue : routées au §6.

## 4. Fichiers modifiés

- `scripts/wn-attendre-ci.mjs` (logique pure : `delaiSurRunEnCours`, `shaAttenduDe`, `shaAttenduApres`, garde de
  tête dans `diagnostiquer`, `--sha` ; câblage : `jobsEnCoursDe`, `gitLocal`, verrou)
- `scripts/wn-attendre-ci.test.mjs`, `scripts/lib/gh-rest.test.mjs` (une assertion)
- `docs/claude/REGLES_PR_MERGE.md` (table des codes, tête attendue), `.claude/rules/pr-revue-et-release-db.md`
- `changelog.d/2026-11-25-autonomie-pieges-partie18.md`, ce handoff

## 5. Validations exécutées

- Bancs `wn-attendre-ci` + `gh-rest` : 64 sur 64 (58 au premier, dont 18 neufs).
- Mutations, fichier rétabli à l'identique, 21 sur 21 rougissent : garde de tête retiré, égalité stricte au lieu du
  préfixe, casse non normalisée, attente de tête sans fin, run en cours jamais lu, liste vide prise pour un run,
  bloc absents puis bloc annulés sans le run en cours, run en cours primant une cause, branche non comparée,
  `--sha` ne primant pas, `--sha` invalide ignoré, `--sha` trop court admis, étape non nommée, statut non nommé,
  fourche admise, origine illisible supposée même dépôt, descendant non admis, divergence admise, tête atteinte
  non verrouillée, `--sha=` ignoré.
- Preuves réelles en lecture seule (PR #2358 d'une autre file) : `--sha` faux → `3` avec les deux sha ; `--sha zz`
  → usage, `4` ; `--sha` abrégé en majuscules de la tête → `0` ; sans `--sha` depuis une autre branche → `0`
  inchangé ; `--sha=` parent de la tête → verrou par descendant, `0` ; `--sha` d'un commit divergent → `3`.
- T1 complet (`cd web && npm run check`) : code 0 avant la revue, rejoué après ses corrections.

## 6. Problèmes ouverts

- **Question de la revue, non vérifiée** : juste après un changement de tête, l'API REST peut-elle rendre le
  nouveau `head.sha` avec un `mergeable=false` encore périmé ? Le bloc des absents sortirait alors en `2`
  CONFLICTING sans attendre. GitHub rend d'ordinaire `mergeable: null` (→ `UNKNOWN`) pendant le recalcul ; à
  constater sur un cas réel avant d'y toucher.
- **Routé** : l'intégrateur et `wn-merge` tournent sur `main` et ne profitent donc pas du garde ; leur passer
  `--sha <sha déclaré « prête »>` serait un changement de `wn-integrer.mjs` (reste de la partie 13-14 déjà au lot).
- Pièges encore à traiter dans le lot : statut « transféré » (partie 19), relevé du lint « objet d'erreur brut
  journalisé » (partie 20). Puis : `sources-check` absent de `GARDES_NODE` ; `wn-integrer.mjs` ne vérifie pas la
  preuve PR-Agent ; fixture E2E `WN-SRC-0998` ; deux dossiers `wn-repro-imp-*`.

## 7. Prochaine action exacte

1. Commit, push, PR (`--body-file`) ; preuve réelle de l'e2e lent : `node scripts/wn-attendre-ci.mjs <N> --delai
   60` depuis la branche, juste après le push (tête attendue, puis `3` nommant les jobs en cours) ; puis
   `wn-attendre-ci` en fond.
2. PR-Agent → 0, verdict cité pour chaque focus area.
3. « prête @<sha> » sur la PR et au registre (boîte `integrateur`), puis plus aucune écriture sur la PR (D-546).
4. Ensuite la partie 19 : `isClosedStatus` de `scripts/wn-campaign-audit.mjs` reconnaît « transféré ».

## 8. Interdits encore actifs

- Ni migration, ni schéma, ni clinique, ni donnée patient. Pas de `prisma format`.
- Rien d'édité dans `web/src/lib/clinical/`. Aucune écriture en production ; aucun `workflow_dispatch` de
  `release-db`.
- Ne jamais supprimer une ligne des registres. Pas de compaction du journal (gel `D-372` §2).
- `orchestrateur/arret` : seule la parole du responsable le change.
- Aucune adresse de page privée dans le dépôt. Horodater en lisant l'heure système.
- Ne tuer aucun processus : les sessions orphelines de la copie principale, c'est le responsable qui les ferme.
