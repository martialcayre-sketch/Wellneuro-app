### Ajouté

- **Le catalogue biologie niveau 1 entre en base** (`D-068`, migration de
  données) : 47 analytes, 15 panels et leurs compositions, 2 plages
  fonctionnelles sourcées (ferritine 50–80 ng/mL, `WN-CL-0044-003` verbatim ;
  vitamine D cible ≥ 45 ng/mL, `WN-CL-0154-054`). **Composition seule, zéro
  indication en base** : les conditions d'indication vivent dans la table
  signée du code (`D-059`), jamais en colonnes de catalogue. Aucune valeur
  biologique patient — le verrou HDS est hors du périmètre de cette migration.

- **La barrière `D-003` s'exécute à l'insertion** : chaque plage fonctionnelle
  est un `INSERT … WHERE EXISTS (claim VALIDE et actif)`. En CI, corpus vide,
  zéro ligne ; en production, les claims sont vérifiés (`v1.0`, relus le
  2026-08-17). Une plage absente après release est un écart à lire, jamais un
  oubli silencieux.

- Colonne `validation_medicale_requise` sur `biology_analytes` (arbitrage
  F.6) : l'insulinémie seule à `true` — règle de sécurité produit, posée
  explicitement, aucun claim ne la fonde et c'est écrit. Vocabulaire d'unités
  étendu de `µg/mL` (voie additive prévue).

- Écarts de transcription **nommés, jamais comblés** : panels « seconde
  intention » non transcrits (analytes hors §A), apoprotéine et IgA sans site
  de prélèvement omises, seuil « < 10 » de la vitamine D non converti en borne
  de plage, ratios conservés en analytes.
