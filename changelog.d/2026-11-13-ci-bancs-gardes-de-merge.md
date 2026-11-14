### CI : les bancs des gardes de merge et du contrôle des registres jouent à chaque run (2026-11-13)

Lot `orchestration-3` (L1 bis du plan du super-orchestrateur, lot 1 de l'audit
externe : fiabiliser le socle).

- **Trou fermé.** Six bancs ne tournaient qu'à la main, par `npm run check` :
  le contrôle des registres (`scripts/lib/registres.test.mjs`, lot L1) et les
  cinq gardes que l'intégrateur exige avant un merge — preuve de revue
  PR-Agent sur la tête, sonde release-db, chevauchement, contrôle sur l'arbre
  fusionné, avis Codex de D-505. Une garde de merge redevenue muette restait
  verte tant que personne ne rejouait son banc.
- **Une étape de `controles`** les joue désormais, avant npm, comme les autres
  bancs d'outillage. Le banc de parité exige donc aussi leur présence dans
  `npm run check`, où ils figuraient déjà.
- Hermétiques : joués avec un environnement vidé et un `PATH` sans `gh` ni
  `codex`, ils passent (170 tests). Coût : quelques secondes par run (5 s sur
  le runner, les six fichiers tournant en parallèle).

Aucun contrôle retiré ; `verify`, la protection de branche et les plafonds de
durée sont inchangés.
