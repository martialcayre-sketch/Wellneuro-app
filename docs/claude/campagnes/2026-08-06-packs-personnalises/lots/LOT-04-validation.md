---
id: "LOT-04"
titre: "Clôture — E2E, changelog, vérification prod, reprise des dettes"
statut: "livré (2026-08-07)"
dépend_de: "LOT-03"
---

# LOT-04 — Clôture de campagne

## But

Rendre un verdict sur pièces : les quatre faits du « Résultat observable » de
`CAMPAGNE.md` sont vérifiés, ~~le parcours complet est couvert par E2E~~ —
**amendé le 2026-08-07** : arbitrage utilisateur, le parcours E2E part en lot
nommé (`../../2026-08-07-dettes-packs-residuelles/lots/LOT-01-e2e-orientation-file.md`),
sa couverture actuelle étant nulle et le « Hors périmètre » de ce lot excluant
tout développement neuf —, et l'activité primaire redevient la campagne dettes
5.0 (LOT-06), conformément à l'arbitrage du 2026-08-06.

## Résultat observable

- Les quatre faits de campagne vérifiés, chacun avec sa preuve (lecture SQL,
  banc, ~~E2E~~, log) — **amendé le 2026-08-07** : la preuve du fait 2 est
  **unitaire seulement**, l'E2E manquant partant en lot nommé
  (`../../2026-08-07-dettes-packs-residuelles/lots/LOT-01-e2e-orientation-file.md`) ;
  et le fait 3 ne dit pas « log » mais « banc d'invariant » (voir Résultats).
- Fragment `changelog.d/` de clôture posé (celui du LOT-02 couvre la partie
  clinique).
- Handoff de campagne écrit (`docs/claude/handoffs/`), **avant** la PR de
  clôture, jamais après le merge.
- État machine basculé : dettes 5.0 primaire (LOT-06), campagne packs close.

## Périmètre

- ~~T3 complet (`npm run test:worktree`) avec le parcours
  orientation → file d'envoi → envoi → déduplication.~~ — **amendé le
  2026-08-07** : T3 complet **a été rejoué et est vert** (voir Résultats), mais
  **sans** ce parcours, qui n'a aucun spec — c'est l'objet du lot nommé
  `../../2026-08-07-dettes-packs-residuelles/lots/LOT-01-e2e-orientation-file.md`.
- Vérifications production par lecture seule.
- `docs/claude/campagnes/2026-08-06-packs-personnalises/` : statuts finaux.
- `node scripts/wn-campaign.mjs activate 2026-08-05-cloture-des-dettes-wellneuro-5-0 --lot LOT-06`
  puis `sync`, et `wn-cycle.mjs --appliquer` depuis `main` après merge.

## Hors périmètre

- Tout nouveau développement — un manque découvert ici devient un lot nommé,
  pas une extension de ce lot.

## Fichiers probables

- `web/e2e/` (parcours praticien orientation → file)
- `changelog.d/`, `docs/claude/handoffs/`
- `.wn/state.json`, `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` (via scripts)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase.
- Pas de refactor hors lot.

## Étapes

- [x] Rejouer T3 et lire le résultat depuis le fichier de sortie.
- [x] Vérifier les quatre faits de campagne, preuve par preuve — verdicts en
      « Résultats », dont un **partiel** (fait 4).
- [x] Statuts de lots et de campagne mis à jour (« clos »).
- [x] Handoff écrit sur la branche vivante
      (`docs/claude/handoffs/2026-08-07-0930-packs-lot04-cloture.md`) ; PR de
      clôture à ouvrir ensuite.
- [x] Bascule d'activité vers `2026-08-05-cloture-des-dettes-wellneuro-5-0`
      LOT-06 : **faite dans cette PR** (`.wn/state.json` + `wn-campaign.mjs sync`,
      qui régénère `ACTIVE_CAMPAIGN.md`).
- [ ] Après merge, et **uniquement** cela : `node scripts/wn-cycle.mjs --appliquer`
      depuis `main` — il ne réconcilie que les champs `git.*`, puis relance `sync`.

## Tests

- T3 complet (E2E inclus — une suite Vitest verte ne prouve rien sur les
  parcours) ; **seul le CI rend verdict si une session voisine tourne**.

## Critères de done

- ~~CI vert lu~~ — **amendé le 2026-08-07** : T1, T3 et l'audit de campagnes
  sont verts en local et lus (section « Validations » ci-dessous) ; **le CI de la
  PR n'est pas encore lu**, la PR n'étant pas ouverte. Ce critère reste dû.
