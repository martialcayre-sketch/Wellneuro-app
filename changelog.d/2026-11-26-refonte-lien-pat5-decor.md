### Refonte Lien, PAT-5 décor : séparateur des deux voix et ornements des vides réels (2026-11-26)

Micro-lot patient ouvert par le responsable le 2026-11-26, après COM-1 (#2339) et COM-2 (#2364). PAT-5 avait livré sans décor (Q2a et Q3a de DOC-9, [[D-481]]). Prototype validé par écrit le 2026-11-26 : « Q1a — Q2a — Q3a » ([[D-481]] §4).

- **Dossier à deux voix (U25)** : un seul séparateur `divider-two-voices`, entre « Ce qui compte pour moi » et « Ce que mon praticien a compris de moi », seulement quand les deux sont servies. Il est posé hors des cartes, centré, 320 px au plus. Les intitulés des deux voix restent en texte et à l'impression.
- **États vides réels** : le germe `nutrition-sprout` (160 px) se pose au-dessus de la phrase, inchangée, sur sept vides : U24, l'objectif de U25, U26, U28, U30, U31 et U32. Les deux vides du bas de U25 n'en reçoivent pas, car le séparateur décore déjà leur zone (un décor par zone). Les erreurs, chargements, refus et blocs fermés gardent leur traitement.
- **Primitive** : tout passe par `LienDecor` (emplacements `deux-voix` et `etat-vide`, déjà ouverts par COM-1). Le décor est hors de l'accessibilité, sans pointeur, absent à l'impression et statique. Aucun texte neuf, aucun chiffre, aucun drapeau. `LienDecor` et `Bibliotheque.tsx` (DOC-10) ne changent pas.
- **Réception** : `e2e/portail-lectures-decor.spec.ts` (Chromium et WebKit) vérifie U25, U24 et U26. Les bancs Vitest des sept écrans épinglent la pose, et un banc neuf couvre `PourVotreMedecinLecture`.
