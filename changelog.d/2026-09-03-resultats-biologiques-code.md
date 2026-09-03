### Ajouté — l'étage 2 s'ouvre : saisie des résultats et estimé ↔ mesuré, derrière son drapeau (CB-09, D-122 §2) (2026-09-03)

- **Routes `GET`/`POST /api/praticien/biologie/resultats`** derrière
  `isCbResultsEnabled` (les DEUX drapeaux exigés — `D-081`), garde partagée
  `garderResultats` (drapeau → session → appartenance **journalisée**, GD-1).
  La saisie est bornée par le serveur : **l'unité est relue sur l'analyte au
  catalogue** (jamais fournie par le client — la concordance
  unité résultat ↔ analyte tient par construction), `source` posée serveur
  (`saisie_praticien`), date de prélèvement **avec l'heure** (l'unicité
  patient/analyte/horodatage distingue deux prélèvements du même jour —
  frontière tracée à la PR #838), borne « non futur » à +24 h côté route
  (`now()` interdit en CHECK), doublon exact refusé en 409 propre. Aucune
  borne de valeur : un seuil serait inventé (DC-19/DC-20). Pas de route de
  correction en V1 — geste à arbitrer, dit dans le code plutôt qu'improvisé.
- **`EstimeMesurePanel` prend vie** (fiche-trajectoire) : drapeau levé, il
  lit la série du dossier et l'affiche **par analyte** — valeur, unité du
  catalogue, horodatage — à côté du déclaratif des courbes, **jamais fusionnés
  en un chiffre unique** (A6-R2), sans interprétation (DC-27) ; et il offre la
  saisie (sélecteur d'analyte avec son unité, valeur, date-heure). Drapeau
  éteint : le second temps documenté, débarrassé du badge « HDS requis »
  périmé (l'hébergement est en place — `D-081` requalifié).
- **Le drapeau `WN_CB_RESULTS_ENABLED` est posé avec le code qui le lit**
  (geste daté `D-081`, 2026-09-03) : `FEATURE_FLAGS.md` §D requalifié avec la
  liste des appelants ; absent = éteint (fail-closed). La levée en production
  est un geste d'exploitation distinct — **conditionné à la mise à jour du
  registre des traitements et de l'information patient** (nouvelle catégorie
  « résultats biologiques » : la table existait, l'écriture s'ouvre). La
  piste d'audit est régularisée au dossier RGPD (23ᵉ route GET journalisée ;
  le POST de saisie ne journalise pas — il ne lit rien du dossier, l'écriture
  est tracée par la ligne elle-même) et le fichier de lot LOT-06 (CB-09) est
  régularisé (gate HDS requalifié D-081, ouverture D-122 §2, restes nommés :
  ré-alimentation du moteur, import labo, geste de correction).
- **Les textes qui deviendraient faux drapeau levé suivent l'état réel** : la
  phrase « aucun résultat d'analyse n'est conservé » des générateurs courrier
  et document patient devient conditionnelle (les routes passent l'état du
  drapeau), le badge du panneau proposition dit « les mesures vivent à part —
  jamais dans la proposition », la bannière Correspondance cesse d'invoquer un
  HDS manquant.
