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
