### Bibliothèque — rayon Questionnaires livré dans l'app (2026-07-23)

`/dashboard/bibliotheque` devient la Bibliothèque multi-rayons (arbitrages du
2026-07-23) : le rayon **Questionnaires** est livré, Analyses biologiques et
Fiches conseils sont annoncés « à venir » (l'ancien écran statique
« Bibliothèque d'interventions » est repris par le futur rayon Fiches
conseils). La rubrique quitte l'héritage 4.0 du rail et rejoint La Spirale.

- **Catalogue navigable** : recherche, filtres par domaine, badges
  « Certifié » (statut `scoring.certification` enfin affiché), « Passation
  praticien » (5 instruments scorables jamais auto-administrés :
  Q_GEO_03/04/05/06, Q_URO_02 — désormais visibles) et « Alias historique »
  (Q_SOM_08 → Q_NEU_12, Q_STR_07 → Q_NEU_11 — non assignables tels quels,
  ce qui échouait déjà silencieusement).
- **Aperçu vierge** : nouvelle route `GET /api/praticien/bibliotheque/apercu`
  qui sert la définition complète (consigne, sections, questions, options)
  depuis `QUESTIONNAIRE_CATALOGUE`, rendue en lecture seule avec
  `QuestionField` — tel que le patient le verra. Les alias sont résolus vers
  la grille qui les porte, en le disant.
- **File d'envoi générale** (migration `20260723180000_bibliotheque_file_envoi_v1`,
  table additive `envoi_brouillons`, RLS deny-all) : un brouillon par patient
  accumule des questionnaires ; « Envoyer » crée les assignations dans la
  transaction verrouillée du portail (patron `packs/assign`) et adresse **un
  seul mail récapitulatif avec le lien portail unique**. Gardes : appartenance
  praticien, dossier clos (409), portail révoqué (409). Pas de cron ni de
  relance automatique.
- Tests : 15 tests Vitest (lib + routes file-envoi/envoyer) et un parcours
  E2E bibliothèque (catalogue, aperçu, file).

Constat consigné sans correctif (logique clinique gatée) : `questions.ts`
porte une définition inline de Q_STR_02 (PSS-10, échelle 1–5, /50) qui
masque celle de `questionnaires/stress.ts` (0–4, /40) — divergence interne à
arbitrer séparément.
