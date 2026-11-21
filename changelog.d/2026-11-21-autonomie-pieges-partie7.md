### Tests : quatre pièges des specs E2E corrigés, trois gardés par un banc (autonomie-pieges-restes, partie 7, 2026-11-21)

Quatre défauts de banc ont fait rougir un CI sans rapport avec le lot qui le
portait. Aucun code de l'application n'est touché.

- **« Hier » = maintenant moins 24 h.** Le dernier dimanche d'octobre dure
  25 h à Paris : entre 23 h et minuit, « hier » rendait la date du jour (six
  échecs agenda au T3 du 2026-10-25). `portail-hub-agenda.spec.ts` et
  `portail-agenda-alimentaire.spec.ts` décalent désormais la date sur le
  calendrier, avec `decalerDate(dateJourParis(), n)`, comme
  `agenda-sommeil-saisie.spec.ts`.
- **Minuit.** Le troisième test de `biologie-document-patient.spec.ts`
  attendait un doublon de la pièce du premier, alors que le texte ne porte que
  la date : une suite qui franchissait minuit entre les deux ne trouvait jamais
  le doublon (#1595). Si son premier geste consigne une pièce neuve, le test
  recommence sur une page neuve, et c'est ce second geste qui doit être refusé
  comme doublon.
- **`textContent()` du `<body>`.** Cette lecture prend aussi les scripts RSC,
  et un `buildId` aléatoire contenant « taux » a fait rougir un test de
  lexique interdit (#821). `portail-dossier-deux-voix.spec.ts` lit l'écran par
  `innerText()`.
- **Flèches sous WebKit.** Sous le WebKit de Playwright, les flèches ne font
  rien défiler (#1895). Aucun spec actuel n'a cette assertion.
- Le banc `web/src/lib/e2ePieges.guard.test.ts` lit les specs et rougit sur
  trois formes : un jour écrit en millisecondes (seul un instant admis, avec
  son motif), un `textContent()` du `<body>` ou du `<html>`, et un spec qui
  presse une flèche et lit un défilement sans écarter WebKit. Les trous qu'il
  laisse sont écrits dans son en-tête. Le piège de minuit tient à un état
  partagé entre deux tests, que le texte ne laisse pas lire en général : il
  n'est pas gardé.
