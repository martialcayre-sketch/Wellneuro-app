---
id: "LOT-11"
titre: "Preuves de la transmission patient : E2E portail, accessibilité, plafond concurrent"
statut: "terminé"
dépend_de: "LOT-04"
---

# LOT-11 — Preuves de la transmission patient

## But

Prouver par des tests rejouables ce que le LOT-04 a livré sans le prouver de
bout en bout. C'est la réserve de clôture du LOT-04 (2026-10-10).

## Résultat observable

- Un E2E portail où un patient de fixture dépose un compte rendu, depuis le
  lien magique jusqu'au statut « En attente ». Il est joué en CI.
  Correction du 2026-10-10 : la fiche disait « reçu ». Or ce statut suppose
  une lecture lancée par le praticien, c'est-à-dire l'IA, hors E2E. Juste
  après un dépôt, le patient lit « En attente » (arbitrage du responsable).
- Un contrôle d'accessibilité de l'écran de transmission. Relecture manuelle
  tracée : clavier seul, libellés lus par un lecteur d'écran, erreurs
  annoncées. Contrôle `@axe-core/playwright` limité à cette page, joué en CI.
- Un banc sur base réelle (Postgres local) qui prouve que deux dépôts
  simultanés ne franchissent pas le plafond de 3 documents non purgés
  (`D-269`).

## Périmètre

Tests seuls, plus les corrections que ces tests révèlent sur la surface du
LOT-04. Une dépendance de dev neuve, `@axe-core/playwright`, est acceptée par
le responsable le 2026-10-10. C'est la première dans le dépôt.

## Hors périmètre

- L'E2E de l'écran d'import praticien.
- Le passage d'axe-core sur d'autres pages.
- Tout changement de règle du LOT-04 : plafonds, types, rétention.

## Interdits

- Fixtures seules (Sophie Nicola, Jennifer Martin, Michel Dogné). Aucun
  dossier réel visé par un seed ou un E2E (`D-075`).
- Aucune écriture dans `resultats_biologiques`.
- Pas de `retries` Playwright (`D-049`).
- Aucune migration.

## Tests

Le lot est lui-même des tests. Il passe par le palier T3 (E2E Chromium et
WebKit), et par les contrats SQL pour le banc de concurrence.

## Critères de done

Les trois preuves sont vertes en CI, ou le défaut qu'elles révèlent est
corrigé dans le lot ; la relecture manuelle est tracée dans la fiche.

## Résultats

**Terminé le 2026-10-10.** Les trois preuves sont vertes en local et dans le
T3 complet, joué deux fois. Le second T3 a été joué après intégration de #1379
(`main` 2951aa03) : 259 E2E sur le build de production, Chromium et WebKit.

**1. E2E portail**, dans `web/e2e/portail-transmission-compte-rendu.spec.ts`,
sur la fixture `PAT_SEED_03`.
- Le parcours enchaîne le lien magique réel, le hub, le lien « Transmettre
  un compte rendu d'analyses », l'accusé `usage_ia`, le dépôt d'un PDF
  généré et la liste.
- La liste se lit « En attente », avec son explication, et le succès est
  lu dans la région `status`.
- Le parcours se fait au clavier seul. Sous WebKit, la touche est
  `Option+Tab` : c'est le geste réel de Safari, qui ne met pas les liens
  dans l'ordre du Tab par défaut. Chaque cible exige `:focus-visible` et un
  indicateur rendu.
- Le nettoyage passe par le geste praticien « Écarter ce document ».
  `staging.guard.test.ts` interdit en effet à un E2E de supprimer un compte
  rendu.

**2. Accessibilité.**
- `@axe-core/playwright` 4.13.0, dépendance de dev. Le lockfile fait aussi
  passer `axe-core` transitif de 4.12.1 à 4.13.0.
- Les tags WCAG 2.1 A et AA sont joués sur trois états : accusé,
  formulaire, liste après dépôt. Zéro violation, aucune règle désactivée.

**3. Banc du plafond**, dans
`web/scripts/banc-plafond-transmission-deux-depots.test.ts`, joué en CI et
en T3.
- Le dossier porte déjà 2 documents. Une troisième session tient le verrou
  consultatif du dossier, et les deux attentes sont constatées dans
  `pg_stat_activity`.
- Résultat : un dépôt et un `plafond_en_attente`, avec 3 documents non
  purgés en base.
- Le témoin montre que le contrôle préalable de la route, hors verrou,
  admettrait les deux dépôts.
- Deux mutations ont été jouées, et toutes deux rougissent le banc :
  - verrou retiré : la course n'a pas eu lieu ;
  - verrou gardé mais rejugement retiré : deux dépôts passent.

**Défauts révélés et corrigés dans le lot.**
- Le succès du dépôt n'était pas annoncé aux lecteurs d'écran. Il est
  désormais annoncé par une région `role="status"` présente dès le premier
  rendu (`TransmissionCompteRendu.tsx`), avec un test unitaire.
- Le contraste du bandeau de succès du portail était de 4,39:1, sous le
  seuil AA de 4,5:1 (axe, `color-contrast`). Le texte passe en couleur
  courante sur le même fond vert pâle (`PatientInlineMessage`). L'arbitrage
  du responsable du 2026-10-10 l'applique aux six écrans patient qui
  affichent ce bandeau, et le praticien n'est pas touché.

**Les drapeaux E2E** `WN_BIO_INGEST_ENABLED` et `WN_BIO_PORTAIL_ENABLED`
sont désormais posés comme en production, dans `playwright.config.ts`, au
build du CI et au build de T3.

**Relecture manuelle tracée (2026-10-10, responsable, Safari et VoiceOver,
fixture `PAT_SEED_03` sur la base de dev locale) : 8/8 OK.**
1. Le lien du hub est atteint par `Option+Tab` et lu « lien, Transmettre un
   compte rendu d'analyses » : OK.
2. Les titres h1 et h2 sont annoncés dans l'ordre : OK.
3. Le bouton « J'en ai pris connaissance » est lu comme un bouton : OK.
4. Le champ de fichier est lu avec son libellé : OK.
5. « Envoyer à mon praticien » est annoncé estompé avant le choix d'un
   fichier : OK.
6. Un faux PDF produit l'erreur « Formats acceptés : PDF, JPEG, PNG ou
   WebP. », annoncée d'elle-même : OK.
7. Le succès est annoncé de lui-même après l'envoi : OK.
8. L'entrée de la liste est lue « Déposé le … — En attente », suivie de son
   explication : OK.

**Ce qui n'est pas prouvé ici.** Le statut « Reçu », qui suppose une lecture
lancée par le praticien. L'écran d'import praticien, hors périmètre. Aucun
comportement réel : ce sont des fixtures (`D-125`), et le constat d'usage du
LOT-04 reste à rejouer à la première transmission réelle.
