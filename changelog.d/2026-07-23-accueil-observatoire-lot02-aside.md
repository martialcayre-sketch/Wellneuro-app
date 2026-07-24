### Accueil Observatoire LOT-02 — colonne de travail : Météo, Inbox, Correspondance (2026-07-23)

L'aside de l'accueil praticien passe du manifeste au travail (campagne
`2026-07-23-accueil-observatoire`, décisions propriétaire du 2026-07-23) :

- **Météo d'adhésion** dans l'aside et en badge inline sur les cartes du Fil
  (« Adhésion : fragile »). Réutilise l'agrégat SP-MET déjà livré, calculé à la
  lecture, jamais persisté, jamais un score, jamais montré au patient — une
  garde structurelle vérifie qu'aucune surface patient ne l'importe.
- **Inbox questionnaires** groupée par patient (nombre, dernière date, titres) :
  elle **remplace** les cartes « Reçu » du Fil — fini la liste d'une ligne par
  questionnaire. « En attente de consultation » = réponses postérieures à la
  dernière consultation validée.
- **Correspondance récente** : les dernières consignations d'échanges médecin
  (C3 LOT-06) apparaissent dans l'aside, et un badge compteur (7 jours) s'allume
  sur l'entrée « Correspondance » du rail.
- L'encart **« Principe 5.0 » est retiré** de l'accueil (le manifeste vit dans
  la vitrine du design system).
- `reponse_recente` est retiré du Fil ; les refus déjà posés sur ces cartes
  restent en base, inertes (append-only), et une ancienne clé rejouée est
  désormais rejetée.
