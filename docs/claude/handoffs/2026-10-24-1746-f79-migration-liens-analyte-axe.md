# Handoff — 2026-10-24 — F79, second temps : migration des dix-sept liens analyte-axe (D-351 §4-§6)

## Branche et état du dépôt

- Branche `feat/f79-liens-analyte-axe-migration`, partie de `origin/main`
  (c345f8be). Rebasée deux fois sur arbitrage du responsable (WIP puis
  rebase), après #1679, #1685 puis #1686, mergées pendant la session.
  Worktree `bio-ingest-cloture`, session concurrente, cycle en `git`/`gh`
  direct.
- Migration de données dans la PR, sans code consommateur.

## Objectif

Écrire en production les dix-sept liens signés de D-351 §2, par une seule
migration relue : `niveau_preuve` nullable, insertion tout ou rien, contrat
de la liste exacte, puis release-db approuvée et constat par conteneur.

## Décisions prises

- Production relue avant d'écrire, conforme à D-351 : aucun écart, donc
  aucune question bloquante.
- Deux arbitrages du responsable, consignés en D-351 §6 :
  - **corpus vide, aucun lien.** Sans claim en base (CI, bases locales), la
    migration n'écrit rien. Dès qu'un corpus existe, c'est 17 liens ou
    l'échec total ;
  - **trigger contre le double lien nutriment/axe** (D-348 §5), posé par la
    même migration.
- Troisième arbitrage, après la passe Codex (D-351 §6) : le trigger
  **refuse ces écritures hors READ COMMITTED**, car sous REPEATABLE READ le
  verrou n'exclut plus le double lien.
- Le contrat de la liste exacte n'est **pas** branché en préflight de
  `release-db` : cela toucherait le script de release, son banc et la
  procédure, hors du lot. En production, il se joue par conteneur au
  constat.
- Le banc de rejeu lit la migration sur le disque. Il ne la recopie jamais.

## Fichiers modifiés

- `web/prisma/migrations/20261024160000_biology_liens_axe_signes_v1/migration.sql`.
- `web/prisma/schema.prisma` (seule `niveauPreuve` devient `String?`).
- `web/prisma/checks/biology_liens_axe_v1.sql`,
  `biology_liens_axe_v1_negatif.sql` ; `biology_axes_v1_negatif.sql` (le
  lien nutriment passe sur un second analyte de test, sinon le trigger le
  refusait).
- `web/scripts/banc-rejeu-liens-axe-f79.test.mjs`.
- `.github/workflows/ci.yml` (trois pas), `scripts/wn-test-worktree.sh` (un
  pas).
