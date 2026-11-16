### Garde : le segment de la page ne sert jamais de clé de stockage local (2026-11-16)

Lot `garde-segment-stockage-local` (carnet, file D, ordre 84), sur une question de `wn-reviewer` à #2152. Le crochet `useSegmentPage` (`web/src/lib/portail/useSegmentPage.ts`) rend le segment `[token]` de `/portail/<segment>` aux composants, pour l'en-tête `x-wn-dossier-page` seulement (`D-481`, DOC-14). Le jeton ne doit jamais nommer une clé de l'appareil, mais aucune garde ne le vérifiait sur ces composants.

- `web/src/lib/portail-identite-locale.guard.test.ts` : nouveau `describe`. Il découvre dans `src/` les sources hors tests qui appellent le crochet (six aujourd'hui), au lieu de les lister. Dans chacune, le segment doit être lié une seule fois (`const x = useSegmentPage()`), puis n'apparaître que dans `enTeteDossierPage(x)` ou dans le tableau de dépendances d'un crochet React. Tout autre emploi rougit : une clé, un argument, une copie dans une autre variable. Le crochet lui-même ne touche à aucun stockage.
- Banc du banc : une source fautive écrite dans le test rougit, ainsi qu'une copie et un appel non lié. Mutation vérifiée sur le panneau du Journal Alimentaire : une clé `wellneuro:…${segmentPage}` fait rougir le cas, puis le fichier est restauré.
- Aucun texte, aucune migration, aucun drapeau.
