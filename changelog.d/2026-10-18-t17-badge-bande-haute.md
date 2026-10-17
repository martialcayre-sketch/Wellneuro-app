### Fiche patient : la bande de gravité la plus haute d'un sous-score se lit plus marquée que la bande inférieure, plus jamais en gris (t17, sans migration, 2026-10-18)

- **L'écart corrigé** (ticket #1368) : un sous-score dans la bande la plus
  haute de sa grille (couleur `dark`) s'affichait avec un badge gris neutre,
  moins marqué que la bande « danger » juste en dessous.
- **Désormais** : le badge est rouge, fond plein et texte blanc (variante
  `critical`, contraste 6,5:1). Une seule correspondance couleur → badge,
  `varianteInterpretation`, sert la fiche et le panneau « Mode de vie ».
- Présentation seule : aucune grille, aucun seuil, aucune bande ne change.
