# Handoff — 2026-10-14 — Plan unique WellNeuro 6.0 : archivage par déplacement, briefs sortis (PR 4 du versement)

## Branche et état Git

`docs/plan-unique-pr4`, dans le worktree `.claude/worktrees/plan-unique-pr3`,
partie de `origin/main` (`d671945b`, #1420, PR 3 mergée, déploiement Scalingo
constaté avant le merge de cette PR). Documentation seule : aucun code, aucune
migration, aucun drapeau. PR ouverte avec ce handoff. Session autonome de nuit
sur mandat du responsable (2026-10-14) : les PR 4 à 6 s'enchaînent, un merge à
la fois, déploiement constaté entre chaque ; les points [A verifier] et
[Hypothese] du plan se tranchent ici et se consignent.

## Objectif

Quatrième des six PR de `D-285` §7 (plan §9 « Archivés par déplacement »,
« Figés en place », « Supprimés », §11) : cinq feuilles de route, neuf
photographies ou cadrages remplacés et deux dossiers déplacés sous
`docs/archive/` avec bandeau daté ; douze documents figés en place ; quatre
dossiers de briefs d'août sortis du dépôt ; liens et chemins réécrits dans les
documents vivants.

## Décisions prises

- Destinations [Hypothese du plan] : `docs/archive/roadmap-updates/` pour les
  feuilles de route (dossier existant), `docs/archive/cadrages/` (neuf) pour
  photographies, audits, cadrages et la proposition « gate multi-cycles ».
- « AUDIT UX 5.0 » du plan = `AUDIT_CONFORMITE_UX_5_0_2026-07-18.md`.
- Gate modèle multi-cycles : « historique Git » au §7, « déplacement » au §9 ;
  tranché en déplacement du dossier entier, bandeau « résolue par G2 ».
- Checklist G-TRUST-04 : bandeau « contredit par `D-121` » ; `docs/DECISIONS.md`
  la cite sous l'ancien chemin, trace non réécrite.
- Curation signée : la pièce de transfert `sources/2026-08-23-…` reste, citée
  par le LOT-02 de doctrine exécutable (`:11-13`, le plan dit `:3`).
- Nutrition référentielle : dossier archivé entier, seul le gabarit vide
  `CAMPAIGN_DRAFT.md` supprimé.
- Chemins réécrits dans les documents vivants seulement. Traces intactes :
  handoffs, `changelog.d/`, `CHANGELOG.md`, `SESSION_LOG.md`, `DECISIONS.md`,
  `docs/archive/`, `.wn/state.json`, `.wn/campaigns/archive/`, `web/` (le
  commentaire `web/src/lib/clinical/tableRepliV1.ts:144` : module clinique
  signé, non touché), et le plan lui-même.
- Fins de ligne : six documents en CRLF gardent leurs octets d'origine sur
  les lignes inchangées ; `ROADMAP_AGENT_PLAN.md` passe en LF à sa nouvelle
  place (normalisation `.gitattributes` sur un chemin neuf), diff entier,
  contenu identique hors bandeau.

## Fichiers modifiés

- Déplacés (« Archivé le 2026-10-14 ») : `ROADMAP_PRODUIT`,
  `PROGRAMME_WELLNEURO_3_0`, `PROGRAMME_WELLNEURO_5_0`, `ROADMAP_AGENT_PLAN`,
  `HISTORIQUE_CHANTIERS_TECHNIQUES` → `docs/archive/roadmap-updates/` ;
  checklist G-TRUST-04, audits de conformité 5.0 et UX 5.0, audit BioFlow,
  audit des panels, mesure du rayon Correspondance, surfaces « écart de plan »
  et « textes partagés », cadrage BIO-PARCOURS v1, dossiers du gate
  multi-cycles et de nutrition référentielle → `docs/archive/cadrages/`.
