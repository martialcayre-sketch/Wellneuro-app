---
id: "LOT-00"
titre: "Q_ALI_09 soudé au pack de base — un geste nécessaire est impossible"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-00 — `Q_ALI_09` soudé au pack de base

## But

**Retirer `Q_ALI_09` du pack de base, et ouvrir le geste praticien qui permet de
retirer d'un pack un qid suspendu** — les deux, pas l'un des deux. À la fin de ce
lot, « Base de consultation » porte 5 qids en production, l'écran
« Questionnaires & packs » rend et laisse décocher un qid présent mais suspendu,
`PATCH /api/praticien/packs` accepte ce retrait sans le confondre avec un ajout,
et `web/prisma/seed.ts` reflète l'état résultant.

**Ce lot débloque la campagne `2026-08-04-agenda-alimentaire`.**
`../../2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:44-53` fait de
« **Aucun pack ne référence `Q_ALI_09`** » un **prérequis bloquant** de
l'allumage de `WN_AGENDA_ALI` (`SELECT nom, par_defaut, actif FROM packs WHERE
'Q_ALI_09' = ANY(qids);` — attendu 0 ligne ; la production en rend **1**, le pack
de base). Motif du runbook : c'est **le seul chemin qui assignerait l'agenda sans
clic praticien**, `assignPackToPatient` — appelé par l'onboarding portail —
n'écartant que `IDS_SUSPENDUS`, et rien ne validant les `qids` d'un pack contre
cette liste. **Risque tant que la ligne existe** : allumer `WN_AGENDA_ALI`
auto-assignerait l'agenda à chaque patient onboardé **sans décision praticien**,
ce que [[D-025]] protège précisément. Le retrait est donc **requis, pas à
arbitrer**.

## Diagnostic

Le pack de base (« Base de consultation », `PACK_-bG21yeIvVYRhrdlYuWIMnFz`,
`par_defaut = true`, assigné à chaque onboarding) porte **6 qids**, dont
`Q_ALI_09`, qui est dans `IDS_SUSPENDUS`. Le praticien **ne peut pas l'en
retirer** : **deux portes** du parcours, prises ensemble, ferment le geste (les
maillons 1 et 2 ci-dessous). Les deux maillons suivants n'en sont pas — le 3 est
une garde qui ne juge que les qids **ajoutés** et ne bloque aucun retrait, le 4
est la **conséquence** du blocage, pas sa cause. C'est la classe « un geste
**nécessaire** est impossible » — pas un défaut de ligne, un défaut de chaîne.

**« Suspendu » est un état de drapeau, pas une propriété de l'instrument.**
`Q_ALI_09` est déclaré `actif: isAgendaAlimentaireEnabled()`
(`web/src/lib/questionnaires-catalog.ts:83`), fonction qui lit
`process.env.WN_AGENDA_ALI` (`web/src/lib/agenda-alimentaire/featureFlag.ts:36-37`),
et `IDS_SUSPENDUS` est **dérivé** de `!q.actif`
(`web/src/lib/questionnaires-catalog.ts:518-520`). L'instrument sortira donc de
`IDS_SUSPENDUS` le jour de l'allumage — ce qui ne rend pas sa présence dans le
pack de base légitime pour autant : c'est justement l'allumage que le runbook
interdit tant que la ligne existe.

La chaîne, vérifiée ligne à ligne au cadrage du 2026-08-07 :

1. **Porte.** `web/src/app/api/praticien/questionnaires/route.ts:35` filtre
   `.filter(q => q.actif)` (le `:34` porte `const questionnaires =
   QUESTIONNAIRES_CATALOG`) → aucune case à cocher n'expose `Q_ALI_09` au
   praticien.
2. **Porte.** `web/src/components/PacksPanel.tsx:309-310`
   (`editSelectedQids = new Set(pack.qids)`) puis `:215`
   (`qids: Array.from(editSelectedQids)`) → l'écran d'édition recharge l'état
   stocké en entier, donc le qid **repart à chaque sauvegarde**.
3. **Pas une porte.** `web/src/app/api/praticien/packs/route.ts:306-309` : la
   garde `IDS_SUSPENDUS` ne refuse que les qids **ajoutés**, jamais ceux déjà
   présents — elle **ne bloque donc aucun retrait**. Ce choix est justifié, et le
   commentaire `:298-301` le dit : refuser sur l'ensemble fourni verrouillerait
   tout pack portant déjà un suspendu. C'est même la raison pour laquelle le pack
   n'est pas verrouillé. Revers : rien ne signale l'instrument déjà en place.
4. **Conséquence, pas porte.** `web/src/app/api/portail/valider/route.ts:144-152` : chaque onboarding
   **ampute le pack en silence**, avec un `ASSIGNATION_PACK_INSTRUMENT_SUSPENDU`.

Le résultat clinique est actif en production : le pack déclaré n'est pas le pack
servi, et le praticien n'a aucun moyen de résorber l'écart.

## Résultat observable

- Le pack de base ne porte plus `Q_ALI_09` — lecture SQL de production, `packs`
  et `pack_questionnaires` alignés à 5 qids.
- **Et** un geste praticien existe pour ôter d'un pack un qid de
  `IDS_SUSPENDUS`. Les deux, pas l'un des deux : corriger la donnée sans ouvrir
  le geste laisse la même impasse au prochain instrument suspendu.
- L'événement `ASSIGNATION_PACK_INSTRUMENT_SUSPENDU` ne se déclenche plus sur
  l'onboarding du pack de base.
- Le prérequis d'allumage de `WN_AGENDA_ALI` est satisfait :
  `SELECT nom, par_defaut, actif FROM packs WHERE 'Q_ALI_09' = ANY(qids);` rend
  **0 ligne** (`../../2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:44-53`).

## Périmètre

- Écran d'édition de pack : rendre visible et retirable un qid présent mais
  suspendu (texte UI en français, mention explicite du statut suspendu).
- Route `PATCH /api/praticien/packs` : accepter le retrait d'un qid suspendu sans
  le confondre avec un ajout ; la garde `IDS_SUSPENDUS` sur les qids ajoutés
  reste en place, inchangée.
- Geste de donnée en production par l'UI praticien : retirer `Q_ALI_09` du pack
  de base, puis lecture SQL de contrôle.
- `web/prisma/seed.ts` : **dans le périmètre de ce lot**, sans ambiguïté. Le
  retrait fait passer le pack de base de 6 à 5 qids en production ; `PACK_BASE`
  (`web/prisma/seed.ts:270`) en porte déjà 5, sans `Q_ALI_09` — vérifier que les
  deux ensembles coïncident après le geste, et les aligner sinon. Cette dette de
  **dérive de contenu** n'est donc **pas** l'une des dettes « sans lot
  d'accueil ». À ne pas confondre avec la dette **distincte** qui, elle, reste
  sans lot : `web/prisma/seed.ts:288-294`, `upsert` avec `update: {}` — un no-op
  qui affiche pourtant « Pack par défaut créé », si bien que le seed **ne répare
  pas** un pack de base cassé. Deux défauts différents sous le même mot `seed`.

## Hors périmètre

- Réactivation de packs depuis l'UI (dette nommée sans lot).
- Lecture de `questionnaire_packs.actif` par `resolvePackQuestionnaireIds`
  (dette nommée sans lot).
- Toute migration, toute suppression physique, tout SQL d'écriture.
- Réhabiliter `Q_ALI_09` au catalogue : sa suspension n'est pas rouverte ici.

## Fichiers probables

- `web/src/components/PacksPanel.tsx`
- `web/src/app/api/praticien/packs/route.ts`
- `web/src/app/api/praticien/questionnaires/route.ts`
- `web/src/app/api/portail/valider/route.ts` (vérification seule)
- `web/prisma/seed.ts`
- tests associés, `changelog.d/`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle ; fixtures limitées à Sophie Nicola, Jennifer
  Martin, Michel Dogné.
- Pas de migration Prisma ni d'écriture Supabase — le retrait du qid passe par
  l'UI praticien, jamais par du SQL.
- Pas de refactor hors lot ; la garde `IDS_SUSPENDUS` sur les ajouts ne
  s'affaiblit pas.

## Étapes

- [ ] Rejouer les quatre maillons du Diagnostic sur le dépôt — **deux portes**
      (1 et 2), une **non-porte** (3) et une **conséquence** (4) — pour confirmer
      qu'aucun n'a bougé depuis le 2026-08-07.
- [ ] Ouvrir le geste (UI + route), avec banc sur chacune des deux moitiés.
- [ ] Lecture SQL avant geste : qids du pack de base, `pack_questionnaires`.
- [ ] Geste praticien en production : retirer `Q_ALI_09`.
- [ ] Lecture SQL après geste, consignée dans « Résultats ».
- [ ] Réaligner `seed.ts` et poser le fragment `changelog.d/`.

## Tests

- T1 après chaque édition ; T2 avant commit (UI et API touchées) ; T3 avant PR.
- Banc : un qid suspendu **déjà présent** est rendu par l'écran d'édition et
  peut être décoché — mutation : le retirer du rendu doit faire rougir.
- Banc : `PATCH` accepte un payload qui **retire** un qid suspendu, et refuse
  toujours celui qui en **ajoute** un. Les deux assertions, pas une.
- Banc : `portail/valider` n'émet plus `ASSIGNATION_PACK_INSTRUMENT_SUSPENDU`
  pour un pack sans qid suspendu.
- Revue adversariale `wn-reviewer` avant PR (volet clinique).

## Critères de done

- Les deux moitiés du « Résultat observable » sont vraies, chacune sur pièce.
- Aucun parcours patient cassé : onboarding et réévaluation vérifiés par E2E.
- `changelog.d/` posé ; handoff écrit avant la PR.

## Résultats

À compléter à la clôture du lot.
