### Vercel : builds sautés quand rien ne change sous `web/` (2026-07-22)

Ajout de `web/vercel.json` avec un `ignoreCommand` (`git diff --quiet HEAD^
HEAD -- .`, exécuté dans le Root Directory `web/`). Chaque push construisait
jusqu'ici l'application entière, y compris pour les commits purement
documentaires (`docs/`, `changelog.d/`…) — previews et même builds de
production sans aucun effet sur `app.wellneuro.fr`, qui consommaient le quota
de déploiements Vercel. Désormais, un push dont le diff ne touche pas `web/`
est ignoré (exit 0) ; tout changement sous `web/` — code, migrations
`web/prisma/`, script de build — continue de déployer normalement. Si `HEAD^`
est indisponible (clone tronqué), la commande échoue et le build a lieu :
le repli est toujours de construire. Écarté : désactiver les previews par
branche (`git.deploymentEnabled`), car les previews des PR de code servent à
la vérification visuelle et détectent un build cassé avant merge.
