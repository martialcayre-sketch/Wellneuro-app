# Handoff — 2026-11-25 — Matrice de consommation : colonne « Patient » (lot `matrice-visibilite-patient-affichage`)

## Branche et état du dépôt

- Branche `claude/clever-mayer-2446bg`, tirée d'`origin/main` `29d6ffff`, passe de
  l'orchestrateur cloud `20261125-1909-orch` (file D).
- Une PR, outillage et documentation générée. La passe ne merge pas : « prête @<sha> »
  à l'intégrateur.

## Objectif

Que la colonne « Patient » de `docs/claude/MATRICE_CONSOMMATION.md` cesse de dire « oui »
pour la Boussole par le seul chemin `protocol/fromPrisma.ts` → `food-compass/refValidation`
(revue CodeRabbit de #1736, ligne de dette de `PLAN_WELLNEURO.md` §8).

## Décisions prises

- Cause établie par reconstruction des chemins : pas une lecture de validation prise
  pour un affichage, mais un faux appelant. `mentionne` lisait un spécificateur par
  inclusion ; le jeton de baril `@/lib/food-compass` (forme abrégée de
  `food-compass/index`) se trouvait dans `'@/lib/food-compass/refValidation'` et
  `'@/lib/food-compass/plates'`. Ni `refValidation.ts` ni `plates.ts` n'importent
  `distribution.ts` : aucun chemin réel ne relie le portail à la Boussole.
- Correctif minimal et général : un spécificateur (`@/…`, `./…`, `../…`) se lit entier,
  entre guillemets (simples, doubles ou gabarit). Aucun import avec extension dans
  `web/src` (constaté), les imports dynamiques restent vus.
- Pas de classement « validation / affichage » des relais : il serait déclaré, pas
  dérivé, et la cause trouvée n'en a pas besoin.

## Fichiers modifiés

- `scripts/wn-matrice-consommation.mjs` (`mentionne`) ;
- `scripts/wn-matrice-consommation.test.mjs` (deux bancs : spécificateur entier ; baril
  importé seulement par ses voisins) ;
- `docs/claude/MATRICE_CONSOMMATION.md` (régénéré : Boussole « non », 3 surfaces
  praticien ; compléments, compatibilité, résolution et questionnaires perdent leurs
  faux appelants ; aucune source dormante) ;
- `docs/claude/PLAN_WELLNEURO.md` §8 (ligne de dette soldée) ;
- `changelog.d/2026-11-25-matrice-visibilite-patient-affichage.md`, ce handoff.

## Validations exécutées

- `node --test scripts/wn-matrice-consommation.test.mjs` : 49/49, bancs neufs
  compris (dont la garde de fraîcheur du Markdown).
- T1 `npm run check:rapide` → 0 ; T1 complet `npm run check` : résultat dans la
  déclaration « prête ». Ni T2 ni T3 (passe cloud, `D-540`).

## Problèmes ouverts

- Quatre lignes restent « Patient : oui » : questionnaires, signaux de sécurité, packs de
  consultation, corpus clinique de synthèse. Les trois premières sont servies au portail
  en toutes lettres (`api/patient/*`, `api/portail/valider`). Le corpus clinique l'est par
  des relais à deux sauts (`lib/anthropic.ts` et voisins) : atteignabilité, pas forcément
  lecture servie. Le distinguer demanderait un jugement déclaré par relais, hors de ce
  lot ; à cadrer si la ligne gêne [Hypothese].

## Prochaine action exacte

Merge par l'intégrateur après PR-Agent sur la tête.

## Interdits encore actifs

- Aucun code de `web/` : le générateur lit, il ne modifie rien.
- `SOURCES_DE_SAVOIR` inchangée.
