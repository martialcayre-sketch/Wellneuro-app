# Handoff — 2026-08-07 — LOT-00 dettes-packs clos sur sa moitié donnée, campagne agenda débloquée

Branche `worktree-lot00-cloture-et-agenda-debloque`, base `origin/main` =
`322f4d26`. Arbre sale, rien de committé à l'écriture de ce fragment. Clôture
**purement documentaire** : aucun fichier sous `web/`, aucun SQL, aucune
migration.

## Objectif

Consigner le geste de production du LOT-00 — fait par le praticien, vérifié par
lecture SQL — et en tirer les deux conséquences : le lot est **livré sur ses
deux moitiés**, et la campagne `2026-08-04-agenda-alimentaire` n'est **plus
bloquée**.

## Les quatre lectures qui closent le lot

Geste praticien du **2026-08-07 à 15:46** (`packs.updated_at = 2026-08-07
15:46:34.011`), après le merge de la PR #608 :

1. « Base de consultation » porte **5 qids** — `Q_MOD_03, Q_MOD_01, Q_INF_03,
   Q_SOM_09, Q_ALI_01` —, **identiques qid pour qid à `web/prisma/seed.ts:270`**.
   La dérive du 2026-08-06 est refermée ; le seed redevient le reflet de la
   production, ce qui valide *après coup* l'abstention constatée au cadrage.
2. `pack_questionnaires` du pack de base : **5 lignes**, `ordre` `[0,1,2,3,4]`,
   sans trou — `syncPackToRegistry` a purgé puis reconstruit.
3. Prérequis du runbook satisfait :
   `SELECT ... WHERE 'Q_ALI_09' = ANY(qids)` rend **0 ligne**
   (`2026-08-04-agenda-alimentaire/RUNBOOK-allumage-drapeau.md:44-53`). Il en
   rendait **1** depuis le 2026-08-06 18:02.
4. **0 assignation créée** entre la dérive (2026-08-06 18:02) et le retrait :
   aucun patient touché. 1 seul pack actif, inchangé.

## Décisions

- **LOT-00 passe à `livré`** sur ses deux moitiés — code (PR #608) et donnée
  (2026-08-07 15:46). `scripts/wn-campaign-audit.mjs:39-42` lit le préfixe
  normalisé `livre` comme « clos ».
- **La campagne `2026-08-07-dettes-packs-residuelles` reste ouverte** : son
  `LOT-01` (E2E orientation → file d'envoi) est `à_faire`. `lot_courant` passe de
  `LOT-00` à `LOT-01`, qui existe (`lots/LOT-01-e2e-orientation-file.md`) —
  sinon `active_lot_missing`.
- **`state.active_lot` passe lui aussi à `LOT-01`** (arbitrage hors consigne
  littérale) : le laisser sur un lot clos aurait fait annoncer `LOT-00` par la
  vue générée.
- **`LOT-06` de la campagne agenda n'est PAS ouvert.** La campagne pose
  elle-même la porte (`2026-08-04-agenda-alimentaire/CAMPAGNE.md:123` et `:151` :
  « pas avant un recueil suffisant pour calibrer (clôture des 21 jours) ») et le
  recueil en est à **2 journées, toutes deux du 2026-08-05, sur 1 assignation**.
  Aucun fichier de lot créé ; son `lot_courant` reste `LOT-08`, qui existe — le
  mettre à `aucun` déclencherait `inflight_without_active_lot`, bloquant en CI.

## Fichiers modifiés

- `docs/claude/campagnes/2026-08-07-dettes-packs-residuelles/lots/LOT-00-pack-base-instrument-suspendu.md`
  — statut, « Résultat observable » (3 × RESTE DÛ → FAIT), 2 cases cochées,
  « Résultats » (quatre lectures) ; datation de la phrase du « But ».
- `.../2026-08-07-dettes-packs-residuelles/CAMPAGNE.md` — `lot_courant`, ligne du
  tableau (titre inchangé), 3 cases de « Done de campagne », dépendance agenda.
- `.wn/state.json` — `next_action`, `active_lot`, `last_completed_lot`, `git.*`,
  et le `status` de `parallel_campaigns[2026-08-04-agenda-alimentaire]`, dont la
  phrase « BLOQUÉE — l'allumage… est interdit » était **périmée**.
- `changelog.d/2026-08-07-pack-de-base-sans-agenda-alimentaire.md` (neuf) — celui
  de #608 portait le geste, celui-ci porte l'effet.
- `docs/claude/SESSION_LOG.md`, ce handoff.
- Régénéré : `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` (vue, jamais éditée à la
  main).

## Validations exécutées

`node scripts/wn-campaign.mjs sync`, `node scripts/wn-campaign-audit.mjs`
(codes bloquants), `bash scripts/check_no_secrets.sh`, et une relecture
`JSON.parse` de `.wn/state.json`. Aucun palier T1/T2/T3 : **rien sous `web/`**,
donc rien à type-checker ni à rejouer.

## Problèmes ouverts

- **Le recueil de l'agenda est arrêté au premier jour** : 2 journées, toutes deux
  du 2026-08-05, 1 assignation. La campagne n'attend plus un correctif, elle
  attend des données que personne ne saisit. C'est le point à porter.
- **Rien ne re-vérifie un prérequis de runbook après l'allumage**, et aucun
  contrat SQL de `web/prisma/checks/` n'assère « aucun pack actif ne référence un
  qid de `IDS_SUSPENDUS` » — l'assertion qui aurait mordu le 2026-08-06 à 18:02.
  Sans lot ouvert ; un tel contrat doit se lire dans la position du drapeau de son
  environnement, sinon il rougit en CI sur un état sain en production.
- `R2-SOM-05` propose Horne sans la porte `RYTHME_BIOLOGIQUE` de `R2-SOM-03` —
  décision praticien.

## Prochaine action exacte

Ouvrir le **LOT-01** de `2026-08-07-dettes-packs-residuelles` : parcours E2E
orientation → file d'envoi → envoi → déduplication, patient fictif, envoi de mail
neutralisé. **Couverture actuelle nulle.** Question à trancher à l'ouverture :
asserter l'envoi du mail récapitulatif, ou s'arrêter à l'assignation créée.
Depuis `main` après merge : `node scripts/wn-cycle.mjs --appliquer`.

## Interdits encore actifs

Aucune migration Prisma, aucune écriture SQL — la production ne se corrige que
par l'UI praticien. Pas de secret. Patients fictifs limités à Sophie Nicola,
Jennifer Martin, Michel Dogné. `ACTIVE_CAMPAIGN.md` ne s'édite jamais à la main.
La garde `IDS_SUSPENDUS` sur les qids **ajoutés** ne s'affaiblit pas. E2E
exclusifs au Mac, jamais deux runs en parallèle.
