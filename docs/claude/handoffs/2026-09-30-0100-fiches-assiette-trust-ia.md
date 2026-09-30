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

- Document validé par le responsable (2026-09-30), puis **texte final
  revalidé** après trois corrections : la seconde passe désormais jouée ;
  « hors ligne » remplacé (revue Copilot) ; la phrase sur OpenAI ramenée aux
  fiches.
- **Faits nouveaux**, établis par un inventaire des appels de modèle dans
  `web/src`, puis vérifiés :
  - `usage_ia` v2 ignore les fiches ;
  - il présente la priorité ([[D-167]]) comme à venir, alors qu'elle est en
    service sous `WN_DOSSIER_DEUX_VOIX`, posé ;
  - il ignore « Ce que j'ai compris de vous » ([[D-168]]), en service.

  Arbitrage du responsable : **v3 complète, et v9 de « Vos données »**. Pas
  d'accusé de lecture. Les textes exacts seront validés avant publication,
  dans un lot à part.
- **OpenAI** est déjà destinataire de l'application par la recherche
  documentaire du praticien, « non déclaré » depuis le 2026-09-07. Arbitrage
  reporté, hors v3.
- **Seconde passe Codex** : les 16 invariants mordent. Seule trouvaille, M7a
  (`route.fiches.test.ts` vert sous la suppression du contrôle de dossier),
  écartée avec motif : `route.test.ts:608` la garde et rougit, et c'est
  l'énoncé qui omettait ce banc. Aucun banc ajouté.
- Amendement de `D-251` (2026-09-30) : conditions « document TRUST » et
  « contre-revue adverse » du §10 tenues ; reste le constat de l'espace.

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

- **`usage_ia` v3 complète et « Vos données » v9 au portail** : textes à rédiger (Claude), à valider
  (responsable), puis lot de code dans le registre TRUST.
- **Constat de l'espace** sur `PAT032`, après son prochain clic.
- **OpenAI, destinataire non déclaré** (recherche documentaire du praticien,
  `docs/DOSSIER_RGPD.md`) : arbitrage reporté par le responsable.
- **Phase « Actions »**, après les fiches.

## 7. Prochaine action exacte

Merger cette PR ; soumettre au responsable les textes exacts de `usage_ia` v3 et de « Vos données » v9.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
- Un texte patient du registre TRUST ne se publie qu'une fois validé par le
  responsable.
- Codex n'est jamais invoqué par Claude.
