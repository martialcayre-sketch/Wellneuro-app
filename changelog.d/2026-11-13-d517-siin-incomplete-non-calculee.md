### Enquête alimentaire SiiN incomplète : score non calculé, consigne `synthese-v35` (D-517, t49, 2026-11-13)

Arbitrages `20261113-2120-a` à `2124-a` du 2026-11-13. Applique D-403 §6 et solde son §7 (a). Aucun seuil, aucun
point, aucune bande ne change ; aucune migration ; version du score « Mon équilibre » inchangée (`v17`) ; 0 passation
SiiN partielle en production le 2026-11-13.

- Moteur `seuils_points` (`questions.ts`, étape `D-517` de l'instantané `seuilsCatalogue`) : un seul des 57 items
  manquant rend l'enquête non calculée — `scored: false`, ni total, ni bande, aucun prorata. Les catégories
  descriptives restent servies avec leurs comptes ; le sous-score du besoin 3 tombe avec le total.
- Texte validé par le responsable, à la fiche patient (sous le titre de la passation) et à l'export (champ « Score ») :
  « Enquête alimentaire incomplète : score non calculé. »
- Consigne `synthese-v35` : un paragraphe sur `scored: false` et `raisonNonScore` à la racine d'un questionnaire —
  reprendre le texte, aucune bande, aucun total reconstitué.
- En aval : ni besoin 1, ni besoin 3 (motif `recueil_incomplet`), ni rideau T0 ; l'orientation ne tient plus la
  passation pour une réponse et repropose l'enquête.
- `release-db` sans migration au merge (banc d'orientation sous `web/src/lib/clinical/`).
