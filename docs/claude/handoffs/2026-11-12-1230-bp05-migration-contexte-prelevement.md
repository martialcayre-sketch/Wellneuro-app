# Handoff — 2026-11-12 — BP-05 (LOT-05, F20) : migration du contexte de prélèvement (D-497 §8, PR 2)

## Branche et état Git

`feat/bp05-migration-contexte-prelevement` est une session concurrente, dans le worktree `.claude/worktrees/b-bp05-migration`. Elle a été créée sur `origin/main` après le merge de #2013 (D-497), puis recalée encore vide sur la tête suivante. Après ses premiers commits, `origin/main` a été fusionné une fois (#2014, sans fichier commun), sur arbitrage du responsable. C'est une PR de migration seule : la file la merge elle-même, sans déclaration « prête ».

## Objectif

Écrire la PR 2 de D-497 : la table du contexte de prélèvement, son bloc `schema.prisma`, le contrat SQL négatif par forme et sa ligne de CI, la ligne d'effacement et son banc, le fragment. Aucun code consommateur.

## Décisions prises

- La migration est écrite sur confirmation distincte du responsable (consigne de reprise du 2026-11-12, point 2).
- Choix de forme dans le cadre de D-497 :
  - table `contextes_prelevement`, modèle `ContextePrelevement`, migration `20261112120000_contexte_prelevement_biologique_v1` ;
  - pas de colonne d'acte : chaque ligne est une pose, et corriger revient à remplacer la tête (§4) ;
  - une seule tête par racine, tenue par deux index uniques : le partiel `(id_resultat) WHERE id_ligne_remplacee IS NULL`, et `id_ligne_remplacee`. Il n'y a ni verrou consultatif ni banc à deux sessions, car aucune décision ne lit la tête (raisonnement validé par la revue `wn-reviewer`) ;
  - la racine se juge par `resultats_biologiques_racine`, la remontée de BP-09 ;
  - l'instant `pose_le` et l'`ordre` sont posés par la base.
- **Arbitrage du responsable du 2026-11-12** (revue `wn-reviewer`, constat A1), option recommandée : la garde de suppression différée ne refuse plus que si le dossier **et** le résultat survivent. Les contextes d'un résultat partent avec lui, ce qui permet le ramassage des E2E de PR 3 (`nettoyerResultatsBiologiques`). Une tête supprimée seule reste refusée.
- **Arbitrage du responsable du 2026-11-12** : remise à niveau par merge de `main`.
- Constat A2 : la table est ajoutée à `TABLES_BIOFLOW`, un inventaire que seul le banc lit.

## Fichiers modifiés

- `web/prisma/migrations/20261112120000_contexte_prelevement_biologique_v1/migration.sql` (neuf).
- `web/prisma/schema.prisma` : modèle `ContextePrelevement` et deux relations inverses (`Patient`, `ResultatBiologique`), édités à la main.
- `web/prisma/checks/contexte_prelevement_biologique_v1_negatif.sql` (neuf), et sa ligne dans `.github/workflows/ci.yml`. T3 l'extrait de `ci.yml` : aucune ligne à ajouter dans `scripts/wn-test-worktree.sh`, qui n'en porte que pour les bancs à deux sessions, et il n'y a pas de banc ici.
- `web/src/lib/patient/effacement.ts` et `effacement.test.ts` : contextes effacés avant les résultats.
- `web/src/lib/biology-library/publie.ts` : `TABLES_BIOFLOW`.
- `docs/DOSSIER_RGPD.md` : rubrique 5, le modèle nommé, comme l'exige le banc `rubrique5.modeles.test.ts`.
- `docs/claude/campagnes/2026-10-04-bio-parcours/lots/LOT-05-contexte-prelevement.md` : statut.
- `docs/claude/plan-journal/F20/2026-11-12-02-migration-contexte-prelevement.md`, `changelog.d/2026-11-12-bp05-migration-contexte-prelevement.md`, ce handoff.

## Validations exécutées

