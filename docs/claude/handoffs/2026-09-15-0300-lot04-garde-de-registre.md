# Handoff — 2026-09-15 — LOT-04 (1/2) : la garde de registre du protocole

Cinquième livraison de la nuit, et **la première moitié du LOT-04**. Le lot se coupe
en deux PR, et l'ordre est doctrinal.

## Pourquoi la garde part AVANT la citation

`D-160` §4 interdit de livrer **la citation sans la garde** — « sinon la citation
devient le chemin sûr et la frappe le chemin sale : on aurait déplacé le défaut au
lieu de le fermer ». Elle **n'interdit pas l'inverse** : livrer la garde seule est
strictement plus sûr, et elle referme une **infraction en cours** plutôt que d'ajouter
une commodité.

## Branche et état Git

- Branche `lot04-citer`, partie d'`origin/main` à `3ca44c54`.
- Sur `main` cette nuit : #1103, #1104, #1106 (`D-188`), #1108 (`D-189`), #1109
  (LOT-02), #1110 (`D-190`, LOT-05).

## Ce qui est livré

- **`termeAnxiogene` sur les quatre champs servis au patient** — `purpose`,
  `followUpCriterion`, et `title` + `minimalPlan` de **chaque** action. Garder ce que
  le portail sert *aujourd'hui* (une seule action) ferait de la garde une dette au
  jour où il en servira trois. `idealPlan`, `rescuePlan` et les limitations internes
  ne franchissent aucune route patient : s'ils le faisaient, ce serait un chemin neuf,
  et il s'inscrirait à la carte.
- **Refus confirmable** (`409 REGISTRE_ANXIOGENE`), le terme nommé **tel qu'il est
  écrit** et le champ où il se trouve, avec un **jeton lié au texte** — préfixé par
  domaine, patron du document patient biologie : deux gardes qui hacheraient le même
  texte deviendraient interchangeables.
- **La commande d'écran, dans le même diff.** Un second geste explicite
  (« Enregistrer ce texte tel quel »), en registre d'avertissement et non d'erreur —
  la garde ne lit pas la négation, et « il n'y a ni urgence ni danger » est signalé
  comme le reste.
- **La ligne du chemin à la carte de `vocabulaire.ts`**, dans la PR qui le crée.

## Deux choses trouvées en chemin

1. **Le refus de registre partage son code `409` avec `version_stale`.** Sans
   branchement sur `reason`, un texte signalé aurait dit au praticien « rechargez
   l'historique » — ce qui n'y change rien et ne nomme pas le terme. Le piège est
   fermé, et commenté sur place.
2. **La soumission est mémorisée avant l'envoi** (`useRef`) pour être rejouée telle
   quelle à la confirmation. La rejouer depuis l'état du formulaire laisserait passer
   une frappe entre les deux clics, et le jeton — lié au texte — la refuserait sans
   dire pourquoi.

## Le banc de débranchement est vérifié, pas affirmé

La carte exige « un banc qui ROUGIT quand la garde est débranchée ». Mutation
appliquée (`termeAnxiogene` neutralisé dans la route), **trois bancs rouges
constatés**, puis restauration **depuis une copie** — jamais par `git checkout --`,
qui effacerait l'édition non commitée et fabriquerait un faux « mutant tué ».

## Validations exécutées

- T1 vert. **Sept bancs neufs** : cinq sur la route (refus nommant terme et champ,
  refus sur le plan minimal d'une action, jeton honoré, jeton refusé après retouche,
  aucun faux refus sur un texte neutre) et deux sur l'écran (bouton présent et
  appelant, bouton absent sans refus).
- T2 : voir le fil de la PR.

## Ce qui reste du LOT-04

**PR 2 — la citation** : les points 1 à 3 de `D-189`. Re-dérivation serveur du libellé
d'axe depuis `selected_priority_id` par `resoudreRegleSignee` ; citation de la tête de
l'objectif négocié actif **par identifiant** ; constat de provenance par comparaison de
textes (patron `provenanceVerifiee.ts`) ; et le geste de désignation à l'écran.

**Le LOT-03 reste bloqué** sur l'arbitrage de la forme de la vue patient.

## Interdits encore actifs

Inchangés : aucune identité patient réelle dans le dépôt ; production en lecture par
`scalingo run -d`, écriture par migration relue puis `release-db` approuvée ; pas de
`schema.prisma` ni de clinique/scoring sans demande explicite.
