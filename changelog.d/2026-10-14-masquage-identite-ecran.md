### BioFlow : seules les pages masquées partent au service de lecture (D-284 §5, lot j, 2026-10-14)

- **Le document d'origine ne part plus** : avant toute lecture, le praticien
  voit chaque page du compte rendu et trace des rectangles noirs sur
  l'identité du patient. Les zones sont brûlées dans les pixels. Seules ces
  pages, réencodées en JPEG sans métadonnées par le serveur, partent chez
  Anthropic (procédé `bio-extraction-v5`). Aucun repli sur le document.
- **Chaque page se juge** : une zone, ou la déclaration « aucune identité sur
  cette page ». La case « Aucune identité sur ce document » vaut pour le
  document sans aucune zone, et elle est tracée.
- **Sans masquage, pas de lecture** : « Lancer la lecture » et « Relancer la
  lecture » restent fermés. La demande est refusée (`masquage_absent`), et une
  lecture déjà en file échoue fermée sans appel. « Refaire le masquage » reste
  possible tant qu'aucune lecture ne court et qu'aucune ligne n'est validée.
- **Écran** : pdf.js (dépendance `pdfjs-dist`, chargée à la demande, sans
  XFA) rend les PDF ; une photo est dessinée sur fond blanc. Plus de 20 pages :
  masquage et lecture impossibles, et l'écran le dit.
- **Route** `POST /api/praticien/biologie/import/masquage` :
  - `Content-Length` exigé et borné ;
  - dossier clos refusé ;
  - signature JPEG, réencodage, nombre de pages rapproché du document ;
  - refus en français ;
  - journal sans contenu.
- **Revue `wn-reviewer`** :
  - P1 : une zone sur une seule page débloquait les autres. Corrigé : chaque
    page se juge.
  - P2 : fond blanc des PNG transparents, pdf.js sans XFA, dossier RGPD
    ramené à ce que le masquage manuel garantit.
- **Revue Copilot de #1428** :
  - chaque page part avec son jugement, que le serveur rejuge ;
  - le masquage verrouille le dossier avant le compte rendu, comme la
    demande de lecture et l'effacement ;
  - le tracé se fait aussi au clavier ;
  - le déploiement se fait worker arrêté ;
  - la mémoire de l'écran à 20 pages est routée au plan.
