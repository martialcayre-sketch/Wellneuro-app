### Le dossier patient s'exporte en PDF, pseudonymisé par défaut pour un outil d'IA externe (2026-09-26)

- **Un bouton « Exporter en PDF »** dans l'en-tête de la fiche patient
  télécharge le dossier : renseignements administratifs, fiche signalétique et
  anamnèse, réponses à tous les questionnaires avec leurs scores, dernière
  synthèse validée complète (axes prioritaires, points à confirmer en
  entretien, vigilance, questions pour la consultation, note du praticien).
- **Deux versions** : « Pour une IA externe », cochée par défaut, sans nom,
  prénom, date de naissance, coordonnées, NIR ni médecin traitant, leurs
  occurrences masquées dans les textes libres ; « Complète ». Le nom du patient
  n'est jamais dans le nom du fichier ni dans les métadonnées (D-252). Le
  masquage est tenu par un corpus de non-régression (fuites trouvées en revue
  adverse contre textes cliniques qui doivent rester intacts) ; ses limites
  sont écrites dans D-252 et le préambule du PDF prévient le lecteur.
- Route `GET /api/praticien/export-dossier`, sous garde d'appartenance ; chaque
  export laisse une ligne au journal d'accès (G-TRUST-04), sans contenu.
- Nouvelle dépendance `pdf-lib`. Aucune migration, aucun drapeau, aucune règle
  clinique touchée. Les assistants d'affichage des scores de « Détail des
  réponses » passent dans `lib/scoring/descriptifsScores.ts`, pour que l'écran
  et le PDF disent la même chose.
