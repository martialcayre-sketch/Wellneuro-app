# Journal de session — Wellneuro NNPP2

> **Archivage** : les entrées du 2026-07-04 au 2026-07-10 sont compactées dans `docs/archive/sessions/SESSION_LOG_2026-07-04_to_2026-07-10_compact.md`, celles du 2026-07-11 au 2026-07-14 dans `docs/archive/sessions/SESSION_LOG_2026-07-11_to_2026-07-14_compact.md`, et celles du 2026-07-14 au 2026-07-22 dans `docs/archive/sessions/SESSION_LOG_2026-07-14_to_2026-07-22_compact.md`. Le journal actif ne conserve que les entrées récentes utiles à la reprise.

## 2026-07-22 — Corpus 5.0 : banc qualité d'extraction (triple lecture croisée)

**Décisions** : reprise du chantier pgvector/corpus, phase 2 de la proposition
5.0 (banc qualité, préalable au pipeline d'ingestion). Banc construit dans
`tools/corpus/bench/` (worktree `corpus-bench-qualite`) : pour chaque page,
lecture **A** (pdftotext, vérité des nombres) + **B** (Claude Sonnet 5 vision) +
**C** (GPT-5.4 vision), invariants déterministes bloquants — dosages nombre+unité
de A devant survivre dans B et C, couverture caractères (bigrammes), comptage de
cellules. Clés API lues depuis `web/.env.local` (jamais committées), les 3 PDF
et sorties hors dépôt (`~/.wellneuro/corpus-bench/`).

**Résultat (85 pages)** : restitution des dosages **100 % B / 100 % C**, 0 perdu
des deux. Tokens entrée ~2011 (Claude) / ~1742 (GPT) par page — l'hypothèse
~2100 de la note de coûts tient. Projection 11 000 pages, batch −50 % : croisé
B+C **~76 $** (la note estimait ~107 $ ; recalage par tokens réels).

**Écarté** : traiter les « manques » comme des régressions — deux confusables
Unicode dans l'invariant lui-même, trouvés sur deux runs. Run 1 : ellipse ASCII
`...` absorbée dans un run numérique → dosage fantôme `2.5 mg`. Run 2 : mu grec
`μ` (U+03BC) des sorties Claude vs signe micro `µ` (U+00B5) de la couche texte →
9 faux manques sur un tableau µg (aucune troncature réelle, vérifié ligne à
ligne). Extracteur durci : ellipses neutralisées, nombres bien formés (milliers
FR `1 000`, décimales `2,5`), `μ→µ`. Re-scoré hors-ligne (`rescore.mjs`) à coût
API nul → 100 %/100 % confirmé sur les deux runs. Invariant qui n'a jamais bougé :
perdus des deux = 0. Les modèles vision sont non déterministes (formatage,
codepoints) : l'invariant doit être robuste aux confusables.

**Prochaine action** : pipeline `tools/corpus/` (extract/invariants/chunk/claims/
ingest) sur les notebooks prioritaires (09 Nutrition, 10 Micronutrition, 08
Biologie fonctionnelle — à confirmer) ; puis migration `rag_corpus_claims`.

**Questions ouvertes** : notebooks prioritaires à confirmer ; schéma
`rag_corpus_claims` à compiler ; champ `patient_identifiable` explicite ;
lancement avant 2026-08-31 (tarif intro Sonnet 5).

## 2026-07-22 — Corpus 5.0 : pipeline verbatim + pilote 09 ingéré (dev-local)

**Décisions** : chantier corpus repris en 3 phases (snapshot → pipeline → claims).
Découverte structurante : le « WELLNEURO_CORPUS_STUDIO » du Drive n'est pas jetable
— c'est le pipeline NotebookLM existant (specs SPEC_DECOUPAGE_RAG, 28+ markdown
candidats, preuves G1-G4). Ne rien supprimer, ne pas vider les notebooks.
Preuve à l'appui : l'ancien canonique NotebookLM de WN-SRC-0056 avait **retiré
les 103 dosages** (synthèse dose-strippée, statut réel EN_ATTENTE), là où la
route 2 IA les conserve tous. Les deux couches sont distinctes : la route 2 IA
produit le **verbatim fidèle** (couche manquante), l'ancien alimente les claims.

