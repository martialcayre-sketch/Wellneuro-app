---
id: "LOT-03"
titre: "Le cadran remplacé — sélecteurs au quart d'heure, soir / nuit / matin"
statut: "terminé (2026-10-08, #1363) — recette sur appareil faite le 2026-10-10 (Android, simulateur iOS)"
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
- Les horaires habituels restent une **proposition** qui ne vaut qu'au geste :
  un bouton « Comme d'habitude : hh:mm » par écran, pour la seule heure que le
  patient y voit (dès une nuit, arbitrages du 2026-10-07 et du 2026-10-08).
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

T1 complet, suites de l'agenda, et le job CI `e2e` : le spec de hit-test du
cadran (`agenda-sommeil-cadran.spec.ts`) est retiré avec lui et remplacé par
`agenda-sommeil-saisie.spec.ts`, qui note une nuit de bout en bout. Relecture
`wn-reviewer` avant la PR.

## Recette sur appareil (arbitrage du 2026-10-08)

Le comportement des listes natives n'est pas émulé par Playwright (roue iOS,
liste Android). Arbitrage : **recette après merge**, en production, avec un
dossier de test, avant d'annoncer le changement aux patients. À vérifier sur
iPhone et Android : la liste s'ouvre sur « Choisir », et fermer la roue sans
la tourner ne pose aucune heure.

**Faite le 2026-10-10** par le responsable, sur un dossier de test en
production (observé, au sens de `D-125`), sur un téléphone Android et, faute
d'iPhone, dans le simulateur iOS du Mac (le Safari d'iOS et sa roue) : fermer
la liste sans rien choisir laisse l'heure sur « Choisir ». Liste de recette
tenue hors dépôt.

## Choix d'exécution

- **Une liste native par heure** (`SelecteurHeure`), 96 quarts d'heure partant
  de 18 h le soir et de 3 h le matin, ouverte sur « Choisir » : aucune heure
  affichée d'office, donc plus de proposition qui ressemble à une réponse.
  Ni champ de texte ni glissement.
- Les horaires habituels ne se posent que par « Comme d'habitude », un bouton
  par écran : l'extinction le soir, le lever le matin. La première version
  remplissait le lever dès le soir, sur un écran où le patient ne le voyait
  pas ; le responsable a tranché pour un bouton par écran (2026-10-08).
- « Continuer » exige l'écran complet et nomme ce qui manque ; « Retour » garde
  les réponses. Un refus d'ordre ramène à l'écran qui porte l'heure à corriger.
