### Ajouté — le rayon biologie ouvre dans la Bibliothèque (CB-08)

- **Rayon « Analyses biologiques » dans la Bibliothèque praticien** : catalogue
  documentaire consultable — 15 bilans hiérarchisés par niveau (socle,
  approfondissement, spécialisé) et 47 fiches d'analytes ouvertes en tiroir
  (patron du rayon compléments C4). La bibliothèque de biologie fonctionnelle,
  ingérée le 2026-07-26 et restée sans appelant depuis (dette `a_brancher` du
  2026-08-05), gagne sa première surface de consultation.
- **Fiche analyte** : identité, prélèvement, les **deux référentiels de
  valeurs côte à côte** (laboratoire / fonctionnel — jamais fusionnés,
  invariant du schéma ; une colonne vide se dit, elle n'est jamais comblée par
  l'autre), remboursement dérivé de `remboursable.ts` (les quatre états ; « non
  évalué » explicitement distingué de « non remboursé »), préanalytique,
  provenance et complétude, bilans citant l'analyte. Aucun score global, aucun
  tarif en euros (coefficient seul dans la source) ; un banc d'écran, joué
  liste et tiroir ouvert, interdit « prescription », « ordonnance » et
  « diagnostic » — « dosage » n'en fait pas partie, la donnée réelle du
  catalogue le portant en verbatim de claim (`PANEL_MG_PLASMATIQUE`).
- **Route `GET /api/praticien/biologie/catalogue`** : praticien seul, patron
  C4 (401 sans session, 404 fail-closed drapeau éteint), lecture seule du
  catalogue — aucune donnée patient ne transite (étage 1 documentaire, verrou
  HDS intact).
- **Surface adossée à `WN_CB_ENABLED`, choix nommé** : ce drapeau garde par
  définition l'étage documentaire (« catalogue d'analyses, plages, bilans » —
  décision A du cadrage CB) et vaut `true` en production depuis `D-070` : le
  rayon devient donc visible au déploiement. Le précédent `D-071` (drapeau
  neuf éteint) visait une surface servie **par dossier** ; un catalogue global
  au cabinet, sans donnée patient, est l'objet même de l'étage 1.
- **Les écrans cessent de mentir sur l'état du rayon** : la bannière de
  `dashboard/biologie` annonçait que le stockage de résultats « attend un
  hébergement HDS » — faux depuis `D-120`/`D-121` (annexe HDS signée le
  2026-08-30) ; la page lit désormais le drapeau à la requête et oriente vers
  le rayon, l'étage 2 restant différé par décision de roadmap. Le sélecteur de
  rayons de la Bibliothèque (`BibliothequePanel`) cesse de marquer « Analyses
  biologiques » à venir quand le rayon est rendu sur la même page : la page
  serveur lui passe l'état du drapeau, la bannière pointe vers la section, et
  sa phrase HDS périmée disparaît dans les deux états.
- Matrice de consommation régénérée : `catalogue-biologie` sort des sources
  dormantes (verdict `a_brancher` du 2026-08-05 soldé, décision retirée) ;
  `rayon:biologie` (claims du notebook 08) reste dormant, re-daté au
  2026-09-01 — élargir l'allowlist corpus demeure une décision praticien.