**Livré (tools/corpus/)** : `snapshot/` (391/391 appariés, 2 doublons contenu),
`lib/wellneuro-text` (réplique normalize, parité hash 3/3 vs serveur),
`extract/` (2 IA A/B/C + invariants), `chunk/` (conforme SPEC : unités de sens
350-800 mots, dose insécable), `ingest/` (`--validate` via vrai
parseRagIngestPayload + `devlocal.mjs` direct pgvector). Pilote 09 (6 sources,
163 pages, ~3 $) : extrait, 26 chunks conformes, **ingérés en base éphémère
pgvector, récupération 26/26**, recherche sémantique juste.

**Écarté** : supprimer le studio / vider les notebooks ; réutiliser les anciens
canoniques comme verbatim (dose-strippés) ; monter un next dev complet (npm
install absent du worktree) au profit d'un harnais direct pgvector répliquant le
SQL du store. Un « perdu des deux » sur WN-SRC-0053 = faux positif (collision de
colonnes de tableau dans pdftotext A ; B/C corrects ; portion alimentaire, pas un
dosage médicamenteux).

**Prochaine action** : Phase 3 — migration `rag_corpus_claims` (SQL brut, pattern
de 20260721090000, revue wn-reviewer avant / execute_sql après). Piste MP4 (14
vidéos, hors 09) à traiter séparément.

**Questions ouvertes** : schéma claims à valider avant migration ; ingestion prod
(acte gaté) ; passage à l'échelle des 88 sources de 09 en batch −50 %.

## 2026-07-22 — IDP2 : #226 vérifiée en prod, G5 constaté actif, précondition LOT-04 re-mesurée

**Décisions** : vérification post-merge de #226 (exception migration/auth) :
migration `20260722100000_idp2_g5_trace_connexions_google` appliquée en
1 tentative (11:39:27Z), table conforme (5 colonnes, pkey + 2 index, RLS
deny-all), requête inverse `_prisma_migrations` vide. Constat non anticipé :
**WN_G5_GOOGLE_PATIENT est actif en production** — 03d exécuté côté humain —
et la trace fonctionne (1 ligne `consomme`, PAT006, 15:04Z), preuve de bout
en bout. Précondition LOT-04 re-mesurée : **1/13** (PAT006 seul passé par
Google ou lien magique). Réconciliation `.wn/state.json`
(`last_completed_lot` → LOT-03f, next_action à jour).

**Écarté** : ouvrir LOT-04 (précondition non remplie, migration destructive) ;
toute écriture en base (lectures `execute_sql` seules).

**Prochaine action** : le praticien renvoie l'invitation aux 12 patients
restants, re-mesurer avant LOT-04 ; sinon suite SP-SPI LOT-01.

**Questions ouvertes** : date de rapprochement 13/13 ; backlog audit.

## 2026-07-22 — C3 LOT-06 : fil médecin V1 livré en deux PR, migration vérifiée en prod

**Décisions** : plan technique approuvé puis exécuté — #252 migration seule
(`correspondances_medecin`, FK RESTRICT, RLS deny-all, effacement nommément,
revue `wn-reviewer` GO, **vérifiée en prod** : 1 tentative, requête inverse
vide, 9 colonnes, 0 policy) ; #255 routes + onglet « Correspondance »
(consigneLe inantidatable, dossier clos = 409 deux sens, `@` refusé dans le
libellé, TRUST indicateur seul). Merges par l'assistant sur instruction
explicite. Vercel : rate limit Hobby → plan Pro pris ; reciblage de #255 après
merge de #252 — `verify` absent (filtre base main), débloqué par close/reopen.

**Écarté** : garde TRUST bloquante (le partage a lieu hors app) ; deux routes
séparées (mêmes gardes) ; exception « entrant » sur dossier clos (rouvrir →
transcrire → reclôturer).

**Prochaine action** : merger #255 dès `verify` vert, puis clôture
documentaire (spéc, campagne, state.json).

**Questions ouvertes** : désactivation des Previews (réglage dashboard, posé ?) ;
bascule C→A au constat d'usage ; visibilité patient du fil.

## 2026-07-22 — Corpus : couche claims (ingestion + rédaction 2 IA)

**Décisions** : voie d'ingestion des claims livrée (route interne
`/api/internal/rag/claims/ingest` + lib), statut `EN_ATTENTE_VALIDATION` forcé et
**version de claim immuable**. Rédaction **2 IA** : Sonnet 5 rédige, GPT-5.4
contre-vérifie la fidélité au verbatim (désaccord → exclu). PR **#254** (infra)
mergée, **#262** (drafting) verify vert.

