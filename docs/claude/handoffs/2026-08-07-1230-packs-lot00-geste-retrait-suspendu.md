# Handoff — 2026-08-07 — LOT-00 packs : le geste de retrait d'un instrument suspendu

Campagne `2026-08-07-dettes-packs-residuelles`, LOT-00. Branche
`worktree-lot00-pack-base-qali09` (base `origin/main` = bd413ffb), arbre sale,
rien de committé à l'écriture de ce fragment.

## Objectif, et ce qui est réellement atteint

Deux moitiés : **retirer `Q_ALI_09` du pack de base** (donnée) et **ouvrir le
geste praticien qui retire d'un pack un qid suspendu** (code). **Le lot n'est pas
livré** : seule la moitié *code* l'est ; la moitié *donnée* est **différée après
le merge** (décision utilisateur du 2026-08-07, [[D-033]]), et **le risque
d'auto-assignation court jusqu'à ce geste**.

## Le fait qui commande tout

`WN_AGENDA_ALI` est **allumé en production** depuis le 2026-08-05
(`docs/claude/campagnes/2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:227-231`,
« le drapeau a été allumé et le pilote lancé » ; variable créée côté Vercel en
Production ce jour-là). Donc `Q_ALI_09` **n'est pas** dans `IDS_SUSPENDUS` en
production, `web/src/app/api/portail/valider/route.ts:144-152` ne l'écarte pas,
le pack de base part **en entier**, et **le prochain patient onboardé reçoit
l'agenda auto-assigné sans décision praticien** — ce que [[D-025]] protège.
Fait rassurant, daté, à ne pas prendre pour une fermeture : **0 assignation créée
depuis le 2026-08-06 18:02**, date de la dérive. Le risque est **prospectif**.

Le prérequis du runbook (« aucun pack ne référence `Q_ALI_09` »,
`RUNBOOK-allumage-drapeau.md:44-53`) **était satisfait le 2026-08-05** ; la dérive
du pack du 2026-08-06 l'a cassé **après coup**, sans que rien ne le re-vérifie.

## Décisions prises

Geste de donnée **différé après merge** ([[D-033]], point 1). **Titre du lot
réécrit** (point 2) : l'ancien — « un geste nécessaire est impossible » — n'était
vrai que **drapeau éteint**. Statut du lot à `en_cours (2026-08-07)` : il n'est
**pas** clos, et `scripts/wn-campaign-audit.mjs:39-42` ne le compte pas comme tel.

## Fichiers modifiés

Code (figé, revu GO) : `web/src/components/PacksPanel.tsx` (+ `.test.tsx`) — bloc
« suspendus déjà présents » (`:635-649`) sur l'instantané des qids du pack (`:69`,
`:187`) ; `web/src/app/api/praticien/questionnaires/route.ts` (+ `.test.ts`) —
`suspendus` servis à part des actifs (`:32`, `:48`, `:68-72`) ;
`web/src/app/api/praticien/packs/route.test.ts` — le retrait était **déjà** accepté
(`route.ts:307`, diff `ajoutes` calculé contre l'existant).

Documentation : fichier de lot, `CAMPAGNE.md` (titre du tableau),
`docs/DECISIONS.md` (D-033), `.wn/state.json` (`next_action`),
`changelog.d/2026-08-07-packs-retirer-instrument-suspendu.md`, `SESSION_LOG.md`.

## Validations exécutées

- **T1** `npm run check` : vert. **T3** `npm run test:worktree` : vert, **1 min
  47 s**, Chromium + WebKit sur build de production. `check_no_secrets.sh` et
  audit de campagnes : verts.
- `wn-reviewer` : **GO**, 5 mineurs corrigés, **deux gardes posés après elle** —
  M1 (`PacksPanel.test.tsx:314`) et M2 (`:351-385`).
- **La mutation qui a sauvé M1** : sa première version restait **verte** sous
  `setEditQidsInitiaux(prev => new Set([...prev, ...pack.qids]))`, parce que
  fermer par « Fermer » réinitialise l'instantané. Le vrai chemin de fuite est la
  fermeture **par enregistrement** (`onSubmitEditPack` ne réinitialise pas).
  Réécrit sur ce chemin, mutation rejouée : **rouge**. Un banc non muté aurait
  protégé la mauvaise porte.

## Prochaine action exacte

Après merge, **geste de production** : UI praticien → « Questionnaires & packs »
→ éditer « Base de consultation » → décocher `Q_ALI_09` **depuis la liste
principale** (le drapeau étant allumé, l'instrument y est `actif` ; le bloc
« suspendus » ne s'affiche **pas** en production) → enregistrer. Puis deux
lectures SQL (MCP Supabase `execute_sql`), à consigner dans « Résultats » du
fichier de lot :

```sql
SELECT nom, par_defaut, actif, qids FROM packs WHERE 'Q_ALI_09' = ANY(qids);
-- attendu : 0 ligne

-- Le registre relationnel doit avoir suivi (`syncPackToRegistry`). Double clé :
-- `pack_questionnaires.pack_id` pointe le `id` cuid de `questionnaire_packs`.
SELECT count(*) FROM pack_questionnaires pq
JOIN questionnaire_packs qp ON qp.id = pq.pack_id
WHERE qp.pack_id = 'PACK_-bG21yeIvVYRhrdlYuWIMnFz';
-- attendu : 5
```

Ensuite `node scripts/wn-cycle.mjs --appliquer` depuis `main`, puis LOT-01 (E2E
orientation → file d'envoi → envoi → déduplication, couverture actuelle nulle).

## Problèmes ouverts

Un prérequis de runbook vérifié à l'allumage n'est **re-vérifié par rien**, et
**aucun contrat SQL de `web/prisma/checks/` n'assère « aucun pack actif ne
référence un qid de `IDS_SUSPENDUS` »** — l'assertion qui aurait mordu le
2026-08-06 à 18:02. Sans lot ouvert. Piège de conception : un tel contrat doit se
lire **dans la position du drapeau de son environnement**, sinon il rougit en CI
sur un état sain en production. Reste par ailleurs ouverte la question clinique de
`R2-SOM-05`, qui propose Horne sans la porte `RYTHME_BIOLOGIQUE` de `R2-SOM-03`.

## Interdits encore actifs

**Aucune migration Prisma, aucune écriture SQL** — le retrait passe par l'UI. Pas
de secret ; patients fictifs limités à Sophie Nicola, Jennifer Martin, Michel
Dogné. La garde `IDS_SUSPENDUS` sur les qids **ajoutés** ne s'affaiblit pas : son
asymétrie est ce qui rend le retrait possible. E2E exclusifs au Mac, jamais deux
runs en parallèle.
