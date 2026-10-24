# Handoff — 2026-10-24 — File D : constat D/53, renvoi de collecte D/38, b12

## Branche et état Git

- Branche `docs/d38-renvoi-collecte-conditions`, partie d'`origin/main`
  (21918b98), worktree `file-d1-suite` (session concurrente, cycle en git/gh
  direct).
- Lots précédents de la file, tous mergés : #1667, #1676, #1677, #1678.

## Objectif

Vérifier le déploiement de #1677, rendre le constat D/53 (drapeaux de
production), traiter D/38 (renvoi du texte de collecte de G-11) et b12.

## Décisions prises

- #1677 déployé (0ac2a236, 09:38 UTC). La production tourne sur c6518a79 :
  l'e-mail des conditions v3 ne dépend plus que du responsable.
- D/53, constat en lecture seule (`scalingo timeline`, historique complet,
  heures UTC) :
  - `WN_G4_LIEN_MAGIQUE` a été supprimée le 2026-10-21 à 11:10:49 par le
    compte du responsable. C'est k10. Effet de bord : le formulaire de
    nouveau lien a disparu avec elle. Reposée le 2026-10-24 à 07:46:52.
  - `WN_BIO_CONSTAT` est livrée éteinte, conforme. La colonne « true » du
    registre est l'en-tête « Valeur ON ».
  - `WN_AGENDA_RELANCE` est un écart réel : jamais reposée sur Scalingo
    depuis la bascule du 2026-08-22.
  - Le responsable reporte sa décision sur ce dernier écart : d53 est mis à
    jour sur la page D et reste à faire.
- D/38 : le texte servi renvoyait encore au texte autonome. Le responsable
  a validé ce jour le renvoi « la partie « Vos données personnelles et leur
  confidentialité » des conditions d'utilisation » (arbitrage 8 de G-11).
- b12 : déjà reporté en D.1 le 2026-10-15 (51f3a91b). Aucune PR n'était
  nécessaire. Passé à « fait » sur la page D.

## Fichiers modifiés

- `web/src/components/patient/collecte/textesDepot.ts`
- `docs/claude/propositions/2026-10-14-g11-textes-patient/README.md`
  (texte 1, arbitrage 8)
- `docs/claude/propositions/2026-10-14-u-patient-hub/README.md`,
  `docs/claude/PLAN_WELLNEURO.md` (D/38), fragment `changelog.d/`,
  `SESSION_LOG.md`

## Validations exécutées

- Bancs du texte de collecte (Vitest ciblé) : 17 tests verts.
- T1 `npm run check` vert.
- T2 `npm run test:worktree -- --fast` : voir la PR.

## Problèmes ouverts

- `WN_AGENDA_RELANCE` (D/53) : à reposer, ou écart accepté par écrit, avant
  les relectures k01 du 2026-10-29.
- L'envoi d'un lien depuis le cockpit n'a pas été rejoué (D/53).

## Prochaine action exacte

CI, verdicts CodeRabbit sur le sha de tête, runs `release-db` en attente
listés, merge en squash avec `--match-head-commit`, puis d38 à « fait » sur
la page D.

## Interdits encore actifs

- Production en lecture seule : aucune écriture en base ni dans
  l'environnement Scalingo.
- Une seule PR à la fois. Pas de merge sans revue CodeRabbit sur le sha de
  tête, ni avec une release-db en attente.
- Aucune identité réelle, aucun identifiant de dossier dans le dépôt. D-298
  s'applique à tout constat écrit.
