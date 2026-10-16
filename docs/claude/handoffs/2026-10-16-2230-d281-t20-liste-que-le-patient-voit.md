# Handoff — 2026-10-16 — D-281 §5, t20 : restes de l'étape 4, PR 1 (la liste que le patient voit)

## Branche et état Git

- Branche `d281-etape4-restes-t20`, depuis `origin/main` 1ab0793f, worktree
  `d281-lot3-portail` (session concurrente, cycle en git/gh direct). Remise à
  niveau sur `origin/main` avant le push (#1503 mergée entre-temps).
- Aucune migration, `schema.prisma` inchangé.

## Objectif

Plan §8, ligne « D-281, restes de l'étape 4 » (fiche t20), premier des trois
restes : programme « indisponible » et actions non fermes encore désignables
par le patient.

## Décisions prises

Arbitrages du responsable du 2026-10-16, sur scénarios (consignés en D-281 §2) :
- programme diffusé non servi au portail ⇒ désignation **sans liste**
  (« Je ne sais pas » / « Un autre produit »), qui rattache ; écarté : le
  formulaire d'avant (un adulte qui ne sait pas sortirait de la règle) ;
- interventions non fermes retirées de la liste du **patient** seulement ;
  liste du praticien et pause des compléments inchangées ;
- (pour la PR 3) Boussole et fiche d'assiette d'un élément en pause : servies,
  marquées « en pause » avec le texte signé ; écarté : les masquer.
Mise en œuvre : `programmeDiffuse` rend `servi` (rejeu de la carte puis
contrat patient, les deux marches du portail) ; `designationPour` : liste
vide si non servi ou sans intervention ferme, `null` (formulaire d'avant) si
le praticien lui-même n'a rien à désigner ; la route refuse un élément hors
liste patient ; `GET trust/etat` ne calcule la désignation que sous
`?designation=1` (page des informations seule) — revue, P2-1.

Découpage des restes : PR 1 (celle-ci) → PR 2, reste 3 (E2E route + trigger
contre PostgreSQL réel) → PR 3, reste 2 (Boussole, fiche d'assiette, miroir
praticien ; inerte jusqu'à la signature).

## Fichiers modifiés

- `web/src/lib/trust/pauseEffetIndesirable.ts` et `.test.ts`
- `web/src/lib/trust/pauseEffetIndesirableServeur.ts` et `.test.ts`
- `web/src/app/api/portail/trust/signalement/route.ts` et `route.designation.test.ts`
- `web/src/app/api/portail/trust/etat/route.ts` et `route.test.ts`
- `web/src/app/portail/[token]/informations/page.tsx`
- `web/src/components/patient/trust/SignalerProbleme.tsx` et `.test.tsx`
- `docs/DECISIONS.md` (D-281 §2), `docs/claude/PLAN_WELLNEURO.md` (ligne t20,
  deux lignes neuves), `changelog.d/2026-10-16-d281-liste-que-le-patient-voit.md`

## Validations exécutées

- Suites trust, routes portail, formulaire, pages portail : 390 tests verts.
- T1 (`check:rapide`) vert sur l'état final ; T1 complet avant commit.
- T2 (`--fast`) sur l'état final : voir la PR.
- Revue `wn-reviewer` : GO, aucun P0/P1 (pas de passe Codex). P2-1 (coût du
  rejeu sur `trust/etat`) corrigé ; P2-2 (appel exact de `vuePatientOuRefus`)
  fixé par le test, extraction routée au §8 ; P2-3 (choix perdu sur erreur de
  base passagère, repli) accepté ; P2-4 (libellé de la question sans liste)
  accepté — aucun texte patient neuf sans signature ; P2-5 sans objet.

## Problèmes ouverts

- Routé au §8, préalable de M-1 : règle signée, un signalement ouvert hors
  règle ajoute une limitation à la carte, qui dérive ; le portail sert alors
  « indisponible », sans les pauses d'un autre signalement (question de la
  revue, démontré dans le code, sans occurrence).
- Routé au §8, sans rang : « servi au patient » composé à trois endroits (D-200).
- Restes 2 et 3 de t20 : PR 2 et PR 3 ci-dessus.

## Prochaine action exacte

Push, PR, CI par `node scripts/wn-attendre-ci.mjs <N>` en fond, revue
CodeRabbit lue sur le sha de tête (synthèse, corps, commentaires en ligne),
merge, déploiement constaté. Puis PR 2 (E2E route + trigger).

## Interdits encore actifs

- Garde de diffusion inerte jusqu'à la signature (M-1, D-281 §6).
- Aucune migration sans accord explicite du responsable.
- Q3 de t25 différée ; écart de bornes TRUST 100 / Fil et prévol hors périmètre.
- Un merge à la fois ; déploiement constaté avant le suivant.
