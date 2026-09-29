# Handoff — 2026-09-29 — Fiches d'assiette : la contre-revue adverse, et ses suites

## 1. Branche et état Git

`fix/fiches-assiette-contre-revue-journaux`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`937fd897` (#1251, l'énoncé de la contre-revue). Un merge à la fois : le
déploiement de `937fd897` est suivi avant tout merge.

## 2. Objectif

Traiter le résultat de la contre-revue Codex de `D-251` : vérifier chaque
trouvaille dans l'arbre, corriger ce qui est confirmé, consigner le reste avec
motif. C'est la troisième condition du §10, désormais tenue.

## 3. Décisions prises

- **P1-1 (journaux) : corrigé.** Classe et code seulement.
- **P1-2 et P1-4 (garanties en base) : bornées à la route, sans migration**
  (arbitrage du responsable). Amendement de `D-251` (NUIT).
- **P1-3 (gardes avant l'e-mail)** : volet drapeau écarté — l'environnement du
  processus est fixe pendant sa vie ; fermeture effective au remplacement des
  conteneurs. Volet compte : qualifié non atomique (relu juste avant l'envoi,
  pas verrouillé).
- **Seconde passe Codex, mutations seules** (arbitrage du responsable) : énoncé
  à préparer par Claude après le merge de cette PR.

## 4. Fichiers modifiés

- `web/src/lib/observability/classeEtCode.ts` : nouveau, pur.
- `web/src/app/api/praticien/protocoles/diffusion/route.ts` : cinq appels.
- `web/src/app/api/internal/fiches-assiette/ingest/route.ts` : un appel.
- `web/src/app/api/portail/lectures/route.ts` : deux `logger.error`, l'erreur
  passée en `metadata` par `classeEtCode`, plus en `error`.
- `web/src/lib/fiches-assiette/journaux.guard.test.ts` : nouvelle garde, sur
  l'arbre TypeScript.
- `route.test.ts` de la diffusion (deux tests), de l'ingestion (un test, et
  le journal lu par `String` au lieu de `JSON.stringify`), des lectures (un
  test).
- `docs/claude/REVUE_CODEX_ADVERSE_FICHES_ASSIETTE_2026-09-29.md`,
  `docs/DECISIONS.md` (amendement), changelog, ce handoff, SESSION_LOG.

## 5. Validations exécutées

- Fichiers de tests touchés : verts (garde, diffusion, ingestion, lectures).
- **Mutation** : le code de `937fd897` remis en place dans les trois routes →
  la garde rougit sur exactement les huit appels ; les quatre tests de
  comportement rougissent. Corrections restaurées.
- Revue Copilot de #1252, deux fils, corrigés : `logger.*` n'est pas sûr
  (`sanitizeError` garde le message) ; l'analyseur textuel se laissait tromper
  par `${err}` et un `\'` échappé.
- Vérifications dans l'arbre : trigger M2 relu (ce qu'il refuse, ce qu'il ne
  lit pas) ; `git blame` des appels ; `sanitizeString` relu ;
  `lectureFichesOuverte()` lit l'environnement ; la route des actes exige une
  session praticien.
- T1 et T2 : voir la PR.

## 6. Problèmes ouverts

- **Seconde passe Codex, mutations seules** : énoncé à préparer, lancement par
  le responsable.
- **Le constat de l'espace** (liste, page d'une fiche, tâche au fil, accusé,
  e-mail reçu) sur `PAT032`, après son prochain clic de diffusion.
- **Document TRUST sur l'IA** : Claude le rédige, le responsable le valide, et
  il est versé au dépôt seulement.
- **La phase « Actions »** : à ouvrir après les fiches, avec son propre
  `D-xxx`.

## 7. Prochaine action exacte

T2, PR, revue, merge, suivi du déploiement ; puis l'énoncé de la seconde passe
(mutations seules), à verser au dépôt avant d'être jouée.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal ; bancs en texte
  synthétique.
- Aucune migration pour les garanties bornées : arbitrage rendu.
- Codex n'est jamais invoqué par Claude.
- Les dossiers de test se lisent par identifiant, jamais par nom.
