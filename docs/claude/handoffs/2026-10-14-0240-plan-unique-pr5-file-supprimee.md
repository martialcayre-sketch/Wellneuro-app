# Handoff — 2026-10-14 — Plan unique WellNeuro 6.0 : la file d'attente est supprimée (PR 5 du versement)

## Branche et état Git

`docs/plan-unique-pr5`, dans le worktree `.claude/worktrees/plan-unique-pr3`,
partie de `origin/main` (`aaf73324`, #1421, PR 4 mergée, déploiement Scalingo
constaté avant le merge de cette PR). Documentation seule : aucun code, aucune
migration, aucun drapeau. PR ouverte avec ce handoff. Session autonome de nuit
sur mandat du responsable (2026-10-14) : les PR 5 et 6 s'enchaînent, un merge
à la fois, déploiement constaté entre chaque.

## Objectif

Cinquième des six PR de `D-285` §7 (plan §11, ligne « 5 | suppression de la
file ») : `docs/claude/campagnes/FILE_ATTENTE.md` supprimé ; les deux adresses
de routage d'un commentaire de revue (`.claude/rules/pr-revue-et-release-db.md`,
`.claude/skills/wn-merge/SKILL.md`) réécrites vers le plan.

## Décisions prises

- « Routé » = vers le plan unique `docs/claude/PLAN_WELLNEURO.md`, dette
  nommée du §8 ou fiche qui le porte, avec son adresse. La « dette nommée de
  `docs/ROADMAP_TECHNIQUE.md` » cesse d'être une adresse : son §12 renvoie à
  l'historique archivé en PR 4, et le plan §11 le dit.
- Les mentions de la file ailleurs (handoffs, fragments, `CHANGELOG.md`,
  `SESSION_LOG.md`, `DECISIONS.md`, `.wn/state.json`, fiches de campagnes et
  cadrages, `BIOFLOW_ROADMAP.md`, archives) restent comme traces datées, comme
  le plan §11 le prescrit ; la ligne 80 de BIO-INGEST et les lignes de
  rayon-biologie-cb reçoivent leur ligne datée en PR 6.
- Le plan cite encore la file (§1 `:10`, §8, §11) : adresses d'historique, à
  réécrire à sa prochaine version avec les reports des PR 2 à 4.
- Revue Copilot : une dette vivante de la file manquait au plan. Les seize
  entrées que le plan ne cite pas par ligne ont été instruites (lecteur et
  deux vérificateurs chacune) : sept portées par le plan, six closes ou
  périmées, trois perdues, ajoutées au §8 « Dettes techniques vivantes » en
  lignes datées (`patientLimitations` servi vide, D-191 et D-200 §3 ; constat
  de la proposition de bilan sur dossier réel ; identifiant brut de la
  priorité dans la minute d'après, D-279). Le plan privé qui génère
  `PLAN_WELLNEURO.md` doit les absorber : geste du responsable.

## Fichiers modifiés

- Supprimé : `docs/claude/campagnes/FILE_ATTENTE.md`.
- `docs/claude/PLAN_WELLNEURO.md` : trois lignes ajoutées au §8.
- Modifiés : `.claude/rules/pr-revue-et-release-db.md` (verdict « Routé »),
  `.claude/skills/wn-merge/SKILL.md` (étape 6, verdict « routé »).
- Neufs : `changelog.d/2026-10-14-plan-unique-pr5-file-supprimee.md`, ce
  handoff ; modifié : `docs/claude/SESSION_LOG.md` (une entrée en fin).

## Validations exécutées

- Lecteurs de la file : aucun script, crochet, test ni manifeste ne lit
  `FILE_ATTENTE.md` (`grep` sur `scripts/`, `web/scripts/`, `.github/`,
  `.claude/`, `.wn/`) ; aucun lien Markdown ne pointe vers lui.
- T1 complet (`cd web && npm run check`, dont `hooks-check` et
  `skills-check`) : code 0, sortie relue dans un fichier ; `bash scripts/check_no_secrets.sh --staged` : OK.
  T2 non joué : aucun code touché.
- Relecture adverse du diff : 1 constat (marqueurs du
  handoff à remplir avant le commit), écarté par les trois contre-lecteurs :
  étape prévue du flux, remplie ici.

## Problèmes ouverts

- À reporter à la prochaine version du plan : ses propres citations de la
  file ; les anciens chemins de la PR 4 ; les reports des PR 2 et 3 ; les
  trois lignes du §8 ajoutées ici, à porter dans le plan privé source.
- PR 6 : `PROJET_CONTEXTE.md`, `DETTE_TRUST.md`, lignes datées du §9.

## Prochaine action exacte

1. `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond (code 0 seul),
   commentaires en ligne lus, un verdict chacun, merge squash après le
   déploiement constaté de `aaf73324`, puis déploiement de cette PR constaté
   (`node scripts/wn-deploiement-observation.mjs`).
2. PR 6 depuis une branche neuve sur `origin/main` : `PROJET_CONTEXTE.md`
   (compte des modèles, biologie), `DETTE_TRUST.md`, lignes datées des textes
   périmés du plan §9 (repérage vérifié dans le scratchpad de la session).

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
