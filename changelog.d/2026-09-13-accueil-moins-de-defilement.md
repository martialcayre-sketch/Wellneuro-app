### L'accueil praticien tient sur un écran : l'inbox remonte, les panneaux vides se replient (2026-09-13)

**Constat propriétaire.** Six panneaux de ~150 px empilés dans un rail de 300 px
poussaient le travail sous la ligne de flottaison : lire les réponses en attente
— le premier geste de la journée — demandait de défiler, et le cas courant de
chaque panneau est vide.

**Trois changements, aucune donnée touchée.**

1. **L'inbox questionnaires quitte le rail pour la colonne principale**, en tête,
   au-dessus de la timeline du Fil. Elle reste une ligne par patient et garde son
   tiroir de lecture : la décision du 2026-07-23 — inbox groupée plutôt que
   cartes « Reçu » fondues dans le Fil — n'est pas rouverte, seule sa PLACE
   change.
2. **Un panneau vide ne coûte plus qu'une ligne** (`PanneauRail`) : titre et état
   constaté restent visibles, le texte complet est à un clic dans un `<details>`.
   Rien n'est caché, contrairement à un rail à onglets qui aurait fait
   disparaître quatre signaux sur cinq. **Une lecture en échec ne se replie
   jamais** — « momentanément indisponible » n'est pas « il n'y a rien », et
   l'inbox ne se replie pas non plus tant que l'ancre a écarté des réponses.
3. **Le rail se dédouble au-delà de 1536 px** : sur un écran large, la colonne
   principale restait vide pendant que le rail débordait vers le bas. Deux
   colonnes de 300 px y divisent sa hauteur par deux ; sous `2xl`, les deux
   groupes se réempilent dans l'ordre d'aujourd'hui.

**Écarté.** Fondre les réponses reçues en cartes de la timeline (rouvrirait la
décision du 2026-07-23) ; un rail à onglets (tient sur un écran, mais rend
invisibles quatre panneaux sur cinq).