- Figés en place (« Figé le 2026-10-14 ») : six cadrages (BIO-INGEST, Boussole
  assiette, fil médecin 5.0, lettre d'adressage, levée du signal d'alerte,
  porte biologique) et six surfaces de relecture (assiettes, conduites,
  familles d'équivalence, resolver, `SAF-QUEST-01`, BP-25).
- Supprimés : briefs charge et capacité, récit du parcours, jumeau de
  compréhension, curation signée (sauf la pièce de transfert) ;
  `nutrition-referentielle/CAMPAIGN_DRAFT.md`.
- Lignes datées : `BOUSSOLE_ALIMENTAIRE_CONTEXTE`, `MON_EQUILIBRE_CONTEXTE`,
  `MOTEUR_INTENTION_CLINIQUE_CONTEXTE`, `docs/design-system-d1.md`.
- Liens et chemins : `CLAUDE.md`, `README.md`, `docs/PROJECT_STATE.md`,
  `.wn/documentation.yml` (clé `plan`), index et contextes de `docs/claude/`,
  `REGISTRE_FRONTIERES.md`, `GATES_VAGUE2_G1_G3_G4.md`, `DOSSIER_RGPD.md`,
  `PROCEDURE_VIOLATION_DONNEES.md`, `ROADMAP_TECHNIQUE.md`,
  `BIOFLOW_ROADMAP.md`, dix-sept fiches de campagnes et propositions.
- Neufs : `changelog.d/2026-10-14-plan-unique-pr4-archivage.md`, ce handoff ;
  modifié : `docs/claude/SESSION_LOG.md` (une entrée en fin).

## Validations exécutées

- Contrôle des anciens chemins (`grep` hors traces) : vide.
- `node scripts/wn-campaign-audit.mjs` (commande de la CI) : code 0, un
  avertissement préexistant (`duplicate_lot_ordinal`) ; `wn-ancres-doctrine` :
  code 0 ; `textesLettre.test.ts` 6/6 (lit le cadrage de la lettre).
- T1 complet (`cd web && npm run check`) : code 0, sortie relue dans un
  fichier ; `bash scripts/check_no_secrets.sh --staged` : OK. T2 non joué :
  aucun code touché.
- Relecture adverse du diff (quatre lecteurs, trois contre-lecteurs par
  constat) : constats et verdicts dans le corps de la PR.

## Problèmes ouverts

- Le plan cite encore les anciens chemins : §1 (`:5-10`), §8 et §11
  (`AUDIT_PANELS` et `AUDIT_BIOFLOW` sous `docs/claude/campagnes/…`, chemin
  déjà faux avant cette PR ; `HISTORIQUE_CHANTIERS_TECHNIQUES.md:38-93` ;
  `FILE_ATTENTE.md`, supprimée en PR 5). À corriger à sa prochaine version,
  avec `PROJET_CONTEXTE.md:195` et les reports des PR 2 et 3 (pagination, PDF
  natif, coaching autonome, RAG SIIN plein, `AGA_*`, banc « élevé / bas »,
  `D-045`, restes a et b sous R:ao).
- `docs/claude/campagnes/README.md` et la table des lots de BIO-INGEST : PR 6.

## Prochaine action exacte

1. `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond (code 0 seul),
   commentaires en ligne lus (`gh api repos/{owner}/{repo}/pulls/<N>/comments`,
   un verdict chacun), merge squash après le déploiement constaté de
   `d671945b`, puis déploiement de cette PR constaté
   (`node scripts/wn-deploiement-observation.mjs`).
2. PR 5 depuis une branche neuve sur `origin/main` : suppression de
   `docs/claude/campagnes/FILE_ATTENTE.md`, adresses de routage de
   `.claude/rules/pr-revue-et-release-db.md` et `.claude/skills/wn-merge/SKILL.md`
   réécrites vers le plan §8.

## Interdits encore actifs

- Un merge à la fois ; chaque PR attend le déploiement constaté de la
  précédente ; jamais d'auto-merge sur une PR de lot.
- Aucune migration, aucun `schema.prisma`, aucune règle clinique ni seuil
  dans les six PR du versement ; aucune release-db.
- `ACTIVE_CAMPAIGN.md` ne s'édite pas à la main ; `active_lot` oui.
- Le fichier non suivi de la copie principale
  (`web/src/lib/clinical-engine/safetyEffetIndesirable.cas-fictifs.test.ts`)
  ne se pousse pas tel quel.
- Aucune identité, aucun constat de production hors agrégat, aucun texte non
  signé.
