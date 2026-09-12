---
id: "LOT-03"
titre: "ecran-du-journal"
statut: "livré (2026-09-12)"
dépend_de: "LOT-02"
---

# LOT-03 — L'écran : « Ce qui s'est passé dans votre dossier »

## But

Donner au journal sa place sur l'accueil du portail, **après** l'étape du moment,
sans reconstruire le hub empilé que l'écart `E11` a fait démonter.

## Résultat observable

- Un bloc **replié par défaut, déplié s'il y a du neuf**.
- **Aucun décompte dans le titre**, contrairement au bloc qu'il remplace.
- Le **jour affiché est celui de Paris**.
- Tant que `WN_PORTAIL_JOURNAL` est éteint, « Depuis votre dernière visite »
  reprend sa place.

## Hors périmètre

**Le retrait de `portail-visite.ts`.** Il reste le filet du nouveau bloc jusqu'à
la mise en service. Le retirer avant enlèverait au patient le peu qu'il a.

## Preuves

**T1 vert. T2 verte. Quinze mutations jouées, quinze mutants tués.**

## Ce que la passe de mutation a trouvé, et qui n'était pas prévu

**Deux bouts de code qu'aucune mutation ne pouvait tuer** — et qui ont donc été
retirés :

1. Un **effet de montage doublant `onToggle`** : la spécification HTML fait
   naître un `toggle` chaque fois que `open` est posé, y compris par React au
   premier rendu. J'ai d'abord cru à un trou de banc et tenté une assertion
   synchrone pour séparer les deux chemins ; elle a survécu aussi.
2. Une garde **`if (event.currentTarget.open)`** : le premier `toggle` est
   nécessairement une ouverture.

## Écart assumé

Un navigateur qui n'émettrait pas ce `toggle` laisserait le repère immobile : le
journal se rouvrirait à chaque visite — visible, gênant, sans perte de donnée.
