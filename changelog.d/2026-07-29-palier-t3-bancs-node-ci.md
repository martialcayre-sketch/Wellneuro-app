### T3 rejoue enfin les bancs `node --test` du CI — et T3 cessait d'être plus large que T1

`wn-test-worktree.sh` s'annonce en première ligne comme « réplique locale du job
CI `verify` ». Il n'en jouait **aucun des cinq bancs `node --test`** : banc de
l'anti-secrets, dossier des droits, validateur du registre des instruments,
comparateur de certification, banc golden de scoring — 99 assertions au total.

**Le point qui décide, c'est l'inversion des paliers.** Deux de ces bancs sont
dans **T1** (`secrets-check`, `dossier-droits-check`), de même que
`test:siin57`. T3 ne les avait pas. Le palier long, celui qu'on lance avant une
PR portant migration ou clinique, était donc **plus étroit** que celui qu'on
lance après chaque édition — et une session qui faisait « T3 avant la PR »
passait à côté de trois contrôles que « T1 après l'édition » aurait pris. C'est
exactement le motif qui a fait entrer le lint dans T1 le 2026-07-21 (LOT-01b) et
les contrats SQL dans ce palier : un palier qui ne couvre pas ce que le CI
vérifie ne protège de rien.

Le banc golden est le cas le plus parlant : il a laissé une dérive de fixture
réelle s'accumuler (`protocol` → `conduite`, PR #389) précisément parce qu'aucun
runner ne le lançait. Il a été branché au CI le 2026-07-28 ; il ne l'était
toujours pas au palier local.

**La liste est extraite de `ci.yml`, jamais recopiée** — même choix que les
contrats SQL trois écrans plus bas, et pour la même raison : une copie diverge au
premier banc ajouté, et la divergence est silencieuse. Mêmes garde-fous
anti-silence, repris tels quels : extraction vide ⇒ échec, banc référencé mais
absent du dépôt ⇒ échec, compte joué ≠ compte extrait ⇒ échec.

**Placement après `ensure_node_modules`, pas avant.** Le chargeur du banc golden
transpile les sources TS via le compilateur, devDependency de `web/` : lancé
avant l'installation, il échoue sur `Cannot find module 'typescript'`. Constaté
en écrivant ce lot, pas déduit.

**`test:siin57` rejoint la séquence longue**, à côté de `npm run test` : le CI
rejoue toute la suite sous `WN_ALI_01_SIIN57=true`, forme que `Q_ALI_01` prend
dans le parc de production depuis le 2026-07-29.

**Ce qui reste hors de `--fast`** : `test:siin57` (une seconde suite complète),
comme le lint et le build. Les cinq bancs y restent — ~4 s à eux cinq, mesurés.

**Preuve par exécution, sur le bloc extrait du script lui-même** : marche
nominale, les cinq bancs verts en 4,1 s ; un banc référencé par le CI mais absent
du dépôt ⇒ « référencé par le CI mais absent du dépôt » ; motif d'extraction
cassé ⇒ « l'extraction a cessé de fonctionner, elle ne rendrait plus silence que
succès ».

**Ce que ce lot ne fait pas** : il ne rapproche pas les deux autres écarts connus
entre le palier et le CI — l'audit des campagnes et l'anti-secrets restent
derrière `--fast`, et la divergence de version PostgreSQL (Debian 17 vs
`postgres:15`) reste assumée, documentée en tête du script.
