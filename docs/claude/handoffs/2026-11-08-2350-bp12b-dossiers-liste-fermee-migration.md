# Handoff — 2026-11-08 — BP-12b (F09), PR 6 : iode et sélénium, polyphénols et antioxydants dans la liste fermée des dossiers de preuve — migration seule

## Branche et état du dépôt

- Branche `b-bp12b-dossiers-liste-fermee`, créée depuis `origin/main` à `25f3cb9a` (#1925), puis avancée en `--ff-only` jusqu'à `36fd8eb7` (#1937). Les commits arrivés entre-temps (documentation et #1936) ne touchent aucun fichier du lot et n'apportent aucune migration. Worktree `.claude/worktrees/b-bp12b-dossiers-liste-fermee` : session concurrente, cycle en `git`/`gh` direct.
- **PR de migration** (exception de `D-373` §2) : elle reste à la file, et la session la merge elle-même, au créneau que donne le responsable. Elle n'est pas déclarée « prête » pour l'intégrateur.
- **Release-db attendue** : elle touche `web/prisma/migrations/**`. Le responsable l'approuve juste après le merge.
- Préalables constatés le 2026-11-08 : la PR #1931 (D-461) est mergée et constatée ; la #1930 (BP-14) est mergée, sa release-db 42528009082 a posé la sentinelle `WN_RELEASE_DB_OK id=42528009082-1` (run rouge par la seule garde anti-recul), et le constat one-off-3280 donne 139 migrations, aucune inachevée, conteneur sur la tête de `main`. Aucune autre migration en vol.

## Objectif

Faire entrer `iode_selenium` et `polyphenols_antioxydants` dans la contrainte `positions_expert_versions_dossier_ferme` (demande du responsable du 2026-11-07, migration et schéma demandés explicitement). C'est la PR 6 de LOT-28 ; la PR 7 (code consommateur) ne part qu'après le constat.

## Décisions prises

- **D-464** (réservée par `wn-reserver-decision`), qui amende D-439 §2 et §5. Trois arbitrages du responsable le 2026-11-08, sur l'option recommandée :
  - l'identifiant `polyphenols_antioxydants`, clé du registre des conflits ;
  - les libellés « Iode et sélénium » et « Polyphénols et antioxydants » ;
  - une règle générale : chaque dossier entre à sa clôture, par une migration en ajout seul puis par le code ; la liste reste fermée.
- Une seule instruction `ALTER TABLE` (DROP puis ADD de la même contrainte), donc atomique. La nouvelle liste contient l'ancienne. `schema.prisma` ne change pas : le CHECK n'y est pas modélisé.
- Le contrat v1 éprouvait « iode_selenium refusé avant sa clôture », un cas qui rougirait dès la migration. Il éprouve désormais `omega_3`, une valeur hors liste. La liste elle-même est au contrat v2.
- Constat de production avant la migration (one-off-6041, lecture seule) : CHECK sur les cinq valeurs ; aucune version de position, aucun acte, aucun arbitrage.
- **Revues de la tête `d78d7d12`, verdicts (2026-11-09)** :
  - PR-Agent : aucune remarque.
  - `wn-reviewer` : GO, aucun P0 ni P1.
    - P2-1 (pas de `lock_timeout`) : écarté. La table est vide, et la migration s'applique au créneau, par le one-off de la release-db.
    - P2-2 (retour arrière) : corrigé, puce ajoutée en D-464 §5 sur arbitrage du responsable.
    - P2-3 (deux phrases de §3 non arbitrées) : corrigé, les deux phrases sont retirées sur arbitrage du responsable.
    - P2-4 (identifiants fixes dans le contrat) : écarté. Le pire cas est un faux rouge, jamais un faux vert, et seulement sur une base locale réutilisée ; le CI joue sur une base neuve, et le contrat v1 a le même patron.
  - CodeRabbit (revue complète demandée à la main) :
    - comptage des CHECK par `conkey` plutôt que par regex : corrigé ;
    - D-464 §3 dit d'ajuster un contrat existant qui éprouvait le refus du dossier entrant : corrigé.
- Remise à niveau de la branche par fusion de `origin/main` (commit de fusion), sur arbitrage du responsable du 2026-11-09.

## Fichiers modifiés

- `web/prisma/migrations/20261108230000_positions_expert_dossiers_v2/migration.sql` (neuf).
- `web/prisma/checks/positions_expert_dossiers_v2_negatif.sql` (neuf) ; `web/prisma/checks/positions_expert_v1_negatif.sql` (un cas et un commentaire).
- `.github/workflows/ci.yml` : étape « Positions expert dossiers negative tests ».
- `docs/decisions/D-464.md` (neuf) ; `docs/decisions/D-439.md` (ligne datée).
- `docs/claude/campagnes/2026-10-04-bio-parcours/lots/LOT-28-positions-expert.md` (périmètre, hors périmètre, interdits).
- `changelog.d/2026-11-08-positions-expert-dossiers-migration.md` ; `docs/claude/plan-journal/F09/2026-11-08-01-dossiers-liste-fermee-migration.md` (rang du jour relu sur `origin/main` : aucun fragment F09 ce jour-là).
- Ce handoff. Hors dépôt : ligne p27 de la page BioFlow.

## Validations exécutées

- Base locale du worktree (`wn-dev-db.sh --migrate`) : migration appliquée ; contrats v1 et v2 verts.
- Mutations du CHECK sur la base locale, puis restauration : la liste à cinq (l'état d'avant la migration), une valeur de trop et la liste sans polyphénols font toutes rougir le contrat v2 (exit 3) ; il est vert après restauration.
- T1 `check:rapide` (17 étapes vertes, 2 sautées) et T1 complet `npm run check` : verts.
- T3 `npm run test:worktree` (sur `b0ebcd01` plus le lot) : séquence CI complète verte en 11 min 9 s ; « Dérive schéma ↔ migrations » donne *No difference detected* ; contrats v1 et v2 joués.
- CI de `d78d7d12` vert : l'étape « Positions expert dossiers negative tests » a réellement tourné.
- Après la correction de CodeRabbit, sur la base locale : contrat v2 vert ; il rougit sur les trois listes mutées et sur une seconde contrainte CHECK posée sur `dossier` (« 2 contrainte(s) »), puis redevient vert après restauration. T1 vert. T3 n'a pas été rejoué : le changement se limite au contrat et à la documentation, et le CI le rejoue sur la tête.

## Problèmes ouverts

- Entre le merge et la PR 7, la base accepte deux dossiers que la route refuse encore. C'est voulu (D-464 §5) : rien ne s'écrit hors liste.
- `routes.test.ts` (l. 123) prend `iode_selenium` comme exemple de dossier hors liste. Il est vrai jusqu'à la PR 7, qui doit le remplacer.

## Prochaine action exacte

1. CI (`wn-attendre-ci`) ; revue CodeRabbit sur la tête (sinon PR-Agent prouvé, sinon `wn-reviewer`), un verdict pour chaque remarque.
2. Le responsable donne le créneau ; avant le merge, l'étape 7 bis de `wn-merge`, puis `node scripts/wn-sonde-release-db.mjs <N>` (`0` seul) ; merge `--squash --match-head-commit`.
3. Release-db approuvée par le responsable ; sentinelle `WN_RELEASE_DB_OK id=<run>` ; constat par conteneur (`migrate status`, définition du CHECK) ; tête en service.
4. PR 7 sur un worktree neuf : `DOSSIERS_POSITION`, `LIBELLES_DOSSIERS`, bancs route et base, atelier vérifié à l'écran (sept dossiers), « prête @sha ».

## Interdits encore actifs

- Production en lecture seule, hors la release-db approuvée par le responsable.
- Aucun texte de position ni de claim au dépôt (D-251 §4).
- Aucun versement, aucune signature, aucun arbitrage par l'assistant.
- Pas de `prisma format`.
- Pas de code consommateur avant le constat ; pas de merge de la PR 7 par la session (intégrateur).
