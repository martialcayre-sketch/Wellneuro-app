### Ajouté

- **Connexion PostgreSQL portable Scalingo** (préparation migration HDS). La
  résolution d'URL (`resolveDatabaseUrl`) accepte `SCALINGO_POSTGRESQL_URL` en
  repli de `DATABASE_URL`, câblée au runtime (`prisma.ts`) et aux migrations
  (`prisma.config.ts`). Taille du pool réglable par `DB_POOL_MAX` (défaut **1**,
  inchangé pour le modèle serverless Vercel ; à relever sur conteneur Scalingo).
  Durcissement TLS opt-in : `DB_SSL_CA` fait vérifier la chaîne de certificats
  au lieu de la faire confiance aveuglément (défaut inchangé sans la variable).
  Aucun impact sur Vercel/Supabase : tous les défauts reproduisent le
  comportement actuel.
