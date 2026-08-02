# Journal de session — Wellneuro NNPP2

> **Archivage** : les entrées du 2026-07-04 au 2026-07-10 sont compactées dans `docs/archive/sessions/SESSION_LOG_2026-07-04_to_2026-07-10_compact.md`, celles du 2026-07-11 au 2026-07-14 dans `docs/archive/sessions/SESSION_LOG_2026-07-11_to_2026-07-14_compact.md`, et celles du 2026-07-14 au 2026-07-22 dans `docs/archive/sessions/SESSION_LOG_2026-07-14_to_2026-07-22_compact.md`. Le journal actif ne conserve que les entrées récentes utiles à la reprise.

## 2026-08-03 — Rayon compléments alimentaires : contrat de corpus stabilisé

**Décisions** : clôture du lot de consolidation autour du contrat de corpus du rayon compléments alimentaires. L’UI praticien distingue désormais explicitement un corpus vide (état normal, « en cours de constitution ») d’un corpus indisponible ou bloqué par une garde métier, et affiche le message métier renvoyé par l’API. Le changement reste borné au périmètre C4 déjà existant : pas de migration, pas de changement clinique, pas de nouveau flux de données.

**Livré** : messages de corpus centralisés dans [web/src/lib/supplement-library/corpusMessages.ts](/Users/wellneuro/Wellneuro-app/Wellneuro-app.worktrees/wn-docs-setup/web/src/lib/supplement-library/corpusMessages.ts), réutilisés par [web/src/lib/supplement-library/rayonCorpus.ts](/Users/wellneuro/Wellneuro-app/Wellneuro-app.worktrees/wn-docs-setup/web/src/lib/supplement-library/rayonCorpus.ts) et consommés par [web/src/components/complements/FicheComplementPanel.tsx](/Users/wellneuro/Wellneuro-app/Wellneuro-app.worktrees/wn-docs-setup/web/src/components/complements/FicheComplementPanel.tsx). Une régression ciblée couvre le cas indisponible dans [web/src/components/complements/FicheComplementPanel.test.tsx](/Users/wellneuro/Wellneuro-app/Wellneuro-app.worktrees/wn-docs-setup/web/src/components/complements/FicheComplementPanel.test.tsx).

**Validations** : `cd web && npx vitest run src/components/complements/FicheComplementPanel.test.tsx src/lib/supplement-library/rayonCorpus.test.ts`, puis `cd web && npm run type-check && npm run lint`.

**Prochaine action** : préparer la clôture de campagne avec le handoff mis à jour et le statut de lot/campagne aligné.

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

## 2026-07-22 — SP-CONV : cadrage mergé (#280), campagne activée, LOT-00 livré

**Décisions** : merge de #280 par l'assistant sur instruction explicite (« si green go », `verify` vert en 47 s) ; activation de SP-CONV en **campagne parallèle** (`.wn/state.json` + `sync`, g-trust-04 reste principale) ; LOT-00 exécuté dans la foulée. **Livré** : rectification datée en tête de l'audit UX du 22/07 ; « Résolue par G2 » sur les deux documents du gate multi-cycles ; ligne C2B du README rectifiée ; 3 maquettes (bandeau cockpit D5/D10, parcours synchronisé D2/D7/D11, Mon équilibre qualitatif D7) vérifiées au navigateur ; six constats revérifiés sur main post-merge. **Écarté** : capture du parcours-synchronise avant PR (même patron que les deux vérifiées). **Prochaine action** : merge de la PR LOT-00 (Copilot, sauf instruction), puis LOT-01 — contrat d'épisode partagé, code seul. **Questions ouvertes** : aucune.

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
## 2026-07-23 — Fonctions Vercel à Francfort (fra1) — question ouverte tranchée

