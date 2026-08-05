---
id: "LOT-02"
titre: "Packs — observer le repli legacy avant de le fermer"
statut: "fait"
dépend_de: "LOT-01"
---

# LOT-02 — Packs : observer le repli legacy avant de le fermer

## But

Le dépôt fait coexister quatre sources pour un même pack : packs historiques,
registre relationnel normalisé, overrides en code, replis par catégories legacy.
Le résolveur `web/src/lib/consultation/packRegistry.ts` limite le risque et
**expose déjà un signal typé** : `source: 'registry' | 'legacy'` avec une `raison`
(`registre_absent`, `registre_vide`, divergence).

Le défaut n'est pas l'absence de signal, c'est que **personne ne l'écoute**. Une
recherche du 2026-08-05 n'a trouvé aucun consommateur hors tests — à confirmer en
ouverture de lot avant tout code.

On n'unifie pas d'abord : on **mesure** d'abord. Fermer le repli sans savoir s'il
est emprunté, c'est risquer de retirer le filet qui tient la production.

## Résultat observable

- Chaque résolution de pack qui tombe en `legacy` est journalisée avec sa `raison`
  et l'identifiant du pack.
- Une surface praticien (ou une requête documentée) répond à : « combien de packs
  sont servis depuis le registre, combien depuis le repli, et lesquels ? »
- Une divergence registre/legacy sur un pack donné est **visible**, pas seulement
  résolue.

## Périmètre

- Confirmer l'absence de consommateur du signal.
- Brancher l'observation (journalisation structurée, pas de nouvelle table).
- Lire la production (`execute_sql`, lecture seule) : quels packs existent au
  registre, lesquels manquent, lesquels divergent.
- Écrire le constat, et **seulement s'il est vide** proposer le retrait du repli
  dans un lot ultérieur.

## Hors périmètre

- Supprimer le repli legacy — décision qui appartient au constat, pas à ce lot.
- Toute migration Prisma.
- Les overrides en code (inventaire seulement, pas de refonte).

## Fichiers probables

- `web/src/lib/consultation/packRegistry.ts`, `packRegistryLogic.ts`
- `web/src/app/api/praticien/packs/assign/route.ts`
- tests associés
- `changelog.d/2026-08-05-packs-observer-le-repli.md`

## Interdits

- Pas d'écriture Supabase ni de migration.
- Pas de donnée patient réelle dans les journaux — identifiants de pack seuls.
- Pas de refactor du résolveur au-delà de l'ajout d'observation.

## Étapes

- [ ] Confirmer par `grep` qu'aucun appelant ne consomme `source`/`raison`.
- [ ] Brancher l'observation.
- [ ] Lire la production et consigner le constat chiffré.
- [ ] T1 puis T2.

## Tests

- Tests unitaires sur chaque `raison` de repli (`registre_absent`,
  `registre_vide`, divergence) : chacune doit produire son signal observable.
- Passe de mutation : retirer l'observation doit faire rougir au moins un test.

## Critères de done

- [ ] Le signal a au moins un consommateur hors tests.
- [ ] Le constat de production est écrit et chiffré.
- [ ] Une recommandation datée existe : fermer le repli, ou pas, et pourquoi.

## Résultats

**2026-08-05.** Hypothèse de départ infirmée en cadrage : le signal `raison`
avait déjà un consommateur (les deux routes journalisaient `ensembles_divergents`
en WARN depuis le LOT-03) — le vrai trou était les deux raisons bénignes
(`registre_absent`, `registre_vide`), totalement muettes, pas de consommateur du
tout. Ajout d'une branche `logger.info` (même event `PACK_REGISTRE_REPLI_LEGACY`,
niveau distinct pour ne pas casser la décision anti-alarme-permanente déjà prise
et documentée en commentaire) dans `packs/assign/route.ts` et
`portail/valider/route.ts`, sans toucher au résolveur.

Constat de production (`execute_sql`, lecture seule, réplique de
`prisma/checkPackRegistryConsistency.ts`) : **8 packs**, 7 en correspondance
registre exacte, **1 en dérive réelle** — `PACK_-bG21yeIvVYRhrdlYuWIMnFz`
(« Base de consultation », pack `parDefaut` envoyé à chaque onboarding) : legacy
contient `Q_SOM_09` (Agenda du sommeil 21 nuits, actif au catalogue), absent du
registre. 0 pack en `registre_absent`/`registre_vide`.

**Recommandation datée (2026-08-05) : ne pas fermer le repli.** Il protège
aujourd'hui le pack le plus emprunté du produit. Avant toute fermeture,
resynchroniser le registre du pack de base pour qu'il inclue `Q_SOM_09` (rejouer
`syncPackToRegistry`, hors périmètre de ce lot — c'est une correction de donnée,
pas une observation) puis revérifier par la même requête.

T1 vert, T2 (`test:worktree -- --fast`) vert (120 passed, 2 skipped — deux
échecs en premier passage, tous deux non reproductibles au second : flakiness
E2E locale connue, sans lien avec le changement). Revue `Explore` : GO, aucun
défaut. Diff limité aux 4 fichiers de code/tests prévus + 1 fragment changelog.
