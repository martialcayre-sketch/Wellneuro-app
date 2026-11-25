# Handoff — 2026-11-25 — Refonte Lien / Empreinte, COM-2 : bandeau du hub patient dans `LienDecor`

## Branche et état du dépôt

- Branche `claude/refonte-lien-com2-hub-patient`, worktree neuf
  `.claude/worktrees/refonte-lien-com2`, créé sur `origin/main` `97e0d72d` fraîchement
  fetché ; `npm ci` et `npx prisma generate` joués avant tout test.
- Une PR. La session ne merge pas : « prête @<sha> » à l'intégrateur.
- Lot frère : DOC-21 (branche `claude/refonte-lien-doc21-signature-hub`), qui inscrit le
  choix dans [[D-481]] §1 bis ; ouvert en même temps (un DOC et un COM à la fois). PAT-3b
  (branche `claude/refonte-lien-pat3b-signature-hub-aaa4bc`) pose le bandeau après le
  merge de COM-2.

## Objectif

Ouvrir dans `LienDecor` l'emplacement du hub patient « Mon parcours » (U10), que COM-1
laissait fermé « faute d'élément nommé ». Cahier : `socle-commun.md`, « COM-2 » (ajouté
par DOC-21). Aucun écran ne l'emploie dans ce lot.

## Décisions prises

- **Prototype PAT-3 révisé et revalidé** (https://claude.ai/artifact/GgXXFgPGumAtdxZUB2cky7,
  rangée « PAT-3b », version 17). Réponses écrites du responsable le 2026-11-25 :
  « C, 76/88 px, DOC+COM », puis « 52/64 comme dessiné ». Variante C, `quiet-sweep.svg`
  en bandeau ; A (`linked-loops-muted`) et B (`alliance-arcs`) écartées. Les « 76/88 px »
  visaient la largeur de A et B ; la hauteur retenue est celle du dessin.
- **Troisième nature, `bandeau`** : pleine largeur du parent, dans le flux, hauteur fixe
  dans la primitive (`h-[52px] md:h-16`, la décision, pas l'appelant), `background-size:
  cover` calé à gauche, aucun `aspect-ratio` : recadré, jamais étiré. À proportions
  libres (nature `ornement`), le SVG de 1 200 × 180 aurait fait 101 px de haut au bureau.
- **Emplacement `hub-patient`**, un seul élément (`quiet-sweep`), facultatif dans les
  props comme `deux-voix`. Tout autre élément au hub, et le bandeau ailleurs, sont
  refusés au typage et ne rendent rien.
- Les classes de l'appelant passent par `classesAdmises`, comme pour un ornement :
  PAT-3b y met les marges négatives qui posent le bandeau bord à bord.

## Fichiers modifiés

- `web/src/components/ui/LienDecor.tsx` : élément `quiet-sweep`, emplacement
  `hub-patient`, nature `bandeau`, commentaire d'en-tête mis à jour ;
- `web/src/components/ui/LienDecor.test.tsx` : emplacement ajouté au banc de réception,
  test du bandeau, catalogue, refus ;
- `changelog.d/2026-11-25-refonte-lien-com2-hub-patient.md`, ce handoff.

## Validations exécutées

- Banc et garde de `LienDecor` : 43 tests verts (dont les six `@ts-expect-error` et les
  neuf refus à l'exécution).
- T1 (`npm run check:rapide`) vert ; T1 complet et T2 `--fast` : résultats dans la
  déclaration « prête ».
- Pas de constat à l'écran : aucun écran n'emploie le bandeau (PAT-3b le fera).

## Problèmes ouverts

- Aucun dans le périmètre. La pose et la mesure « première action visible sans défilement
  au téléphone » appartiennent à PAT-3b.

## Prochaine action exacte

Après le merge de DOC-21 et de COM-2 : PAT-3b avance sa branche sur `origin/main`, pose
`<LienDecor emplacement="hub-patient" />` en tête de la carte « Mon parcours »
(`MonParcoursAccueil.tsx`), puis fait le constat de l'en-tête de U10.

## Interdits encore actifs

- Un lot ne pose un décor que par `LienDecor` (§1 quater, gardé par le banc).
- Aucun texte d'interface sans acceptation mot pour mot ; aucun chiffre côté patient
  ([[D-333]]).
- Aucun drapeau, aucune modification clinique, de route, de garde ni de schéma.
- Production en lecture seule. Aucune identité ni aucun identifiant de dossier au dépôt.
