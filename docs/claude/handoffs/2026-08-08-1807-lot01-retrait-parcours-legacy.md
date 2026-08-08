# 2026-08-08 18:07 — LOT-01 : le parcours patient legacy retiré, la redirection reste

Campagne `2026-08-08-dettes-ouvertes-5-0`. Branche
`lot-01-retrait-parcours-legacy`, base `1188909e`, tête `0f0b18d1`.
PR #625 ouverte, `verify` vert, `MERGEABLE` — cette clôture est écrite avant le
squash, sans quoi elle ne remonterait pas.

## Ce qui est fait

Le **LOT-01** en entier, sous un arbitrage qui a changé le lot : **retrait
immédiat** au lieu de la date-cible que le cadrage prévoyait. Décision consignée
en `D-035`.

- `web/src/app/patient/[idAssignation]/page.tsx` (406 lignes), son banc et
  `layout.tsx` supprimés. Le `href` interne que le lot devait retirer vivait
  dans la page — il part avec elle.
- La redirection 307 quitte `next.config.mjs` pour `web/src/middleware.ts`.
- Premier banc qui **emprunte** la redirection :
  `web/e2e/parcours-legacy-redirection.spec.ts`.
- Correction rattachée : les commentaires de `orientationEngine.ts:212` et
  `orientationRulesV1.ts:229`, qui déclaraient encore ouverts trois moteurs
  fermés par #583.

## Ce qu'il faut savoir avant de reprendre

- **`redirects()` recopiait la query, et `next.config.mjs` jurait le contraire**
  depuis le 2026-08-05. `/patient/ASS_x?email=…` rendait
  `/portail/connexion?email=…` : l'adresse d'un patient, donnée de santé
  indirecte, partait dans l'URL. Une query portée par la destination est
  **fusionnée**, pas substituée — aucune écriture déclarative ne l'empêche.
- **Un filet placé en amont n'est pas un filet, c'est le chemin réel.**
  `redirects()` s'exécute **avant** le middleware : le garder « en doublon »
  aurait gagné la course et neutralisé le correctif. Il est retiré, et la
  contrepartie est assumée — 404 si le middleware dérive, ce que le banc
  surveille sur deux navigateurs.
- **La règle la plus chère du lot était celle sans témoin.** Le lot affirmait
  que « les E2E sont le seul lieu où la redirection est empruntée » ; aucun test
  ne l'empruntait. Et le retrait avait changé la conséquence d'une panne : avant,
  une redirection cassée laissait la page legacy rendre ; depuis, c'est un 404
  sur un lien reçu par e-mail.
- **`X-Robots-Tag` n'est pas appliqué à la réponse 307** — Next ne pose pas les
  en-têtes de `headers()` sur une redirection. Ce qui protège d'une indexation
  est que la page d'arrivée les porte ; l'assertion est déplacée là.
- **Deux bancs cassés par le retrait, par leur garde anti-vacuité** — leur
  raison d'être : `auth.roles.guard.test.ts` énumérait `app/patient` (racine
  retirée, **pas remplacée** ; `app/api/patient` reste et c'est là que la garde
  compte) et `questionnaire-display.test.ts` exigeait deux montages de
  `GenericQuestionnaire` (plancher descendu à 1, motif écrit sur place —
  abaisser un plancher sans le dire est la manière dont un garde cesse
  silencieusement de garder).
- **T3 complet, pas T2** (1 min 58) : la suppression d'un répertoire de route ne
  se voit ni au `tsc --noEmit` ni à Vitest, seul `next build` la sanctionne.

## Prochaine action

**LOT-02** — « Certifié » n'emporte pas la définition de `D-034` à l'écran
praticien. Question tranchée le 2026-08-08 : **renommer le libellé** en
« Scoring vérifié » (plutôt qu'infobulle ou lien), sur **toute la famille** des
libellés qui emploient le mot. Plan approuvé, périmètre : deux mappers déplacés
dans `web/src/lib/certification-libelles.ts`, un garde qui assère la table de
libellés **et** refuse le retour de `/certifi/i` sur les valeurs rendues, et le
sélecteur E2E `dashboard-praticien.spec.ts:132-137` reporté.

Ordre imposé : cette clôture, puis le merge de #625, puis branche LOT-02 depuis
`origin/main` **fraîchement fetché** — jamais depuis cette branche squashée.

## Questions ouvertes

- **Jusqu'à quand garder la redirection `/patient/*` ?** Le lot a retiré le
  parcours mais laissé sa redirection **sans échéance** : la dette « une date qui
  n'existe pas » s'est déplacée, elle ne s'est pas fermée. Elle sert des liens
  e-mail déjà partis, dont on ignore la durée de vie réelle — une mesure d'accès
  sur la redirection trancherait.
- **`web/src/app/api/patient/assignations/route.ts` n'a plus d'appelant** depuis
  ce lot. Retrait d'une route d'API = décision séparée ; nommé ici pour ne pas
  le redécouvrir dans six semaines.

## Interdits encore actifs

- Ne pas retirer la redirection 307 ni son `X-Robots-Tag` sans décision produit.
- Ne pas remettre un repli déclaratif dans `next.config.mjs` : il gagnerait la
  course contre le middleware.
- Ne pas rétablir `app/patient` parmi les racines d'`auth.roles.guard.test.ts`
  sans recréer le répertoire — le banc refuse désormais la résurrection de l'un
  sans l'autre.