**Écarté** : supersession auto des claims (risque de défaire une validation) →
additif/immuable ; dry-run d'inspection avant ingestion (choix « enchaîner
direct »).

**Preuves** : revue adversariale (workflow, 20 agents) — 10 constats confirmés,
tous corrigés, dont l'ajout silencieux de sources à un claim validé. Dev-local :
136 claims (53 exclus par la fidélité), 136/136 ingérés, barrière D-003 tenue.
T1 + T2 (`test:worktree`) verts.

**Prochaine action** : claims → prod, gaté sur le déploiement de #254 (Vercel) +
une surface de validation praticien (Atelier corpus, non ouverte).

**Questions ouvertes** : passage à l'échelle 88 sources (API batch) ; piste MP4.

## 2026-07-22 — Hygiène du flux : déploiements Vercel filtrés, purge outillée des branches

**Décisions** : Ignored Build Step posé deux fois — `web/vercel.json` (#258,
mergée) et réglage projet via API — les commits hors `web/` ne consomment plus
de déploiement (quota Hobby 100/j) ; constaté opérant sur #264 (« Canceled by
Ignored Build Step »). `delete_branch_on_merge` activé. Purge sur preuve (tip ⊆
`headRefOid` d'une PR mergée, ou ancêtre de `main`) : 8 worktrees, 76 branches
locales, 15 remote. `scripts/nettoyage-branches.sh` (#264, verify vert) rejoue
cette preuve — constat seul par défaut, `--appliquer` pour purger.

**Écarté** : désactiver les previews par branche (vérification visuelle des
PR) ; toute suppression sans preuve (le squash merge aveugle `--merged` ; deux
rétentions légitimes trouvées).

**Prochaine action** : sortir `docs/ai/Anthropic Api Key.pages` du dépôt ;
trancher `86e0619` (journal LOT-01b jamais mergé).

**Questions ouvertes** : filtre docs-only sur `verify` (check obligatoire) ;
fichier sale de `rag-pgvector-audit`.

## 2026-07-22 — Hygiène du flux, acte II : sauvetages et régime permanent

**Décisions** : clé Anthropic (`.pages`) sortie du dépôt →
`~/Documents/WELLNEURO-API-KEYS/`. Journal LOT-01b (`86e0619`) réinséré à sa
place chronologique (#267). Requalification de 9 sources corpus préservée en
PR brouillon, validée par le praticien et mergée (#268). Purge finale outillée :
restent 3 worktrees (sessions actives), 5 branches locales, 3 remote. Régime
permanent constaté : `delete_branch_on_merge` auto-nettoie les branches
mergées, le filtre CI docs-only existait déjà (`verify` 25 s contre 6 min 33),
l'Ignored Build Step ne consomme plus de déploiement docs.

**Écarté** : valider moi-même la requalification corpus (gouvernance des
données → brouillon) ; pull du checkout principal (compaction du SESSION_LOG
en cours, non committée).

**Prochaine action** : trancher `worktree-corpus-bench-qualite` (`7e4f591`,
brouillon de migration claims) — domaine de la session corpus.

**Questions ouvertes** : compaction du SESSION_LOG à terminer ; deux scripts
keep-awake non suivis dans `scripts/`.

## 2026-07-22 — Cadrage SP-CONV (convergence Spirale 5.0, trajectoire partagée)

**Décisions** : campagne `2026-07-22-sp-conv-trajectoire-partagee` cadrée (7 lots, sans migration) ; contrat d'épisode partagé en code seul sur les cycles G2 ; parcours patient 6 étapes HC-F synchronisées ; réouvertures actées : renommage A7 et baselines V12 ; tags du rail non rouverts (réglé par V14). **Écarté** : lots migration/gate multi-cycles — la confrontation au code montre le gate G2 levé le 19/07 (`c2b_cycle_identity_v1`) ; 5 étapes de la maquette-démo ; KPI d'accueil (métriques supprimées par V14). L'audit du jour est hérité **rectifié** (table dans CAMPAGNE.md). Séquence programme (#12), registre §3 et index README amendés ; `.wn/state.json` non touché (g-trust-04 active). Les trois questions ouvertes ont été tranchées dans la même session (D9 « Mon carnet alimentaire », D10 fiche plein écran réel, D11 quatre statuts patient sous dérogation inchangée). **Prochaine action** : merge de la PR de cadrage (Copilot), puis LOT-00 (annotations + maquettes) après décision de gouvernance sur l'activation. **Questions ouvertes** : aucune au cadrage.

## 2026-07-22 — G-TRUST-04 PR-7 : journal des accès praticien branché

**Décisions** : PR-7 livrée et mergée (#278, verify 6 min 21 vert, merge sur
instruction explicite). Helper `journaliserAccesDossier` (awaité fail-open
patron G5, purge 365 j, code `PRATICIEN.ACCES_DOSSIER.TRACE_ECHEC`), garde
`verifierAppartenancePatient(…, acces?)`, 12 routes GET branchées (7 cat. A,
5 cat. B ralliées à la garde, 403 préservés à l'octet). Revue adversariale
`wn-reviewer` : GO, 0 bloquant. T1 (298 tests) + T2 (1 min 58, 73 E2E) verts.
Post-merge : table vérifiée (`execute_sql`) — 0 ligne, RLS deny-all.

**Écarté** : journaliser les refus (nommerait un dossier non lu) ; convertir
la catégorie C à la garde (choix anti-oracle, PR-9 en appel direct).

**Prochaine action** : PR-5 (`@ts-nocheck` vague 1) ou PR-6 (exercice sur
table) ; PR-9 routes C/D.

**Questions ouvertes** : preuve fonctionnelle du journal au premier dossier
ouvert en prod ; PR #277 (keep-awake) toujours ouverte.

## 2026-07-22 — G-TRUST-04 PR-6 : exercice sur table de la procédure de violation

**Décisions** : exercice sur table exécuté (exigence 6) — scénario fictif,
lien portail de Michel Dogné transféré à un proche ; déroulé §2→§8 en
vérifiant chaque geste contre le code réel ; fiche 2026-EX1 ; verdict :
exécutable en 72 h par une seule personne. Constat EX-1 corrigé dans la même
PR : RUNBOOK « Révocation accès patient » inexécutable (`portailToken`
inexistant, route `DELETE /api/praticien/token` — trois portes, une
transaction — ignorée). §8.4 réécrit « exercée le 2026-07-22 ». PR #281
verte, `verify` inclus — merge confié à Copilot.

**Écarté** : reprendre PR-7 (constatée déjà mergée #278 par la session
parallèle avant d'agir) ; toucher la checklist (réservée PR-11) ; alerte
active sur les logs SECURITY (EX-2, surface nouvelle non décidée).

**Prochaine action** : reste du LOT-00 (PR-5/8/9/10/11) confié à l'autre
session.

**Questions ouvertes** : existence physique du registre des violations
(EX-3, humain) ; confirmation juridique D-TRUST-02.

## 2026-07-23 — Corpus : pilote chunks + claims ingéré en production

**Décisions** : ingestion prod exécutée — 26 chunks (6 sources pilotes, batch
001) puis 136 claims LOT_001, via le nouveau `tools/corpus/claims/ingest.mjs`
(#282, mergée sur autorisation explicite). Rotation de `RAG_INTERNAL_SECRET` :
variable Vercel **Sensitive** (`env pull` ne rend que le masque `[SENSITIVE]`),
valeur conservée au coffre `~/Documents/WELLNEURO-API-KEYS/`. Branche
`worktree-corpus-bench-qualite` supprimée (recouverte par main, preuve : diff
vide hors package.json obsolète).

**Écarté** : lots de 64 puis 16 claims — timeout transaction Prisma 5 s (~4
requêtes séquentielles par claim × latence iad1↔eu-central-1) ; `--lot 4`
retenu, correctif serveur remis à plus tard.

**Preuves** : base prod — 136 `EN_ATTENTE_VALIDATION`, 0 `VALIDE`, 136 liens
sha complets, barrière `match_wellneuro_rag_claims` vide même sondée avec
l'embedding d'un claim ingéré au seuil 0.

**Prochaine action** : validation praticien des 136 claims dans l'Atelier
(`dashboard/corpus`).

**Questions ouvertes** : région des fonctions (fra1) et regroupement des
requêtes du store avant l'échelle 88 sources ; piste MP4.