- `docs/DECISIONS.md` (D-351 §6), `docs/claude/PLAN_WELLNEURO.md` (F79),
  `changelog.d/2026-10-24-f79-migration-liens-analyte-axe.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Production, transaction `READ ONLY` close par `ROLLBACK`, conteneur
  one-off-8486 :
  - 0 lien dans la table ;
  - `niveau_preuve` NOT NULL avec son CHECK A-D, 8 CHECK, 2 clés
    étrangères, 2 index uniques partiels, aucun trigger ;
  - les 16 analytes présents et actifs ;
  - les 16 claims distincts `VALIDE`, actifs, non supplantés, en v1.0 ;
  - 8 587 claims au corpus.
- Base locale :
  - migration appliquée ;
  - contrats verts : liste exacte, négatif F79, F52, catalogue négatif ;
  - banc de rejeu : 15 cas sur 15, puis 17 sur 17 après la revue (version
    modifiée, analyte échangé) ;
  - mutations éprouvées : un sens altéré dans la liste du contrat fait
    rougir le cas positif du banc ; trigger retiré, le contrat négatif et
    le contrat de liste rougissent.
- T1 (`check:rapide`) vert. Le banc `wn-etat-reel` a rougi une fois, sur un
  worktree d'une autre session qui changeait de branche ; rejoué seul, il
  est vert.
- T3 (`npm run test:worktree`) vert en 6 min 52 s, avant le second rebase
  (#1686 : interface et docs, aucune migration).
- Revue `wn-reviewer` (P0, lecture seule) : GO, aucun P0 ni P1. P2 repris :
  garde de transaction du banc élargie, deux cas de banc ajoutés ; fraîcheur
  des claims après la release routée en préalable du code consommateur
  (fiche F79). Les autres P2 sont notés dans la PR.
- Passe Codex (P0) sur 0762fbfb : deux P1 et un P2, tous corrigés.
  - P1 : le banc pouvait commettre ses fixtures. La garde lit maintenant les
    instructions de la migration et du contrat, et s'éprouve sur quatre
    mutations. Un constat final vérifie qu'aucune fixture n'a survécu.
  - P1 : le double lien passait sous REPEATABLE READ. Le trigger refuse
    désormais cette isolation, et cinq cas à deux sessions l'éprouvent.
  - P2 : le contrat négatif déplace un nutriment vers un analyte, puis
    d'un rapport à un autre.
  - Mutations rejouées sur une base jetable : sans le verrou, sans le refus
    d'isolation, sans `analyte_code` ou sans `ratio_code` dans le
    déclenchement, le banc ou le contrat rougit. Le banc rejoué deux fois
    ne laisse aucune ligne.
- Seconde passe Codex sur 626741eb : isolation et déplacements de source
  clos ; un P1 maintenu et un P2 nouveau, corrigés.
  - P1 : la garde à expressions régulières restait contournable
    (`/* fin */ COMMIT;`, `--` dans une chaîne). Tout le banc tourne
    désormais dans un clone jetable de la base nommée, supprimé à la fin :
    la non-persistance tient par construction. La garde devient un
    analyseur lexical, éprouvé sur dix mutations.
  - P2 : un nettoyage en échec laissait le banc vert. Il n'y a plus de
    nettoyage. La suppression du clone est exigée, puis une session neuve
    constate que la base nommée n'a rien reçu.
  - Éprouvé sur une base jetable : avec la garde désactivée et
    `/* fin */ COMMIT;` dans la migration, le banc rougit et la base nommée
    reste à 0 claim et 0 lien ; une suppression du clone en échec fait
    sortir le banc en 1 ; le banc suivant supprime le clone resté.

## Problèmes ouverts

- Code consommateur des liens : « non gradé » affiché, jamais un nul lu
  comme une lettre. Il part après le constat.
- Correspondance panel → axe (F53). Relecture atelier des claims
  WN-CL-0030-020, 0007-006 et 0021-003. WN-SRC-0236.
- Le contrat de la liste exacte en préflight de `release-db` : possible, à
  décider à part.

## Prochaine action exacte

CI par `wn-attendre-ci`, revue CodeRabbit sur le sha de tête et verdict sur
chaque commentaire, passe Codex (geste du responsable), merge. Ensuite :
lister les runs `release-db` en attente d'une autre session, faire
approuver la nôtre, puis constat par conteneur. Le constat joue
`biology_liens_axe_v1.sql` en lecture seule et lit les dix-sept lignes :
actives, chaque claim encore `VALIDE`, actif, non supplanté. Il se verse
dans une PR de suivi (fiche F79).

## Interdits encore actifs

- Production en lecture seule ; écriture seulement par migration relue, puis
  release-db approuvée, une seule à la fois.
- Aucun pull, merge ni rebase sans l'arbitrage du responsable.
- Aucun merge sans une revue de CodeRabbit sur le sha de tête ; merger la
  migration ne l'applique pas.
- Ne pas éteindre `WN_DOCUMENT_MEDECIN_PATIENT` ; jamais `err.message` dans
  les logs.
- Aucun texte clinique, libellé d'hypothèse ni identité réelle dans le
  dépôt : identifiants et mécanismes seulement. Le texte des claims reste au
  Claude Doc privé.
