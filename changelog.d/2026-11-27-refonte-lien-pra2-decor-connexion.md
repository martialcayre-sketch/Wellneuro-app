### Refonte Lien, PRA-2 décor : fond `login-calm` sur la connexion praticien (2026-11-27)

Lot issu du prototype PRA-2 décor, variante B retenue le 2026-11-26 (« B, avec
COM-3 ») ; le calage portrait est livré par COM-3 (#2388).

- **Pose** : la page `/login` pose `<LienDecor emplacement="connexion-praticien" />`
  dans son cadre, devenu `relative isolate`. Le fond reste en périphérie : centré
  en paysage, calé en haut à droite en portrait. La carte reste opaque, aucun champ
  ni bouton n'est sur le décor, et celui-ci est absent à l'impression.
- **Inchangé** : la marque Empreinte dans le `h1`, le lien d'évitement (premier arrêt
  de tabulation), le flux NextAuth, le domaine autorisé, les routes et les gardes.
  Aucun texte neuf.
- **Bancs** : `app/login/page.test.tsx` (décor posé une fois, hors de
  l'accessibilité, sous le contenu) et `e2e/login-decor.spec.ts` (carte opaque,
  calage selon l'orientation, aucun défilement horizontal, absent à l'impression).
