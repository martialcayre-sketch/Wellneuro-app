# Handoff — 2026-10-04 — Lettre d'adressage remise au patient : LOT-03b, aperçu praticien et impression

## Branche et état Git

- Branche `ccr-233e115a-00c8c1`, repartie de `origin/main` (`034a97f`, merge
  de #1308). PR à ouvrir.

## Objectif

Lever les deux conditions de pose restantes ([[D-262]]) : le praticien voit la
lettre avant le clic (P1 de la revue du LOT-02) ; l'impression patient passe
par le rendu `medecin` (P1 de la revue du LOT-03a, cadrage §3.2).

## Décisions prises

- Aperçu : clé `lettre` du GET de diffusion (date, déjà remise ou non), jamais
  le texte. Une seule règle pour l'aperçu et la remise (`lettreDuClic`).
- Jeton : l'identifiant de la lettre due (et « déjà remise ») est combiné au
  jeton des fiches — le cockpit l'envoie déjà et sait relire sur refus ;
  drapeau éteint, jeton inchangé octet pour octet.
- `annonceParEmail` reste celui des fiches ; l'annonce de la lettre se dit dans
  son bloc (son drapeau ouvre aussi sa lecture).
- Impression : `rendreCourrierAdressageFige` (chokepoint `medecin`, provenance
  recopiée de la lettre consignée), servie en page HTML `no-store` par une route
  portail gardée comme la lecture ; le bouton ouvre cette page.

## Fichiers modifiés

- `lib/correspondance/lettreAdressageRemise.ts` (+ banc), `lettreServicePatient.ts` (+ banc)
- `lib/clinical/courrierAdressage.ts` (+ banc)
- `api/praticien/protocoles/diffusion/route.ts` (+ `route.lettre.test.ts`)
- `api/portail/lettre-adressage/impression/route.ts` (+ banc)
- `components/patient-cockpit/ProtocolDiffusionPanel.tsx`, `ClinicalRuntimeSection.tsx`
  (+ bancs, garde `diffusionFiches.guard.test.ts`)
- `components/patient/lettre-adressage/CourrierMedecinLecture.tsx` (+ banc)
- Docs : FEATURE_FLAGS, DOSSIER_RGPD, cadrage §5, carte `vocabulaire.ts`, changelog.

## Validations exécutées

- `tsc` vert ; Vitest ciblé vert (correspondance, diffusion, cockpit, portail).
- `npm run check` vert ; suite Vitest complète verte (675 fichiers).
- Revue `wn-reviewer` : **GO merge**, aucun P0/P1. P2 corrigés : la remise est
  liée à la lettre VUE dans l'aperçu recalculé (une lettre consignée entre les
  deux ne part pas) ; aucune provenance fabriquée au rendu imprimable ; message
  de refus « périmé » exact ; e-mail non annoncé deux fois. Tests ajoutés (cas
  passant avec lettre, jeton brut drapeau éteint, terme prescriptif, ancrage
  absent, indisponible, 403). P2 restant, noté : si le chokepoint refuse le
  rendu imprimable, l'onglet montre un 404 JSON (repli : impression de la page
  de lecture).
- E2E : job `e2e` du CI.

## Problèmes ouverts

- **Q-L1** (cadrage) : une lettre remise non révoquée reste servie après une
  porteuse dépassée — à trancher avant la pose.
- E-mail pour une lettre révoquée pendant sa remise ; export d'accès sans les
  remises.
- **Date de la lettre au jour UTC** (préexistant, `genererCourrierAdressage` :
  `new Date().toISOString().slice(0, 10)`) : une lettre consignée entre minuit
  et 2 h à Paris porte la veille. L'aperçu et l'impression suivent ce jour pour
  ne pas contredire le corps ; passer le générateur à `dateJourParis` change le
  texte des lettres futures — à décider (revue Copilot de #1309).

## Prochaine action exacte

1. CI vert, merge sur accord. 2. Arbitrage Q-L1. 3. Pose de
`WN_LETTRE_ADRESSAGE_PATIENT` sur ordre, constat sur un dossier de test par
identifiant (aperçu au cockpit, clic, écran portail, impression, e-mail).

## Interdits encore actifs

- Pas de pose avant Q-L1 et l'ordre du responsable.
- Aucune identité réelle dans le dépôt.
