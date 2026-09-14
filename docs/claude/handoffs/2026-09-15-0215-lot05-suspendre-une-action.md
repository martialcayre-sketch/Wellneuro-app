# Handoff — 2026-09-15 — LOT-05 : une action peut attendre un bilan

Quatrième lot de la campagne « 5. Actions — le protocole assisté ». Il rend
déclenchable une boucle livrée depuis des semaines.

## Branche et état Git

- Branche `lot05-suspendre`, partie d'`origin/main` à `ddf3caf7`.
- Sur `main` cette nuit : #1103 (clôture `D-179`), #1104 (ouverture de campagne),
  #1106 (`D-188`), #1108 (`D-189`), #1109 (LOT-02).

## La décision, et pourquoi elle était due

Le dépôt se contredisait, et **aucun arbitrage consigné ne tranchait** :

- `ProtocolMiniBuilder.tsx` rendait le statut en lecture seule — « posé par la règle
  de décision, jamais saisi à la main (`D-056`) » ;
- l'en-tête de `e2e/biologie-arbitrage-revision.spec.ts` affirmait l'inverse —
  « c'est le praticien qui la pose » ;
- `D-130` disait « le geste d'écran reste dû » ;
- `FILE_ATTENTE.md` posait **deux chemins à arbitrer** sans les départager.

`D-190` amende `D-056` **dans un seul sens** : le praticien pose
`conditionnelle_biologie`, et **rien d'autre**. Le motif répond directement à la
crainte de `D-056` — « une intention pourrait naître *active* sans règle derrière » :
ce geste ne fait que **retenir**, jamais libérer, et l'arbitrage 5 de `D-056` disait
déjà qu'une intention conditionnelle n'est pas une recommandation.

Le chemin « brancher `D-056` » est écarté **avec son motif** :
`deciderIntentionAvantBiologie` refuse tout aujourd'hui (`clinical_rules` à 0 ligne,
catalogue d'alertes non publié, lien règle ↔ claim manquant, `D-133`). Le brancher
laisserait la boucle aussi indéclenchable qu'avant, en donnant l'illusion contraire.

## Ce qui est livré

- **Le geste** : une case « En attente du bilan biologique » par action + un champ
  « Ce qu'on attend ».
- **Le contrat suit le geste** : `version` n'est demandée que si au moins une action
  est suspendue ; sinon la soumission **reste en V1**. En V4, les actions non
  suspendues reçoivent `active` **explicitement** — le contrat l'exige sur chacune.
- **Deux refus locaux** : une attente sans cible est refusée en nommant l'action ;
  décocher retire l'attente **avec** le statut, le contrat refusant l'un sans l'autre.
- **Le défaut de sortie corrigé** : `reviserApresArbitrages` appelait `saveVersion`
  **sans `version`** — la soumission retombait en V1 et la route rendait
  `409 version_contrat_incompatible` sur une version active V4. La boucle n'était pas
  seulement sans amorce : **son geste de sortie était incompatible avec le contrat
  qu'il révise**.
- **`ArbitrageBiologiquePanel` reçoit son banc de composant** — seul de son répertoire
  à n'en avoir aucun, et l'oubli s'explique : il était inatteignable.

## Ce qui n'est PAS fait, et le cadrage le demandait

**Borner le geste aux lignes de la proposition de bilan** (`recommandé` / `à répéter` /
`conditionnel` à déclencheur rempli). La cible reste une **saisie libre**. Deux
raisons, et je les dis plutôt que de rétrécir en silence :

1. la proposition vit dans une **autre sous-vue** de la phase Actions ; la relier au
   constructeur est une plomberie qui dépasse ce lot ;
2. le contrat lui-même ne vérifie `waitFor.cible` contre **aucun catalogue** —
   « refusé plutôt que traduit » ne porte que sur le `type` de l'attente.

La cible reste praticien : `buildPatientProtocolView` sert une phrase d'attente fixe,
et jamais `waitFor.cible` recopiée. À reprendre avec **`BiologyCatalogRef`**, qui se
réexamine dans cette entrée de file et n'est pas livré.

## Validations exécutées

- T1 vert. Neuf bancs neufs au total (quatre sur la suspension, cinq sur le panneau).
- T2 : voir le fil de la PR.

## Prochaine action exacte

**LOT-04 — citer.** Il dépend de `D-189` (rendue) et du LOT-02 (mergé). C'est le plus
gros lot restant : recopie serveur, constat de provenance, garde de registre
confirmable **avec sa commande d'écran**, et la ligne à la carte de `vocabulaire.ts`.

**Le LOT-03 reste bloqué** sur l'arbitrage de la forme de la vue patient (`D-189`).

## Interdits encore actifs

Inchangés : aucune identité patient réelle dans le dépôt ; production en lecture par
`scalingo run -d`, écriture par migration relue puis `release-db` approuvée ; pas de
`schema.prisma` ni de clinique/scoring sans demande explicite.