- Campagne close ; dettes 5.0 redevenue primaire.
- ~~Aucun écart `wn-etat-reel.mjs` sur les dimensions comparées.~~ — **amendé le
  2026-08-07** : `wn-etat-reel.mjs` n'a pas été lancé par ce lot ; l'audit de
  campagnes (`scripts/wn-campaign-audit.mjs`, code 0 avec les drapeaux du CI) est
  la seule vérification d'état exécutée.

## Résultats

**Clôture documentaire du 2026-08-07.** Ce lot ne touche aucun fichier de
`web/src/`, `web/prisma/` ni `web/e2e/`.

### Les quatre faits, avec leur preuve

| Fait | Preuve | Verdict |
|---|---|---|
| 1 — un seul pack actif | Lecture SQL de production du 2026-08-07 : table `packs`, 8 lignes, **1 seule** à `actif = true` — « Base de consultation » (`PACK_-bG21yeIvVYRhrdlYuWIMnFz`), `par_defaut = true`. Les 7 autres (Cardio-métabolique, Digestif, Florence 1, Humeur-neuro, Socle initial, Sommeil-chrono, Stress-burnout) à `actif = false`, historique intact. `questionnaire_packs` suit : 1 actif / 7 inactifs — le soft-delete s'est propagé au registre. | vérifié |
| 2 — orientation → envoi personnalisé | `OrientationPanel.tsx:195-196,345` : le geste offert est « Ajouter à la file d'envoi » ; le panneau ne porte plus d'assignation de pack. Bancs : `OrientationPanel.test.tsx`, `api/praticien/file-envoi/route.test.ts`, `api/praticien/file-envoi/envoyer/route.test.ts`. | vérifié **au périmètre du panneau seulement**, et **sans preuve E2E** — voir ci-dessous |
| 3 — aucune règle sans cible | `orientationRulesV1.test.ts:463` : aucune entrée de la table, **publiée ou non**, ne cible un pack. Table re-signée (sha `547119c6…`, 23/23 claims VALIDE), 6 règles re-ciblées. | vérifié **pour la cible pack seulement** — voir ci-dessous |
| 4 — le pack de base ne dérive plus | Lecture SQL du 2026-08-07 : le pack de base porte **6 qids** (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_SOM_09`, `Q_ALI_01`, `Q_ALI_09`) et `pack_questionnaires` (joint par `pack_questionnaires.pack_id = questionnaire_packs.id`) rend **6 lignes**, exactement alignées. Mais `packs.updated_at` = **2026-08-06 18:02:38.913**, et le LOT-00 mesurait **5 qids** en production le 2026-08-06 (`LOT-00-cadrage.md:90-91`, certifié « 8/8 packs en MATCH exact », « 5 lignes, ordres 0..4 sans trou » en `:119-123`). | **partiellement vérifié — dérive survenue et non prévenue** : voir ci-dessous |

**Deux restrictions écrites au fait 2**, arbitrées le 2026-08-07 :

- L'énoncé de campagne est **restreint au panneau d'orientation**. Le formulaire
  « Assigner un pack à un patient » de `PacksPanel.tsx:483-513`
  (`POST /api/praticien/packs/assign`) **reste en place** : survivance assumée,
  qui depuis le retrait ne peut plus proposer que « Base de consultation ».
- La preuve est **unitaire seulement**. Le parcours orientation → file d'envoi →
  envoi → déduplication n'a **aucune couverture E2E** ; ce manque devient un lot
  nommé plutôt qu'une extension de ce lot, conformément au « Hors périmètre »
  ci-dessus.

**Une restriction écrite au fait 3.** `orientationRulesV1.test.ts:463` ne porte
que sur `suggestion.packId` : ce qu'il rend impossible, c'est la perte de cible
**par pack**. Les **deux points de fail-closed silencieux** que [[D-030]]
nommait écartent, eux, des cibles **questionnaire**, et restent **non
instrumentés** — dette écrite, **sans lot** :

- `web/src/lib/clinical/orientationEngine.ts:627` —
  `if (suggestion.questionnaireId && estAdministrable(entree, suggestion.questionnaireId))` :
  si le prédicat est faux, `cibles` reste vide et **rien n'est journalisé**.
- `web/src/lib/clinical/orientationService.ts:262-264` — filtrage muet sur
  `estAdministrableParLaRoute(recommandation.cible.questionnaireId)`.

### Le fait 4 : la dérive du pack de base est survenue **pendant** cette campagne

Le verdict est **partiel**, et il se scinde en deux énoncés de sens opposé.

- **L'invariant « registre relationnel = legacy » tient.** 6 qids côté `packs`,
  6 lignes `pack_questionnaires` pour ce pack, relus le 2026-08-07 ;
  `check:pack-registry` vert, plus aucun
  `PACK_REGISTRE_REPLI_LEGACY ensembles_divergents`.
- **La non-dérive est démentie.** Le LOT-00 mesurait **5 qids** en production le
  2026-08-06 (`LOT-00-cadrage.md:90-91` : `Q_MOD_03, Q_MOD_01, Q_INF_03,
  Q_SOM_09, Q_ALI_01`) et certifiait, après backfill, « 8/8 packs en MATCH
  exact » et « 5 lignes, ordres 0..4 sans trou » (`LOT-00-cadrage.md:119-123`).
  La lecture SQL du 2026-08-07 en donne **6**, et `packs.updated_at` porte
  **2026-08-06 18:02:38.913** — horodatage qui ne borne que la **dernière**
  écriture sur la ligne, jamais celle qui a ajouté le qid. Ce qui est prouvé :
  `Q_ALI_09` est entré dans le pack de base **pendant la campagne**, **entre la
  mesure du LOT-00 (2026-08-06) et 18:02:38.913**, dernière écriture connue —
  donc après cette mesure et **avant** que le garde `IDS_SUSPENDUS` sur `PATCH`
  (LOT-03, #604, 2026-08-07) n'existe. La lecture consignée en [[D-025]]
  (« Lecture du 2026-08-05 : aucun des 8 packs ne le référence ») corrobore : la
  dérive est **postérieure au 2026-08-05**.
- **L'auteur du geste est indéterminé.** Aucune colonne d'audit ne le porte, et
  aucun document de campagne ne le mentionne. Ce n'est pas une omission de
  rédaction : la preuve n'existe pas.
- **Rattachement.** C'est nommément la réserve de [[D-025]] — « Aucun garde
  n'empêche `Q_ALI_09` d'entrer dans un pack » — et le **point 4 de [[D-030]]**,
  qui portait au LOT-03 le garde `IDS_SUSPENDUS` sur `POST`/`PATCH` précisément
  parce qu'« aucun des deux endpoints ne le vérifie aujourd'hui ». La seule
  dérive documentée du pack de base sur toute la période s'est produite pendant
  la campagne qui devait la fermer, et le garde est arrivé après elle.

### Deux lots ouverts, dans une campagne distincte

Campagne `2026-08-07-dettes-packs-residuelles` (`statut: à_faire`) :

- **LOT-00** — `Q_ALI_09` (instrument suspendu) est soudé au pack de base : aucun
  geste praticien ne permet de l'en ôter, et chaque onboarding ampute le pack en
  silence. Clinique, actif en production, le seul urgent. **Et il bloque une
  autre campagne** : `../../2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:44-53`
  fait de « Aucun pack ne référence `Q_ALI_09` » un **prérequis bloquant** de
  l'allumage de `WN_AGENDA_ALI` (`SELECT nom, par_defaut, actif FROM packs WHERE
  'Q_ALI_09' = ANY(qids);` — attendu 0 ligne ; la production en rend **1**, le
  pack de base). Le retrait n'est donc pas à arbitrer : il est **requis**.
- **LOT-01** — le parcours E2E orientation → file d'envoi → envoi →
  déduplication, couverture actuelle **zéro**.

### Cinq dettes nommées, **sans lot d'accueil** — et le compte a bougé deux fois

**Le décompte annoncé d'abord — « trois » — était faux.**
`../lots/LOT-03-integration.md:203-213` en datait **cinq** ; trois avaient
disparu du diff de clôture (l'`upsert` no-op du seed, le commentaire de
`schema.prisma`, la suture `suggestedPackSelection`). Rétablies ici, le compte
passait à six. Il redescend à **cinq** parce que la dette « seed à 5 qids » est
**rattachée au périmètre du LOT-00** de `2026-08-07-dettes-packs-residuelles`
(`lots/LOT-00-pack-base-instrument-suspendu.md`, section Périmètre) : le retrait
de `Q_ALI_09` du pack de base doit s'y refléter. Elle n'est donc plus sans lot.

**Piège de lecture, signalé par la revue** : LOT-03 nommait « `seed.ts` ne
répare pas un pack de base cassé » ; la première rédaction de ce lot nommait
« `seed.ts:270` porte 5 qids ». **Deux défauts différents sous le même mot
`seed`** — traiter le second ne traite pas le premier. Ils sont écrits
séparément ci-dessous et ci-dessus.

Les cinq suivantes sont écrites ici pour être retrouvées, et **délibérément
laissées sans lot** : aucune n'a d'effet clinique observable aujourd'hui, et
ouvrir un lot par dette latente reviendrait à rouvrir la campagne qu'on clôt. Ce
n'est pas un oubli.

1. **`prisma/seed.ts` ne répare pas un pack de base cassé** (libellé de
   `LOT-03-integration.md:208-209`) : `upsert` avec `update: {}`, no-op
   silencieux qui affiche pourtant « Pack par défaut créé ».
   `web/prisma/seed.ts:288-294` — `upsert({ where: { idPack }, update: {},
   create: PACK_BASE })` sous `if (!parDefautExistant)`, suivi de
   `console.log('Pack par défaut créé : …')`. Or
   `web/src/app/api/praticien/packs/route.ts:92-94` note que sans un pack à la
   fois `parDefaut: true` **et** `actif: true`, « tout onboarding rend 404 “Pack
   de base introuvable”, pour tous les patients, et l'UI n'offre aucun chemin de
   réparation ». C'est le **miroir** de la dette n° 3 : ni l'UI ni le seed ne
   réparent.
2. **`resolvePackQuestionnaireIds` ne lit jamais `questionnaire_packs.actif`**
   (`web/src/lib/consultation/packRegistry.ts:89-123`). Le retrait ne crée pas ce
   défaut : il vient d'**armer sa condition de déclenchement**, 7 lignes du
   registre sur 8 portant désormais `actif = false`. Piège pour le jour d'une
   bascule du registre en source primaire.
3. **Aucun chemin praticien ne réactive un pack.** `PATCH { actif: true }` est
   accepté par la route, mais aucun écran ne l'envoie : `PacksPanel.tsx` porte
   **quatre** appels mutants sur `/api/praticien/packs` — le `POST` de création
   (`:177-181`, qui envoie `nom`/`thematique`/`description`/`qids`), le `PATCH`
   d'édition (`:207-217`, payload `:210-216`, mêmes champs plus `idPack`), le
   `DELETE` de désactivation (`:238`) et le `PATCH { idPack, parDefaut }` du
   bouton « par défaut » (`:254-257`). **Aucun des quatre ne porte `actif`** —
   c'est cela, et non le seul `PATCH` d'édition, qui prouve qu'aucun écran ne
   réactive. Le composant porte un **cinquième** appel mutant, `POST
   /api/praticien/packs/assign` (`:281`), mais il vise **une autre route** : c'est
   le formulaire d'assignation nommé plus haut. Sept packs sont désactivés sans
   retour possible autrement que par appel API direct.
4. **Le commentaire de `web/prisma/schema.prisma:155-156` cite encore le pack en
   capitales** — « BASE DE CONSULTATION » —, la casse même qui avait tué le repli
   de `resoudrePackBase` (libellé de `LOT-03-integration.md:210-212`). Non
   corrigé : `schema.prisma` ne se touche pas sans demande explicite.
5. **La suture `suggestedPackSelection` est laissée inerte en place** (libellé de
   `LOT-03-integration.md:213`) : état déclaré et commenté mort en
   `web/src/components/PatientsPanel.tsx:902`, prop encore passée en
   `PatientsPanel.tsx:1033`, consommateur encore présent en
   `web/src/components/PacksPanel.tsx:80-106`. Plus rien ne l'alimente, donc plus
   rien ne l'observe.

### Validations

Lancées et **lues** le 2026-08-07, après cette rédaction :

- **T1 — `cd web && npm run check` : vert (code 0)**, audit de campagnes inclus.
- **Audit de campagnes — `node scripts/wn-campaign-audit.mjs` avec les drapeaux
  du CI : code 0**, 0 erreur, **1 warning préexistant**
  (`duplicate_lot_ordinal` sur `2026-07-11-refonte-ux-shell-3-0`).
- **T3 — `cd web && npm run test:worktree` : vert**, séquence CI complète en
  **1 min 54 s**, Chromium + WebKit sur build de production.
- **CI de la PR : non encore lu.** La PR de clôture n'est pas ouverte ; aucun
  verdict de CI n'est donc annonçable (`scripts/wn-attendre-ci.mjs`, code 0 seul
  autorisant l'annonce).
