# 2026-08-23 16:30 — LOT-09 : `DC-09` mord dans le prompt (`D-097`)

## Ce qui est livré

`DC-09` bascule de *Proposition* à **acté**. Le cadre déontologique de
`SYSTEM_PROMPT_GOUVERNANCE` porte « **Une association n'est pas une preuve** »
avec ses quatre formes interdites (`prouve`, `explique`, `démontre`,
`atteste`), la moitié qui dit ce qui reste attendu, et l'exclusion explicite du
bloc déterministe. Version `synthese-v28` → **`synthese-v29`**, déclarée.

Banc neuf `promptAssociationPreuve.guard.test.ts` (8 tests) : formule +
unicité, **opérateur** d'interdiction, périmètre déterministe,
ce-qui-reste-attendu, coexistence des consignes voisines, **position** de la
clause.

## Les trois choses non évidentes

1. **Le point d'insertion est un choix de préséance, pas de rangement.** La
   section « Recommandation d'exploration déterministe » prime sur toute
   consigne « relative aux explorations à proposer » mais ne relève « aucune
   des interdictions posées plus haut » (`anthropic.ts:525`). Une clause posée
   au-dessus est hors de sa portée ; la même clause plus bas serait discutable
   **sans qu'un mot ait bougé**. D'où une garde de position, vue rouge en
   déplaçant la clause sans en changer un caractère. **Borne** : deux autres
   sections (`:384`, `:457`) priment *sans* cette réserve — être plus haut ne
   protège pas d'elles. Aucune contradiction pratique aujourd'hui ; ne pas
   citer ce patron plus large qu'il n'est.

2. **Un banc de prompt qui n'épingle que du vocabulaire ne garde rien.** La
   première rédaction vérifiait que les quatre formes *apparaissent* ; « Ne
   l'écris jamais » → « Évite de l'écrire » la laissait entièrement verte.
   L'interdit devenait une préférence en silence — le défaut exact que le lot
   prétend fermer. Vérifier l'**opérateur**, pas seulement les mots qu'il
   régit. Limite qui demeure : une clause contradictoire ajoutée *ailleurs*
   reste verte au banc ; seule l'empreinte la rattrape, et ses deux messages
   disent désormais que le report n'est pas un geste mécanique.

3. **Le verdict d'abstention est réutilisable.** Le détecteur de restitution
   ne juge que contre un **vocabulaire fermé** (packs, identifiants, marqueurs
   imposés par la consigne). Un glissement de langage n'en a pas : le détecter
   demanderait un lexique ouvert et un arbitrage chiffré neuf. Motif écrit
   dans `verifierRestitutionOrientation.ts:43` pour que la question ne se
   repose pas à l'aveugle. `D-011` (journaliser, ne pas censurer) intact.

## Ce qui reste ouvert

- **Les ancres `fichier:ligne` de la constitution se périment à chaque édition
  du prompt.** Ce lot a décalé `anthropic.ts` de +11 lignes et faussé huit
  citations (`DC-03`, `DC-27`, `DC-32`, `D-097` lui-même, fiche de lot) —
  toutes corrigées et revérifiées une à une, mais le mode de défaillance est
  **silencieux et récurrent** : aucun banc ne vérifie qu'une citation pointe
  sur ce qu'elle annonce. Question de fond, hors lot.
- **`wn-diagnostic-e2e.mjs` a raté un blocage WebKit qu'il existe pour
  nommer** : il exige `page.goto` dans `error-context.md`, où Playwright
  n'avait écrit que le timeout de *teardown*. Le journal réseau vide — le fait
  décisif — était pourtant là. Correctif à part.
- L'arbitrage sur les **dix orphelines** reste reporté au LOT-08 ([[D-096]]).

## État de validation

T1 vert (479 + 402). **T3 intégralement vert sur l'état final** — 5 503 tests
Vitest, contrats SQL, dérive schéma *No difference detected*, et les 156 E2E
passés WebKit compris en 58 s (2 min 22 s au total). Un T3 antérieur avait
rougi sur `trajectoires.spec.ts:10` en iPhone 13 avec un journal réseau
**vide** — signature `D-049`, non reproduite au run suivant.

Revue `wn-reviewer` : **GO avec réserves**, toutes levées sauf la question de
fond sur les ancres. La réserve P0 était opérationnelle et non technique : une
session voisine avait fait basculer la copie principale sur sa propre branche,
emportant le travail non commité du LOT-09 — rien n'avait fui dans son commit,
et la branche a été reprise puis rebasée sur `origin/main` (PR #772 mergée
entre-temps, aucun chevauchement de fichiers).
