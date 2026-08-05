# Handoff — 2026-08-05 06:20 — Plancher garanti (D-021)

## Où en est le lot

Terminé côté code, T1 et T3 verts (E2E compris, séquence CI complète en 2 min).
Branche `worktree-plancher-garanti`, basée sur `origin/main` (`aaecfe45`, #567).
**Reste à faire : ouvrir la PR et lire le code de sortie de
`node scripts/wn-attendre-ci.mjs <N>`.** Seul un `0` autorise à l'annoncer prête,
et `verify` doit avoir réellement tourné.

## Ce que le lot livre

Sur un recueil partiel, la bande atteinte par les seules réponses recueillies est
servie comme **plancher** — `bandePlancher`, champ distinct, `interpretation`
restant `null` — et la note de recueil la porte sous la forme « Au moins « X » ».
Trois moteurs : `sum`, `psqi`, `tfd` (racine **et** axes). Décision `D-021`,
fragment `changelog.d/2026-08-05-plancher-garanti.md`.

## Les trois choses à ne pas redécouvrir

1. **Le TFD avait déjà sa garde.** `#567` (`aaecfe45`) l'a livrée le 2026-08-04,
   racine et axes. Un cadrage fait sur un `main` local en retard d'un commit la
   croyait absente. Vérifier `git log origin/main` avant de scoper un lot voisin.

2. **`separerConduite` ne filtre rien sur un recueil partiel.** Il sort
   immédiatement quand `interpretation` vaut `null`. Tout objet neuf qui copie une
   bande (`{...bande}`) transporte donc son `protocol` hors de l'entonnoir unique.
   Cinq instruments éligibles en déclarent un sur leur bande la plus sévère :
   `Q_NEU_02`, `Q_GEO_03`, `Q_CAR_01`, `Q_SOM_04`, `Q_GEO_02`. Le lot le retire.

3. **Le sens d'une grille ne se déduit pas.** Ni du moteur, ni de l'ordre
   d'écriture des bandes, ni des couleurs. Trois grilles sont écrites en `min`
   décroissant (`Q_ALI_01`, `Q_ALI_02`, `Q_GEO_04`) et `Q_TAB_01` est écrit en
   `min` croissant tout en inversant le sens. D'où la déclaration explicite.

## La leçon, arrivée deux fois dans le même lot

**Une garde qui ne visite jamais l'état où le défaut existe est verte pour une
mauvaise raison.**

- `conduite.guard.test.ts` ne saturait que des passations **complètes** : il ne
  pouvait pas voir un champ qui n'existe que sur un recueil partiel. Il visite
  désormais aussi un partiel.
- Mon propre banc de propriété partait d'une passation **saturée** : la bande
  finale y était toujours la plus haute de la grille, donc supérieure à n'importe
  quel plancher — y compris faux. Il ne pouvait pas échouer. Refondé sur une bande
  intermédiaire, avec une **contre-épreuve par mutation** (forcer le plancher à la
  bande la plus sévère doit produire une violation).
- Même classe sur `monotonieMoteurs.guard.test.ts`, qui a d'abord laissé passer le
  défaut `Q2` qu'il existe pour attraper : une seule ligne de base ne faisait pas
  bouger la marche de `C2`. Trois lignes de base désormais.

## Ce qui reste ouvert

- **`R-GAS-01` n'est pas rallumée.** C'était l'intention écrite de la réserve de
  `D-020` ; `orientationEngine.ts` écarte toujours sur `missing > 0`. Le plancher
  est raconté (note, synthèse), pas agi. La réserve n'est close qu'à moitié.
- **Aucune surface praticien dédiée.** Le plancher de racine atteint la fiche par
  la note (`text-xs`, sous le titre) pendant que la colonne « Interprétation »
  affiche `—` ; le plancher d'**axe** du TFD n'atteint que le modèle de synthèse.
  L'IA en sait donc momentanément plus que la fiche déterministe.
- **Ce que le plancher n'atteint pas** : huit réponses maximales concentrées sur
  un seul axe du TFD ne produisent aucun plancher — `totalGlobalDepuisSousScores`
  rend `null` faute de dénominateur complet, et un plancher se lit sur un nombre.
- **La classe reste ouverte** sur `sum_decimal`, `count_threshold`, `ecab` et
  `bms_average` : aucune règle publiée ne les vise.
- **Portée nulle sur l'existant**, mesurée le 2026-08-05 (`execute_sql`) : aucune
  des 100 passations en base n'est partielle, et les trois PSQI réels sont complets
  avec `Q2` renseigné. Le lot est prospectif.

## Deux détails d'outillage

- La description de `bandePlancher` dans la consigne (`synthese-v15`) **n'est plus
  gardée par personne** : les deux gardes de champs ne balaient que des passations
  saturées, où aucun plancher n'existe. Elle ne tient que par l'empreinte et la
  relecture. C'est écrit dans le fichier.
- Un worktree neuf a besoin de `npx prisma generate` avant `npm run check`, sans
  quoi une trentaine d'erreurs TS pointent `@/generated/prisma` sans rapport avec
  le lot.
