### Refonte visuelle 5.0 — lot V10, écrans du portail (2026-07-22)

Les écrans du portail héritant du socle V9 par leurs primitives, ce lot
ajuste ce qui restait : titres d'écran à 26 px display (taille pcard de la
maquette), sous-titres remontés à 16 px, « Mon parcours » harmonisé, et le
dialogue de confirmation au radius 18 px + `shadow-pop`. Vérifié : plus
aucune couleur hors tokens ni titre hors display dans `app/portail` et
`components/patient` (hors legacy Mon équilibre, lot V11). Textes intacts.
