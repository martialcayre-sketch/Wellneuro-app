### L'outillage Vercel/Supabase quitte le dépôt — le décommissionnement D-080 se lit aussi dans le code (2026-09-01)

Les hébergeurs historiques ayant été définitivement fermés le 2026-09-01 avec
preuve d'effacement (`D-080`, `D-120`), tout outil qui pointait encore vers eux
était devenu un piège muet. Sont retirés : les cinq scripts npm `supabase:*`,
`web/vercel.json`, `web/supabase/` (config CLI et snapshot vide),
`clone_env_vars.py`, `scripts/setup_supabase_prisma.sh` et
`scripts/wn-local-migrate.sh` (visait le Docker Supabase local, et figurait
déjà sur la liste noire du hook anti-risque — le hook, lui, ne bouge pas).
`web/scripts/vercel-build.sh` devient `web/scripts/build.sh` (contenu et
doctrine « le build n'écrit jamais en base » inchangés) ; les bootstrap Mac ne
dépendent plus du CLI Vercel et renvoient vers un `web/.env.local` créé à la
main. Les docs vivantes qui présentaient encore Vercel/Supabase comme
l'infrastructure courante (instructions Copilot, `REGLES_CRITIQUES.md`,
`scripts/README.md`, `WORKFLOW_DEVELOPPEMENT.md`, `ROADMAP_TECHNIQUE.md` §8)
disent désormais Scalingo. Intouchés, délibérément : les
migrations Prisma historiques, `withSupabaseSslMode` dans
`web/src/lib/postgres.ts` (actif mais inerte), les fragments et handoffs
d'archive, et les fixtures de tests qui rejouent l'époque Vercel.
