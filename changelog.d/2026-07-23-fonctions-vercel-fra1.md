### Modifié

- **Fonctions Vercel épinglées à Francfort (`fra1`)** : la base Supabase vit en
  `eu-central-1` et les fonctions tournaient dans la région par défaut (`iad1`,
  Washington) — ~80 ms par aller-retour SQL, cause du timeout de transaction
  observé à l'ingestion des claims (5 s dépassées dès 16 claims). Toutes les
  routes gagnent cette latence, et le traitement des données reste dans l'UE.
