---
id: "LOT-00"
titre: "Q_ALI_09 dans le pack de base — auto-assigné à l'onboarding drapeau allumé, irretirable drapeau éteint"
statut: "en_cours (2026-08-07) — moitié code livrée ; le retrait de Q_ALI_09 en production reste dû (geste praticien différé après merge, décision utilisateur)"
dépend_de: "aucun"
---

# LOT-00 — Q_ALI_09 dans le pack de base — auto-assigné à l'onboarding drapeau allumé, irretirable drapeau éteint

## But

**Retirer `Q_ALI_09` du pack de base, et ouvrir le geste praticien qui permet de
retirer d'un pack un qid suspendu** — les deux, pas l'un des deux. À la fin de ce
lot, « Base de consultation » porte 5 qids en production, l'écran
« Questionnaires & packs » rend et laisse décocher un qid présent mais suspendu,
`PATCH /api/praticien/packs` accepte ce retrait sans le confondre avec un ajout,
et `web/prisma/seed.ts` reflète l'état résultant.

**Ce lot répare un prérequis violé sur un pilote qui tourne — pas un prérequis
en attente d'être satisfait.**
`../../2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:44-53` fait de
« **Aucun pack ne référence `Q_ALI_09`** » un **prérequis bloquant** de
l'allumage de `WN_AGENDA_ALI` (`SELECT nom, par_defaut, actif FROM packs WHERE
'Q_ALI_09' = ANY(qids);` — attendu 0 ligne ; la production en rend **1**, le pack
de base). Motif du runbook : c'est **le seul chemin qui assignerait l'agenda sans
clic praticien**, `assignPackToPatient` — appelé par l'onboarding portail —
n'écartant que `IDS_SUSPENDUS`, et rien ne validant les `qids` d'un pack contre
cette liste.

**La chronologie compte, et elle inverse la lecture spontanée.** Le prérequis
**était satisfait le 2026-08-05**, jour de l'allumage : le drapeau
`WN_AGENDA_ALI` a été mis en Production et le pilote lancé sur le dossier de
contrôle `PAT006`
(`../../2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:227-231`,
« Rejeu du 2026-08-05 » ; `docs/DECISIONS.md`, « Le drapeau étant **allumé en
production** »). C'est la **dérive du pack de base du 2026-08-06** qui l'a cassé
**après coup** : `Q_ALI_09` est entré dans les `qids` du pack de base alors que
le drapeau était déjà allumé et le pilote en cours. Le runbook ne repasse pas
par ses prérequis une fois exécuté — rien ne l'a donc signalé.

**Fait rassurant, à ne pas perdre : le risque est prospectif, pas réalisé.**
Lecture SQL du 2026-08-07 : **0 assignation créée depuis le 2026-08-06 18:02**,
c'est-à-dire depuis la dérive. **Aucun patient n'a été auto-assigné à l'agenda à
ce jour.** Ce qui est en cause est le **prochain** onboarding, pas les dossiers
existants — ce qui laisse le temps de faire le lot proprement, et ne le rend pas
moins requis : ce que [[D-025]] protège, c'est précisément qu'aucun agenda ne
parte sans décision praticien. Le retrait est **requis, pas à arbitrer**.

## Diagnostic

Le pack de base (« Base de consultation », `PACK_-bG21yeIvVYRhrdlYuWIMnFz`,
`par_defaut = true`, assigné à chaque onboarding) porte **6 qids**, dont
`Q_ALI_09`. Tout le reste du diagnostic dépend d'une seule variable.

### « Suspendu » est un état de drapeau — donc le diagnostic dépend de l'environnement où on le lit

`Q_ALI_09` est déclaré `actif: isAgendaAlimentaireEnabled()`
(`web/src/lib/questionnaires-catalog.ts:83`), fonction qui lit
`process.env.WN_AGENDA_ALI` (`web/src/lib/agenda-alimentaire/featureFlag.ts:36-37`),
et `IDS_SUSPENDUS` est **dérivé** de `!q.actif`
(`web/src/lib/questionnaires-catalog.ts:518-520`). L'appartenance de `Q_ALI_09` à
`IDS_SUSPENDUS` **bascule avec le drapeau** — et avec elle, tout ce que la chaîne
fait de sa présence dans le pack.

Or les deux environnements ne sont pas dans la même position :

- **En production, `WN_AGENDA_ALI` est ALLUMÉ** depuis le 2026-08-05 (variable
  créée côté Vercel en Production ce jour-là ; pilote `PAT006` lancé,
  `RUNBOOK-allumage-drapeau.md:227-231` ; `docs/DECISIONS.md`). `Q_ALI_09` y est
  donc **`actif`**, et **hors** de `IDS_SUSPENDUS`.
- **Dans le dépôt, il est ÉTEINT** — c'est la position par défaut, donc celle du
  CI, du développement local et des bancs. `Q_ALI_09` y est **suspendu**.

**Les deux lectures ne décrivent pas le même défaut :**

| | production — drapeau **allumé** | dépôt par défaut — drapeau **éteint** |
|---|---|---|
| `Q_ALI_09` ∈ `IDS_SUSPENDUS` | **non** | oui |
| onboarding portail (`valider/route.ts:144-152`) | **ne l'écarte pas** : le pack part **en entier** — l'agenda est **auto-assigné, sans décision praticien** | l'écarte : le pack est **amputé en silence**, avec un `ASSIGNATION_PACK_INSTRUMENT_SUSPENDU` |
| retrait par le praticien | **possible aujourd'hui** : l'instrument est `actif`, il figure dans la liste principale de la modale d'édition et s'y décoche | **impossible** : les deux portes ci-dessous ferment le geste |

**C'est la colonne de gauche qui motive l'urgence, et c'est la pire des deux.**
Le défaut vivant en production n'est pas l'amputation silencieuse — c'est son
inverse : **le prochain patient onboardé reçoit l'agenda alimentaire sans qu'aucun
praticien ne l'ait décidé**, exactement ce que [[D-025]] protège. Une amputation
prive d'un instrument ; une auto-assignation en impose un.

**La colonne de droite n'est pas hypothétique pour autant** : c'est ce que voient
le CI, les bancs et toute session de développement, c'est ce qui redeviendra vrai
au moindre retour arrière du drapeau (`RUNBOOK-allumage-drapeau.md`, « Retour
arrière »), et c'est la situation **permanente** de tout instrument réellement
suspendu, sans drapeau pour le rallumer. Le geste de retrait doit donc exister
même une fois `Q_ALI_09` parti du pack.

### Les deux portes — vraies quand le drapeau est éteint

Chaîne vérifiée ligne à ligne au cadrage du 2026-08-07, **drapeau éteint**
(position du dépôt). C'est la classe « un geste **nécessaire** est impossible » —
pas un défaut de ligne, un défaut de chaîne.

1. **Porte.** `web/src/app/api/praticien/questionnaires/route.ts:35` filtre
   `.filter(q => q.actif)` (le `:34` porte `const questionnaires =
   QUESTIONNAIRES_CATALOG`) → aucune case à cocher n'expose un qid suspendu au
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
4. **Conséquence, pas porte, et seulement drapeau éteint.**
   `web/src/app/api/portail/valider/route.ts:144-152` ampute alors le pack à
   chaque onboarding, avec un `ASSIGNATION_PACK_INSTRUMENT_SUSPENDU`. **Drapeau
   allumé — le cas de la production —, ce maillon ne fait rien** : le pack part
   entier, agenda compris.

Dans les deux lectures, une même chose reste vraie et suffit à motiver le lot :
**le pack de base ne devrait pas porter `Q_ALI_09`**, et le praticien doit
pouvoir retirer d'un pack un qid suspendu quelle que soit la position du drapeau
qui le suspend.

## Résultat observable

**Statut au 2026-08-07 : une moitié faite, une moitié due.** Le geste de donnée
est **différé après le merge de cette PR** (décision utilisateur du 2026-08-07).
**Le lot n'est donc pas livré** — seule sa moitié *code* l'est, et le risque
d'auto-assignation décrit ci-dessus **court jusqu'au geste**.

- **RESTE DÛ** — Le pack de base ne porte plus `Q_ALI_09` : lecture SQL de
  production, `packs` et `pack_questionnaires` alignés à 5 qids. Non fait ; le
  geste est différé après merge.
- **FAIT** — un geste praticien existe pour ôter d'un pack un qid de
  `IDS_SUSPENDUS` : bloc dédié dans la modale d'édition
  (`web/src/components/PacksPanel.tsx:635-649`), bâti sur l'instantané des qids
  du pack pris à l'ouverture (`:69`, `:187`), et route
  `GET /api/praticien/questionnaires` qui sert désormais `suspendus` à part des
  actifs (`web/src/app/api/praticien/questionnaires/route.ts:32`, `:48`, `:68-72`).
  Cette moitié-là est **indépendante du drapeau** : elle vaut pour tout
  instrument suspendu sans drapeau pour le rallumer.
- **RESTE DÛ** — **Aucun onboarding n'auto-assigne l'agenda alimentaire.** C'est
  l'énoncé qui tient dans les deux positions du drapeau, et c'est celui qui
  compte en production, où `WN_AGENDA_ALI` est allumé
  (`../../2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:227-231`).
  Tant que le pack de base porte `Q_ALI_09`, le chemin d'assignation sans clic
  praticien existe. Fait rassurant et daté, à ne pas confondre avec une
  fermeture : **0 assignation créée depuis le 2026-08-06 18:02** — le risque est
  **prospectif**, il porte sur le **prochain** onboarding.
- Corollaire, vrai **seulement drapeau éteint** :
  `ASSIGNATION_PACK_INSTRUMENT_SUSPENDU` ne se déclenche plus sur l'onboarding du
  pack de base. Drapeau allumé, cet événement n'a jamais été émis pour
  `Q_ALI_09` — ne pas prendre son absence pour une preuve.
- **RESTE DÛ** — Le prérequis du runbook `WN_AGENDA_ALI`, **cassé après coup le
  2026-08-06** sur un pilote déjà lancé, est de nouveau satisfait :
  `SELECT nom, par_defaut, actif FROM packs WHERE 'Q_ALI_09' = ANY(qids);` rend
  **0 ligne** (`../../2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:44-53`).
  Il en rend **1** aujourd'hui.

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

- [x] Rejouer les quatre maillons du Diagnostic sur le dépôt, **drapeau éteint**
      (position par défaut) — **deux portes** (1 et 2), une **non-porte** (3) et
      une **conséquence** (4) — pour confirmer qu'aucun n'a bougé depuis le
      2026-08-07. Aucun n'a bougé ; la non-porte est confirmée
      (`web/src/app/api/praticien/packs/route.ts:307`).
- [x] Ouvrir le geste (UI + route), avec banc sur chacune des deux moitiés.
- [x] Lecture SQL avant geste : qids du pack de base, `pack_questionnaires` —
      **6 qids**, `Q_ALI_09` inclus ; 0 assignation créée depuis le
      2026-08-06 18:02.
- [ ] **Geste praticien en production : retirer `Q_ALI_09`. RESTE DÛ — différé
      après le merge de cette PR (décision utilisateur du 2026-08-07).**
      **`WN_AGENDA_ALI` y étant allumé, l'instrument est `actif`** : il se décoche
      depuis la liste principale de la modale, pas depuis le bloc « suspendus » —
      lequel ne s'affiche qu'aux environnements où le drapeau est éteint.
- [ ] **Lecture SQL après geste, consignée dans « Résultats ». RESTE DÛ** — elle
      ne peut pas précéder le geste.
- [x] Réaligner `seed.ts` et poser le fragment `changelog.d/`. `seed.ts` était
      **déjà** aligné sur l'état visé (`web/prisma/seed.ts:270` porte 5 qids,
      sans `Q_ALI_09`) : abstention constatée sur pièce, pas oubli. Fragment posé
      (`changelog.d/2026-08-07-packs-retirer-instrument-suspendu.md`).

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

**Le lot n'est pas livré.** Sa moitié *code* l'est ; sa moitié *donnée* — retirer
`Q_ALI_09` du pack de base en production — reste due, **différée après le merge**
(décision utilisateur du 2026-08-07). Tant qu'elle n'est pas faite, le prochain
patient onboardé reçoit l'agenda alimentaire sans décision praticien, ce que
[[D-025]] protège.

### Validations

- **T1** `npm run check` : **vert** (code 0).
- **T3** `npm run test:worktree` : **vert**, **1 min 47 s**, Chromium + WebKit sur
  build de production.
- `bash scripts/check_no_secrets.sh` : **vert**.
- `node scripts/wn-campaign-audit.mjs` (codes bloquants) : **vert**.

### Revue adversariale

**`wn-reviewer` : GO.** Cinq mineurs corrigés ; **deux gardes posés après elle** —
ils ne viennent pas de la revue, ils viennent de la mutation.

- **M1 — l'instantané est réécrit à chaque ouverture, jamais accumulé.**
  `web/src/components/PacksPanel.test.tsx:314`, cas (d) : rouvrir la modale sur un
  **autre** pack après un enregistrement ne conserve pas le suspendu du précédent.
  Sans lui, un suspendu deviendrait **ajoutable** là où il ne l'était pas.
- **M2 — un suspendu ne compte pas comme un questionnaire envoyé.**
  `web/src/components/PacksPanel.test.tsx:351-385` : `titreParId` reste bâti sur
  les **actifs seuls**, donc le compteur de ligne, le badge « Non envoyé » et le
  libellé du `<select>` d'assignation annoncent 1 et non 2. Y fondre `suspendus`
  « pour afficher un titre » rétablirait le contresens « 6 annoncés / 5 envoyés »,
  et **aucun autre banc ne rougirait**.

**Le résultat qui compte est un banc muté, pas un banc écrit.** La première
version du banc M1 (réouverture de la modale) **restait verte** sous la mutation
`setEditQidsInitiaux(prev => new Set([...prev, ...pack.qids]))` : fermer la modale
par « Fermer » réinitialise l'instantané, si bien que la fuite ne pouvait pas se
produire dans le scénario testé. Le vrai chemin de fuite est la fermeture **par
enregistrement** — `onSubmitEditPack` ne réinitialise pas l'instantané. Banc
réécrit sur ce chemin, mutation rejouée : **rouge**
(`web/src/components/PacksPanel.test.tsx:307-314` pour l'énoncé de la mutation,
`:314` pour le cas (d)). **Un banc non muté aurait protégé la mauvaise porte** :
il aurait certifié une fermeture qui n'est pas celle par laquelle le défaut passe.

### Trois abstentions, confirmées par la revue

- `PATCH /api/praticien/packs` **acceptait déjà** le retrait : le diff `ajoutes`
  est calculé contre l'existant (`web/src/app/api/praticien/packs/route.ts:307`),
  donc la garde `IDS_SUSPENDUS` ne mord que sur les ajouts. Rien à changer.
- `web/prisma/seed.ts:270` **porte déjà 5 qids**, sans `Q_ALI_09` : aucun
  réalignement à faire.
- Le banc réclamé sur `portail/valider` **existe déjà** —
  `web/src/app/api/portail/valider/route.test.ts:103-115` asserte qu'aucun
  `ASSIGNATION_PACK_INSTRUMENT_SUSPENDU` n'est émis quand aucun instrument du pack
  n'est suspendu, et l'assertion porte sur le **code d'événement**, pas sur
  « aucun warn ».

### Ce qui reste dû, et l'ordre

1. Merge de la PR.
2. Geste praticien en production : ouvrir « Questionnaires & packs », éditer
   « Base de consultation », décocher `Q_ALI_09` **depuis la liste principale**
   (le drapeau étant allumé, l'instrument y est `actif`), enregistrer.
3. Deux lectures SQL de contrôle, à consigner ici :
   `SELECT nom, par_defaut, actif, qids FROM packs WHERE 'Q_ALI_09' = ANY(qids);`
   — attendu **0 ligne** ; et le compte de `pack_questionnaires` du pack de base
   — attendu **5**.
