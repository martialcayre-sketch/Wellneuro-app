### Accueil Observatoire LOT-01 — timeline du Fil, carte imminente, vues rapides (2026-07-23)

Alignement de l'accueil praticien sur la maquette « WellNeuro 5.0 — La
Spirale » (campagne `2026-07-23-accueil-observatoire`) :

- **Timeline horodatée** : le Fil passe de la pile plate à la grille
  heure | pastille-icône | carte avec axe vertical. L'heure affichée est la
  date réelle de l'événement source (heure si aujourd'hui, « hier », date
  courte sinon, « — » sans date) — rien d'inventé.
- **Carte imminente** : la tête du Fil porte un badge textuel « Maintenant »
  (jamais la couleur seule, A5-R1) et son action passe en bouton primaire ;
  elle reste écartable, et l'écarter promeut la suivante.
- **Résumé qualitatif** : l'en-tête du panneau « Aujourd'hui » dit
  « 1 signalement · 2 relectures · … » au lieu de « N carte(s) ».
- **Relectures agrégées par patient** : une carte « N relectures en attente »
  par patient remplace la carte par synthèse (l'agrégat global de la maquette
  est incompatible avec le refus G1, ancré patient). Nouvelle clé d'agrégat :
  un fait nouveau fait revenir la carte écartée ; les refus par-synthèse
  existants restent en base, inertes.
- **Bandeau « Vues rapides »** dans le header desktop : Fil du jour ·
  Trajectoire · Consultation · Correspondance (`aria-current` sur la vue
  active) — le rail reste intégral.
