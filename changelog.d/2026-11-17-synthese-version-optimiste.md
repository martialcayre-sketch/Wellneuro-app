### Synthèse : version optimiste des gestes du praticien (file D, 2026-11-17)

- Les gestes sur une synthèse (PATCH `api/praticien/synthese` : enregistrer,
  valider, annoter, rejeter, vider) relisaient sous le verrou du dossier le
  statut et le modèle seulement (#2221, #2226). Un « enregistrer » concurrent
  qui laisse le brouillon brouillon passait donc inaperçu : un « valider »,
  un second « enregistrer » ou un « vider » lus avant lui l'écrasaient en
  silence. Démontré dans le code, sans occurrence observée (P3 de
  `wn-reviewer` sur #2221, P3-2 sur #2226 ; PR-Agent sur les deux).
- Sous le verrou, chaque geste, « vider » compris, compare désormais aussi
  `updatedAt` à sa lecture d'entrée. Changée, la synthèse est refusée en 409
  « La synthèse a été modifiée entre-temps. Rechargez-la avant de
  recommencer. », avec le code `synthese_modifiee`.
- L'écran des synthèses envoie la version (`updatedAt`) de la synthèse qu'il
  affiche, et garde celle que rend chaque geste réussi. Une version périmée
  est refusée avant tout verrou. Sur ce 409, l'écran relit la synthèse et
  l'affiche telle qu'elle est enregistrée ; le message dit que le texte non
  enregistré n'est pas conservé. Le détail se ferme si la synthèse a
  disparu.
- « Vider » une synthèse disparue entre la lecture et le verrou répond 409
  au lieu d'une erreur technique. Aucune migration : `updatedAt` existait.
- Limites connues :
  - changer l'e-mail d'un patient réécrit `updatedAt` sur ses synthèses
    (`api/praticien/patients`). Un écran ouvert prend alors un 409 sans que
    le contenu ait changé, et son texte non enregistré est remplacé. Garder
    une copie consultable de ce texte est renvoyé à un lot de suivi ;
  - la version est un horodatage à la milliseconde, pas un compteur.
