# Intégration aval fail-closed (LOT-04) (2026-08-03)

Mon Équilibre ignore désormais explicitement les sources de questionnaires suspendus, même si des passations historiques existent en base.

La génération de synthèse IA filtre désormais les réponses sur l'administrabilité runtime avant construction du prompt. Si un dossier ne contient aucune réponse administrable, l'API retourne `422` et n'appelle pas le modèle.

Ce lot renforce la fermeture par défaut des mécanismes aval sans modifier les règles de scoring clinique ni les arbitrages de statut.
