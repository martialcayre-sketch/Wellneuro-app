---
id: "LOT-03"
titre: "Refactor des packs — source de vérité unique"
statut: "livré"
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

Le cadrage a trouvé un défaut plus grave que la double source de vérité annoncée :
**les deux espaces de noms étaient disjoints**. `PACKS_REGISTRY` dit
`pack_socle_initial_neuronutrition`, la base dit `PACK_SOCLE_INIT`, et
`orientation/route.ts` comparait les deux directement. `compositionPacks` restait
donc toujours vide, et le filtre fail-closed rejetait **toute** recommandation de
pack. Le moteur, même doté d'une table signée, n'aurait jamais pu proposer autre
chose qu'un questionnaire.

Livré :

- `PackRegistryItem` porte `idPackBase` (l'`id_pack` réel, 6 cas sur 16) et
  `axeId` (le lien vers le registre d'intervention du LOT-00) ;
- traduction **dans les deux sens** — `packIdDepuisIdBase` et
  `idBaseDepuisPackId` ; la réponse d'orientation porte `idPackBase` pour que la
  recommandation soit suivable jusqu'à `/api/praticien/packs/assign` ;
- le repli `legacy` de `resolvePackQuestionnaireIds` distingue ses causes
  (`registre_absent` / `registre_vide` / `ensembles_divergents`) et n'alerte que
  sur la dérive réelle ;
- `checkPackRegistryConsistency` signale les correspondances orphelines.

**Preuve que le correctif corrige** : en remettant la comparaison directe, 3 tests
rougissent. Et le test qui aurait dû attraper le défaut d'origine existait — il
moquait `idPack: 'pack_stress_chronique_burnout'`, un `id_pack` qui n'a jamais
existé en base. Une fixture qui invente sa base ne prouve rien sur la base.

### Ce que la revue adversariale a changé

`wn-reviewer` a rendu GO SOUS RÉSERVE avec trois majeurs, tous traités :

1. **Le correctif `niveau` n'atteignait pas la production** — `syncPackToRegistry`
   n'est appelé que sur édition d'un pack, et **aucun code ne lit**
   `questionnaire_packs.niveau`. Le changement a été **retiré** : hors périmètre,
   sans consommateur, et le garder aurait exigé soit un commentaire faux, soit un
   re-sync que ce lot n'autorise pas.
2. **La traduction n'existait que dans un sens** — une recommandation aurait
   désigné un slug là où l'assignation attend un `id_pack` : 404, cul-de-sac. La
   traduction inverse est livrée et testée.
3. **L'alarme de dérive naissait saturée** — le pack par défaut étant en dérive,
   le `warn` serait parti à chaque onboarding sans distinguer un registre absent
   d'une divergence réelle. Qualifié par cause, avec les deux comptages dans le
   message.

Deux de ses mineurs portaient sur des tests qui ne gardaient pas ce qu'ils
annonçaient (un commentaire trop large, un banc qui recopiait sa source au lieu
de l'itérer) — corrigés. Un garde a été ajouté sur la table de règles : vacant
aujourd'hui, il empêchera au LOT-05 qu'une règle cite un pack sans existence en
base, cas où la recommandation disparaîtrait en silence.

### Signalé, non traité — décision clinique

`estAdministrableParLaRoute` ne vérifie pas `actif` dans le catalogue,
contrairement à `IDS_ASSIGNABLES`. Des instruments à passation praticien
(`Q_GEO_03/04/05/06`, `Q_URO_02`, `Q_PED_02`) sont donc « administrables » au sens
de l'orientation. Vérifié en base le 2026-08-03 : **aucun d'eux ne figure dans les
6 packs de doctrine**, le risque est théorique. Aligner ce prédicat est un
arbitrage clinique, hors périmètre de ce lot.
