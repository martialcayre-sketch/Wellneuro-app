### Orchestration : l'outillage de merge de l'intégrateur entre au dépôt et se durcit (D-546, 2026-11-20)

Lot `orchestrateur-l3-integrateur` (file D, L3 du plan du super-orchestrateur,
D-540 §10 (4)). Il applique la réponse `20261113-1941-d` : « Verser et durcir,
avec délai de repentir ».

- **`scripts/wn-integrer.mjs`** remplace `integrer.sh`, qui vivait hors dépôt
  sans banc. Il garde ses étapes et ses codes (7 bis, 7 ter, `main` inchangé,
  tête inchangée, PR empilées, merge lié au sha). Il ajoute quatre gardes :
  - **l'origine** : la déclaration vient du propriétaire du dépôt, et la tête
    du dépôt lui-même (code 19) ;
  - **le délai de repentir** : dix minutes après « prête » (code 20). Toute
    parole sur la PR depuis la déclaration suspend le merge, celle d'un robot
    comprise (code 21). Un commentaire modifié compte à l'heure de sa
    modification, et une déclaration modifiée n'est jamais servie. La parole
    se relit juste avant le merge. Seuls les commentaires du propriétaire qui
    portent `<!-- wn-integrateur -->` en première ligne ne suspendent pas. La
    file redéclare, et le délai repart ;
  - **le bail unique** (code 22) : `bail prendre`, `bail rendre`,
    `bail prendre --reprendre`, sous verrou exclusif. Il est sans expiration,
    et chaque reprise est écrite au journal ;
  - **le journal des merges** : une ligne JSON par passage, refus compris,
    dans le répertoire Git commun du clone, jamais suivi.
  - Durcissements venus des revues : la garde « `main` inchangé » compare au
    `main` vu au début du passage ; une avance `--ff-only` en échec après le
    merge rend le code 25 ; le script refuse si `scripts/` diffère de `main`.
- **Le filet de D-454** passe par le même script (`--filet`), depuis un
  worktree détaché sur `origin/main` : vingt minutes, aucune prise en charge
  marquée, sans bail.
- **La sonde `prete` de `wn-guetteur.mjs`** reçoit le contrôle d'origine du
  guetteur hors dépôt, avec ses mots (`provenance=ok`,
  `CONTROLE-INDETERMINE(…)`). La fonction est partagée
  (`scripts/lib/origine-declaration.mjs`).
- `versPrGraphql` rend l'origine de la tête (`isCrossRepository`,
  `headRepositoryOwner`) ; une tête illisible n'est jamais « même dépôt ».
- **D-546** amende D-454. `CLAUDE.md`, `ROLES_MACHINES.md` et
  `REGLES_PR_MERGE.md` en reprennent la règle : une file n'écrit plus sur sa
  PR après « prête », ou elle redéclare.
- Bancs : `wn-integrer.test.mjs` (neuf, dans `bancs-outillage-check`),
  `wn-guetteur.test.mjs`, `gh-rest.test.mjs`.
