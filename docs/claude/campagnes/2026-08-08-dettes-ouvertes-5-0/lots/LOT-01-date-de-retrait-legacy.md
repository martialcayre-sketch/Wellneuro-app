---
id: "LOT-01"
titre: "Dette 5 — le parcours patient legacy est retiré, pas daté"
statut: "livré (2026-08-08) — répertoire supprimé, redirection conservée"
dépend_de: "aucun"
---

# LOT-01 — Dette 5 : le parcours patient legacy est retiré, pas daté

## Ce qui a été décidé, et qui change le lot

Le cadrage proposait de **poser une date-cible** de retrait — le critère du
LOT-04 de la campagne close étant coché à tort, faute d'échéance réelle.
**Arbitrage du 2026-08-08 : retrait immédiat.** Le répertoire
`web/src/app/patient/` est supprimé dans ce lot ; il n'y a donc plus de date à
poser, ni de lien interne à retirer — il vivait dans la page supprimée.

Le risque a été signalé avant l'exécution : c'est précisément ce que le LOT-04
avait refusé de faire sans preuve de non-usage, et 406 lignes de parcours
partent sans filet. La décision a été maintenue, et elle est défendable — le
parcours est **inatteignable depuis le 2026-08-05** (redirection 307), et plus
rien ne le vise.

## Ce qui est supprimé

- `web/src/app/patient/[idAssignation]/page.tsx` (406 lignes) — l'ancien
  parcours entier, avec le `href={/patient/…}` interne (L191-192) que le lot
  devait retirer.
- `web/src/app/patient/[idAssignation]/page.test.tsx` — son banc. **La règle
  qu'il gardait n'est pas perdue** : `consentementPossible` sur recueil périmé
  est couvert par
  `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.test.tsx`,
  qui consomme la même route serveur. Vérifié avant la suppression, pas supposé.
- `web/src/app/patient/layout.tsx`.

## Ce qui est conservé, et pourquoi

- **La redirection 307** de `web/next.config.mjs`. Elle n'est plus une
  convergence entre deux parcours vivants : elle est le seul reste du legacy, et
  elle existe pour les **liens e-mail déjà partis chez des patients**. La
  retirer ferait tomber ces liens en 404 au lieu de les ramener au portail.
  Le choix du 307 contre le 308 tient toujours, et pour la même raison : un 308
  en cache sur un poste patient est irrattrapable.
- **L'en-tête `X-Robots-Tag` sur `/patient/:path*`** : il part avec la réponse
  307 elle-même, et c'est elle qu'un crawler rencontrerait en suivant un ancien
  lien.
- **Les routes `api/patient/*`** : `api/patient/questionnaire` est appelée par
  l'écran **portail**, elle n'a rien de legacy.

## Correction rattachée — deux commentaires qui mentaient

`orientationEngine.ts` et `orientationRulesV1.ts` déclaraient encore
`sum_decimal`, `count_threshold` et `ecab` « ouverts » / « en attente », alors
que la PR #583 les a fermés le 2026-08-05. Les trois gardes existent bien dans
`web/src/lib/questions.ts` (L2517, L3357, L3706) avec trois bancs dédiés —
vérifié ligne à ligne, pas repris de la prose du lot. Le dépôt contredisait sa
propre correction à deux endroits ; c'est réparé.

## Ce que ce lot laisse derrière lui, et qui est nommé

**`web/src/app/api/patient/assignations/route.ts` n'a plus d'appelant.** Elle
n'était consommée que par la page supprimée. C'est du code mort à compter de ce
lot — pas retiré ici (une route d'API a une surface publique, son retrait se
décide séparément), mais il ne faut pas le découvrir dans six semaines.

## Deux bancs cassés par le retrait, et c'est le bon signe

T1 était vert ; **T3 a rougi sur deux bancs**, tous deux par leur garde
anti-vacuité — exactement leur raison d'être :

- `src/lib/auth.roles.guard.test.ts` énumérait `app/patient` parmi les racines
  patient à balayer, et `readdirSync` a levé sur le dossier disparu. La racine
  est retirée, **pas remplacée** : `app/api/patient` reste, et c'est là que la
  garde compte.
- `src/lib/questionnaire-display.test.ts` exigeait **au moins deux** montages de
  `GenericQuestionnaire` ; il n'en reste qu'un, l'écran portail. Plancher
  descendu à 1, avec le motif écrit sur place — abaisser un plancher sans le
  dire est la manière dont un garde anti-vacuité cesse silencieusement de
  garder.

## Validation

- T1 vert.
- **T3 complet vert** (1 min 58 : lint, build de production, migrations,
  contrats SQL, E2E Chromium + WebKit) — pas T2 : la suppression d'un répertoire
  de route ne se voit ni au `tsc --noEmit` ni à Vitest, seul `next build` la
  sanctionne, et les E2E sont le seul lieu où la redirection est empruntée.
