### Import biologique : l'extraction a désormais une durée maximale réelle (BIO-INGEST LOT-08) (2026-10-05)

- La lecture d'un compte rendu par l'IA est bornée de bout en bout (4 min),
  réponse en flux comprise. Auparavant, seul le début de la réponse était
  attendu au plus 3 min ; un flux qui ne finissait jamais laissait l'import
  « en cours » sans terme. Il finit désormais en échec « délai dépassé »,
  relançable.
- La transaction qui enregistre les lignes lues a un délai explicite (20 s).
- Aucune migration ; consigne, schéma de sortie et version du procédé
  inchangés.
