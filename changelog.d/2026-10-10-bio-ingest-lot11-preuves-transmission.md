### Import biologique : preuves de la transmission du compte rendu par le patient (BIO-INGEST LOT-11) (2026-10-10)

- Un E2E Playwright suit un patient de fixture du lien magique jusqu'au
  statut « En attente » de son compte rendu déposé. Le parcours se fait au
  clavier seul, et chaque cible doit porter un focus visible. Il est joué sous
  Chromium et sous WebKit (iPhone 13).
- Un contrôle d'accessibilité `@axe-core/playwright` (WCAG 2.1 A et AA) passe
  sur les trois états de l'écran de transmission : accusé, formulaire et
  liste après dépôt. Il exige zéro violation et ne désactive aucune règle.
  C'est une nouvelle dépendance de dev.
- Un banc sur base réelle (`scripts/banc-plafond-transmission-deux-depots.test.ts`,
  CI et T3) prouve que deux dépôts simultanés pour la dernière place ne
  franchissent pas le plafond de 3 documents non purgés (`D-269` §5). Il en
  résulte un dépôt et un refus nommé.
- Correctifs révélés par ces preuves :
  - le message de succès de la transmission est désormais annoncé aux
    lecteurs d'écran ;
  - le bandeau de succès du portail patient s'écrit en couleur de texte
    courante sur son fond vert pâle. Le vert ne donnait qu'un contraste de
    4,39:1, sous le seuil AA, et la correction vaut pour les six écrans
    patient qui affichent ce bandeau.
- Les E2E tournent désormais avec `WN_BIO_INGEST_ENABLED` et
  `WN_BIO_PORTAIL_ENABLED` allumés, comme la production.
