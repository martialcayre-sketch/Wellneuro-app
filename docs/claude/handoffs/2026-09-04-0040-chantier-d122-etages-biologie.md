# Handoff — 2026-09-04 — Rayon biologie : les deux étages de D-122 livrés (décision F + CB-09)

## Branche et état Git

- Branche vivante : `feat/cb-resultats-code` (PR #854, verify vert, en merge
  cette nuit sur autorisation globale de l'utilisateur du 2026-09-04 ~00:35).
- Déjà sur `main` : PR #828 (migration `documents_patient_biologie`,
  release-db appliquée + constat conteneur 2026-09-03), PR #838 (migration
  `resultats_biologiques`, idem — avec l'unicité patient/analyte/horodatage
  ajoutée par geste Copilot de l'utilisateur), PR #848 (code document
  patient).

## Objectif du chantier

D-122 (2026-09-01) : ouvrir les étages restants du rayon biologie — le
document patient consigné ancré (décision F, étage 1) puis les résultats
réels (CB-09, étage 2) — chaque migration seule dans sa PR (D-087), le code
après constat par conteneur.

## Décisions prises en route

- Unicité (patient, analyte, horodatage) : la borne vit sur l'HORODATAGE
  complet — la saisie exige l'heure, sinon la 2ᵉ mesure du jour serait
  refusée (commentaire PR #838).
- Unité JAMAIS fournie par le client : relue sur l'analyte à la saisie
  (concordance par construction, vocabulaire partagé « appliqué quatre fois »).
- Garde registre patient du document : refus confirmable LIÉ AU TEXTE
  (empreinte SHA renvoyée au 409, re-refus si le texte re-dérivé diffère).
- POST résultats SANS journal GD-1 (il ne lit rien du dossier) ; le GET
  journalise (23ᵉ route, dossier RGPD mis à jour).
- Drapeau `WN_CB_RESULTS_ENABLED` posé avec le code (D-081), éteint ;
  textes « aucun résultat conservé » conditionnés partout, bancs de
  débranchement à l'appui.

## Validations exécutées

- T1 et T2 verts sur chaque PR (T2 : 6292 Vitest, 167 E2E ; unique rouge
  récurrent = spec WebKit `portail-lien-magique`, segment au CI, D-049).
- PR A : revue adverse 8 angles (workflow) — TOCTOU confirmation, verrou
  double-clic, états rassis corrigés avant PR.
- PR B : contre-revue `wn-reviewer` — no-go initial, 4 conditions levées
  (états de lecture DC-24, bancs de câblage, textes restants, fail-closed
  prouvé) + 6 mineurs pris.
- Régime D-087 éprouvé deux fois le 2026-09-03, deux leçons consignées :
  fenêtre de suivi 10 min < démarrage à froid npx (faux rouge) ; wait timer
  5 min + garde de tête = release perdante face à une session qui merge.

## Problèmes ouverts / suites consignées

- Levée du drapeau en prod : registre des traitements + information patient
  D'ABORD (écrit au changelog et à la PR #854).
- Geste de correction d'une saisie de résultat : n'existe pas, à arbitrer
  (dit dans la route et à l'écran).
- Import laboratoire (2ᵉ origine de D-122 §2) : non livré.
- Ré-alimentation moteur d'orientation/momentum par le mesuré : exigera sa
  propre décision.
- Dédoublonnage différé (parité gardée avec les jumeaux livrés) : prélude
  commun des routes proposition, double lecture patient dans la garde,
  date UTC du « préparé le » (courrier ET document).
- Constat visuel des surfaces par l'utilisateur : pas encore fait.
- Clôture de la campagne CB : arbitrage utilisateur.

## Prochaine action exacte

Si la #854 n'est pas mergée : `node scripts/wn-attendre-ci.mjs 854` puis
merge. Ensuite : constat visuel utilisateur, puis — à son heure — la levée
du drapeau précédée des mises à jour RGPD.

## Interdits encore actifs

- Jamais de résultat/valeur dans la proposition ni le document patient
  (liste blanche des contrats SQL).
- Aucun seuil/borne clinique sans décision (DC-19/20) ; pas de règle
  résultat→statut sans son propre arbitrage (D-122, frontières).
- Fixtures uniquement (Sophie Nicola, Jennifer Martin, Michel Dogné) ;
  production lisible par conteneur one-off seulement.
