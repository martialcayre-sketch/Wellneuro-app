### Refonte visuelle 5.0 — V14, conformité à la maquette de référence (2026-07-22)

Le propriétaire a montré, copies d'écran à l'appui, que la référence du
chantier était la mauvaise : l'app suivait la maquette du dépôt (18/07,
métriques conservées, rail repliable) alors que la référence est l'artifact
« WellNeuro 5.0 — La Spirale ». Alignement complet :

- **Rail** : étendu par défaut (252 px, repli mémorisé), brand « WellNeuro ·
  Horizon 5.0 », groupes exacts — La Spirale (Le Fil du jour avec **compteur
  réel** de cartes, Fiche-trajectoire, Consultation copilote,
  Correspondance), Héritage 4.0 — inchangé (tags « 4.0 »), Réglages.
  Fiche-trajectoire s'allume sur les fiches, Questionnaires & packs sur la
  liste — même page, deux lectures.
- **Accueil** : métriques « le cabinet en un coup d'œil » **supprimées**
  (décision propriétaire) ; eyebrow daté « Interface ambiante », H1 « Le Fil
  du jour », sous-titre de la maquette ; Fil en panneau « Aujourd'hui » avec
  compteur mono, cartes à bouton d'action + pill « Pourquoi maintenant : … » ;
  colonne « Principe 5.0 ».
- L'artifact de référence est versionné
  (`docs/claude/propositions/2026-07-15-wellneuro-5-0-spirale/maquette-artifact-reference.html`).

Écarts documentés, jamais inventés : « Météo d'adhésion » attend un agrégat
réel des signaux par patient (SP-MET, lot suivant) ; badge Correspondance
absent faute de donnée. E2E mis à jour dans le même commit (en-têtes,
Fiche-trajectoire au singulier, attente du Fil sans métriques).
