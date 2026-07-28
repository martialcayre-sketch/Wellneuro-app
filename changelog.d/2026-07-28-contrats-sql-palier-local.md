### Le palier local rejoue enfin les contrats SQL (2026-07-28)

`npm run test:worktree` se présente comme la « réplique locale du job CI
verify ». Il ne l'était pas : les cinq fichiers `web/prisma/checks/*.sql` — ceux
qui éprouvent les CHECK, la RLS, les triggers, les index partiels et les
invariants de données rejoués en transaction annulée — n'étaient lancés que par
le CI.

Conséquence vécue le 2026-07-27 en écrivant le garde de contenu : valider du SQL
de garde obligeait à monter un PostgreSQL à la main, trois fois. C'est le motif
exact qui avait fait entrer le lint dans T1 le 2026-07-21 (LOT-01b) — un palier
qui ne couvre pas ce que le CI vérifie ne protège de rien.

Une étape est ajoutée après `migrate deploy`, avant le seed. **La liste des
contrats n'est pas recopiée : elle est extraite de `ci.yml`.** La recopier
l'aurait fait diverger au premier contrat ajouté, et la divergence aurait été
silencieuse — le palier serait resté vert en ignorant le nouveau garde. Extraction
par `sed` et non `grep -o`, le grep de macOS et celui du runner ne rendant pas la
même chose. Trois refus explicites plutôt qu'un silence : aucun contrat trouvé
dans `ci.yml`, un contrat référencé mais absent du dépôt, un contrat en échec.

L'étape tourne aussi en `--fast` : ces contrats coûtent quelques secondes, et ce
sont précisément eux qu'on veut voir en écrivant une migration.
