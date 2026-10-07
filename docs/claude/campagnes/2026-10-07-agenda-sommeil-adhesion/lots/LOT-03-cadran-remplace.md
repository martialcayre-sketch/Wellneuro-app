---
id: "LOT-03"
titre: "Le cadran remplacé — sélecteurs au quart d'heure, soir / nuit / matin"
statut: "à faire (arbitré le 2026-10-07 : lancé sans attendre la re-mesure)"
dépend_de: "LOT-01"
---

# LOT-03 — Le cadran remplacé

## But

Remplacer le cadran circulaire (jusqu'à quatre poignées sur un anneau de 24 h)
par une saisie des heures que tout patient sait faire, et regrouper les
questions en trois moments (soir, nuit, matin). Interface seule : ce que
l'instrument mesure ne change pas.

## Résultat observable

- Chaque heure (mise au lit, extinction, réveil final, sortie du lit) se saisit
  par un sélecteur au **quart d'heure** (00, 15, 30, 45), utilisable au doigt
  et au clavier, sans glissement (alternative WCAG 2.5.7). Aucune valeur hors
  quart d'heure ne peut être produite : `RE_HEURE` (`nuit.ts`) reste le
  contrat, sans arrondi silencieux.
- Les horaires habituels restent une **proposition** qui ne vaut qu'au geste ;
  « Confirmer ces horaires » est conservé (dès une nuit, arbitrage du
  2026-10-07).
- Parcours en trois écrans courts — le soir, pendant la nuit, le matin — avec
  Retour et Continuer, réponses conservées en mémoire de la page tant qu'elle
  est ouverte (aucun brouillon persistant dans ce lot).
- Classes de réveil : le libellé reste, une **aide discrète** donne l'ordre de
  grandeur (« moins de 15 min au total »…) — arbitrage du 2026-10-07 ; le
  commentaire « sans minutes » de `libelles.ts` est réécrit en conséquence.
- Le récapitulatif reste `FriseNuits`, sans heure ni durée (règle
  anti-orthosomnie).

## Ce qui ne change pas

Contrat `agenda-sommeil-v3`, classes, réponses obligatoires, validation
serveur, fenêtre J / J-1, agrégats, barème. Aucune migration.

## Validation attendue

T1 complet, suites de l'agenda, et le job CI `e2e` (le spec
`agenda-sommeil-cadran.spec.ts` est à réécrire pour les sélecteurs). Relecture
`wn-reviewer` avant la PR.
