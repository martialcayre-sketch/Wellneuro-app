### 2026-08-02 — stabilisation des routes internes du rayon compléments

- les routes d’ingestion et de référentiel des compléments répondent désormais avec un payload d’erreur cohérent (`ok: false`) en cas de configuration, d’authentification ou d’échec de validation.
- la stabilité des gardes fail-closed de la voie interne a été renforcée sans changer la logique clinique ni les migrations.
