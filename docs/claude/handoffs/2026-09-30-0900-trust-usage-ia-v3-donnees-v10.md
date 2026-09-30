# Handoff — 2026-09-30 — Portail : `usage_ia` v3 et « Vos données » v10

## 1. Branche et état Git

`feat/trust-usage-ia-v3`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `953f2d0c` (#1254, document TRUST des fiches,
déployé `success`). Un merge à la fois.

## 2. Objectif

Publier au portail les deux documents TRUST décidés le 2026-09-30 (amendement
de `D-251`) :

- la v3 de « L'intelligence artificielle dans Wellneuro », parce que la v2 est
  fausse sur trois points ;
- la v10 de « Vos données personnelles », pour la ligne Anthropic.

## 3. Décisions prises

- **Textes exacts validés par le responsable** avant écriture. Les numéros de
  liste de l'aperçu sont une mise en page : les quatre usages sont des
  paragraphes, mot pour mot.
- **v3 sans accusé** : document descriptif, non présenté par la séquence.
- **v10 avec accusé** (arbitrage du responsable). Seule la version courante
  réclame un accusé (`avantDeCommencer.ts`). Sans accusé, la v10 aurait
  effacé celui de la v9, que 23 dossiers actifs sur 28 devaient encore.
- L'arbitrage OpenAI (recherche documentaire, destinataire non déclaré) reste
  reporté.

## 4. Fichiers modifiés

- `web/src/lib/trust/contenus/registre.ts` : `USAGE_IA_V3`,
  `DONNEES_CONFIDENTIALITE_V10`, et leur ajout au registre.
- `web/src/lib/trust/contenus/registre.test.ts` : dix-huit documents, version
  courante v10, accusé de la v10, contenu de la v10 et de la v3.
- `docs/DOSSIER_RGPD.md` : la rubrique 6 (Anthropic) et le troisième flux
  Anthropic (`D-168`) ; les fiches, sans flux de donnée personnelle.
- `docs/DECISIONS.md` : point 2 bis de l'amendement du 2026-09-30.
- Changelog, ce handoff, SESSION_LOG.

## 5. Validations exécutées

- Empreintes des deux versions calculées par le banc (`canonicalSha256`).
- `npx vitest run src/lib/trust` : 10 fichiers, 69 tests verts. Ils couvrent
  la séquence « Avant de commencer » et le croisement de la rubrique 6 du
  dossier RGPD.
- Les E2E dérivent la version à accuser du registre (`e2e/helpers/db.ts:194`),
  sans rien de figé.
- Par conteneur, en lecture seule : 28 dossiers actifs, 5 accusés de la v9,
  dernier le 2026-09-29.
- T1 et T2 : voir la PR.

## 6. Problèmes ouverts

- **Après le déploiement** : 28 dossiers actifs verront « Avant de
  commencer » à leur prochaine visite, pour accuser la v10.
- **OpenAI, destinataire non déclaré** : arbitrage reporté.
- **Constat de l'espace de lecture** sur `PAT032`, après son prochain clic.
- **Phase « Actions »**, après les fiches.

## 7. Prochaine action exacte

T2, PR, revue, merge, suivi du déploiement ; puis le clic de diffusion sur
`PAT032`.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Un texte patient du registre TRUST ne change qu'avec une nouvelle version,
  et qu'une fois validé par le responsable.
- Aucun texte de Fiche MY au dépôt.
- Les dossiers se lisent par identifiant, jamais par nom.
