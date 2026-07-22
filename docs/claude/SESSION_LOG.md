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
