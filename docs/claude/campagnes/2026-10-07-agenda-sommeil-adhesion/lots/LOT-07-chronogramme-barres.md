---
id: "LOT-07"
titre: "Chronogramme praticien — les nuits redessinées"
statut: "en_cours (2026-10-10)"
dépend_de: "LOT-04"
---

# LOT-07 — Chronogramme praticien : les nuits redessinées

## Constat

Trouvé pendant la recette locale du 2026-10-10 (patients de fixture, base
locale, navigateur automatisé). Le chronogramme du panneau praticien affiche ses
axes, ses médianes et son infobulle, **mais aucune barre de nuit**, quelle que
soit la nuit.

Mesuré dans le navigateur : sur l'axe des heures inversé (le soir en haut),
recharts transmet à la forme d'une barre d'intervalle une hauteur **négative**,
`y` posé au pied (y 129, hauteur −88 pour 23:00 → 07:00). La forme écartait toute
hauteur ≤ 0 et ne dessinait donc rien.

Le filtre et l'axe inversé sont là depuis la création du chronogramme (#427,
2026-07-28). Statut au sens de `D-125` : *démontré dans le code et dans un vrai
navigateur* ; la production porte le même code et la même version de recharts,
mais l'écran de production n'a pas été observé depuis cette session.

## Correctif

`BarreNuit` remet le rectangle à l'endroit avant de le découper — `y` en tête,
hauteur positive. Les portions (endormissement en tête, éveil du matin en pied)
et le tiret gris de « je ne sais pas » ([[D-271]]) se posent alors où la
légende le dit. Aucun calcul, seuil, contrat ni libellé modifié.

## Validation

- Banc : `BarreNuit` exportée et rendue directement dans un `<svg>` (recharts ne
  rend rien en jsdom) ; hauteur négative, hauteur positive, tiret en tête,
  hauteur nulle. Les deux tests de hauteur négative échouent sur le code
  d'avant.
- Recette locale (non versionnée) : cinq agendas sur les trois patients de
  fixture — saisie v4 avec « je ne sais pas », refus d'ordre, première et
  deuxième nuit, fichier de rappel, agenda v3, panneau praticien, clôture
  courte confirmée, export PDF. Tout vert après correctif ; seule la barre
  manquait avant.

## Ce que la recette locale ne couvre pas

Les gestes propres au téléphone : roue native de l'iPhone, Safari (WebKit
absent du conteneur — Chromium au gabarit iPhone 13), ouverture du fichier de
rappel par Calendrier, Samsung Agenda ou Google Agenda, et sa sonnerie. Ils
restent à la recette sur appareil.
