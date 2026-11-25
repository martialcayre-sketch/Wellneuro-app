### Refonte Lien, COM-1 : primitive commune du décor `LienDecor` (2026-11-25)

Micro-lot commun rouvert par le responsable le 2026-11-25 (« Rouvrir COM-1 »), selon
[[D-481]] §1 bis et §1 quater. `components/ui/LienDecor.tsx` est désormais la seule porte
par laquelle un écran pose un fond ou un ornement du kit `web/public/wellneuro-lien/`.

- **Règles appliquées une fois** : nœud `aria-hidden` sans contenu ni rôle, sans
  pointeur ni sélection, masqué à l'impression, sans aucune classe de mouvement (celles
  de l'appelant sont retirées, comme celles qui rétabliraient le pointeur, l'impression ou
  l'empilement). Un fond reste sous le contenu (`-z-10`) ; un ornement prend sa place
  dans le flux.
- **Éléments acceptés** : connexion praticien (`login-calm`), entrée patient
  (`screen-mobile` sous 768 px, `screen-desktop` au-delà), dossier à deux voix
  (`divider-two-voices`), en-tête de fiche (`alliance-arcs` ou `linked-loops-muted`, choix
  au prototype PRA-3a), états vides réels (`nutrition-sprout` ou `neural-branches`) —
  choix du responsable du 2026-11-25. Le hub patient (U10) et l'ornement neuf du §1 ter
  n'entrent pas ; aucun motif `patterns/`. Tout autre couple est refusé au typage et ne
  rend rien à l'exécution.
- **Banc** (`LienDecor.test.tsx`) : réception de COM-1, SVG servis statiques et sans
  texte, et garde du §1 quater — aucun fichier de `web/src` ne cite un décor du kit hors
  de la primitive.

Aucun écran ne l'emploie encore : les poses viendront par les lots nommés. Aucun texte,
aucune route, garde, drapeau, schéma ni règle clinique ; aucun fichier de COM-0.
