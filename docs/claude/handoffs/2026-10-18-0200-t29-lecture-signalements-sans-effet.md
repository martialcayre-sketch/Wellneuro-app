# Handoff — 2026-10-18 — t29 : la chaîne C1 ne lit plus les signalements (D-281 §5)

## Branche et état Git

- Branche `t29-lecture-signalements-sans-effet`, depuis `origin/main`
  9aec4a5b, worktree `d281-lot3-portail` (session concurrente, cycle en
  git/gh direct ; file A en autonomie, délégation du 2026-10-18).
- Aucune migration, `schema.prisma` inchangé.

## Objectif

Plan §8, dette t29 : depuis t27, la lecture des signalements par la chaîne C1
est sans effet, et elle coûte une requête par carte depuis la signature de
SAF-EI-01 (M-1).

## Décisions prises

- Aucune décision neuve. Le lot retire ce que t27 avait laissé pour rester
  minimal.
- Retirés : le champ `effetsIndesirables` de l'entrée de la chaîne ; le
  paramètre des producteurs `construireSafetyFindings` et
  `constatsSecuriteOuverts` ; les lectures du cockpit (deux), du
  vérificateur, du rejeu et du Fil (lecture groupée) ; le module
  `effetsIndesirablesPrisma.ts` et le type `EffetIndesirableRuntime`.
- Les bancs qui passaient des signalements sont devenus sans objet : ils sont
  remplacés par une garde structurelle (deux paramètres, aucune mention dans
  `chaineC1.ts`).
- La garde de diffusion (`signalementsEnAttente`) et les comptes du panneau,
  du Fil et du prévol ont leurs propres lectures : ils ne changent pas.

## Fichiers modifiés

- `web/src/lib/clinical-engine/{chaineC1,safetyFindings,verifierChaineC1,rejeuCarteDecision}.ts` ;
  `web/src/app/api/praticien/cockpit/route.ts` ; `web/src/lib/fil/signauxSecurite.ts` ;
  `effetsIndesirablesPrisma.ts` supprimé ; deux commentaires de renvoi.
- Une dizaine de bancs : retrait du second argument, garde réécrite.
- `docs/claude/PLAN_WELLNEURO.md` (§8 soldé) ;
  `changelog.d/2026-10-18-t29-lecture-signalements-sans-effet.md`.

## Validations exécutées

- tsc vert ; Vitest ciblé (chaîne, Fil, signalements, cockpit, portail) :
  1 540 verts.
- T1 complet vert ; T2 (`--fast`) vert : Vitest 13 417 verts et 4 sautés, E2E 274 verts et 6 sautés.

## Problèmes ouverts

- Aucun.

## Prochaine action exacte

PR, CI, revue CodeRabbit sur le sha de tête, merge, constat du déploiement.
Page de la file A : t29 passe à fait.

## Interdits encore actifs

- Aucune migration ni `schema.prisma` sans accord du responsable.
- Aucune règle clinique ni seuil touchés.
