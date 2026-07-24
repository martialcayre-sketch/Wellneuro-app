# Audit — Migration HDS et coût à venir

**Date** : 2026-07-24. **Statut** : instruction de la migration « à instruire » du
registre des frontières (invariant HDS, écart assumé du 2026-07-21). Produit par
audit multi-agents (3 inventaires du dépôt, 4 recherches externes, 4
contre-vérifications adversariales, 1 revue de complétude) ; chaque statut de
certification a été vérifié sur l'annuaire officiel ANS le 2026-07-24, chaque
prix sur la page officielle du fournisseur. Ceci n'est pas un avis juridique —
les points de droit restent à confirmer en revue D-TRUST-02. La question
structurante (WellNeuro = le praticien, même personne physique) a été **tranchée
le 2026-07-24** par le responsable de traitement : voir § 7.1.

---

## 1. Résumé exécutif

L'échéance de la dérogation est le **2026-10-21** (~13 semaines). La migration
est **techniquement légère** (base de ~30 Mo, aucun couplage Supabase/Vercel
au-delà du Postgres et du build) et **financièrement modeste** vers la cible
recommandée. Le vrai coût n'est pas l'hébergement : ce sont les chantiers de
conformité qui l'accompagnent.

| Poste | Aujourd'hui | Cible recommandée (Scalingo HDS) |
|---|---|---|
| Hébergement mensuel | 0 € (Supabase free + Vercel Hobby) | **41–83 € HT/mois** (≈ 50–100 € TTC) |
| Hébergement annuel | 0 € | ≈ 500–1 000 € HT/an |
| Migration (one-shot) | — | **5–8 jours-homme** étalés sur 4–6 semaines |
| Conformité associée (one-shot) | — | **3–10 k€** (revue juridique, AIPD, DPA, pentest léger) |
| Assurance cyber (récurrent) | — | à deviser (RC pro extension cyber) |

**Recommandation** : Scalingo, région `osc-secnum-fr1`, PostgreSQL Business —
certifié HDS v2.0 sur les 6 activités, PaaS + Postgres managé sous le même
certificat, pgvector et pgcrypto disponibles, pas de ticket d'entrée. Arbitrage
fournisseur à rendre **sous 15 jours** pour tenir l'échéance ; demander en
parallèle deux devis écrits (Scalingo + Clever Cloud) — voir §6.

---

## 2. Pourquoi il faut migrer — situation juridique

- **Les données stockées sont des données de santé.** L'inventaire (34 modèles
  Prisma + 4 tables SQL-brut) classe 14 tables en données de santé rattachées au
  patient : anamnèse complète (poids, antécédents, allergies, médicaments),
  réponses **brutes** des questionnaires (`scoresJson.rawAnswers`), ~64
  questionnaires cliniques validés dont BDI, MADRS, AUDIT, IDTAS (item
  d'idéation suicidaire), EORTC (items sexualité), synthèses IA, check-ins de
  protocole, signalements d'effets indésirables, correspondance médecin. La
  doctrine CNIL (données de santé par croisement et par destination) les
  qualifie sans ambiguïté — confirmé par vérification adversariale.
- **Supabase et Vercel ne sont pas certifiés HDS.** Vérifié le 2026-07-24 sur
  l'annuaire officiel ANS (interrogation exhaustive de l'endpoint de données :
  lettre S = 39 entrées sans Supabase, lettre V = 11 sans Vercel). Ni l'un ni
  l'autre n'a de projet HDS annoncé (Supabase : question publique ouverte depuis
  2024-11-29, non répondue).
