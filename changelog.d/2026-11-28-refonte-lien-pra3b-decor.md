### Refonte Lien, PRA-3b décor : séparateur des deux voix de l'objectif négocié (2026-11-28)

Micro-lot praticien de la refonte Lien, ouvert par la session d'orchestration. Le prototype a été validé par écrit par le responsable, dans la session du lot, le 2026-11-28 : « Q1a — Q2a — Q3a » ([[D-481]] §4, question 20261127-2220-d).

- **Fiche-trajectoire, sous-vue « Objectif négocié »** : un séparateur `divider-two-voices` se pose entre « Le patient » et « Le praticien a compris » de la version courante. Il est centré, 320 px au plus, et ajoute 48 px au bureau et 41 px au téléphone.
  - Il ne se pose que si une reformulation existe : une voix seule n'a rien à séparer.
  - L'historique replié n'en reçoit pas (un décor par zone, [[D-481]] §1 bis).
  - À 195 px, il est gardé et ne déborde pas.
- **Primitive** : le séparateur passe par `LienDecor` (emplacement `deux-voix`, déjà ouvert). Il est hors de l'accessibilité, sans pointeur, statique, et absent à l'impression, où les deux intitulés restent. Aucun texte neuf, aucun drapeau, rien de clinique ; `LienDecor` ne change pas.
- **Réception** : `e2e/fiche-objectif-deux-voix-decor.spec.ts` (Chromium et WebKit) vérifie la place, l'accessibilité, l'impression et la largeur de 195 px. `ObjectifNegociePanel.test.tsx` épingle la pose : version courante seulement, aucune sans reformulation.
