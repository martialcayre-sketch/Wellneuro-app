### Fil du jour : carte « Synthèse à générer » pour les questionnaires lus sans synthèse (2026-07-27)

L'inbox par patient (accueil-observatoire LOT-02) retire une réponse dès sa
lecture confirmée par le praticien — mais rien ne prenait le relais : un
patient dont le questionnaire venait d'être lu, sans qu'aucune synthèse IA
n'ait encore été générée, devenait invisible à la fois de l'inbox et du Fil.

- Nouveau type de carte `synthese_a_generer` (`lib/fil/cartes.ts`), symétrique
  de `synthese_a_valider` : une carte par patient, ancrée sur sa lecture
  confirmée la plus récente (`questionnaireLecturePraticien`), écartée dès
  qu'une synthèse plus récente que cette lecture existe (brouillon ou déjà
  validée). Refusable comme les autres cartes (G1).
- Route `GET /api/praticien/fil` : deux `groupBy` supplémentaires (dernière
  lecture confirmée par patient, dernière synthèse toutes causes confondues
  par patient) alimentent la comparaison.
