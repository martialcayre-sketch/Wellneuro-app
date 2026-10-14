# Handoff — 2026-10-14 — D-281 étape 4, PR 1 : le verdict du praticien (F66)

## Branche et état Git

`d281-lot4-validation`, worktree `.claude/worktrees/d281-lot3-portail`, partie
d'`origin/main` 85b95dcc (lot 3 mergé, #1447). Un commit de lot ; PR ouverte
avec ce handoff. Aucune migration : la table des verdicts existe en
production depuis le lot 2 (#1408, constatée).

## Objectif

Étape 4 de `D-281` §6, en deux PR (arbitrage du 2026-10-14). PR 1 : la
surface où le praticien rend et corrige son avis d'implication sur un
signalement rattaché. PR 2 : règle amendée, garde de diffusion, banc de cas
fictifs réécrit, texte de l'avis rendu servi au portail.

## Décisions prises

Arbitrages du responsable du 2026-10-14, consignés en `D-281` §3 à §5 :
- deux PR (surface du verdict d'abord) ;
- après signature, l'attente bloque **la diffusion seule** : propositions et
  préparation restent ; le producteur de la règle livrée (inhibition totale,
  levée par statut) sera remplacé en PR 2 ;
- texte de l'avis rendu « impliqué » **signé** (§4) : « Votre praticien a
  examiné votre signalement : cet élément reste en pause. Ne le reprenez pas ;
  votre programme va être adapté. » ;
- « jamais à l'identique » consigné dans le verdict, sans contrôle machine
  de la version suivante — dette au plan §8.
Mise en œuvre : la correction nomme la tête de chaîne qu'elle supplante
(sinon 409) ; un avis identique à celui en vigueur est refusé ; pour « Je ne
sais pas » / « un autre produit », le praticien choisit parmi les éléments
désignables du programme VISÉ (version figée), ou « aucun » = non impliqué.

## Fichiers modifiés

- `web/src/lib/trust/verdictEffetIndesirable.ts` (pur) et son test ;
  `pauseEffetIndesirable.ts` (`verdictCourant` exporté, `amenagement`
  optionnel au type) ; `pauseEffetIndesirableServeur.ts`
  (`elementsDesProgrammesVises`) et son test.
- `web/src/app/api/praticien/trust/verdict/route.ts` (+ test) ;
  `web/src/app/api/praticien/trust/route.ts` (GET : `validation`, dates,
  `pauseServie`) (+ `route.validation.test.ts`).
- `web/src/components/ValidationEffetIndesirable.tsx` (+ test),
  `TrustPanel.tsx`.
- `docs/DECISIONS.md` (D-281 §3-§5), `docs/claude/PLAN_WELLNEURO.md` (F66,
  deux dettes au §8), `docs/claude/MATRICE_CONSOMMATION.md` (régénérée),
  `changelog.d/2026-10-14-d281-lot4-verdict-praticien.md`, `SESSION_LOG.md`.

## Validations exécutées

- T1 complet (`npm run check`) vert sur l'état final.
- T2 (`test:worktree -- --fast`) vert : 271 E2E, 3 sautés ; lancé avant les
  correctifs de revue (textes d'interface et tests), rejoués ensuite en
  ciblé (47 tests verts) et par T1 complet.
- Revue `wn-reviewer` : GO, aucun P0/P1 ; trois P2 corrigés (texte faux une
  fois la règle signée, programme sans élément désignable dit « illisible »,
  test de scoping trop lâche) ; tests manquants ajoutés.

## Problèmes ouverts

- Compteur `nonTraites` du GET compté par statut : un signalement rattaché
  « traité » sans avis en sort alors que l'attente demeure (§5). Aucun écran
  ne le consomme aujourd'hui ; à reprendre avec la garde de la PR 2.
- Reste de l'étape 3 pour la PR 2 ou la signature : signalement au format
  d'avant d'un patient majeur sans rattachement ; programme « indisponible »
  et actions non fermes encore désignables ; surfaces qui ignoreront la pause
  (fiches d'assiette, Boussole, aperçu praticien) ; aucun test d'intégration
  du trigger contre PostgreSQL réel.
- Accès au formulaire « Signaler un problème » peu visible au portail (routé
  au plan §8).

## Prochaine action exacte

CI par `node scripts/wn-attendre-ci.mjs <N>` → trois sorties de revue
CodeRabbit lues, verdict par commentaire → merge
(`--match-head-commit`) → déploiement constaté. Puis PR 2 sur une branche
neuve depuis `origin/main` : remplacer `construireFindingsEffetIndesirable`
(attente = signalement rattaché sans verdict en tête, statut ignoré), garde de
diffusion dans `api/praticien/protocoles/diffusion/route.ts` sous
`interruptionEffetIndesirableActive()`, texte de l'avis rendu au portail,
banc de cas fictifs réécrit sur la règle amendée.

## Interdits encore actifs

- Ne pas signer `SAFETY_EI_METADATA` avant l'étape 5 (acte du praticien).
- Textes du §4 mot pour mot (banc qui relit `DECISIONS.md`) ; le troisième
  texte s'y ajoute dès qu'il est servi.
- Aucune surface neuve pour un dossier mineur ou sans date.
- Aucune migration dans l'étape 4.
