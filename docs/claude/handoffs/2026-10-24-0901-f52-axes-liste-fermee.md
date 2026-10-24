# Handoff — 2026-10-24 — F52 : la cible `axe` fermée sur dix codes (D-348)

## Branche et état du dépôt

- Branche `feat/f52-axes-check`, partie de `origin/main` (5389dd98), worktree
  `bio-ingest-cloture`. Session concurrente, cycle en `git`/`gh` direct.
  Branche neuve, jamais la branche squashée de la PR #1666.

## Objectif

Fermer la cible `axe` de `biology_analyte_links` sur les dix codes de
D-348 §2, par une migration seule dans sa PR, avec un contrat SQL négatif.
Aucun lien analyte-axe (F79).

## Décisions prises

- Contrainte `biology_analyte_links_cible_axe_check` :
  `cible_type <> 'axe' OR cible_code IN (…dix codes…)`. CHECK seul, aucune
  ligne écrite, `schema.prisma` inchangé.
- « Lien sans claim » : déjà refusé par `claim_id NOT NULL` et
  `biology_analyte_links_claim_non_vide_check` ; le contrat l'éprouve sur un
  lien d'axe, sans nouvelle contrainte.
- Le contrat exige aussi que la liste en base soit exactement celle de
  D-348 §2 : un onzième code ajouté sans décision rougit.

## Fichiers modifiés

- `web/prisma/migrations/20261024100000_biology_axes_liste_fermee_v1/migration.sql`.
- `web/prisma/checks/biology_axes_v1_negatif.sql` (neuf) et sa ligne dans
  `.github/workflows/ci.yml`.
- `web/prisma/checks/cb_biologie_structure_v1.sql` (la contrainte exigée).
- `docs/claude/PLAN_WELLNEURO.md` (F52), `changelog.d/2026-10-24-f52-axes-liste-fermee.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Production en lecture seule, transaction `READ ONLY` close par `ROLLBACK`,
  conteneur détaché one-off-7033 : 50 fondateurs sur 50 `VALIDE`, actifs,
  non supplantés, non prescriptifs, typologie `déclaré`, une seule version ;
  0 ligne dans `biology_analyte_links` ; sept CHECK sur la table ; aucune
  migration en échec ; dernière appliquée `20261023160000`.
- T3 (`npm run test:worktree`) vert en 6 min 52 s : migration appliquée,
  dérive « No difference detected », contrat joué, vitest et E2E verts.
- Preuve par mutation du contrat sur la base locale : contrainte retirée,
  renommée, onzième code, neuf codes, garde `axe` retirée, non-vide retiré,
  `NOT NULL` retiré — les sept rougissent ; la base intacte passe.
- Passe Codex (P1-1, corrigé) : le contrat ne protégeait pas la cible
  `besoin`. Une contrainte voisine étendant la liste aux besoins laissait
  l'ancien contrat vert (rejoué). Ajout d'un lien de besoin valide en cas
  positif ; cette mutation et celle de `cible_besoin_check` rougissent
  désormais (neuf mutations au total).

## Problèmes ouverts

- Correspondance panel → axe (D-348 §7), renvoi des trois claims à
  l'atelier (D-348 §6), classement de WN-SRC-0236 : hors de ce lot, chacun
  séparément.

## Prochaine action exacte

Passe Codex sur le diff, revue CodeRabbit sur le sha de tête, lister les
runs `release-db` en attente, merger, release-db approuvée par le
responsable, puis constat par conteneur : migration appliquée, contrainte
`biology_analyte_links_cible_axe_check` présente, 0 ligne dans
`biology_analyte_links`. Ensuite F79.

## Interdits encore actifs

- Production en lecture seule ; écriture seulement par migration relue, puis
  release-db approuvée, une seule à la fois.
- Aucun pull, merge ni rebase sans l'arbitrage du responsable.
- Aucun merge sans une revue de CodeRabbit sur le sha de tête.
- Ne pas éteindre `WN_DOCUMENT_MEDECIN_PATIENT` ; jamais `err.message` dans
  les logs.
- Aucun texte clinique, libellé d'hypothèse ni identité réelle dans le
  dépôt : identifiants et mécanismes seulement.
