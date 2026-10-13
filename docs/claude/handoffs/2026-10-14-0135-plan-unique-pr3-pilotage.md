# Handoff — 2026-10-14 — Plan unique WellNeuro 6.0 : le pilotage renvoie au plan (PR 3 du versement)

## Branche et état Git

`docs/plan-unique-pr3`, dans le worktree `.claude/worktrees/plan-unique-pr3`,
partie de `origin/main` (`09bd86b1`, #1419, PR 2 mergée, déploiement Scalingo
constaté `success` le 2026-10-14). Documentation seule : aucun code, aucune
migration, aucun drapeau. PR ouverte avec ce handoff. Session autonome de
nuit sur mandat du responsable (2026-10-14, « passe toutes les PR en full
autonomie ») : les PR 3 à 6 s'enchaînent, un merge à la fois, déploiement
constaté entre chaque.

## Objectif

Troisième des six PR de `D-285` §7 (plan §9 « Campagnes maintenues (PR 3) »,
« Pilotage à corriger (PR 3) », §11) : `.wn/state.json` renvoie au plan au
lieu de dupliquer l'ordre ; fiches LOT-11 et LOT-12 du sommeil, LOT-25 de
BIO-PARCOURS, LOT-05 de BIO-INGEST ; `BIOFLOW_ROADMAP.md` ;
`PROJET_CONTEXTE.md` « Ce qui reste ouvert » ; `campagnes/README.md` ligne 5.

## Décisions prises

- `next_action` : tête neuve qui nomme la campagne active, son lot courant
  « aucun » et le plan ; l'ancienne tête est démotée en trace datée
  (convention de la pile, `scripts/wn-etat-reel.mjs` garde 4 : le plan disait
  « remplacée », la trace est gardée) ; les 23 entrées ex-[40] à [62] sont
  retirées, toutes versées au plan §8 ; `blocking_issues` vide.
- `status` [A verifier du plan] : gardé `active`. C'est le vocabulaire de
  l'outillage (`active` | `idle`, `scripts/wn-campaign.mjs`
  `deactivateCampaign`) ; la vue écrit « Statut : active » en dur pour le bloc
  primaire (`scripts/lib/vue-campagnes-actives.mjs:44`). La pause est le
  statut de la campagne, pas celui de l'état machine.
- `validation` [A verifier du plan] : aucun script ne l'écrit ; posée à la
  main sur le T1 complet du jour, `last_checked_at` antérieur à `updated_at`
  (garde 2) ; le T3 du 2026-10-06 reste cité comme dernier T3.
- `lot_courant` « aucun » sur BIO-INGEST [Hypothese du plan] : appliqué, comme
  la PR 2 l'a fait pour biologie exploitée.
- LOT-12 du sommeil : statut posé tel que le plan l'écrit, bandeau daté sur
  la fiche, phrase datée dans `CAMPAGNE.md`, statut de campagne réécrit sans
  tiret cadratin (LOT-11 mergé, LOT-12 transféré).
- `AUDIT_REGLES_CAMPAGNES.md` régénéré (générateur nommé, statuts changés).
- `PROJET_CONTEXTE.md` : phrase corrigée après contre-lecture, elle ne cite
  que ce que le plan nomme (voir Problèmes ouverts).
- `campagnes/README.md` : renvoi au plan en ligne 5 et note « photographie du
  2026-08-02, le frontmatter fait foi », qui couvre le REPRISE « ouverte »
  signalé par le handoff précédent sans réécrire la table (PR 6).

## Fichiers modifiés

- `.wn/state.json` ; `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` (régénéré).
- BIO-PARCOURS : `CAMPAGNE.md` (statut, paragraphe des lots, cinq lignes
  datées dans la table, ordre des `release-db`), `lots/LOT-25`.
- Sommeil : `CAMPAGNE.md`, `lots/LOT-11`, `lots/LOT-12`.
- BIO-INGEST : `CAMPAGNE.md` (`lot_courant`), `lots/LOT-05`.
- `docs/architecture/bioflow/BIOFLOW_ROADMAP.md` ;
  `docs/claude/PROJET_CONTEXTE.md` ; `docs/claude/campagnes/README.md` ;
  `docs/claude/campagnes/AUDIT_REGLES_CAMPAGNES.md`.
- Neufs : `changelog.d/2026-10-14-plan-unique-pr3-pilotage.md`, ce handoff ;
  modifié : `docs/claude/SESSION_LOG.md` (une entrée en fin).

## Validations exécutées

- `npm ci` et `npx prisma generate` dans le worktree.
- T1 complet (`cd web && npm run check`) : vert, code 0, 17 étapes, sortie
  relue dans un fichier. T2 non joué : aucun code touché.
- `node scripts/wn-campaign-audit.mjs --fail-on-warning-codes …` (commande
  de la CI) : code 0 avant et après `wn-cycle --appliquer`.
- Bancs `wn-etat-reel`, `wn-coherence-etat`, `wn-campaign`, `wn-cycle` :
  89 cas verts, avant et après `--appliquer`.
- `node scripts/wn-cycle.mjs --appliquer` : `updated_at`,
  `recent_decision_ids` (D-285 à D-281), vue régénérée.
- `bash scripts/check_no_secrets.sh` (dans T1) et `--staged` avant commit.
- Relecture adverse du diff par quatre lecteurs (mandat, faits, forme,
  outillage), chaque constat soumis à trois contre-lecteurs : 5 constats,
  1 retenu et corrigé (phrase de `PROJET_CONTEXTE.md`), 4 écartés sur pièces.

## Problèmes ouverts

- À reporter à la prochaine version du plan : la pagination au-delà de
  ~100 lignes est nommée au §9 (renvoi à S-1 et au §8) mais portée par aucune
  fiche ni ligne du §8 ; la génération PDF native avec signature du booklet,
  le coaching patient autonome et le RAG SIIN plein ne sont pas nommés (le §5
  ne ferme SSO et RAG dynamique que par renvoi à
  `HISTORIQUE_CHANTIERS_TECHNIQUES.md:82-93`, qui part en archive en PR 4).
  Remarque Copilot sur #1420 : corrigée.
- Restent de la PR 2 : pseudo-items `AGA_*`, banc « élevé / bas », `D-045`
  sans sort au §7, « restes a et b sous R:ao ».
- La table des lots de BIO-INGEST (`CAMPAGNE.md:80`) dit encore
  « FILE_ATTENTE » : PR 6, ligne datée.
- Fiche F01 du plan (lettre a, S-3) : les textes qu'elle cite sont corrigés
  ici sans la lettre a ; à constater au cadrage de S-3.

## Prochaine action exacte

1. `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond (code 0 seul),
   commentaires en ligne lus (`gh api repos/{owner}/{repo}/pulls/<N>/comments`,
   un verdict chacun), `gh pr merge <N> --squash --delete-branch`,
   déploiement constaté (`node scripts/wn-deploiement-observation.mjs`).
2. PR 4 (archivage) depuis une branche neuve sur `origin/main` : plan §9
   « Archivés par déplacement », « Supprimés », §11 ; repérage des chemins,
   citations au registre et liens à réécrire déjà fait en lecture seule.

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