- **Risque encouru** : art. L.1115-1 CSP — 3 ans d'emprisonnement et 45 000 €
  d'amende (225 000 € pour une personne morale), peines complémentaires
  (L.1115-2) ; côté CNIL, art. 9/28/32 RGPD (précédent Dedalus Biologie :
  1,5 M€ en 2022 pour un éditeur de logiciels de santé), contrôles ciblés
  IA/santé annoncés pour 2026. La gratuité du service n'exonère pas ; le
  consentement des participants ne se substitue pas à la certification (la
  mention de consentement de l'ancien L.1111-8 a été supprimée en 2018).
- **Référentiel applicable** : HDS **v2.0** (arrêté du 26 avril 2024, JO du 16
  mai 2024) — hébergement physique EEE, transparence des transferts. Le butoir
  de bascule v1.1→v2 (16 mai 2026) est passé : tout contrat signé désormais
  doit porter un certificat v2.0. Une **v2.1** est annoncée (publication
  octobre 2026, effet décembre 2026, transparence renforcée sur les
  législations extra-européennes) — sans impact sur le choix, les candidats
  retenus la subiront via leurs audits de surveillance.

---

## 3. État des lieux technique — la migration est légère

Constats favorables, vérifiés dans le dépôt et sur la base de production :

- **Supabase = Postgres managé, rien d'autre.** Schémas `auth` et `storage`
  vides (0 users, 0 objects), aucun SDK `@supabase/*` au runtime. Tout passe
  par Prisma + `pg`. Base totale ~30–40 Mo (dont 20 Mo de référentiel Ciqual
  public) ; PostgreSQL 17.6, extensions requises : `vector` 0.8.0 (corpus RAG)
  et `pgcrypto`.
- **Vercel = presque rien.** `vercel.json` de 5 lignes (région fra1), aucun
  cron, aucun edge/ISR/middleware. Adhérences à défaire : `vercel-build.sh`
  (gate `VERCEL_ENV=production` + `prisma migrate deploy`), variables
  `VERCEL_ENV`/`VERCEL_GIT_COMMIT_SHA` (Sentry, journal d'accès), double URL
  pooler/session, SSL `no-verify` du pooler Supabase (`src/lib/postgres.ts`),
  pool `max: 1` (dimensionné pour le serverless — à réévaluer sur serveur
  persistant), `clone_env_vars.py`. Le CI GitHub Actions est autonome (Postgres
  Docker éphémère) ; seul le déclencheur de déploiement (intégration Git
  Vercel) est à recréer.
- **Deux flux sortants de données de santé**, hors périmètre hébergeur mais à
  traiter dans le même mouvement :
  1. **Anthropic** (`/api/praticien/synthese`) : le prompt part avec
     « Patient : prénom nom » + scores + anamnèse complète. Chantier RGPD
     distinct du HDS (DPA art. 28, transfert hors UE, TIA) — et un correctif
     immédiat de quelques lignes : **pseudonymiser** (identifiant opaque à la
     place du nom). Les flux claims et embeddings OpenAI ne portent que le
     corpus de cours (contrainte CHECK `patient_identifiable = false`) et
     peuvent rester.
  2. **SMTP** (nodemailer, `SMTP_URL`) : prénom, e-mail, jeton d'accès et
     parfois **motif de consultation** transitent par un relais dont le
     fournisseur n'est identifié nulle part (ni code, ni doc). À identifier
     (lire `SMTP_URL` en prod), vérifier localisation/DPA, et retirer le motif
     de consultation du corps des e-mails (correctif trivial).
- **Contrainte de plateforme découverte** : le routeur Scalingo coupe à 30 s
  avant le premier octet puis impose un envoi de données au moins toutes les
  59 s. La route claims (`maxDuration: 120`) et la synthèse Anthropic devront
  passer en **streaming ou en tâche asynchrone** (1–2 jours de travail, inclus
  dans l'estimation). Équivalent Clever Cloud non publié — à confirmer par
  essai réel.
- **À corriger au passage** : `patients.access_token` (jeton portail permanent)
  stocké **en clair** en base, alors que les liens magiques sont correctement
  hachés (HMAC-SHA256). Sans lien avec l'hébergeur, mais incohérent avec le
  niveau de soin du reste et pertinent pour l'AIPD.

---

## 4. Comparatif des hébergeurs certifiés

Statuts relevés dans l'annuaire officiel ANS le 2026-07-24 et contre-vérifiés
sur les certificats des fournisseurs.

| Option | Certification (annuaire ANS) | Adéquation | Coût mensuel estimé (HT) |
|---|---|---|---|
| **Scalingo** (recommandé) | 6 activités, v2.0 — certificat LNE n° 38436-2, valable 11/09/2028 | PaaS + Postgres managé (PG 17, pgvector 0.8.2, pgcrypto), région `osc-secnum-fr1` (Outscale SecNumCloud, Paris), buildpack Next.js, Review Apps, scheduler | **41–83 €** |
| **Clever Cloud** | 6 activités, v2.0 — certificat Bureau Veritas FR094504, valable 19/12/2027 | PaaS + Postgres managé (PG 14–18, pgvector/pgcrypto inclus), zones HDS Paris/Gravelines/Roubaix, cron natif | **≈ 216–250 €** (forfait fixe 200 € + ×1,4 sur les ressources) |
| OVHcloud Public Cloud | 6 activités, v2.0 (sa doc affiche encore « v2018 » — exiger le certificat v2 au contrat ; activités 5–6 des DB managées sous-traitées à Aiven OY) | DB managée HDS mais **pas de PaaS applicatif** : instance à exploiter soi-même | ≈ 330–420 € (dont support Business obligatoire, plancher 250 €) |
| Scaleway | 4 activités seulement (1–4) ; **Managed Databases hors périmètre HDS** | Inadapté sans auto-administrer Postgres | — |
| AWS / GCP / Azure | Certifiés (AWS/Microsoft 1–6 ; Google 1–5, sans la sauvegarde) | Ne rend **pas** Vercel/Supabase conformes : chaque maillon de la chaîne de sous-traitance doit être certifié pour ses activités | — |
| IaaS certifié + auto-administration (VM OVH, Supabase self-hosted…) | Conforme en droit (l'auto-administration n'est pas de l'hébergement « pour compte de tiers ») | Un mi-métier d'ops ou une infogérance certifiée à 300–800 €/mois — à écarter pour un praticien seul | — |

**Détail Scalingo (fourchettes vérifiées ligne à ligne le 23–24/07/2026)** :
région HDS = +20 % sur la grille standard ; badge « HDS » porté par les plans
PostgreSQL **Business** (2 nœuds « multi-node », SLA 99,96 %, PITR 7 j).

- Basse (minimal réaliste) : conteneur M (17,28 €) + PostgreSQL Business 512M
  (24,00 €) ≈ **41 € HT/mois**.
- Haute (confortable) : 2 × conteneur M (34,56 €) + Business 1G (48,00 €) ≈
  **83 € HT/mois**.
- Pas de ticket d'entrée : annexe HDS contractuelle sans frais propre, support
  Basic inclus. Obligations client : désigner une personne habilitée aux
  décisions données de santé (art. 10.2 de l'annexe) et un contact
  professionnel de santé pour les accès (art. 9.4/10.3, carte CPS) ; PGSSI-S ;
  jamais de donnée de santé dans les tickets. Accès à `osc-secnum-fr1` sur
  demande au support (délai à provisionner). Préproduction possible en région
  standard (+ ~22 €/mois), patients fictifs seulement.
- Variante économe à faire confirmer par écrit : si le plan PostgreSQL
  **Starter** était contractuellement admis en HDS (le badge « HDS » de la page
  pricing n'apparaît que sur Business), le total tomberait à ≈ 26 € HT/mois —
  question à poser avec le devis.

**Détail Clever Cloud** : grille horaire identique entre zones standard et HDS ;
le surcoût est le **forfait fixe 200 €/mois + multiplicateur ×1,4** sur les
ressources — soit 80–93 % de la facture pour ce profil à trafic quasi nul.
Techniquement excellent (PG 17 par défaut, pgvector/pgcrypto sans démarche,
cron natif), mais ~3 à 5 fois plus cher que Scalingo pour cette taille.
Chiffres contre-vérifiés sur sources primaires le 2026-07-24 (citation exacte du
forfait sur la page officielle, grilles relues via l'API de facturation,
certificat retrouvé dans l'annuaire ANS — lettre C). L'arbitrage final doit de
toute façon se faire **sur devis écrits**, pas sur pages publiques.

---

## 5. Chiffrage complet de la migration

**Hébergement** (delta mensuel net, la baseline actuelle étant 0 €) :
≈ 41–83 € HT/mois. Pas de double-run coûteux : Supabase free et Vercel Hobby
restent gratuits pendant la transition.

**Migration technique — 5 à 8 jours-homme étalés sur 4–6 semaines** :

| Chantier | Estimation |
|---|---|
| Transfert base (dump/restore PG 17 + pgvector, répétition à blanc, bascule) | 1 j |
| Portage app (buildpack, script build, gate prod, `migrate deploy` en hook, ~15 variables, URIs OAuth ×2, `postgres.ts`, pool) | 1–2 j |
| Routes longues → streaming ou jobs asynchrones (claims 120 s, synthèse) | 1–2 j |
| DNS/cutover (zone Squarespace, TTL, liens portail des 13 patients, callbacks OAuth), E2E post-bascule | 1 j |
| Sortie propre de Supabase/Vercel : dump final, suppression projet, effacement des sauvegardes **avec preuve écrite**, purge logs, clôture | 0,5–1 j |
| Mise à jour du registre embarqué (`gouvernance.ts`, `registre.ts` nomment Vercel/Supabase), PROCEDURE_VIOLATION_DONNEES, roadmaps, observabilité cible | 0,5–1 j |

Sans la sortie propre, la migration ne change rien au risque : les données de
14 personnes réelles resteraient chez deux hébergeurs non certifiés.

**Conformité associée (dominante) — ordre de grandeur 3–10 k€ one-shot** :
revue juridique D-TRUST-02 (dont la question « activité 5 » ci-dessous), AIPD
(exigée par la propre matrice du projet pour le « GO données réelles »), DPA à
signer/archiver (hébergeur retenu, Anthropic, SMTP, Google, Sentry), pentest
léger (exigence 7 de G-TRUST-04, aujourd'hui « inexistant »), extension cyber
de la RC pro (récurrent, à deviser). À instruire par 2–3 devis (avocat/DPO
externe mutualisé santé numérique).

**Gratuit et immédiat, sans attendre la migration** :

1. Pseudonymiser l'appel Anthropic (retirer nom/prénom du prompt).
2. Retirer le motif de consultation du corps des e-mails.
3. Hacher le jeton portail permanent (aligné sur les liens magiques).

---

## 6. Rétro-planning vers le 2026-10-21 (13 semaines)

| Semaines | Jalon |
|---|---|
| S1–S2 (→ 08/08) | **Arbitrage fournisseur** ; demande d'accès région HDS + **devis écrits** Scalingo et Clever Cloud ; identification du SMTP réel ; correctifs immédiats (§5) |
| S3–S4 | Signature contrat + annexe HDS ; désignations (personne habilitée, contact professionnel de santé) ; devis juridique/AIPD lancés |
| S5–S6 | Déploiement à blanc en région standard, **données fictives** (build, migrate, synthèse, route claims — valide les timeouts) ; conversion streaming/async si besoin |
| S7–S8 | Répétition dump/restore ; TTL DNS réduit ; bascule ; vérification post-bascule (liens portail, OAuth, E2E) |
| S9–S10 | Sortie Supabase/Vercel avec preuves d'effacement ; mise à jour registre embarqué + docs ; consignation au registre des frontières |
| S11–S13 | Marge ; **levée de la dérogation** (et non reconduction) par le responsable de traitement |

Le critère de succès de l'audit est explicitement : au 2026-10-21, écrire
« dérogation levée » — une reconduction serait l'échec du plan.

---

## 7. Questions ouvertes au responsable de traitement

1. **Structure juridique et activité 5 — TRANCHÉ (2026-07-24 par le responsable
   de traitement).** WellNeuro et le praticien sont **la même personne
   physique** : Martial CAYRE, 4 rue Mazelle, 54260 Longuyon (France), docteur
   en pharmacie, diplômé en neuronutrition® (S.I.I.N.). Il n'y a donc **aucun
   tiers** entre le producteur des données (l'acte de consultation) et
   l'exploitant de l'application : l'exploitation du SI est « pour son propre
   compte ». Conséquences :
   - WellNeuro **n'est pas hébergeur au sens de l'art. L.1111-8 CSP** et n'a
     **pas à obtenir de certification HDS en propre** — l'obligation pèse
     entièrement sur le **fournisseur d'infrastructure**, qui héberge les
     données pour le compte de M. CAYRE et doit, lui, être certifié. La
     migration vers un hébergeur certifié (Scalingo ou Clever Cloud) **suffit à
     clore le sujet HDS**. C'est le scénario le plus simple et le moins coûteux.
   - **Condition de validité** : ceci ne tient **que tant que M. CAYRE est le
     praticien unique** (cohérent avec l'« hypothèse mono-praticien » du code).
     Le jour où WellNeuro hébergerait les données de **patients d'un autre
     praticien**, elle hébergerait « pour compte de tiers » (activité 5) et
     devrait alors se certifier elle-même — bascule à réinstruire avant tout
     onboarding d'un second praticien.
   - Restent dus quelle que soit la structure : le contrat avec l'hébergeur
     retenu doit être une véritable **prestation d'hébergement de données de
     santé** (clauses HDS de l'annexe), et le secret professionnel du
     pharmacien s'applique inchangé.

   Cet arbitrage retire le principal aléa juridique du dossier ; la revue
   D-TRUST-02 le consigne sans avoir à le trancher.
2. **Accès à la production après migration** : l'annexe HDS Scalingo réserve
   l'accès aux données de santé à un professionnel de santé (carte CPS). Le
   mode actuel — requêtes SQL depuis le poste de dev, Prisma Studio, outil MCP
   — doit être requalifié en politique d'accès écrite, sinon la migration crée
   une non-conformité contractuelle immédiate. Même traitement pour les
   **copies locales** : le dump de migration (chiffré, puis effacé avec trace),
   les dumps existants éventuels, et la base de dev partagée entre postes (à
   vérifier : patients fictifs seulement).
3. **Anthropic** : vérifier et archiver le DPA API, la rétention d'inférence
   (le prompt caching est activé), l'existence contractuelle d'une inférence
   UE ; rédiger la TIA. Si blocage : chiffrer l'alternative (LLM chez
   l'hébergeur retenu ou fournisseur UE).
4. **Sentry et logs de l'hébergeur cible** : résidence du projet Sentry
   (option UE) et DPA à vérifier — les messages d'erreur sont scrubbés par
   configuration, pas audités. Attention particulière : le jeton portail
   figure dans le **chemin d'URL** (`/portail/<jeton>`) — définir la rétention
   et le masquage des logs d'accès chez l'hébergeur retenu (les logs Vercel
   disparaissent, leurs équivalents doivent être qualifiés, et la procédure de
   violation cite encore « logs Vercel, alertes Supabase » comme canaux de
   détection).
5. **Préproduction** : trancher — Review Apps/préprod en région standard avec
   les 3 patients fictifs, production seule en zone HDS, garde-fou empêchant
   une préprod de pointer la base HDS.

---

## Sources principales

- Annuaire officiel des hébergeurs certifiés (ANS) :
  <https://esante.gouv.fr/offres-services/hds/liste-des-hebergeurs-certifies>
  (relevé exhaustif par lettre, 2026-07-24)
- Art. L.1111-8 et L.1115-1 CSP (Légifrance) ; arrêté du 26 avril 2024 (JORF
  n° 0113 du 16 mai 2024, NOR TSSD2325104A) ; ANS, annonce v2.1
- CNIL, « Qu'est-ce qu'une donnée de santé ? » ; recommandations IA ;
  sanction Dedalus Biologie (2022)
- Scalingo : <https://scalingo.com/pricing>, certificat LNE n° 38436-2 (PDF),
  annexe HDS (GTC Appendix Health Data Hosting), doc régions/routing
- Clever Cloud : <https://www.clever.cloud/health-hds/>, certificat Bureau
  Veritas FR094504 (PDF), API de tarification (`price-system?zone_id=parhds`)
- OVHcloud : compliance HDS, « Représentation des garanties », support levels ;
  Scaleway : page HDS officielle
- Dépôt : `docs/claude/REGISTRE_FRONTIERES.md` (invariant + dérogation),
  `docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/CHECKLIST_ACTIVATION_G_TRUST_04.md`
  (instruction du 2026-07-21), `web/prisma/schema.prisma`,
  `web/src/app/api/praticien/synthese/route.ts`,
  `web/src/lib/consultation/email.ts`, `web/scripts/vercel-build.sh`
