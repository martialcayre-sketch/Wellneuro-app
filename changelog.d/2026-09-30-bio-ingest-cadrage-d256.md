### Biologie : cadrage de l'acquisition des résultats (BIO-INGEST), décision D-256 et ouverture de la campagne (2026-09-30)

- **Aucun code, aucune migration.** Ce lot pose le cadre avant tout
  développement : décision `D-256`, campagne suivie `2026-09-30-bio-ingest`,
  cadrage `docs/claude/campagnes/CADRAGE_BIO_INGEST_2026-09-30.md`.
- **Les résultats biologiques gardent un seul modèle.** Qu'ils soient saisis
  par le praticien, extraits d'un compte rendu ou transmis par un laboratoire,
  ils aboutissent tous dans `resultats_biologiques`, et toujours après une
  validation humaine. Aucune couche d'ingestion générique n'est créée.
- **Cinq arbitrages du responsable** : la saisie groupée passe en premier ;
  les documents source sont stockés en base HDS ; une saisie groupée est
  enregistrée en entier ou pas du tout ; l'extraction PDF passera par une IA
  vision, et seulement après la mise à jour du registre RGPD et du document
  patient ; la provenance détaillée est portée par le lot d'import, jamais par
  le résultat.
- **Écartés** : le choix d'un analyte par un LLM, les conversions d'unité
  silencieuses, les résultats qualitatifs en V1, la lecture des résultats par
  le moteur clinique et la saisie vocale.
