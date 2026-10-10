---
id: "LOT-06"
titre: "Suites de la mesure de référence — rappel après la première nuit, clôture courte, export"
statut: "terminé (2026-10-09, #1372) — effet lu avec le LOT-02 le 2026-10-29"
dépend_de: "LOT-02"
---

# LOT-06 — Suites de la mesure de référence

## But

Agir sur deux constats de la mesure de référence du 2026-10-09
([LOT-02](LOT-02-remesure.md)) et fermer un reliquat de relecture du LOT-04.
Interface seule : aucune mesure, aucun seuil, aucun contrat ne change ; aucun
envoi du serveur.

## Résultat observable

- **A — Le rappel après la première nuit.** Tant qu'une seule nuit est notée,
  la frise s'ouvre sur « Votre première nuit est notée. Pour y penser demain
  matin, vous pouvez ajouter un rappel à votre téléphone. », suivie de la carte
  du rappel (LOT-05). Dès la deuxième nuit, la carte reprend sa place en bas de
  page. Constat visé : 8 des 15 fenêtres échues s'arrêtaient après la première
  nuit. Proposé une fois, jamais insisté ; rien ne part du serveur
  (`REGISTRE_FRONTIERES.md`).
- **B — La clôture d'un agenda trop court.** Côté praticien, « Clôturer et
  agréger » sur un agenda de moins de sept nuits exploitables
  (`MIN_NUITS_AGREGATS`, seuil existant) demande confirmation et dit ce que le
  geste ferme : aucune moyenne calculée, plus aucune saisie du patient. Le
  geste reste possible. Constat visé : au moins six agendas transmis sans sept
  nuits.
- **C — L'export PDF.** Une métrique d'agenda non couverte s'écrit « Non
  calculé : données insuffisantes » (et non plus « recueil insuffisant ») : depuis
  le contrat v4, un agenda bien rempli peut laisser une mesure vide parce que le
  patient a répondu « je ne sais pas ». Le préambule le dit.

## Ce qui ne change pas

Seuils, classes, contrat `agenda-sommeil-v4`, barème, routes, base. La
clôture par le patient à la fin de sa fenêtre n'est pas touchée : on ne
l'alerte pas sur ce qu'il n'a pas noté.

## Lecture

L'effet de A se lira le 2026-10-29 avec le reste ; il ne s'isole pas des
autres lots (arbitrage du 2026-10-07).

## Validation

T1 complet ; suites de l'agenda, du panneau praticien (nouveau banc) et de
l'export ; CI.
