### Sécurité — deny-all RLS sur `arbitrages_biologiques` (dette de `D-059`)

- **La table était la SEULE de `public` sans RLS en production** (lecture MCP du
  2026-08-18, sur l'ensemble du schéma). La migration
  `20260815010000_arbitrage_biologique_sans_valeurs` avait omis le
  `ENABLE ROW LEVEL SECURITY` que toutes les autres tables patient portent
  depuis `20260707123710_enable_rls_security`. Régression isolée, pas une
  posture — elle se ferme.
- **Ce que la table porte** : un lien nominatif dossier ↔ intention ↔ verdict
  clinique ↔ e-mail du praticien. Aucune valeur d'analyse (le verrou HDS
  tenait), mais « ce patient a fait explorer cette intention, et voici la
  conclusion » est une donnée de santé. Supabase octroyant par défaut les
  privilèges de `public` à `anon`/`authenticated`, une table sans RLS rejoint le
  périmètre PostgREST : la protection ne reposait plus que sur la configuration
  du projet.
- **Sans effet sur les données** : 0 ligne en production, rien n'a jamais
  transité par cette surface.
- **Le contrat SQL existant ne regardait pas ce terme-là** — c'est pourquoi
  l'omission a pu vivre sans qu'aucune garde ne parle.
  `cb_arbitrage_biologique_v1_negatif.sql` assertionne désormais la RLS active
  et l'absence de policy, comme le contrat des panels documentés. Vérifié par
  avant/après : le contrat **échoue** sur la table d'origine et **passe** une
  fois la migration appliquée.
