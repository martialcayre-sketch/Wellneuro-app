# Handoff — file D, lot `orchestrateur-mise-en-service` : D-540 amendée, passe cloud versée, `gh pr` passé en REST (2026-11-20)

## 1. Branche et état Git

- Branche `docs/orchestrateur-mise-en-service`, tirée d'`origin/main` le 2026-11-20 à 18:47Z, dans le worktree
  `.claude/worktrees/orch-ci`. L'ancienne branche du worktree (`fix/synthese-conflit-texte-conserve`, squashée par
  #2257) n'a pas été touchée.
- Commit tardif (D-518) : les modifications restent non commitées jusqu'au push.
- Carnet : le lot `orchestrateur-mise-en-service` (ordre 96) est pris le 2026-11-20 à 18:47Z, avec `if_version`.
- Boîte D : les cinq messages non traités ont été accusés (`traite`).
- Session concurrente de la file D, en `git` et `gh` directs. La PR se déclare « prête », et l'intégrateur la merge.

## 2. Objectif

Phase 2 de D-540 §10 : le lot de mise en service, au Mac, P1. Il comprend :
- l'amendement de D-540 selon `20261120-1231-d` (A), `20261120-1232-d` (A) et `20261118-2312-d` (« Prudent ») ;
- les lectures GitHub en REST dans les cinq scripts recensés au carnet ;
- la consigne de la passe ;
- les champs du carnet et la boîte `orchestrateur` ;
- `CLAUDE.md` et `ROLES_MACHINES.md` pour les sessions de passe.

Aucune routine n'est créée, allumée ni lancée.

## 3. Décisions prises

- **D-540, amendement du 2026-11-20** (section finale ; ligne d'en-tête ajoutée).
  - La passe est la session du lot : au plus un lot, puis arrêt.
  - Garde de tête : aucun lot `cloud` pris sans PR. Elle remplace la condition 2 du §3 et la « session vivante » du
    §5. Un lot de la voie Mac pris au Mac ne bloque pas la passe, sinon `autonomie-pieges-restes`, tenu au long cours,
    gèlerait la file D.
  - Un lot déjà tenté en cloud, c'est-à-dire avec une intention à quelque version que ce soit, ne repart jamais en
    cloud. Un export ne porte pas les versions.
  - P0 : double reconnaissance.
    - Au carnet, `risque` doit valoir `P1` ou `P2`.
    - La session reclasse elle-même un lot qu'elle juge P0 : `lieu: mac`, `risque: P0`, retour à `pret` (pas
      `bloque`).
  - Valeurs « Prudent » écrites dans le code : 7 h–23 h à Paris, 4 lots par jour, hygiène quotidienne.
  - Deux simplifications, écrites dans l'amendement :
    - un signal de voie Mac ou d'orphelin par lot, et non par version ;
    - plus de ligne « 24 h sans lot lançable » : le journal la porte.
  - Non vérifié, à constater à la première passe du pilote : le push d'une branche et l'ouverture d'une PR depuis la
    passe.
- **Décision de passe en code** : `scripts/wn-orchestrateur-passe.mjs`, fonction pure plus CLI sur un export avec
  manifeste. Codes 0, 1, 2 et 3. Il écrit la ligne de journal et ne recopie aucun texte libre.
- **REST** : `scripts/lib/gh-rest.mjs` (chemins et conversions). `wn-attendre-ci` reconstruit le rollup à partir de
  `check-runs` et de `status` de la tête ; si l'une des deux lectures est illisible, la PR est déclarée illisible
  (code 4).
