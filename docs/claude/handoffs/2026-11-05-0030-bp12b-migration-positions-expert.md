# Handoff — 2026-11-05 — BP-12b, PR 2 : migration seule des positions d'expert

## Branche et état du dépôt

- Branche `b-bp12b-migration-positions`, partie de `origin/main` (avancée
  par `--ff-only` jusqu'à 9a960713) ; worktree
  `.claude/worktrees/b-bp12b-positions-expert` (réutilisé ; la branche de
  #1867 est supprimée après son merge).
- PR de **migration** : elle reste à sa file (`D-373` §2, `D-393` §6) ;
  cette session ne la merge pas et la suit jusqu'au constat par conteneur.

## Objectif

Créer les trois tables vides de D-439 (§2, §3, amendement A3), avec leur
contrat SQL négatif, leur ligne de CI et le bloc `schema.prisma`, sans aucun
code consommateur.

## Décisions prises

- Demande explicite du responsable, le 2026-11-04 au soir : « PR2 écris la
  migration ». Le registre RGPD reste inchangé, ce qu'il a confirmé dans le
  même message (« rien au rgpd ») : aucune donnée patient n'entre dans ces
  tables. Le lot s'est écrit dans la nuit, d'où les fragments datés du
  2026-11-05.
- Aucun D-xxx neuf : la PR applique D-439.
- Choix d'écriture, dans le cadre de D-439 et sur ses patrons :
  - contenu à quatre rubriques exactement (`enonce`, `perimetre`,
    `population`, `limites`) ;
  - empreinte d'acte = SHA-256 hex de la concaténation des SHA-256 hex des
    quatre textes, dans l'ordre fixe, pour que le JS la reproduise sans
    dépendre de la mise en forme de `jsonb::text` ;
  - seule la version courante d'une position reçoit un acte ;
  - une révision reste dans son dossier et suit strictement le numéro de la
    version courante ;
  - le motif est obligatoire pour une révocation comme pour une pose ;
  - aucune clé étrangère vers `rag_corpus_claims`, car des bancs y
    suppriment leurs propres lignes. L'existence d'un claim se vérifie à la
    route, et un claim absent se lit « à relire ».

## Fichiers modifiés

- `web/prisma/migrations/20261104230000_positions_expert_v1/migration.sql`
  (neuf).
- `web/prisma/schema.prisma` : trois modèles après les fiches d'usage
  (`PositionExpertVersion`, `PositionExpertActe`,
  `ArbitrageConflitSource`), alignés à la main, sans `prisma format`.
- `web/prisma/checks/positions_expert_v1_negatif.sql` (neuf).
- `.github/workflows/ci.yml` : étapes « Positions expert negative tests » et
  « Positions expert two-session bench ».
- `web/scripts/banc-positions-expert-deux-sessions.test.mjs` (neuf) ;
  `scripts/wn-test-worktree.sh` : le pas T3 du banc.
- `changelog.d/2026-11-05-positions-expert-migration.md`,
  `docs/claude/plan-journal/F09/2026-11-05-01-migration-positions-expert.md`,
  ce handoff.

## Validations exécutées

- `npx prisma validate` : valide.
- `prisma migrate deploy` sur la base locale du worktree, puis `prisma
  migrate diff --from-config-datasource --to-schema` : *No difference
  detected*.
- Contrat négatif joué par `psql` : NOTICE final atteint.
- Huit mutations du schéma, injectées dans la transaction du contrat :
  chacune le fait rougir. Elles retirent le CHECK des appuis, celui de la
  relecture et celui de la forme de la pose ; désactivent les trois
  triggers d'insertion et le trigger TRUNCATE des arbitrages ; coupent la
  RLS d'une table.
- T3 complet (`npm run test:worktree`) : vert, en 8 min 56 s, E2E compris.
  Il a joué la migration, la dérive (*No difference detected*) et le
  contrat. Les corrections qui ont suivi ne touchent que des commentaires
  de la migration et le contrat.
- `wn-reviewer` (P0, migration) : GO, aucun P0 ni P1. Traitement des P2 :
  - P2-1, corrigé : `doit_refuser` vérifie le motif du message. Une version
    inconnue doit être refusée sous son nom, plus par l'empreinte.
  - P2-2, corrigé : six cas ajoutés (format de `structure_sha256`, auteur
    blanc d'un acte et d'un arbitrage, bornes du motif et de l'auteur), et
    l'en-tête nomme les quatre CHECK qu'un trigger masque.
  - P2-5, commentaire corrigé : le `v` est facultatif dans le format du
    claim.
  - P2-4 : SERIALIZABLE est nommé au commentaire des verrous.
  - P2-3 : routé vers la PR 3 (voir « Problèmes ouverts »).
- Après correction, dix mutations font rougir le contrat, dont le CHECK de
  `structure_sha256` et l'auteur blanc d'un acte.

- Contre-revue Codex de 74baec3b : BLOQUER, P1-1 confirmé et reproduit.
  - Le défaut : une transaction SERIALIZABLE dont l'instantané précède une
    première pose commise en READ COMMITTED posait une seconde tête. Il en
    allait de même pour deux premières versions.
  - La détection de SERIALIZABLE ne joue qu'entre transactions
    SERIALIZABLE. Le commentaire repris de `wn-reviewer` (P2-4) était faux.
  - Correctif : les trois triggers n'admettent plus que READ COMMITTED.
  - Nouveau banc `web/scripts/banc-positions-expert-deux-sessions.test.mjs`,
    joué en CI et en T3. Il fait sept courses, chacune constatée en attente
    du verrou : deux premières poses, deux premières versions, révision
    contre acte, retrait contre arbitrage, révocation contre remplacement,
    le scénario de Codex, et REPEATABLE READ et SERIALIZABLE refusés sur les
    trois tables. Il passe 7 sur 7.
  - Contre-épreuve : avec l'ancienne garde, les cas 6 et 7 rougissent (« une
    seconde tête a passé en SERIALIZABLE »).
  - Le banc signe aussi avec l'empreinte calculée en JS, et la base
    l'accepte : la formule est la même des deux côtés.
- Revue CodeRabbit de ea521766 : quatre remarques, toutes corrigées.
  - Majeure : le garde-fou d'hôte local du banc se contournait par `?host=`
    (ou `hostaddr`). Le banc refuse désormais ces deux paramètres.
  - Mineure : le `_` des motifs `LIKE` du nettoyage était un joker. Il est
    échappé.
  - Nitpick : le contrat compte les tables dont un trigger TRUNCATE est
    actif. Contre-épreuve : trigger des versions désactivé ⇒ rouge.
  - Nitpick : une chaîne de versions à deux chiffres (`v1.9` → `v1.10` →
    `v9.9` → `v10.0`, puis `v9.10` refusée). Contre-épreuve : avec une
    comparaison textuelle, le contrat rougit.

## Problèmes ouverts

- Même garde dans quatre migrations déjà en production : REPEATABLE READ
  refusé, SERIALIZABLE admis.
  - Tables : `annulations_resultats_biologiques_v1`, `constats_praticien_v1`,
    `donnees_physiologiques_traitements_v1`, `constats_besoin_praticien_v1`.
  - Démontré dans le code, sans occurrence observée : aucun écrivain de
    l'application n'emploie SERIALIZABLE. `physio-traitements/ecriture.ts`
    le pose en convention, et les transactions nommées sont en
    `ReadCommitted`.
  - Hors de ce lot : un correctif est une migration par table, sur
    demande. Signalé au responsable.
- Les refus que D-439 place à la route seront éprouvés en PR 3 : conflit
  inconnu mais bien formé, fiche hors de la liste curée, claim retenu hors
  du conflit.
- Pour la PR 3, d'après `wn-reviewer` :
  - P2-3 : une écriture par transaction, ou l'arbitrage avant l'acte.
    Sinon, deux transactions croisées s'interbloquent (40P01, sans état
    incohérent).
  - Un banc doit comparer l'empreinte JS et l'empreinte SQL de
    `positions_expert_empreinte_contenu`.
  - Trois questions sont à trancher, à la route ou par le responsable :
    1. un `retiree` sur une version jamais signée, ou un `signee` répété :
       la base les accepte ;
    2. la position retenue par un arbitrage doit-elle fonder la même fiche ?
    3. une fiche peut-elle être fondée par deux positions ?

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue (CodeRabbit, sinon
PR-Agent, D-393 §2), `wn-reviewer` et une passe Codex (P0, migration,
`POLITIQUE_REVUE.md`), un verdict par commentaire. Le merge revient à la file, au créneau choisi par le
responsable. Ensuite : release-db approuvée par lui, sentinelle liée au run,
`migrate status` par conteneur, et seulement alors la PR 3.

## Interdits encore actifs

- Pas de code consommateur avant l'application constatée ; une seule PR
  structurelle à la fois en file B.
- Production en lecture seule ; l'approbation de release-db est un geste du
  responsable.
- Aucun texte de position au dépôt ni dans une migration ; aucune
  sélection de fiche d'après le dossier.
