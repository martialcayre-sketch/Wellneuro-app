# Handoff — 2026-09-30 — Fiches d'assiette : le document TRUST sur l'IA

## 1. Branche et état Git

`docs/trust-ia-fiches-assiette`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`3d49537a` (#1253, énoncé de la seconde passe Codex, déployé `success`).
Documentation seule. Un merge à la fois.

## 2. Objectif

Rédiger, faire valider et verser au dépôt le document TRUST sur l'usage de
l'IA exigé par `D-251` §5 et §10 (arbitrage du 2026-09-29 : dans le dépôt
seulement, sans lien depuis la fiche). Verser aussi le résultat de la seconde
passe adverse (mutations), rapporté par le responsable pendant la rédaction :
les deux ferment une condition du §10.

## 3. Décisions prises

- Document validé tel quel par le responsable (2026-09-30).
- **Fait nouveau** : le document du portail `usage_ia` v2 ne connaît que deux
  usages et un fournisseur. Arbitrage du responsable : **publier une v3 au
  portail**. Elle ajoutera l'usage des fiches et OpenAI, sans accusé de
  lecture. Le texte exact sera validé avant publication, dans un lot à part.
- **Seconde passe Codex** : les 16 invariants mordent. Seule trouvaille, M7a
  (`route.fiches.test.ts` vert sous la suppression du contrôle de dossier),
  écartée avec motif : `route.test.ts:608` la garde et rougit, et c'est
  l'énoncé qui omettait ce banc. Aucun banc ajouté.
- Amendement de `D-251` (2026-09-30) : conditions « document TRUST » et
  « contre-revue adverse » du §10 tenues ; reste le constat de l'espace.
- Une phrase du document TRUST validé (« seconde passe prévue ») est mise à
  jour avec le fait, même jour : signalé au responsable.

## 4. Fichiers modifiés

- `docs/TRUST_IA_FICHES_ASSIETTE.md` : nouveau.
- `docs/claude/REVUE_CODEX_MUTATIONS_FICHES_ASSIETTE_2026-09-30.md` : nouveau.
- `docs/DECISIONS.md` : amendement.
- Changelog, ce handoff, SESSION_LOG.

## 5. Validations exécutées

- Chaque fait du document a été vérifié dans le dépôt :
  - l'outil d'adaptation (`tools/corpus/fiches/augmenter.mjs`, README) ;
  - les consignes (nombres, doses, vocabulaire) ;
  - la mention au patient (`MENTION_IA`, montée sur la page de lecture) ;
  - la carte « Signaler un problème » et son choix « Une information est
    incorrecte » ;
  - la session praticien exigée par la route des actes ;
  - la transcription (lectures A, B, C de l'amendement de `D-251`).
- Par conteneur, en lecture seule et en agrégats :
  - 7 versions, toutes `claude-sonnet-5` et `gpt-5.4`, consigne
    `fiche-assiette-v1+d4d81bb3a8ae9fa5`, déposées le 2026-09-27 ;
  - 7 validées, toutes avec relecture intégrale, entre le 2026-09-27 et le
    2026-09-29 ;
  - 0 remise.
- Aucun texte de fiche dans le document.
- CI : voir la PR.

## 6. Problèmes ouverts

- **`usage_ia` v3 au portail** : texte à rédiger (Claude), à valider
  (responsable), puis lot de code dans le registre TRUST.
- **Constat de l'espace** sur `PAT032`, après son prochain clic.
- **Phase « Actions »**, après les fiches.

## 7. Prochaine action exacte

Merger cette PR ; soumettre au responsable le texte exact de `usage_ia` v3.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
- Un texte patient du registre TRUST ne se publie qu'une fois validé par le
  responsable.
- Codex n'est jamais invoqué par Claude.