- `npx prisma validate` passe ; `prisma generate` aussi.
- Sur une base locale vierge : `migrate deploy`, contrat vert (NOTICE « quatorze promesses tenues »), `prisma migrate diff` → No difference detected.
- Deux mutations font rougir le contrat au bon cas : le retrait de `jour_cycle_borne`, puis le retour à l'ancienne garde (dossier seul). Base locale supprimée ensuite.
- T1 complet vert avant chaque commit, `effacement.test.ts` compris (33 tests).
- Premier T3 sur `c399562c3` : rouge au banc RGPD rubrique 5, corrigé en `242dbddd4`.
- Second T3 sur `242dbddd4` : vert, en 11 min 15 s (dérive « No difference detected », nouveau contrat joué, 366 E2E).
- T3 sur la tête après A1 : voir la PR.
- `wn-reviewer` (P0) : GO sur `c399562c3` sous condition A1 (traitée), avec A2 et les nitpicks traités. Revue de l'écart : GO sur `dbf22fcf4`, obligation N1 reportée à la PR 3 (prochaine action). Nitpick écarté : la clause « dossier » de la garde est redondante (le résultat ne survit pas au dossier), mais inoffensive, et elle reste lisible.

## Problèmes ouverts

- Le contre-audit Codex est un geste manuel du responsable : lui fournir le diff de la PR.
- La revue de bot doit porter sur la tête (CodeRabbit, sinon Copilot si son quota le permet, sinon PR-Agent prouvé). Tout constat de migration remonte en arbitrage.
- Le créneau de merge est choisi par le responsable. Il faut la sonde `wn-sonde-release-db` à 0, puis la release-db approuvée dans la foulée.
- **Arbitrage du responsable du 2026-11-12** (constat PR-Agent sur #2018) : l'effacement est rendu tolérant à la table absente. Il lit `to_regclass('public.contextes_prelevement')` dans la transaction et ne touche la table que si elle existe. Attraper l'erreur ne suffirait pas, car une requête sur une table absente annule toute la transaction. Un cas est ajouté à `effacement.test.ts`. **La PR 3 retire cette tolérance** après le constat.
- **Précaution d'exploitation** (revue `wn-reviewer` de l'écart `f23e109a`) : **ne lancer aucun effacement de dossier pendant l'exécution de la release-db**. La migration prend ses verrous sur `patients` puis `resultats_biologiques`, et un effacement toléré les prend dans l'ordre inverse : l'interblocage est possible, pendant quelques millisecondes. Si la migration est l'abandonnée, c'est P3009 au déploiement suivant, puis `migrate resolve --rolled-back` et rejeu.
- Question de la revue, à reprendre au constat : compter en production les résultats dont `supersedes_resultat_id` vise un id absent ou forme un cycle (attendu : 0). Ces fils ne pourraient recevoir aucun contexte.
- Risque résiduel antérieur, hors lot : `resultats_biologiques` n'a pas de garde contre l'UPDATE.

## Prochaine action exacte

Merger la PR par la file, au créneau du responsable, sonde à 0. Puis release-db approuvée, sentinelle `WN_RELEASE_DB_OK` liée au run, et constat par `scalingo run -d` : `migrate status` agrégé par nom, table `contextes_prelevement` vide. Ensuite seulement, PR 3 dans une autre session : retrait de la tolérance à la table absente dans `effacement.ts` (et de son cas de banc), bloc de contexte à la saisie et à la validation d'import, « non recueilli » ≠ « inconnu », motifs de la série, version suivante de « Vos données personnelles » publiée dans le même déploiement, sans drapeau neuf. Le ramassage E2E (`nettoyerResultatsBiologiques`) y supprimera les contextes puis les résultats dans **une seule** `prisma.$transaction([...])`, contextes filtrés par `resultat: { saisiLe: { gte: depuis } }`. Deux appels séparés seraient refusés : la garde est jugée au commit, et le résultat existerait encore au moment où ses contextes partent seuls (revue `wn-reviewer` de l'écart, N1).

## Interdits encore actifs

- Jamais `npx prisma format`.
- Aucune borne, catégorie ni comparaison à une consigne sans provenance.
- Aucun code consommateur avant le constat.
- Production en lecture seule, par `scalingo run -d`.
- Ne pas toucher à t71b (worktree `t71b-cadrage`), t51, r4_01, #2006 (BP-17), t78.
