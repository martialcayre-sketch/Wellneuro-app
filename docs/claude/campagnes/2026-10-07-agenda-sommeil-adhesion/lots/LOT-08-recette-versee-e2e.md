---
id: "LOT-08"
titre: "La recette locale versée au dépôt — E2E du patient et du praticien"
statut: "terminé (2026-10-10, #1379) — CI WebKit verte 9/9 ; trou nommé : clôture → PDF (AGD_LAT_MED)"
dépend_de: "LOT-07"
---

# LOT-08 — La recette locale versée au dépôt

## Constat

La recette locale du 2026-10-10 (LOT-07) vivait dans un espace temporaire de
session : elle disparaît avec lui. Aucun test ne regardait le chronogramme dans
un vrai navigateur — d'où trois mois de barres absentes (#427 → #1376) — et le
WebKit du CI, moteur de Safari, ne rejouait que deux écrans de la saisie.

## Ce que le lot verse

Tests seulement : aucun code applicatif, aucun seuil, contrat, libellé ni
route modifié. Patient fictif Michel Dogné (`PAT_SEED_03`) uniquement.

- **`web/e2e/agenda-sommeil-saisie.spec.ts`** — quatre tests ajoutés aux deux
  existants : l'ordre impossible refusé sans rien écrire puis la nuit corrigée
  envoyée avec ses « je ne sais pas » ([[D-271]]) ; la première nuit qui
  propose le rappel au-dessus de la frise, et le fichier `.ics` téléchargé
  (heure choisie, dès le lendemain, ni lien ni mot de santé) ; la deuxième nuit
  qui renvoie la carte sous la frise (LOT-06) ; l'agenda commencé en v3 qui s'y
  termine ([[D-272]] §3).
- **`web/e2e/agenda-sommeil-praticien.spec.ts`** — nouveau : le chronogramme
  lu dans le SVG, chaque barre de son repère du soir à son lever sur les
  graduations de l'axe, ses portions claires à leur place et à leur taille
  (endormissement en tête, éveil au lit en pied), aucune portion et le tiret
  gris en tête pour « je ne sais pas », l'infobulle au survol (bureau) ; à six
  nuits, la clôture demande confirmation et « Laisser l’agenda ouvert »
  n'appelle pas la route ; à sept, elle agrège sans rien demander.
- **`web/e2e/helpers/db.ts`** — nuits posées en base (la route n'accepte que
  le jour et la veille), chacune passée d'abord par le validateur de la route
  sous le contrat demandé ; lecture des nuits et du statut d'assignation.

Les deux projets Playwright les jouent : Chromium au bureau, WebKit au gabarit
iPhone 13.

## Validation

- Le test du chronogramme **rougit sur le code d'avant le LOT-07** : correctif
  retiré localement (hauteur négative écartée), build de production, spec
  praticien rejoué — rouge sur « rien de dessiné », les deux tests de clôture
  verts.
- Revue adverse en quatre angles (WebKit et dates, pouvoir discriminant,
  isolation entre specs et règles du dépôt, fidélité à la recette) : sept
  constats mineurs, tous traités — attente des barres avant lecture, portions
  claires affirmées, seuil encadré à six nuits, aucune requête de clôture sur
  « Laisser », fichier `.ics` comparé ligne à ligne, ouverture des détails
  prouvée, trou de l'export nommé ci-dessous.
- Run local des deux specs contre le build de production, base PostgreSQL
  locale seedée : Chromium bureau et Chromium au gabarit iPhone 13.
- T1 complet ; CI (WebKit compris).

## Ce que le lot ne couvre pas

- **L'export PDF** (« Non calculé : données insuffisantes ») : le texte d'un
  PDF est compressé dans ses flux de page — `export-dossier.spec.ts` le dit et
  s'arrête au fichier reçu —, et la recette le lisait avec `pdftotext`, absent
  du CI. La chaîne est prouvée maillon par maillon en unitaire : médiane
  d'endormissement nulle, jamais 0, sur sept nuits « je ne sais pas »
  (`agregats.test.ts`), rendu « Non calculé » d'une mesure d'agenda nulle
  (`sectionQuestionnaires.test.ts`, sur les réveils seulement), préambule
  (`libellesAgendas.test.ts`). **Trou nommé** : aucun test ne relie la
  clôture au rendu du dossier pour la médiane d'endormissement
  (`AGD_LAT_MED`).
- **Les gestes propres au téléphone** : la roue native de l'iPhone, l'ouverture
  du fichier de rappel par Calendrier, Samsung Agenda ou Google Agenda, et sa
  sonnerie. Ils restent à la recette sur appareil.
