# Handoff — t62 (file A) : la synthèse corrigée se cite et se compte (D-469)

## Branche et état Git
- `fix/t62-synthese-citable-corrigee`, depuis `origin/main` `a07e67c9c`, copie principale ; PR à ouvrir.

## Objectif
Arbitrage `20261105-0937-d` (2026-11-06) : « validée ou corrigée » partout. Les trois lecteurs bornés de
`lib/objectif` (`lireSyntheseCitable`, `lireSynthesesCitables`, `constaterOuverture`) ne lisaient que
`Validee_Praticien`.

## Décisions prises
- D-469 (réservée par `wn-reserver-decision.mjs`) : amende D-167 §2 et §10, s'applique à D-168 §1-4, assume
  l'effet sur l'ouverture et sur la borne du second rideau (règle D-158 inchangée).
- Liste unique dans le module feuille sans import `web/src/lib/synthese/statutsValidee.ts`, ré-exportée par
  `preconditionsT0.ts` ; les adaptateurs n'importent toujours aucun moteur clinique.
- Constat prod 2026-11-09 (agrégats) : 2 corrigées dans 2 dossiers, borne reculée dans les deux, aucun
  booléen d'ouverture ne bascule.

## Fichiers modifiés
`lib/synthese/statutsValidee.ts` (neuf), `lib/clinical-engine/preconditionsT0.ts`, `lib/objectif/matierePriorite.ts`,
`matiereComprehension.ts`, leurs gardes, `syntheseCitableCorrigee.test.ts` (neuf), `provenanceVerifiee.test.ts`,
`matiereComprehension.test.ts`, `api/praticien/objectifs/proposition-priorite/route.test.ts` ; D-469, lignes
datées sous D-167 et D-168, ligne du plan §8 passée en soldée, fragment `changelog.d/`.

## Validations exécutées
- `npm run check` (T1 complet) vert ; `npm run test:worktree -- --fast` (T2) vert, 357 E2E.
- `wn-reviewer` : GO ; mineurs appliqués (tri NULL du banc calqué sur Postgres, garde contre import relatif de
  `clinical-engine`, deux bancs de plus, formulation « règle de borne ») ; `vitest src/lib/objectif` et
  `check:rapide` verts après.

## Problèmes ouverts
- `lib/documents/types.ts` et quelques écrans gardent leur propre liste de même contenu (hors périmètre, D-469 §4).
- Tri `desc` : une synthèse citable sans date passerait en tête (théorique, préexistant ; 0 en prod).

## Prochaine action exacte
PR, CI (`wn-attendre-ci.mjs`), revue CodeRabbit sur la tête, « prête @<sha> » à l'intégrateur. Pas de
release-db (`clinical-engine/` hors du filtre `lib/clinical/**`). Puis t61 : cadrage à soumettre au responsable.

## Interdits encore actifs
Pas de merge par la session (intégrateur) ; une seule release-db en attente toutes files ; t67 après la
release-db de #1942 ; aucune identité patient dans le dépôt.