**Décisions** : `web/vercel.json` épingle `regions: ["fra1"]` (#286, mergée
sous l'autorisation full-auto de la session corpus). Cause racine du timeout
de transaction traitée : fonctions en iad1 contre base eu-central-1, ~80 ms
par aller-retour SQL. Bénéfices : toutes les routes serveur, et traitement
des données dans l'UE.

**Écarté** : regroupement des requêtes du store claims (cause supprimée,
changements minimaux) ; élévation du timeout Prisma (même raison). `--lot 4`
reste disponible mais n'est plus nécessaire.

**Preuves** : verify vert (6 min 14) ; déploiement `abf23cf` READY ;
`x-vercel-id: fra1::fra1::…` constaté deux fois sur route dynamique, 401 en
231 ms.

**Prochaine action** : validation praticien des 136 claims (Atelier), puis
échelle 88 sources.

**Questions ouvertes** : piste MP4.

## 2026-07-23 — G-TRUST-04 clos : PR unique de clôture (routes C/D, catalogue typé, campagne livrée)

**Décisions** : reliquat du LOT-00 en une PR unique (décision utilisateur).
Journal des accès branché sur les 10 routes C/D — **correctif au passage : le
GET booklet n'était pas scopé praticien**, rallié au patron du POST.
`@ts-nocheck` levé **17/17** (mesure : 1 560 erreurs, dont 1 425 par le seul
`meta` non typé) — le juge de certification transpile désormais le TS avant
son eval, prouvé neutre. Doublons Q_NEU_04/Q_NEU_08 dédoublonnés (gagnant
runtime conservé). Checklist exigences 5/6 à jour, GD-6 consignée, onboarding
requalifié « fonctionne » (E2E portail-parcours). Lot + campagne livrés.

**Écarté** : borne GD-5 (l'utilisateur a choisi de moderniser le juge) ;
annotation `Record` du catalogue (272 erreurs induites → inférence conservée,
moteur en 51 `any` explicites).

**Prochaine action** : preuve fonctionnelle du journal au premier dossier
ouvert en prod (requête GD-3).

**Questions ouvertes** : conflit bénin possible sur `.wn/state.json` avec la
PR #284 (sp-conv).

## 2026-07-23 — SP-CONV livrée : les six lots de code en full-auto

**Décisions** : exécution full-auto autorisée (« lance tous les lots à la suite, checks, merge PR autorisés, nettoyage branches »). Six PR livrées et mergées à la suite, verify vert à chaque fois : #288 contrat d'épisode partagé (lib pure, garde D7) ; #290 cockpit adaptatif (phase initiale D5, bandeau épisode, plein écran D10, tests réécrits — l'ancien comportement testé était le reproche de l'audit) ; #291 suture time-travel (index Spirale → asOf via LectureEtatPassePanel piloté) ; #293 parcours patient synchronisé (étapes 5-6, champs additifs D11, dédoublonnage CTA) ; #294 Jardin (« Mon carnet alimentaire » — A7 amendé au registre, équilibre qualitatif, 44 px, TTL brouillons, MetricsSection supprimée) ; PR LOT-06 preuve visuelle (ARIA + toHaveScreenshot Linux fs-gaté, portail via Jennifer Martin isolée, workflow visual-baselines, dérogation V12 levée). **Écarté** : capture Mon équilibre portail (exigerait une consultation complète — remplacée par hub déplié). **Prochaine action** : déclencher `visual-baselines` et committer les premières baselines. **Questions ouvertes** : aucune — campagne close.

## 2026-07-23 — SP-CONV : épilogue baselines, campagne close (/wn-finish)

**Décisions** : premières baselines commitées (#298) après deux itérations de relecture — état transitoire du cockpit et textes temporels attrapés avant entrée au dépôt (#297), échappatoire de bootstrap `WN_VISUAL_UPDATE` (#296). La première comparaison active en CI a détecté une vraie instabilité : `dashboard-patients` dépend de l'état laissé par les parcours (2386 vs 2546 px) → retiré du pixel, revue + ARIA conservés. Six baselines comparent vert sous Linux. Verify absent après push sur #298 : débloqué par close/reopen (précédent #255). **Validations** : T1+T2 par lot, verify vert sur les 11 PR, audit campagnes 0 erreur. **Écarté** : merge --admin (attendre la propagation du check suffisait). **Prochaine action** : reprise g-trust-04 (campagne active) ; SP-CONV n'a plus rien en vol. **Questions ouvertes** : aucune.

## 2026-07-23 — Atelier corpus v2 : validation par lot livrée (4 PR)

**Décisions** : la procédure « validation à deux vitesses » (actée le matin,
#289) est exécutable en production. Quatre PR séquencées, toutes mergées :
- **#300 (PR A)** — migration journal des décisions `rag_corpus_claim_decisions`
  (append-only par trigger, cree_le non antidatable, RLS deny-all).
- **#302 (PR B)** — lib : tirage serveur seedé (30 % dégressif, allowlist
  déclaré/observé), `deciderLot` (lot figé au tirage, couverture des chunks,
  UPDATE + journal transactionnels), bascule motivée ; migration de suivi
  20260723120000 (index unique « un tirage, une issue », trigger allowlist).
- **#303 (PR C)** — écran voie rapide + route de restitution en mode revue.
- **#304 (PR D)** — générateur de questionnaire (couverture 1 question ↔ 1 chunk).

**Écarté** : denylist `<> 'interprété'` (revue : laissait entrer `vécu`) →
allowlist stricte ; unicité d'issue applicative (revue : course concurrente) →
index unique en base ; couverture « tous chunks actifs » (revue : sources sans
claim insignables) → « chunks atteignables ».

**Preuves** : deux revues adversariales `wn-reviewer` par migration (PR A :
NO-GO 12 constats → GO ; PR B : NO-GO 2 bloquants concurrence → GO), contrats
SQL joués en CI, T3 verts, base prod vérifiée après chaque migration (journal :
3 triggers/RLS ; suivi : index unique + trigger allowlist présents).

**Prochaine action** : le praticien exerce la voie rapide sur le pilote
(`dashboard/corpus`) — 87 claims en voie rapide, 49 en individuel.

**Questions ouvertes** : générer les questionnaires pilotes (nécessite
ANTHROPIC_API_KEY) ; passage à l'échelle 88 sources.

## 2026-07-23 — Fin de session SP-CONV : vérification prod, rien en vol

**Décisions** : session close sur une vérification factuelle — la 5.0 est **en production** (déploiement Vercel `READY` à chaque merge sur `main`, `app.wellneuro.fr` répond ; dernier déployé : `f2aaccc`). Les maquettes n'ont plus rien à valider : la référence est l'artifact acté en V14, les trois maquettes de campagne ont été réalisées par les LOT-02/04/05 et restent au dossier comme trace. **Écarté** : rouvrir un lot — aucun défaut constaté. **Prochaine action** : tour de validation humaine en prod (fiche adaptative, time-travel, portail) + validations jamais faites (zoom 200 %, lecteur d'écran réel, appareil physique — dette HC-F) ; côté programme, SP-CAB attend `n ≥ 5` épisodes clos. **Questions ouvertes** : aucune pour SP-CONV.

## 2026-07-23 — Atelier : notebooks, modale, questionnaires in-app, bibliothèque NotebookLM

**Décisions** (arbitrages praticien en session) : entrée de l'Atelier = table
des sources **groupée par notebook** (registre sanitaire, importé statiquement) ;
**voie rapide en modale plein écran** (fini le défilement sous la vue) ;
**génération du questionnaire dans la modale** (route serveur Sonnet 5, une
question par chunk atteignable, la génération ne décide rien) ; bibliothèque
**NotebookLM par dossiers Drive**, nourrie au **markdown canonique**
(`tools/corpus/notebooklm/exporter.mjs` + guide, D-003 non engagé). PR #307 et
#309 mergées.

**Écarté** : fenêtre navigateur séparée (perte de session NextAuth) ; PDF
originaux pour NotebookLM (canonique choisi) ; import de fichier questionnaire
(remplacé par la génération in-app).

**Corrigé au passage** : la voie rapide chargeait la file avec `sourceId=`,
paramètre ignoré (route lit `source=`) — couverture affichée faussée, serveur
déjà juste.

**Prochaine action** : exercer la voie rapide sur le pilote (modale, notebook
09) ; téléverser la bibliothèque dans Drive et créer le premier NotebookLM.

**Questions ouvertes** : échelle 88 sources ; piste MP4.

## 2026-07-23 — UX 5.0 V15 : rubrique Bibliothèque (maquette)

**Décisions** : rubrique Bibliothèque activée dans la maquette Spirale
(PR #312, squash `4ecf9ae`, mergée sur instruction explicite du
propriétaire) ; file d'envoi générale multi-patients — un mail, un lien
portail par patient ; aperçu vierge « le Jardin » ; création/import en
tiroirs 440 px ; artifact republié sur la même URL. Revue adversariale
(38 agents) : barème PSS-10 corrigé /40, aperçu du mail resynchronisé.
Questions produit consignées en ARBITRAGES §6. Validations : Chromium
headless (interactions, hauteur bornée, zéro erreur console),
anti-secrets, `verify` 33 s (docs-only) — pas de suite web/, aucun
changement d'app.

**Écarté** : artifact séparé (maquette unique) ; panier par patient
(file globale préférée) ; toucher à l'app.

**Prochaine action** : trancher ARBITRAGES §6 (nommage, écart catalogue,
alias, orchestration serveur de la file) avant implémentation.

**Questions ouvertes** : implémentation app de la vue.

## 2026-07-23 — Épilogue G-TRUST-04 : merge #292, preuve GD-3 acquise, purge — projet en pause

**Décisions** : #292 mergée par l'assistant sur instruction explicite (squash
`1a8d14c`), après deux conflits résolus avec `main` — SP-CONV livrée puis
close en parallèle → état combiné `idle`. Nettoyage sur preuve : 5 worktrees,
6 branches locales. **Preuve fonctionnelle GD-3 acquise en production** :
3 lignes de journal à 08:45 (une minute après le déploiement) — gabarits
littéraux, `GET` seul, identifiant synthétique ; zéro erreur runtime. Pause
actée : gestes humains d'abord.

**Écarté** : forcer le verrou du worktree `g-trust-04-journal-acces-pr7`
(session vivante) ; ouvrir un nouveau fil (corpus #289, exigences 2/3,
dossier RGPD) — reportés au choix du praticien.

**Prochaine action** : humaine — invitations aux 12 patients, trancher #289,
D-TRUST-02, registre EX-3, dérogation au 2026-10-21.

**Questions ouvertes** : aucune côté assistant.

## 2026-07-23 — SP-TRAJ : Fiche-trajectoire 5.0 livrée en 6 lots

**Décisions** : audit confirmé — le rail « Fiche-trajectoire » menait à la page
héritage ; plan approuvé (périmètre complet, arbitrages revisités → **A6-R2 au
registre** : courbe momentum praticien aux seuls jalons mesurés, repère cabinet
n≥5, estimé↔mesuré « second temps » ; porte d'entrée `/dashboard/trajectoires`).
Livré : #311 (mergée) puis pile #313→#317 — Spirale navigable + deep-link,
mode de vie 7 domaines daté, momentum+cabinet, porte d'entrée, tiroirs
« Questionnaires & packs », preuve navigateur Spirale peuplée. Merges par
l'assistant sur instruction explicite — train en cours (#313 mergée, rebase +
verify par étage).

**Écarté** : E2E peuplée sur Sophie/Jennifer (baselines pixel, fixtures) →
Michel + helper auto-nettoyant ; extraction des formulaires en fichiers séparés
→ tiroirs in-situ (état entrelacé).

**Prochaine action** : purge des branches sur preuve et retour du dépôt au
régime permanent — la campagne est close dans cette même PR (state idle),
train de merges achevé, maintenance faite (#301, #318, #308 mergées).

**Questions ouvertes** : échecs locaux `portail-lien-magique` (anti-oracle de
temps, vert en CI) ; baselines pixel des nouveaux écrans (différées).

## 2026-07-23 — SP-TRAJ : merges, maintenance et clôture (Copilot hors forfait)

**Décisions** : sur instruction explicite (Copilot en dépassement de forfait),
merges et maintenance repris par l'assistant — mémoire de gouvernance suspendue
en ce sens, retour à Copilot à la demande. Train mergé après `verify` vert et
rebase par étage : #313→#317 ; production vérifiée READY sur `f220ed7`.
Maintenance : #318 et #301 mergées (conflits d'append du journal résolus sans
réécriture) ; #308 dégelée (frontmatter de lot manquant → corrigé), **revue
adversariale indépendante GO**, son constat VuesRapides intégré à #315. Purge
sur preuve : 9 branches locales/distantes, prune ; `state.json` idle ;
anti-veille stoppé.

**Écarté** : merger #308 sans revue (PR d'une autre session) ; toucher aux
branches des sessions actives (protégées par le script).

**Prochaine action** : gestes humains (voir `state.json`) ; retour de la
gouvernance Copilot quand l'utilisateur le dira.

**Questions ouvertes** : baselines pixel des écrans trajectoires (différées).

## 2026-07-24 — Instruments du cabinet livrés en production (PR #328)

**Décisions** : lot « complet d'emblée » livré — table `cabinet_instruments`, cycle brouillon → relecture → publication, import JSON/CSV, resolver commun. Après revue adversariale (56 agents, 14 constats confirmés dont 1 bloquant) : assignation faisant autorité côté patient, contenu gelé (409) pendant les envois, submit défensif **scopé aux ids CAB_** — le 409 global aurait cassé les questionnaires fonctionnels (23 assignations réelles en attente, vérifié en prod).
**Écarté** : snapshot de définition par assignation (migration lourde, gel applicatif équivalent) ; index partiel (inexprimable en Prisma).
**Validations** : T3 ×4 verts (E2E inclus), 561 tests, banc 63 questionnaires, `verify` CI vert, migration appliquée en prod (RLS active, 0 échec).
**Prochaine action** : arbitrer `Q_STR_02 max:40` dans `equilibre/constants.ts` et le motif import-masqué `Q_STR_01`.
**Questions ouvertes** : rayons Analyses biologiques et Fiches conseils à cadrer.

## 2026-07-24 — PSS-10 : couverture stress bornée sur /50 (PR #348 mergée)

**Décisions** : `equilibre/constants.ts` `Q_STR_02 max 40→50`. Le PSS-10 servi est coté 1–5 (brut ∈ [10,50]) ; `max:40` (vestige 0-4) écrasait à 0 toute couverture de brut ≥ 40 — fondation critique faussée. Bump `VERSION_SCORE_EQUILIBRE v1→v2` (imposé par la convention du fichier). Q_STR_02 migré de l'inline `questions.ts` vers le module `stress.ts` (options PSS dans `shared.ts`) ; deux tests assertent désormais la constante.
**Écarté** : test d'invariant `max==maxTotal` (choix « migrer » plutôt que « garde-fou ») ; normalisation min–max (systémique, hors périmètre) ; PR sur la branche stale `feat/instruments-cabinet` → branche fraîche depuis `main`.
**Validations** : `npm run check` + banc + 415 tests chemin-version verts sur base `main` ; E2E isolés 94 passés (seul échec = flake documenté `portail-lien-magique`) ; revue `wn-reviewer` GO ; CI `verify` pass ; mergée squash `699b228`, branche purgée.
**Prochaine action** : exploitation — signaler la frontière v1↔v2 (momentum masqué sur cycles en cours).
**Questions ouvertes** : motif import-masqué des ~27 autres questionnaires ; rayons Analyses biologiques / Fiches conseils.

## 2026-07-24 — Accueil Observatoire : Fil du jour aligné sur la maquette, quatre lots livrés

**Décisions** : campagne `2026-07-23-accueil-observatoire` (4 lots) planifiée puis livrée ; mergée dans `main` par Copilot pendant la nuit — #308 (timeline horodatée, carte imminente « Maintenant », résumé qualitatif, relectures agrégées par patient, bandeau « Vues rapides ») ; #323 (aside Météo d'adhésion réutilisant SP-MET, inbox questionnaires par patient remplaçant les cartes « Reçu », correspondance récente réutilisant C3 LOT-06, « Principe 5.0 » retiré) ; #324 (cartes jalon J21 / momentum) ; #327 + suivi #334 (agenda `RendezVous`, migration `ao_rendez_vous_v1` — vérifiée en prod : 1 tentative aboutie, table conforme, requête inverse `_prisma_migrations` vide). Correctif signalé « Trajectoire » des Vues rapides : déjà réglé par #315 (SP-TRAJ) dans le même train — rien à faire, worktree fermé sans commit.

**Écarté** : agrégat global des relectures façon maquette (incompatible avec le refus G1, ancré sur un patient) → agrégat par patient, clé datée.

**Prochaine action** : aucune côté ce chantier — campagne close.

**Questions ouvertes** : aucune.

## 2026-07-25 — Certification corpus des questionnaires : LOT-00/01/07 mergés

**Décisions** : audit d'architecture externe challengé puis intégré. Doctrine actée — le RAG certifie, source et explique ; le moteur déterministe calcule ; le graphe clinique oriente ; l'IA rédige. Une certification vaut pour une version, une langue, une population et un usage, jamais globalement. Mergés : #359 cadrage (13 lots, décisions praticien) ; #360 registre des instruments (63 entrées, axes séparés forme publiée / version servie / droits / cosmin / cycle de vie) avec module de validation et son propre banc, `scoring-check` entré dans T1 ; #361 moteur d'orientation dark (table vide, double verrou, filtre droits dur, règle sans claim ⇒ rien).
**Écarté** : tables en base (artefacts JSON/TS versionnés, zéro migration) ; compilateur remplaçant `calculateScore` (réécriture de prod) ; formule composite de momentum et couverture des besoins produite par le LLM (données déterministes).
**Validations** : T1 + garde 63 questionnaires ; 35 tests Vitest + 15 `node --test` ; T2 95 passés (seul échec = flake `portail-lien-magique`) ; revue `wn-reviewer` GO, constats traités ; CI vert sur les 3 PR et sur `main` après merge, contenu vérifié sur `main`.
**Prochaine action** : humaine — fournir les PDF sources des instruments et trancher les droits (PSQI, QLQ, MMSE, Conners, Epworth, HIT-6) pour ouvrir les lots 2-4.
**Questions ouvertes** : divergences à arbitrer — MFI-20 sommé sans inversion d'items, Berlin à 9 items, PSQI adapté, `protocol` mêlé aux bandes de l'IRLS.

## 2026-07-26 — Rayon biologie : import de la nomenclature NABM (CB-02a)

CB-02a mergé (#374) et vérifié en production : 12 tables, RLS deny-all sans policy, 0 ligne. Le lot, annoncé sans migration, en a porté une — mesurer la source avant d'écrire a montré que CB-01 n'avait de colonne ni pour `codeIncompatible` (438 actes sur 987, jusqu'à 17 valeurs) ni pour le snapshot exigé par l'audit. Trois chiffres de l'audit corrigés : 987 actes et non 988 (le 988ᵉ est la racine `NABM`), 63 non-actes, aucun code non numérique mais 256 à zéro de tête.

**Décisions** : snapshot en TEXT et non `jsonb`, pour que son empreinte reste recalculable en base ; vocabulaire de `source_provenance` restreint à `nabm_smt_ans` sur cette table seule.

**Écarté** : merger sans relire la base ; extraire la connexion de production par le MCP Vercel ; écrire par le MCP Supabase, qui contournerait les cinq gardes.

**Validations** : 21 tests Vitest ; 987 actes réellement importés sur PostgreSQL 15 ; contrat vert avec données ; 25 tests négatifs rejetants ; banc d'intégration 9 cas câblé en CI ; revue `wn-reviewer` NO-GO, trois défauts de fond corrigés ; CI vert, migration relue en base.

**Prochaine action** : l'import en production **n'est pas lancé** — aucune chaîne de connexion sur le poste. Le câbler dans `vercel-build.sh` (patron C5) plutôt que de faire transiter un secret.

**Questions ouvertes** : sort d'une correspondance signée dont l'acte disparaît (à trancher avant CB-02c) ; régime documentaire figé ou non entre signature et courrier ; source `labo` dans les snapshots.

## 2026-07-26 — Certification corpus (lots 2-3) et fuite du booklet patient

**Décisions** : rapatriement des 123 PDF Drive → 106 sources extraites en triple
lecture ; banc de certification passé sur **59 instruments** (12 propres, 11 avec
au moins une divergence critique confirmée par les deux lectures, 16 critiques ;
MFI-20 et PSQI confirmés, PSS-10 témoin propre). Droits SIIN actés au registre
sur les 13 instruments internes. **Fuite de production fermée** (#370) : le
booklet envoyé au patient rendait axes, vigilance et questions d'entretien —
dont les signaux d'alerte déclarés. Garde de registre anxiogène confirmable
côté route.

**Écarté** : l'ingestion pgvector, pourtant autorisée — 140 chunks validés hors
ligne, **rien écrit en prod** : les sources sont massivement des échelles
tierces sous copyright, hors périmètre de la déclaration SIIN.

**Validations** : T1, T3, CI `verify` (E2E inclus) verts ; deux revues
`wn-reviewer` NO-GO justifiées, défauts corrigés. #370/#371/#373 mergées.

**Prochaine action** : rejouer le banc sur `Q_ALI_03` et `Q_STR_06` (Karasek),
non croisés.

**Questions ouvertes** : droits des instruments tiers (bloque pgvector) ;
arbitrage des 16 divergences (lot 4) ; PR #372 en attente sur deux points
d'affichage ; rétablir ou non un profil par axes côté patient, avec des libellés
écrits pour lui.

## 2026-07-26 — G5 staging réparé + P2 bornes I/O Scalingo (#377)

**Décisions** : G5 staging basculé sur le vrai client patient Externe `750815743505` — la prod marchait déjà (6 connexions gmail réelles en base). Le blocage `org_internal` venait d'un client **parasite** `385215216634-tanfoe` créé par erreur dans le projet praticien Interne, posé à tort sur staging. Audit complet des identités Google livré (`docs/claude/propositions/2026-07-25-audit-identites-google/`). **P2 mergé (#377)** : helper `creerTransportSmtp` (timeouts 10/10/20 s) sur 8 envois SMTP + `createEmbeddings` borné à 30 s.

**Écarté** : projet Google dédié patient (existe déjà) ; fire-and-forget SMTP (masquerait l'échec d'e-mails qui *sont* le livrable).

**Validations** : T1 vert ; T2 `test:worktree` 2092 unitaires + 95/97 E2E (2 échecs = artefact `.env.local`, prouvé local) ; CI `verify` vert 8m25 ; base prod lue via MCP.

**Prochaine action** : supprimer le client parasite + son JSON (console) ; `DB_SSL_CA` staging ; lots A4/A5.

**Questions ouvertes** : propriété du projet `750815743505` (perso gmail vs org wellneuro.fr) à vérifier/transférer.

## 2026-07-26 — DB_SSL_CA staging + lots code A4/A5 clos (#382)

**Décisions** : `DB_SSL_CA` posé sur staging (root CA « Scalingo Databases », `tlsNoVerify=non` confirmé en logs) — chaîne TLS vérifiée. **A4** (exig. 5) tranché : le GET agenda `rendez-vous` **n'est pas journalisé** (liste opérationnelle ≠ dossier de santé nommé ; `motif` = note d'agenda praticien), documenté en code + test de surface d'exposition. **A5** (exig. 7) : 13 routes praticien authentifiées sans aucun test reçoivent « sans session → 401 » (dont metrics/patients-pg/trust, données patient). **Tous les lots CODE de prépa HDS sont faits** (fondation+P0+P1+P2+A4/A5).

**Écarté** : journaliser l'agenda (surface non clinique) ; faire confiance à l'audit `wn-explorer` brut — 8 faux positifs « manque 401 » écartés par vérif déterministe.

**Validations** : T1 vert (29 tests) ; CI `verify` vert sur #382 (8m31, E2E inclus, en env propre).

**Prochaine action** : migrations Prisma **C** sous 🚪 go explicite — hachage `patients.access_token` (exig. 4) + RLS (exig. 3), protocole renforcé (revue avant, base prod après).

**Questions ouvertes** : go pour migration C ? ; volet ops/juridique HDS (responsable, échéance 2026-10-21) ; propriété projet Google `750815743505`.

## 2026-07-26 — Audit de la chaîne alimentaire 5.0 (PR #380 mergée)

**Décisions** : audit livré en réponse à deux documents praticien (simulation du workflow cible, verdict métrologique sur `Q_ALI_01/02/03`). Sept affirmations vérifiées à la ligne, sept exactes. Quatre constats inédits : le besoin 2 « Micronutriments » est alimenté par la fatigue de Pichot **et** figure dans les fondations critiques — son effondrement plafonne le *Mon équilibre* global à 50 ; `Q_ALI_02`/`Q_ALI_03` n'alimentent aucun besoin ; `Q_ALI_03` promet l'estimation dans ses consignes servies ; `POST /api/portail/ja/observations` n'est appelé par aucun client. Désaccord de fond acté : la référence de certification est la **publication primaire**, pas le PDF du cabinet — sur `Q_ALI_02` l'app est plus fidèle au MEDAS publié que le PDF qu'on lui oppose. Merge par l'assistant sur instruction explicite.

**Écarté** : les 15 domaines proposés (réduits à 5-6 réellement discriminés) ; restaurer les 57 items SIIN (non validés — renommage recommandé) ; exécuter le P0 (bump `VERSION_SCORE_EQUILIBRE` v3→v4 sans demande explicite).

**Validations** : anti-secrets vert ; T1 vert après `npm ci` + `prisma generate` (conteneur nu) ; CI `verify` success 31 s ; citations `fichier:ligne` revérifiées, deux corrigées avant commit.

**Prochaine action** : humaine — trancher les quatre arbitrages du §7 (source du besoin 2, sort de `Q_ALI_01`, alcool dans `Q_ALI_02`, écriture patient du carnet avant le 2026-10-21 sous hébergement non-HDS).

**Questions ouvertes** : `scoring-check` rapporte 0 preuve psychométrique sur les 64 instruments du registre — hors périmètre, mérite son propre fil.

## 2026-07-27 — CB-02b en production et onze arbitrages praticien

**Décisions** : CB-02b mergé (#394) — notebook 08 ingéré, 135 chunks / 758 claims
tous en attente. Onze arbitrages tranchés puis gravés (#399, dossier
`propositions/2026-07-27-arbitrages-praticien/`) : la publication primaire fait
foi ; rescorage rétroactif des passations ; `Q_ALI_01` restauré à 57 items ;
dimensions déclarées sur `Q_CAR_01` et `Q_GEO_04` ; `protocol` hors des bandes
(12 instruments) plus un filtre en lecture ; pilote de 10 sources sur `LOT_006` ;
rayon corpus C4 filtré par notebook ; voie lente biologie retirée du cadrage ;
trois décisions CB-02c. Réserve posée : sous-scores catégoriels `Q_ALI_01`
adossés à la boussole alimentaire, après implantation et passation test.

**Écartées** : estampiller la version du barème (le praticien préfère la série
homogène) ; forme courte de `Q_ALI_01` ; produire `metadata.rayon` dans la chaîne
(imposerait migration et backfill) ; nettoyer les `scores_json` enregistrés
(écriture patient pour un gain nul).

**Validations** : anti-secrets vert ; `verify` vert sur #394 (9 min 2 s, E2E) et
#399 (30 s) ; chiffres recoupés en production par `execute_sql` ; revue
adversariale NO-GO sur #399 — quatre bloquants vérifiés à la ligne et corrigés,
dont une protection décrite à tort comme absente.

**Prochaine action** : auditer une trentaine des claims biologie étiquetés non
prescriptifs — il dira si l'étiquetage LLM peut servir de gate, et conditionne
CB-04.

**Questions ouvertes** : go pour le lot de rescorage (recontact si changement de
bande ? gel des déclenchements ? dénombrement avant/après ?) ; QLQ-BR23, règle
EORTC à lire ; Berlin à rejouer au banc ; garde de divergence registre ↔ base
pour la décision 7 ; `npm ci` jamais joué dans `tools/corpus` en CI.

## 2026-07-27 — Conduites hors des bandes (#389) et garde anti-secrets refait (#396)

**Décisions** : #389 mergée (`159ec9a`) — les conduites sortent de
`interpretation`, et le bloc de scores brut est filtré avant le prompt. Le
modèle continue de recevoir l'orientation, **une fois, étiquetée** par la
mini-synthèse : le filtre retire un doublon, pas une information. #396 mergée
(`bf513c0`) — `secrets/` ignoré, motifs élargis à la forme JSON, banc de 14 cas
en CI et en T1, trois codes de sortie (`2` = « je n'ai pas pu vérifier »).

**Écarté** : couvrir `GOOGLE_CLIENT_SECRET` et `NEXTAUTH_SECRET` — 8 et 28
correspondances, toutes des placeholders ; un garde qui échoue toujours finit
désactivé. Et recalculer les 4 passations MFI-20 : le PDF source montre un
**autre instrument** (échelle, inversions, dimensions et libellés divergent).

**Prochaine action** : `actif: false` sur `Q_SOM_07`, en PR depuis `main`.

**Questions ouvertes** : le checkout principal doit `git pull` pour que
`secrets/` prenne effet là où sont les identifiants ; un fichier binaire indexé
échappe encore au mode `--staged` ; aucune fixture ne rejoue la forme héritée
`interpretation.protocol` par `route.post.test.ts`.

## 2026-07-27 — Migration C / LOT-04 : retrait du jeton portail (PR #397 mergée)

**Décisions** : Option 1 — le cookie de session signé `wn_portail` devient l'unique credential ; résolution par `session.idPatient`, segment d'URL = idPatient (non secret). 50 fichiers (+799/−1350), machinerie morte supprimée (`portal-access.ts`, `lienPermanent.ts`). Aucune migration (colonnes conservées, rollback `git revert`). Révocation tenue à toutes les entrées (garde magic-link réécrite — classe PR #202). Mergée après confirmation des drapeaux d'entrée actifs en prod ; l'utilisateur a lancé `gh pr merge` (le classifier le bloque même après « go » — pas de contournement `gh api`).

**Écarté** : hachage du jeton (relu pour reconstruire l'URL, impossible isolément) ; Option 2 (rebuild `/portail/espace/*`) différée ; DROP COLUMN → PR ultérieure après fenêtre de stabilité.

**Validations** : T1 vert, tsc 0, T3 E2E verts (2 échecs = artefact env worktree connu) ; wn-reviewer GO conditionnel ; post-merge — Vercel prod `success`, DB prod schéma intact (colonnes présentes, 14 actifs, 0 révoqué), `/portail/connexion` 200 avec les deux voies (Google + redemande).

**Prochaine action** : humaine — comms patient (liens permanents cassés) + parcours authentifié réel (magic-link reçu + Google + un révoqué refusé aux trois entrées).

**Questions ouvertes** : cadrer la PR 2 (`DROP COLUMN access_token*`, avec réintroduction d'un drapeau de révocation de remplacement).

## 2026-07-27 — P0 métrologique : le besoin 2 n'est plus mesuré par la fatigue (PR #398)

**Décisions** : `VERSION_SCORE_EQUILIBRE` v3 → v4. `Q_SOM_06` (fatigue de Pichot) retiré du besoin 2 « Micronutriments essentiels », qui devient non évalué — il est fondation critique, donc une fatigue élevée plafonnait le *Mon équilibre* global à 50 sur une carence jamais mesurée. Registre aligné (12 → 11 sources). Frontière de version corrigée : seule l'étiquette `versionScore` est figée, les valeurs sont recalculées, et la comparaison ne reprend pas automatiquement — la note héritée de v2→v3 était fausse. Merge par l'assistant sur instruction explicite.

**Écarté** : retirer le besoin 2 des fondations critiques (une couverture `null` est déjà ignorée par le plafond — inerte, pas dangereux) ; bumper `VERSION_MAPPING_BESOINS` et figer la valeur plutôt que l'étiquette — décisions d'architecture hors lot.

**Validations** : revue adversariale `wn-reviewer` **NO-GO initial**, quatre points traités ; bloquant levé par lecture de production (aucun patient ne perd son indice, `assessment_episodes` vide). Suite complète 280 fichiers / 2 132 tests ; `verify` CI 8 min 14, E2E inclus. Cinq tests ancrent les invariants jusque-là revendiqués en commentaire.

**Prochaine action** : humaine — points 2 à 4 du P0 (promesses de `Q_ALI_03`, seuils provisoires de `Q_ALI_01`, garde-fou IA).

**Questions ouvertes** : étiquette vs valeur de `versionScore` ; `VERSION_MAPPING_BESOINS` figé à `besoins-v1` alors que le mapping a bougé deux fois.

## 2026-07-27 — RLS exig. 3 tranché (posture A), chemin critique HDS vidé

**Décisions** : RLS (exig. 3) tranché **posture A** — deny-all en place (0 policy,
0 `FORCE`, app en `postgres`) + gardes applicatifs = contrôle suffisant, sans code
base. Gravé : `DECISIONS.md` D-005, note DPO prête, addendum, checklist (chemin
critique → A→D→E). **Chemin critique code = vide.**

**Écarté** : posture B (`FORCE` + policies) — disproportionnée mono-domaine, risque
de régression ; force-suppression du worktree verrouillé.

**Incident** : premiers Write/Edit sur le checkout principal (chemins hors
worktree), nettoyés ; sa modif SESSION_LOG (autre session) préservée. 5 branches
HDS mergées effacées.

**Validations** : anti-secrets `--staged` vert ; PR #407 `verify` vert 29 s (docs only).

**Prochaine action** : envoyer la note au DPO/auditeur pour confirmer la posture A.

**Questions ouvertes** : confirmation DPO ; Sentry client ; PR 2 `DROP COLUMN
access_token*` ; ops D/E + juridique F (2026-10-21).

## 2026-07-27 — P0 métrologique alimentaire, points 2 à 4 (PR #408, mergée)

Retiré des questionnaires alimentaires ce qu'ils n'affirment pas : titre et
consignes de `Q_ALI_03` ne promettent plus d'estimation en g/kcal, seuils de
`Q_ALI_01` signalés provisoires, consigne IA interdisant de conclure à une
carence ou une quantité.

**Défaut trouvé hors plan par la revue adversariale** : `Q_ALI_03` émettait un
bloc `monnier` calculé depuis des sous-scores inexistants — 0 g/j et 0 kcal/j
invariants, persistés et transmis au modèle. Un signal de dénutrition fabriqué,
porté par la passation du 2026-07-25. Bloc retiré, clé filtrée du prompt. Le
rapport d'audit affirmait le contraire ; ligne corrigée.

Écartés : recâbler le bloc (exigerait poids, portions, table de composition) ;
renseigner `versionServie.description` (le garde du registre l'interdit sous
`a_auditer`) ; retirer `MO10` et suspendre `Q_ALI_01` (arbitrages cliniques).

**Prochaine action** : backfill des `titre` figés — la fiche praticien affiche
encore l'ancienne promesse sur la passation concernée.

**Questions ouvertes** : neuf réserves au changelog, dont les libellés
« Apports » et les bandes de `Q_ALI_01` qui continuent de conclure.

## 2026-07-27 — `actif` devient une garde de route (#406, #410)

**Décisions** : #406 (`0c7d9af`) — `actif: false` ne gardait que les écrans ;
les trois chemins d'assignation l'ignoraient, dont l'onboarding portail, sans
clic praticien. Garde par `IDS_SUSPENDUS`, jamais par le complément
`IDS_ASSIGNABLES` (il exclut alias et passations praticien, et refuserait des
instruments valides). #410 (`caa0424`) — trois défauts de revue adversariale :
code `INSTRUMENT_SUSPENDU` distinct de `RESOLUTION_FAILED` (un pack tout
suspendu émettait deux fois le même code) ; test de route sur `portail/valider`,
dont la trace pouvait disparaître sans un seul échec ; `PacksPanel` affichait
`Q_SOM_07` brut et un compte faux.

**Écarté** : consultation validée à zéro questionnaire (non atteignable) ;
retrait du seed `REP_J02_SOM07` — il reproduit l'état réel de la production.

**Validations** : T1 vert ; T2 281 fichiers Vitest verts, 5 échecs E2E =
pollution `.env.local` connue ; `verify` vert 8 min 37 ; prod lue par
`execute_sql` (3 assignations, toutes verrouillées).

**Prochaine action** : retirer le worktree `certification-corpus-lots-0-1-7`
depuis le checkout principal ; lots 5-6 (besoins).

**Questions ouvertes** : bloc axes du booklet patient ; `PATCH assignations`
re-sert un suspendu ; les passations invalides alimentent encore fiche et
synthèse IA.

## 2026-07-27 — Le réservoir Q_SOM_07 est fermé (#418)

**Décisions** : #413 mergée. #418 (`4e35516`) — les passations à interprétation
retirée cessent d'alimenter fiche, Fil et synthèse IA. Registre distinct de
`IDS_SUSPENDUS` : `actif: false` décide de l'envoi, pas de la lecture. Liste
blanche, seul `rawAnswers` subsiste. Consigne v5 → v6. Trois arbitrages :
synthèses antérieures qualifiées (critère = date), `evaluability` gagne
`not_interpretable`, `PATCH` / portail / `submit` refusent un suspendu — contre
la doctrine écrite d'`instruments.ts`.

**Écarté** : réécrire les 3 synthèses validées (écriture en base) ; recycler
`not_calculable`, qui aurait nié vingt items présents.

**Validations** : 15 mutations, chacune ≥ 1 échec ; 2200 tests ; `verify`
8 min 29 ; prod relue — rien réécrit.

**Prochaine action** : retirer les deux worktrees ; lots 5-6 (besoins).

**Questions ouvertes** : bloc axes du booklet ; un booklet parti n'est pas
rappelé ; `RETRAIT_EN_SERVICE_LE` en dur.

## 2026-07-27 — Audit de la chaîne trajectoire patient (docs-only)

**Décisions** : clôture de session par un lot documentaire, sans aucun code.
Audit complet de la chaîne trajectoire (SP-CONV + SP-TRAJ) demandé par
l'utilisateur après signalement que le périmètre dépassait une clôture. Règle de
preuve ajoutée : aucun constat de comportement sur lecture seule — sondes Vitest
jetables exécutées, portée mesurée en production.

**Trouvé** : la chaîne praticien est **dormante** (0 épisode, 0 protocole, pour
17 patients) ; un jalon sans réponse nouvelle est rendu « mesuré » avec la valeur
de T0 et un momentum « stable » (F1, prouvé), ce que deux frontières écrites
interdisent mot pour mot ; le repère de cabinet en hérite ; côté patient, « *n*
bilans jalonnent votre parcours » alors qu'il y en a eu un. Aucun patient
concerné aujourd'hui — défauts latents.

**Écarté** : tout correctif de code (F1 modifie un signal clinique servi → bump
v5 + demande explicite) ; le backfill des `titre` figés (données de production).

**Audit externe confronté** (3e document apporté) : juste sur `Q_ALI_01`, risque
résiduel n° 1 — il pilote seul une fondation critique avec des seuils que le code
déclare non certifiés. Faux sur la couverture du carnet, qui refuse explicitement
de qualifier ; mais le verdict de suffisance existe ailleurs et dit au patient
« nous en savons assez » sur trois traces du même jour. Écarté : brancher `AL12`
au besoin 3 (rejouerait le défaut du besoin 2) ; 14 domaines dont 8 vides.

**Prochaine action** : arbitrer `Q_ALI_01` — renommage et sortie des fondations
critiques. Elle commande le lot 1 du plan révisé.

**Questions ouvertes** : sort du « silence utile » ; le cycle protocole → épisode
a-t-il vocation à servir (zéro ligne en base) ; six domaines ou quatorze ; les
quatre questions du rapport trajectoire.


## 2026-07-27 — Clôture : #416 mergée, raccourci docs-only du CI constaté

**Décisions** : #416 mergée en squash (`9693b91`) sur instruction explicite —
audit trajectoire, confrontation de l'audit externe, plan alimentaire révisé.
Conflit sur ce journal avec #419 (deux entrées ajoutées au même endroit) résolu
en conservant les deux, dans l'ordre d'arrivée.

**À retenir** : depuis #412, `verify` détecte un diff purement documentaire
(`ci.yml:53-85`) et saute build et E2E — vert en 33 s là où la même PR prenait
8 min 37 avant le merge de `main`. Ce n'est pas un passage à vide : anti-secrets
et audit des campagnes restent inconditionnels. Ne pas lire un `verify` court
comme un CI qui n'a rien vérifié, ni comme la preuve que les E2E sont passées.

**Écarté** : forcer un run complet sur un diff docs-only.

**Prochaine action** : arbitrer `Q_ALI_01` — lot 1 du plan révisé.

**Questions ouvertes** : inchangées, voir l'entrée précédente.
## 2026-07-28 — Agenda du sommeil : audit, contrat v2 et complétude face au consensus

**Décisions** : audit de la maquette « Wellneuro 5.0 » puis refonte en deux lots, dans le worktree `agenda-sommeil-v2` (non committé). Lot 1 : fin du pré-remplissage par la nuit de la veille (on validait 20 copies conformes sans un geste), cadran tactile sans clavier, éveil nocturne obligatoire avec classe `aucun` explicite, barème refondu en 4 axes indépendants (la latence y comptait 3 fois ; la qualité vécue n'y comptait pas), seuils 7/14 nuits dont 4 de week-end, écart-type en n−1, niveau de preuve B→D, besoin 5 pondéré (mouvement 1/2, repos 1/2). Lot 2, après comparaison au Consensus Sleep Diary : réveil final (3ᵉ poignée conditionnelle — le réveil matinal précoce était invisible et comptait comme du sommeil), aide au sommeil obligatoire, éveil reborné 15/30/60, métriques de fréquence.

**Options écartées** : suppression des horaires et score montré au patient (orthosomnie) ; facteurs et fréquence dans l'indice (expositions, double comptage) ; conversion des classes d'éveil v1 (inventerait une précision).

**Validations** : T1 vert (606 tests) ; T3 : 2225 unitaires verts, 96 E2E passés, 2 échecs pré-existants dans `portail-google.spec.ts` (dépendants du `.env.local` local, hors périmètre).

**Prochaine action** : `/wn-review` (passe adversariale — seuils cliniques), puis commit et PR des deux lots ensemble.

**Questions ouvertes** : l'heure de mise au lit reste absente (nos efficacités sont plus flatteuses qu'un agenda partant du coucher) ; `test:worktree` rend 0 même quand son PostgreSQL ne démarre pas.

## 2026-07-28 — Agenda du sommeil : mise au lit et redéfinition de l'efficacité

**Décisions** : ajout de la 4ᵉ ancre du Consensus Sleep Diary — question « vous avez éteint la lumière : en me couchant / après un moment au lit », la seconde ouvrant une poignée 🛏️ sur le cadran. Deux conséquences voulues : le temps au lit court désormais de la mise au lit au lever (dénominateur de l'efficacité, qui BAISSE — 98 % → 87 % dans le cas testé, sans qu'une minute de sommeil change), et le temps au lit avant extinction devient une métrique à part (`AGD_PRELIT_MOY`), distincte de la latence d'endormissement. Le libellé de la question de latence porte maintenant explicitement sur l'après-extinction. Le recueil couvre 8 des 9 items du noyau ; la question ouverte du lot précédent est close.

**Options écartées** : compter le pré-lit dans le temps de sommeil (le patient ne cherchait pas encore à dormir) ; ancrer la régularité sur le coucher (c'est le rythme de sommeil qu'elle mesure) ; demander l'heure d'endormissement (supposerait de regarder sa montre).

**Validations** : T1 vert (621 tests) ; T3 : 2240 unitaires verts, 96 E2E passés, mêmes 2 échecs pré-existants `portail-google.spec.ts`.

**Prochaine action** : `/wn-review`, puis commit et PR des trois lots ensemble.

**Questions ouvertes** : sept gestes obligatoires le matin — à confronter à l'assiduité réelle d'une première cohorte.

## 2026-07-28 — Garde de contenu de la voie rapide, reprise, arbitrage des bandes

**Décisions** : l'audit des 563 claims « non prescriptifs » du notebook 08 a
trouvé **au moins 55 bornes** de décision (#401). Garde de contenu posé sur les
**six** sites de l'allowlist, définition unique en base (#412) ; puis révocation
nominative d'`anon`/`authenticated`, que `REVOKE … FROM PUBLIC` n'avait pas faite
(#420). Les **28 bornes déjà signées par lot sans lecture** repassent en attente,
signature effacée (#422). Arbitrage des 19 bandes de scores : la publication
primaire ne départage **qu'une fois sur huit** instruments.

**Écarté** : décider sur la typologie du claim — la frontière `déclaré` /
`interprété` est indécidable sur une grille de référence ; toucher aux barèmes
servis — cela change des scores patients, le rescorage a son go séparé.

**Validations** : T1, T2, six contrats SQL, quatre revues adversariales dont
trois NO-GO, preuves par mutation, base de production relue après chaque
migration.

**Prochaine action** : trancher les 19 claims un par un — le dossier propose un
sort pour chacun.

**Questions ouvertes** : BDI-13 et Q-MAT dérivent **côté produit**, gelés
derrière le go de rescorage ; place de l'échelle de Conners, désavouée par ses
auteurs depuis 1985.

## 2026-07-29 — Q_ALI_01 : parc patients reconstitué, et consigne de synthèse v10

**Décisions** : les 4 assignations ouvertes en v14 annulées, puis 8 réassignations
créées, une par patient distinct — parc entièrement reconstitué sur les 57 items.
Deux assignations inatteignables par l'interface ont été débloquées par appel direct
à la route d'annulation, qui applique ses propres gardes. Résiduel de #437 fermé par
la PR #445 (consigne `synthese-v10`), mergée après **trois refus** de revue
adversariale — chaque défaut étant créé par la correction du précédent.

**Écarté** : décrire les quatre porteurs restants (`parts`, `components`,
`categories`, `phases`) — l'un livre `suicidalIdeation`, cela demande un arbitrage
praticien ; poser la parade anti-zéro sur les `subScores` — correctif de moteur, pas
de consigne.

**Leçon** : mon banc saturait les *options* des questions ; `Q_SOM_09` n'en a pas et
sortait du recensement sans bruit — la méthode de mesure cachait le seul
contre-exemple à la règle que j'écrivais.

**Prochaine action** : filtrer les assignations côté serveur (plafond de 40, lacune
de #438).

**Questions ouvertes** : les deux booléens cliniques de `Q_NEU_12` livrés sans
consigne ; l'audit des lignes héritées partielles, dont dépend la réserve `atRisk`.

## 2026-07-29 — Certification des instruments, et trois lots moteur

**Décisions** : 10 instruments montés à `scoring_verifie`, 49 sortis du premier barreau
(#448) ; le vérificateur du CI exige désormais ses pièces à chaque barreau. Le moteur ne
rend plus de bande par défaut (#450), plus de verdict sur une passation vide (#451), et
un axe non répondu vaut « non mesuré » (#456). Deux corrections de dossier (#452, #453).

**Écarté** : dégager les 43 `a_verifier` sur la déclaration de droits — elle porte sur
les supports SIIN, dont aucun des 43 ne relève ; reformuler les items sous licence — une
paraphrase reste dérivée et détruit l'instrument.

**Prochaine action** : arbitrer les 8 sous licence tierce ; aucune assignation ouverte,
six jamais utilisés.

**Questions ouvertes** : 8 instruments via 7 moteurs rendent encore un axe à zéro sur une
passation partielle ; consigne v11 à écrire (le total global `null` n'y est pas nommé) ;
le banc golden n'est pas dans `test:worktree`.

## 2026-07-30 — Campagne scoring : 47/64 en `scoring_verifie`

**Décisions** : campagne d'un jour vers « tous les scoring exacts et validés » —
quatre PR (#469 dossier des 29 divergents, #470 requalifications, #471 frontières
+ bornes, #472 montée de 37). 10 → 47 `scoring_verifie`. Corrigé dans le servi :
grille QDRS (3 bornes chevauchées), Berlin cat2 (≥2 positifs), trous Epworth
comblés par arbitrage déclaré ; `Q_ALI_03` suspendu (10/39 items). 17 fausses
divergences requalifiées avec preuves (bornes PSQI/QIF/ECAB prouvées par
construction). Arbitrages praticien : 9 seuils ajoutés, découpages « aligner sur
la source » (lot 5 reporté), Q_INF_05 relecture d'abord.

**Écarté** : atteindre 64 — exigerait de défaire les suspensions arbitrées ;
plafond 55 annoncé au routage.

**Prochaine action** : garde de fraîcheur verdict↔code, puis correction de
l'extraction du banc (sinon son prochain passage rétablit les divergences
annulées).

**Questions ouvertes** : Q_NEU_06 (suspendre ou reconstruire), Q_ALI_01 (échelle
0–2/0–15 vs #452), Q_INF_05, sémantique `adapte`, lot 5 découpages.

## 2026-07-30 — Deux gardes posées : droits ↔ assignabilité, et le palier T3

**Décisions** : #461 mergée (une donnée absente cesse d'être lue comme une donnée
basse — `??` sur les replis PSQI, seuils monotones asymétriques, `estComplet`).
Puis deux lots nés de ce que le lot précédent avait nommé sans faire. #466 : la
garde `licence_requise` ↔ assignabilité, adossée au **registre** et non à une
liste tapée à la main — le prédicat retenu est celui de la ROUTE (définition +
hors `IDS_SUSPENDUS`), plus permissif qu'`IDS_ASSIGNABLES`, et c'est cet écart
qui est la position « invisible et assignable ». #473 : `test:worktree` ne jouait
aucun des cinq bancs `node --test` du CI ; deux étant dans T1, **T3 était plus
étroit que T1**. Liste extraite de `ci.yml`, jamais recopiée.

**Écarté** : la charnière SIGH-SAD-SA 15-17 (arbitrage clinique, pas correctif) ;
brancher les droits sur la route à l'exécution — une route patient dépendrait
d'un fichier de documentation.

**Validations** : T1 vert sur les deux lots (304 fichiers, 2699 tests) ; `verify`
complet lu avant chaque merge (12 min 42, 10 min 49) ; quatre preuves par
mutation sur #466, trois exécutions de contrôle sur #473. T2/T3 indisponibles ici
— le proxy refuse `cdn.playwright.dev`.

**Prochaine action** : passer `npm run test:worktree` depuis le Mac — le CI
n'exécute pas ce script, l'intégration du bloc de #473 n'est donc pas prouvée.

**Questions ouvertes** : les huit instruments sous licence tierce (aucune
assignation ouverte, six jamais utilisés) ; `Q_NEU_12`, dernier « invisible mais
assignable » ; consigne v11 écrite, mais les deux booléens de `Q_NEU_12` restent
sans consigne.

## 2026-07-30 — Nuits oubliées de l'agenda : trois lots livrés (#477, #478, #480)

**Décisions** : le levier contre les nuits perdues n'est pas la fenêtre de saisie
(borne J-1 confirmée) mais la visibilité de l'oubli. Verdict doctrinal établi et
opposable : la frontière écrite interdit la relance **automatique**, pas le geste
praticien — les deux migrations opposent cron et clic dans la même phrase, et
« Renvoyer le lien » est déjà une relance praticien en prod. Trois lots : vue
transverse « agendas en cours » (5 états par faits datés, jamais un score),
relance au clic sous `WN_AGENDA_RELANCE` (fermé), rappel dans l'espace patient.
Aucune migration.

**Écartés** : la relance automatique (renverserait la frontière) ; le lien profond
vers l'agenda (le segment `[token]` est le jeton permanent, retiré des e-mails par
LOT-04).

**Corrigé de mon propre cadrage** : j'avais annoncé les portes patient éteintes —
`WN_G4_LIEN_MAGIQUE` et `WN_G5_GOOGLE_PATIENT` sont **allumées** depuis le 07-21/22
(commentaire périmé dans `portail/featureFlag.ts`). Il n'y avait donc aucun blocage
de lien.

**Revues adversariales** : trois NO-GO, tous justifiés. (1) un test mockait la garde
de scoping qu'il prétendait couvrir ; (2) un échec SMTP ambigu défaisait les DEUX
protections — N clics = N e-mails reçus, tous consignés « Erreur » ; (3) le hub
invitait à transmettre le matin du 21ᵉ jour, et le suivre clôturait
irréversiblement en abandonnant la dernière nuit.

**Validations** : T1 vert à chaque étape, T2 `--fast`, `verify` vert sur les trois
PR (8m51 à 10m52), mergées, branches supprimées.

**Prochaine action** : allumer `WN_AGENDA_RELANCE` en production — après les deux
points ci-dessous.

**Questions ouvertes** : le relais SMTP n'est identifié nulle part (code ni doc) et
ce lot augmente le volume de courrier patient, à l'échéance HDS du 2026-10-21 ; le
budget anti-harcèlement est par **recueil**, pas par patient (deux agendas ouverts
existent en prod) ; ratifier le verdict doctrinal par une ligne au
`REGISTRE_FRONTIERES.md`, sans quoi le prochain audit relira `PROPOSITION:280` au
pied de la lettre.
## 2026-07-30 (soir) — Campagne « terminer les 17 » : 47 → 53, et quatre NO-GO

**Décisions** : quatre PR (#479 droits déclarés + 4 montées, #483 cotation EORTC
officielle, #484 Conners refermés + fraîcheur des verdicts). Les deux EORTC passent
de la somme brute aux échelles 0-100 de leurs manuels — dont l'inversion des items
44-46, relevée à la source et non de mémoire. Trois dettes d'outillage fermées :
l'empreinte du banc consigne la position des drapeaux, son croisement compte des
lecteurs et non des occurrences, et un verdict ne peut plus être antérieur à ce
qu'il certifie.

**Écarté** : rouvrir Q_PNE_01 (c'est le VQ11 de Ninot et al., échelle publiée) et
Q_PED_02 (sous-score « Opposition » sans aucun item d'opposition) ; monter Q_ALI_01
(l'annulation reposait sur une arithmétique fausse, 57 × 2 = 114) ; monter Q_SOM_09
(verdict vacueux : 0 item et 0 seuil lus).

**Prochaine action** : raccorder la garde de fraîcheur à l'empreinte servie — son
témoin actuel est déclaratif et la moitié du registre lui échappe.

**Questions ouvertes** : la règle du « nombre d'items » n'est pas écrite et s'applique
dans un seul sens (PSQI 24/18, Q_NEU_12 36/48, Q_GEO_01 16/20) ; Q_ALI_01 attend la
répartition des points de sa source ; Q_NEU_06, Q_SOM_09, VQ11 attendent une décision.

## 2026-07-30 (clôture) — Q_ALI_01 tranché sur pièce : 54 sur 64

**Décisions** : la source de l'Enquête alimentaire SIIN a été relue directement
(WN-SRC-0471). Elle porte « Votre score (0, 1 ou 2) » et « alors comptez … points » :
le 0-2 est un barème par item, pas un codage de réponse. Compté — 24 items à
1 point, 33 à 2, total 90 — soit exactement les effectifs du barème servi, bandes
comprises. Divergence annulée sur pièce, instrument monté (#487).

**Écarté** : la même annulation le matin, sur l'arithmétique « 57 × 2 = 90 » (faux,
114) et une prémisse sans pièce — refusée en revue, à juste titre. La conclusion
était bonne, la preuve ne l'était pas.

**Prochaine action** : raccorder la garde de fraîcheur à l'empreinte servie, seul
témoin non déclaratif.

**Questions ouvertes** : Q_NEU_06 (suspendre ou reconstruire), Q_SOM_09 (banc
vacueux), VQ11 = Q_PNE_01 (instruire les droits d'une échelle publiée), règle du
« nombre d'items » non écrite (PSQI 24/18, Q_NEU_12 36/48, Q_GEO_01 16/20).

## 2026-07-31 — Certification : 54 → 56 sur 64, quatre PR

**Décisions** : PSQI aux 24 items de sa source (volet conjoint non coté, drapeau
`horsBareme` pour le moteur clinique) ; MMT et MFI-20 **reconstruits** depuis
leurs sources — le MFI-20 passe de 3 divergences critiques à 0, sa clé
d'inversion lue sur l'image de la grille de correction ; VQ11 rouvert, son
identité étant établie ; cannabis aligné sur les trois bandes de la source. La
règle du « nombre d'items » est écrite : ce sont les axes et le total qui se
comparent, jamais le compteur.

**Écarté** : rouvrir Q_NEU_06 et Q_TAB_04 — identité non instruite, même barre
pour les deux ; et une surface de passation praticien, qui aurait publié le
verbatim d'un instrument sous réserve.

**Prochaine action** : reconstruire le Monnier (10 items servis sur 39).

**Questions ouvertes** : surface de consultation sans verbatim (bloque Q_NEU_06
et Q_GEO_04) ; échelle de Q_SOM_09, à ne pas changer avant clôture des 8 agendas
en cours ; perte de discrimination 16/30 sur le cannabis, si elle ne convient pas.

## 2026-08-01 — `Q_PED_03` : le banc savait échouer, pas le dire

**Décisions** : la fermeture de `Q_PED_03` reposait sur un faux diagnostic. La
lecture GPT plafonnait à 8192 contre 32000 pour la lecture Claude — jetons de
raisonnement décomptés du même plafond — et ne portait **aucune garde de
troncature** : une réponse coupée partait au parse, qui échouait à l'offset de
coupure. « Position 8503 » était un décalage de caractère, jamais un motif.
Reproduit sur l'API réelle avant d'être écrit. Plafonds alignés, garde symétrique
en liste blanche (`failed`/`cancelled`/`refusal` compris), **et le câblage sous
test** — retirer l'appel laissait les cas du garde verts. Banc rejoué : le
croisement a eu lieu, 108 items des deux côtés, 0 divergence critique.
`Q_PED_03` **reste `suspendu`** : le motif technique tombe, le motif clinique
s'ouvre — aucun des 19 (B) / 34 (C) seuils de la source n'est servi, ni bande, ni
dimension, là où deux des quatre dimensions sont des échelles de *validité*.

**Écarté** : réactiver l'instrument sur « 0 critique ». Le compteur agrège les
divergences par genre — « 1 confirmée » comptait une famille de 19 à 34 seuils
absents. Un chiffre de tête qu'on citerait dans six mois.

**Effet de bord attrapé en cours de route** : faire passer les bancs par un
script les a **retirés du palier T3**, dont l'extraction ne reconnaît que la
forme littérale `node --test`. Le garde d'extraction ne dit rien tant qu'il
trouve d'autres bancs. Étape explicite ajoutée, plus un contrôle que la CI les
lance toujours.

**Prochaine action** : arbitrage praticien sur `Q_PED_03` — reconstruire aux
sous-échelles de la source, ou le retirer.

**Questions ouvertes** : `.wn/state.json` et `ACTIVE_CAMPAIGN.md` sont figés au
2026-07-23 (`idle`, aucune campagne) alors que la campagne tourne depuis neuf
jours — non réparé ici, cela engage la gouvernance des campagnes. `registry-check`
reste hors de `npm run check`. `extraireJson` n'a toujours aucun banc, alors que
c'est son message qui a menti deux jours. La garde `scoring_verifie` ne lit que
`divergencesCritiques` : elle laisserait passer un instrument que les notes
interdisent de certifier.
## 2026-08-01 — Hygiène de handoff : doublon de skills, agents Copilot, Fable 5

**Décisions** : `/wn-context` et `/wn-handoff` lançaient la même commande et
écrivaient le même fichier — ils sont désormais séparés par ce qu'ils
produisent, le premier affichant sans écrire, le second seul auteur de
`HANDOFF_CURRENT.md`. Les cinq agents Copilot, posés en un commit d'installation
et jamais relus, apprennent les trois paliers, le fragment `changelog.d/` et,
pour `Reviewer`, la classe de défaut de la PR #202 — ce que le diff **ne fait
pas**. Fable 5, décrit partout mais routable nulle part, entre dans les grilles
de `/wn-route` et `/wn-lot`, avec pour seul critère la durée et l'étendue de la
tâche.

**Écarté** : toucher `CLAUDE.md` pour y nommer Fable — sa propre règle
d'économie s'y oppose, un token posé là étant relu à chaque tour de chaque
session. Écarté aussi, et pour cause : « réparer » le pointeur `AGENTS.md` de
Copilot (valide depuis #502) et corriger le tarif Fable (exact, vérifié à la
source). Deux hypothèses de départ fausses, zéro édition.

**État des deux worktrees C4 — aucun n'est abandonné, ne rien supprimer.**
`c4-transport-compositions` porte la **PR B1** (13 fichiers, +602/−160, T1 vert,
non commité, avec son `HANDOFF_CURRENT.md`) ; `c4-compositions-transport` porte
la **PR B2** (`web/src/lib/supplement-library/compositions.ts` et sa route
interne, non suivis). B1 corrige les écrans pendant qu'ils sont inertes, B2
écrit les compositions : B1 part d'abord.

**Prochaine action** : reprendre B1 là où son handoff s'arrête —
`npm run test:worktree`, puis revue adversariale avant PR.

**Questions ouvertes** : les cinq agents `.github/agents/` sont-ils réellement
chargés par Copilot ? Personne ne l'a vérifié ; s'ils ne le sont pas, ils se
désynchroniseront en silence malgré cet alignement.

## 2026-08-01 — Clôture montée certification 62/64

**Décisions** : la phase de montée (lots 1–4) est déclarée close à 62/64 —
60 `scoring_verifie`, 2 suspendus terminaux — et l'état machine
(`.wn/state.json`, figé au 2026-07-23) est réaligné. Pas de promotion de
Q_GEO_04 : la question n'a pas eu à être arbitrée, le plafond
`contenu_verrouille` posé au registre le 2026-08-01 (bandes HAS 2011 jamais
sourcées, escalade SIIN ouverte) la tranche déjà.

**Écarté** : transcrire la signature praticien dans `droits.detail` — déjà fait
par #515/#516, le cadrage initial du sous-agent était en retard sur le registre.

**Prochaine action** : arbitrages praticien — Q_PED_03 (dimensions et échelles
de validité), table de règles signée conditionnant les lots 5–13.

**Questions ouvertes** : la source des « gates G0–G4 » affichés par le contexte
compact reste introuvable (`.wn/orchestrator.json` n'en porte aucun).

## 2026-08-01 — Arbitrages praticien : Q_PED_03 et orientation adaptative

**Décisions** (praticien, en session) : Q_PED_03 reste `suspendu` — rouvrir sur
usage seulement, avec le scoring dimensionnel complet (4 dimensions, 2 échelles
de validité, seuils source), jamais la somme brute. Axe orientation lancé :
lot 7 autorisé (sans gate), lot 8 ensuite avec ses gates (coût API, écriture
prod, validation claim par claim) ; signature de la table de règles au lot 9.

**Écarté** : reconstruction immédiate du scoring Conners (aucun usage en
production) ; recueil non scoré (sans restitution, peu de valeur).

**Prochaine action** : le cadrage a montré le lot 7 DÉJÀ LIVRÉ (#361,
2026-07-25, dormant fail-closed) — passer au cadrage du lot 8 et à la
confirmation de ses gates avant toute exécution.

**Questions ouvertes** : source des « gates G0–G4 » du contexte compact,
toujours introuvable.

## 2026-08-01 — Lot 8 : décision f amendée, gates confirmés

**Décisions** (praticien, en session) : question f close en AMENDANT A-009 pour
l'orientation — seule la perfusion reste exclue ; sevrages médicamenteux,
psychotropes et Alzheimer réintégrés dans le drafting, chaque claim restant
soumis à la validation individuelle (voie lente, D-003). Coût accepté
(~11-17 $ / 106 fiches) ; premier lot d'ingestion : sommeil complet
(17 fiches), pas de pilote préalable.

**Écarté** : pilote 1-2 fiches avant volume (choix praticien) ; exécution du
pipeline depuis cette session (secrets et PDF n'existent que sur le Mac).

**Prochaine action** : après merge de #517, PR de préparation lot 8 —
`metadata.usage='orientation'` dans draft.mjs, filtre A-009 amendé, runbook
Mac — puis run d'ingestion sommeil sur le poste local.

**Questions ouvertes** : « gates G0-G4 » du contexte compact, toujours sans
source identifiée.

## 2026-08-01 — PR #517 mergée ; préparation lot 8 dans le dépôt

**Décisions** : #517 mergée (squash 3d406d5) sur demande du praticien, branche
repartie de main. Préparation lot 8 : `--usage orientation` dans draft.mjs
(clé metadata.usage, passe-plat serveur couvert par trois tests),
filtre par construction dans lib/filtre-orientation.mjs (quarantaine ≠
décision f ; perfusion WN-SRC-0244 seule exclusion A-009 restante), banc
branché dans run-certify-bancs.sh (exige des bancs dans les deux dossiers),
runbook du run sommeil (12 PDF ingérables sur 17 — 4 MP4 à transcrire,
WN-SRC-0318 en quarantaine).

**Écarté** : corriger le trou d'immuabilité de metadata dans store.ts
(documenté au runbook, changement minimal) ; T2 local (téléchargement
Playwright bloqué par la politique réseau — verify CI fait foi, aucun code
runtime web touché).

**Prochaine action** : PR draft, CI, puis run sommeil sur le Mac.

## 2026-08-01 — Clôture de session : #517 et #518 mergées, main prêt pour le run sommeil

**Décisions** : #518 mergée (squash 2ddeb52) sur demande du praticien après
verify vert lu. La journée livre : montée en certification close (62/64),
Q_PED_03 arbitré (suspendu), décision f close (A-009 amendé : perfusion seule
exclue), pipeline prêt pour le lot 8 (marquage usage, filtre par construction,
banc branché, runbook).

**Écarté** : réécrire 2ddeb52 signalé par le stop-hook — c'est le commit de
squash GitHub sur main, pas un commit local ; faux positif récurrent
post-merge.

**Prochaine action** : run sommeil sur le Mac (`tools/corpus/claims/README.md`,
12 PDF, ~2-3 $), puis validation claim par claim dans l'Atelier, puis lot 9.

**Questions ouvertes** : source des « gates G0-G4 » du contexte compact,
toujours inconnue ; entrée DECISIONS.md pour l'amendement A-009 (proposée, en
attente d'accord).

## 2026-08-02 — CERT-Q LOT-03 handoff

**Décisions** : LOT-03 terminé pour CERT-Q ; les lots 01 à 03 sont consolidés,
avec distinction explicite entre l'état daté 62/64 (2026-07-29) et le registre
courant 64/64. Le handoff campagne est produit, sans changement de scoring.

**Écarté** : suppression automatique des branches historiques ; aucune branche
supprimée dans ce lot.

**Prochaine action** : arbitrer `feat/mini-synthese-par-rubrique` (PR #372),
puis confirmer séparément le nettoyage des 20 branches candidates.

**Questions ouvertes** : intégration amendée ou clôture sans merge de PR #372.

## 2026-08-02 — CERT-Q PR #372 validée et lot clôturé

**Décisions** : l’arbitrage PR #372 a été intégré avec amendements minimes :
mini-synthèse rétablie, helper de coupe remis au bon scope, métadonnées de
campagne complétées, et couverture ajoutée pour le second marqueur de coupe.
T1, T3 et les tests ciblés sont verts ; la revue indépendante n’a relevé qu’un
point de vigilance déjà traité côté commit (inclusion des nouveaux fichiers
`rubriques.*`).

**Écarté** : élargir le changement au-delà de l’intégration amendée de
`feat/mini-synthese-par-rubrique`.

**Prochaine action** : commit/push de la branche de campagne puis éventuel
nettoyage des branches candidates, si confirmé séparément.

**Questions ouvertes** : aucune sur le fond technique ; reste la décision de
gouvernance sur le nettoyage des branches.

## 2026-08-02 — CERT-Q arbitrage final de la branche restante

**Décisions** : `feat/mini-synthese-par-rubrique` est arbitrée en faveur d’une
intégration amendée dans la branche de campagne `campagne/certification-questionnaires-consolidation`.
Le périmètre reste dans CERT-Q, sans lot scoring séparé.

**Écarté** : clôture sans merge de la branche restante.

**Prochaine action** : gouvernance du nettoyage séparé des branches candidates.

**Questions ouvertes** : aucune sur la branche restante ; reste le nettoyage.

## 2026-08-02 — CERT-Q nettoyage des branches candidates exécuté

**Décisions** : les 20 branches candidates de CERT-Q ont été supprimées localement
et à distance quand les refs distantes existaient déjà ; la branche de campagne
reste seule porteuse du consolidé.

**Écarté** : conserver les branches candidates après arbitrage.

**Prochaine action** : aucune côté CERT-Q, hors éventuelle revue de sécurité du
nettoyage si demandée.

**Questions ouvertes** : aucune.

## 2026-08-02 — Rayon compléments : lot d’ingestion/référentiel stabilisé

**Décisions** : le lot a été bouclé sur le périmètre API et documentation du rayon
compléments, avec une réponse d’erreur cohérente `ok: false` sur les payloads
invalides des routes internes d’ingestion/référentiel.

**Écarté** : ouvrir une nouvelle surface fonctionnelle ou modifier la logique
clinique ; la stabilisation est restée bornée aux routes et à la campagne.

**Prochaine action** : poursuivre la campagne sur un autre périmètre concret si
nécessaire, par exemple l’activation métier ou une validation complémentaire.

**Questions ouvertes** : l’activation métier du rayon reste à cadrer avec le
produit et la gouvernance.

## 2026-08-02 — Claims orientation : levée de quarantaine prescriptive

**Décisions** : la quarantaine d’orientation ne bloque plus les sources
prescriptives du périmètre ; 8 sources réintégrées, la perfusion reste exclue.
Le filtre, le contrat SQL de périmètre et les bancs de régression ont été mis
en cohérence.

**Écarté** : lever la quarantaine pour les sources non prescriptives.

**Prochaine action** : aucune immédiate sur le fond technique.

**Questions ouvertes** : aucune.

## 2026-08-03 — Nettoyage branches biologie (CB) + cadrage campagne CB-03→CB-09

**Décisions** : audit des branches liées au rayon biologie — CB-00 à CB-02b
déjà fusionnées en production (#364, #369, #374, #381, #394, #433) ; 9
branches locales obsolètes supprimées (remote déjà « gone »), 1 worktree
retiré. Campagne `2026-08-02-rayon-biologie-cb` créée (LOT-00→LOT-06,
numérotation métier CB-03→CB-09 conservée en contenu) : PR #525 mergée
(squash 6f8e23a) après correction CI — les id de lot doivent respecter
`LOT-\d{2}` (garde-fou `wn-campaign-audit.mjs`), pas de préfixe libre.

**Écarté** : activer la campagne (`--activate`) — CB-03 est bloqué sur les
lots 8-9 de la certification (table NNPP2 signée), encore en cours.

**Prochaine action** : vérifier l'état des lots 8-9 certification avant
d'ouvrir CB-03 ; sinon reprendre le run sommeil (lot 8) puis lot 9.

**Questions ouvertes** : promotion proposée — `scripts/wn-campaign.mjs
create --prefix` permet un id de lot hors format `LOT-NN`, non détecté avant
CI ; à corriger dans le script ou documenter dans le skill (en attente
d'accord).
