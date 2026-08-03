---
id: "LOT-03"
titre: "Refactor des packs — source de vérité unique"
statut: "à_faire"
dépend_de: "LOT-00"
palier: "T3"
---

# LOT-03 — Refactor des packs : source de vérité unique

## But

Recomposer les 16 packs de questionnaires sur les axes du registre d'intervention
(LOT-00), et **supprimer la double source de vérité** qui les décrit aujourd'hui.

## Le défaut à corriger

Deux descriptions coexistent et peuvent diverger sans que rien ne le signale :

| Source | Contenu | Couverture |
|---|---|---|
| Base — `QuestionnairePack`, `pack_questionnaires`, `pack_triggers` | composition réelle, ordre, obligatoire, conditions | résolue par `web/src/lib/consultation/packRegistry.ts` |
| Code — `PACKS_REGISTRY` | id, titre, niveau, phase — **pas la composition** | 16 packs |
| Code — `QUESTIONNAIRE_OVERRIDES.packsRecommandes` | tenu à la main | **10 questionnaires sur 64** |
| Code — `LEGACY_CATEGORY_MAP` | repli par catégorie legacy | les 54 autres |

`resolvePackQuestionnaireIds` rend déjà `source: 'registry' | 'legacy'`. Ce
signal de divergence existe **et n'est surveillé par aucun test** : un pack peut
basculer en repli legacy sans que personne le sache.

## Résultat observable

- Une seule source fait foi pour la composition d'un pack, désignée explicitement
  dans le code.
- Un test échoue si le code et la base divergent sur la composition d'un pack.
- Les `packsRecommandes` couvrent les 64 questionnaires, ou le repli est
  explicite et testé.

## Périmètre

- Désigner la source de vérité et l'écrire dans le fichier concerné.
- Recomposer les packs sur les axes du registre LOT-00.
- Poser le garde de divergence.
- Étendre ou remplacer `QUESTIONNAIRE_OVERRIDES` selon la source retenue.

## Hors périmètre

- **Toute modification du contenu, des items ou du scoring d'un instrument.** Le
  `64/64` gelé par `#528` n'est pas rouvert — c'est l'arbitrage PMI-1.
- Rendre assignable un questionnaire suspendu ou verrouillé : le filtre
  `estAdministrableParLaRoute` de `#528` reste en amont de tout.
- Toute migration de schéma.

## Fichiers probables

- `web/src/lib/questionnaires-functional.ts`
- `web/src/lib/consultation/packRegistry.ts`
- `web/src/lib/bibliotheque.ts` (filtre d'administrabilité, à ne pas affaiblir)
- tests associés

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ni écriture Supabase.
- Pas de modification d'instrument.
- Pas de refactor hors lot.

## Étapes

- [ ] Relever les divergences actuelles entre code et base sur les 16 packs.
- [ ] Désigner la source de vérité et documenter le choix.
- [ ] Recomposer les packs sur les axes LOT-00.
- [ ] Poser le garde de divergence et le test du signal `source: 'legacy'`.
- [ ] `node scripts/check_questionnaire_certification.js` — doit rester vert.
- [ ] `npm run test:worktree` (T3).

## Tests

- Divergence code/base sur une composition → échec.
- Un pack contenant un questionnaire suspendu ou verrouillé → non administrable,
  jamais proposé.
- `check_questionnaire_certification.js` vert sur les 64 — preuve que le refactor
  n'a pas atteint les instruments.

## Critères de done

- [ ] Une seule source de vérité, nommée dans le code.
- [ ] Garde de divergence en place et passant.
- [ ] Les 64 restent certifiés à l'identique.
- [ ] Revue de diff sur l'absence de changement clinique.

## Résultats

À compléter à la clôture.
