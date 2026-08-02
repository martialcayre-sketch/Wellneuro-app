### 2026-08-02 — cohérence du payload d’erreur de la route de référentiel des compléments

- la route interne d’ingestion du référentiel des compléments renvoie désormais un payload d’erreur cohérent avec `ok: false` en cas de payload invalide, sans changer la logique clinique ni les migrations.
