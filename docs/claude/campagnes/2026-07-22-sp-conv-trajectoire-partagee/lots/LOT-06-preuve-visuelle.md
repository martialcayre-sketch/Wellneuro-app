---
id: "LOT-06"
titre: "Preuve visuelle — baselines et captures du portail (rouvre la dérogation V12)"
statut: "à_faire"
dépend_de: "LOT-02, LOT-04, LOT-05"
---

# LOT-06 — Preuve visuelle — baselines et captures du portail

## But

Rouvrir la dérogation V12 (arbitrage utilisateur du 2026-07-22) : le
chantier visuel s'est clos sans baseline versionnée ni capture du portail
patient. Ce lot installe une non-régression visuelle réelle des deux
univers — après que les LOT-02/04/05 ont stabilisé les écrans.

## Résultat observable

- Des baselines `toHaveScreenshot` versionnées existent pour les écrans
  couverts par `web/e2e/visual.spec.ts` **plus** au moins trois écrans du
  portail patient (accueil parcours, questionnaires, Mon équilibre).
- Les baselines sont produites et comparées sur **Linux uniquement**
  (l'environnement du CI) ; en local macOS, le test produit des artefacts
  de revue sans comparer — la divergence de rendu des polices qui a motivé
  la dérogation ne casse plus `verify`.
- Le patient de capture est **isolé par worker** : plus d'interférence avec
  `PAT_SEED_03` partagé (motif du refus de capture portail en V12).
- Des snapshots DOM/accessibilité couvrent les éléments sensibles aux
  polices (bandeau cockpit, journey) en complément des pixels.

## Périmètre

`web/e2e/visual.spec.ts`, `web/e2e/README.md`, seeds de test (patient de
capture dédié par worker, dérivé du patron `test:worktree` — base éphémère
par worktree), configuration Playwright (projet Linux-only pour le
visuel), CI `verify`.

## Hors périmètre

Les écrans différés (Agenda, Biologie — statiques) ; la vitrine
`/dev/vitrine` ; tout changement d'UI (si une capture révèle un défaut, il
part en lot correctif séparé).

## Fichiers probables

- `web/e2e/visual.spec.ts`
- `web/playwright.config.ts`
- `web/e2e/README.md` (contrat de baseline documenté)
- `web/prisma/seed*` ou fixtures E2E (patient de capture par worker)
- `.github/workflows/` (si le job `verify` doit publier les artefacts)
- `docs/design-system-d1.md` §10 (dérogation levée, mention datée)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle — patients de capture dérivés des trois
  patients fictifs autorisés.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.
- Un seul run E2E à la fois sur la base partagée (règle
  `docs/ROLES_MACHINES.md`) tant que l'isolation n'est pas en place.

## Étapes

- [ ] Vérifier les hypothèses (le provisioning éphémère de `test:worktree`
      est-il réutilisable pour isoler le patient de capture en CI ?).
- [ ] Isoler le patient de capture par worker.
- [ ] Basculer `visual.spec.ts` en `toHaveScreenshot` gated Linux ;
      produire les baselines dans le CI.
- [ ] Ajouter les trois captures portail + snapshots DOM/a11y.
- [ ] Mettre à jour la dérogation dans le design system (levée datée).
- [ ] T3 complet ; relire le diff.

## Tests

Le lot **est** un test : `verify` doit échouer sur une régression visuelle
volontaire (à démontrer une fois, capture témoin), puis repasser vert.

## Critères de done

Baselines commitées, comparées en CI, stables sur deux runs consécutifs ;
portail couvert ; dérogation V12 levée et datée dans le design system.

## Résultats

À compléter à la clôture.