- **Hors dépôt** :
  - document `orchestrateur/arret` créé à `arret: true` (fermé jusqu'au feu vert) ;
  - lot `orchestrateur-l3-integrateur` marqué `lieu: mac`, `nature: reservee` (son titre dit « jamais en cloud »).

## 4. Fichiers modifiés

- `docs/decisions/D-540.md` (amendement), `docs/ROLES_MACHINES.md`, `CLAUDE.md`
- `docs/claude/templates/ORCHESTRATEUR_PASSE.md` (neuf)
- `scripts/lib/gh-rest.mjs` et son banc `gh-rest.test.mjs` (neufs)
- `scripts/wn-attendre-ci.mjs`, `scripts/wn-cycle.mjs`, `scripts/wn-etat-reel.mjs` (+ `.test.mjs`),
  `scripts/wn-guetteur.mjs`, `scripts/nettoyage-branches.sh` et son banc `nettoyage-branches.test.mjs` (neuf)
- `scripts/wn-orchestrateur-passe.mjs` et son banc `.test.mjs` (neufs)
- `scripts/lib/registres.mjs` et son banc `.test.mjs`
- `web/package.json` : trois bancs ajoutés à `bancs-outillage-check`
- `changelog.d/2026-11-20-orchestrateur-mise-en-service.md`, ce handoff

## 5. Validations exécutées

- Bancs ciblés : `gh-rest`, `wn-attendre-ci`, `wn-guetteur`, `wn-cycle`, `wn-etat-reel` (138 tests),
  `nettoyage-branches` (3), `wn-orchestrateur-passe` (21) et `registres` (20). Tous verts.
- `npm run check:rapide` : code 0 (17 étapes vertes, 1077 tests).
- En réel, lecture seule :
  - `wn-attendre-ci.mjs 2178` → 0, vert, `MERGEABLE`/`CLEAN` ;
  - `wn-guetteur.mjs merge 2257` → `MERGEE commit=f97e9b91` ;
  - `wn-etat-reel` → `disponible: true`, 1 PR ;
  - `wn-cycle` → rapport rendu ;
  - `nettoyage-branches.sh` en constat → 0, 281 lignes, aucune « lecture GitHub en échec ».
- Le banc de `nettoyage-branches` refuse tout `gh pr` par un faux `gh`.
- Pas de T2 : ni UI ni API touchées.
- **Revue `wn-reviewer` : GO conditionnel**, aucun P0 ni P1. Le relecteur a comparé le rollup GraphQL et sa
  reconstruction REST sur #2282, #2285 et #2286 : résultats identiques. Il n'a trouvé aucune voie où `--appliquer`
  supprimerait à tort.
  - La condition (P2, clôture absente) est levée : ce handoff et le fragment ont été écrits pendant la revue.
  - P3 corrigés :
    - une intention en vol tient la file occupée ;
    - un état d'intention inconnu, ou sans heure lisible, rend la lecture douteuse ;
    - `deja_tente` se lit aussi par l'identifiant ;
    - une PR illisible n'est plus retirée en silence (guetteur, `wn-etat-reel`) ;
    - le banc de nettoyage ignore les crochets globaux ;
    - la borne de 23 h 59 est écrite dans la doc ;
    - deux bancs sont ajoutés : `mergeable` nul avec `dirty`, et un statut `error` sur deux pages.
  - P3 laissés, motifs :
    - le message « gh indisponible » sur une branche hors alphabet (`wn-cycle`) : prudent et rare ;
    - `branche_sure` sous bash 3.2 : un caractère accentué échoue côté `gh`, avec le code 2 « lecture GitHub en
      échec », donc sans suppression ;
    - la course tête et checks d'`attendre-ci` : inchangée, et visible au sha de « prête ».
  - Question ouverte : `filter=latest` des check-runs face à un « Re-run failed jobs », à constater sur une PR
    relancée.
- `npm run check` (T1 complet) : code 0, après les corrections.
- **PR-Agent sur 0761ea34 : partiel** (diff élagué, 7 fichiers exclus, code 1). Le repli est la revue `wn-reviewer`
  (D-448). Deux constats, tous deux **corrigés** :
  - « Dégradation silencieuse » et « Libellé trompeur » : un nom de branche hors `[A-Za-z0-9._/-]` s'affichait
    « aucune preuve » ou « aucune PR » sans que GitHub ait été lu.
  - Il se dit maintenant « nom de branche non interrogeable » (code 2 de `preuve`).
  - Un banc vérifie le cas `fix+z`, et que ce nom n'est jamais envoyé à GitHub.

## 6. Problèmes ouverts

- La phase 3 (pilote) attend le feu vert du responsable. Il faudra alors :
  - poser `orchestrateur/arret` à `false`, sur sa parole ;
  - écrire la routine du pilote, sans l'allumer avant ce feu vert ;
  - marquer au carnet les lots de la file D `lieu: cloud`, `nature: ordinaire`, `risque: P1|P2`. Aucun ne l'est
    aujourd'hui : tous vont au Mac.
- Le push et la PR depuis une passe ne sont pas vérifiés ; ils sont à constater à la première passe.
- Restent `pret` pour la file D : `orchestrateur-l3-integrateur` (ordre 97, jamais en cloud). Reste pris :
  `autonomie-pieges-restes` (ordre 35, partie 5 seulement sur un cas réel).

## 7. Prochaine action exacte

1. Verdict de `wn-reviewer` : corriger, puis `npm run check` (T1 complet) ; commit tardif, push, PR (`--body-file`).
2. `node scripts/wn-attendre-ci.mjs <N>` en fond, puis `node scripts/wn-revue-pr-agent.mjs <N>` → 0.
3. Donner un verdict à chaque commentaire ; poser `pr` au carnet ; « prête @<sha> » sur la PR et ligne `prete` à
   l'`integrateur`.

## 8. Interdits encore actifs

- Ne créer, rallumer ni lancer aucune routine. La routine d'essai du second essai à blanc reste désactivée.
- Ne pas poser `orchestrateur/arret` à `false` sans la parole du responsable.
- Ni migration, ni schéma, ni clinique, ni donnée patient. Rien de `web/src/lib/clinical/` ; pas de `prisma format`.
  Aucune écriture en production.
- Ne pas toucher `tools/corpus/fiches-usage/rediger.mjs`. Ne jamais supprimer une ligne des registres.
- Aucune adresse de page privée dans le dépôt.
- Horodater en lisant l'heure système. Pas d'allongement du délai ni de retries.
- Porte 24 non levée.
