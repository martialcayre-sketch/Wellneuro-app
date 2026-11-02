# Handoff — 2026-11-02 — Portail patient : audit « rails et menus », arbitrages Q1–Q3 et Q27–Q30, maquette

## Branche et état du dépôt

- Branche `audit/portail-rails`, partie de `origin/main` (6b5ea0f3, #1806) ;
  worktree `.claude/worktrees/audit-portail-rails`, cycle en `git`/`gh`
  direct.
- PR #1815, documentaire (`docs_only`) : la proposition
  `docs/claude/propositions/2026-11-01-portail-rails-et-menus/README.md`,
  une ligne de dette au plan (§8), le fragment
  `changelog.d/2026-11-02-audit-portail-rails-et-menus.md` et ce handoff.
  Ni code, ni migration, ni décision `D-xxx`, ni drapeau : rien n'est
  engagé.

## Objectif

Répondre à la demande « faire évoluer l'interface patient comme l'espace
praticien, avec la même organisation (rails et menus) » par un audit
statique : ce que le praticien a, ce que le patient a, les écarts, ce que la
doctrine impose, trois organisations possibles, un plan de lots et les
questions à trancher ; consigner les arbitrages rendus ; relier la maquette.

## Décisions prises

- Arbitrages du responsable du 2026-11-01, à options fermées, sur la seule
  lecture du document (chapitre 14) : Q1 **A d'abord, B ensuite** (hub
  regroupé en L2, bouton « Menu » et tiroir en L3 après constat) ; Q2
  **l'organisation seule** (groupes nommés, ordre, un seul `aria-current`,
  liste déclarée une fois ; ni rail nuit ni compteurs, D-333) ; Q3 **menu +
  étapes** (frise des étapes navigable, nouveau lot L2b entre L2 et L3).
- Q27 à Q30, ouvertes par Q3 : texte d'attente court pour l'étape en
  attente ; cibles existantes seulement, aucune route neuve ; étape passée
  en relecture, à venir fermée (A6-R1) ; `<nav aria-label="Étapes de votre
  parcours">` distincte de « Autres espaces ».
- Maquette du 2026-11-02 (artefact Design « Maquette — Navigation du
  Jardin », quatre artboards sur le design system Wellneuro, patiente
  fictive Sophie Nicola), reliée au chapitre 9 ; non rendue, non
  contractuelle.
- Revue de la PR : CodeRabbit saute le dépôt (moins de dix étoiles, revue
  manuelle refusée) et la revue PR-Agent de la tête ne vaut pas preuve
  (`wn-revue-pr-agent` en `1` : diff compressé, README exclu du budget). Sur
  consigne du responsable du 2026-11-02 (« prend la main sur Copilot »), la
  session a tenu la revue de substitution : huit relecteurs indépendants,
  chaque constat contre-vérifié par trois lentilles ; 21 constats
  confirmés, 7 réfutés ; verdicts écrits dans la PR. Les corrections ont
  ouvert quatre questions (Q31 à Q34, chapitre 13), à trancher dans L0, et
  une ligne de dette au plan (feuille « Plus » mobile sans « Comptes du
  cabinet », écart hérité de #1780, relevé à la revue de #1765).

## Fichiers modifiés

- `docs/claude/propositions/2026-11-01-portail-rails-et-menus/README.md`
  (créé, puis corrigé le 2026-11-02 : citations, cohérence L0/L2b/Q27–Q29,
  ligne D7/D11 au chapitre 7, Q31 à Q34, mise à jour datée du drapeau de la
  bibliothèque) ; `docs/claude/PLAN_WELLNEURO.md` (une ligne, §8) ;
  `changelog.d/2026-11-02-audit-portail-rails-et-menus.md` ; ce handoff.

## Validations exécutées

- CI vert (`verify` a tourné) sur chaque tête ; `wn-attendre-ci 1815` en `0`
  sur la tête finale avant le merge.
- À la rédaction : 259 citations `fichier:ligne` relues contre
  `origin/main@6b5ea0f3` ; une erreur corrigée
  (`bibliothequeDrapeau.ts:22-24`).
- Relecture multi-agents du 2026-11-02 : 28 constats vérifiés, 21 confirmés
  (14 corrigés sur la branche, 1 routé au plan, les autres portés par ce
  handoff et le fragment changelog), 7 réfutés avec motif ; détail dans le
  commentaire de verdicts de la PR.

## Problèmes ouverts

- Q4 à Q26 et Q31 à Q34 (chapitre 13) restent à trancher dans L0 ; L0 écrit
  la `D-xxx`, le tableau étape → cible (Q28) et le rang visible des étapes
  (Q33).
- Le texte d'attente de l'étape 5 (Q27) est un libellé patient : à faire
  accepter mot pour mot avant le merge de L2b, sous la garde D7.
- Le design system publié dit encore « une correction d'avance sur l'app »
  pour la feuille « Plus » : à retoucher d'une ligne après le merge de #1765.

## Prochaine action exacte

Merge de #1815 selon `wn-merge` (étapes 7 bis et 7 ter rejouées sur la tête
finale, `--match-head-commit`, sujet posé), puis ouverture de L0 : trancher
Q4 à Q26 et Q31 à Q34, rédiger la `D-xxx` et le plan de bancs ; aucun code
avant L0.

## Interdits encore actifs

- Aucun code, aucune route, aucun drapeau ni décision dans ce lot ; aucune
  migration.
- Côté portail : aucun jeton `--rail-*`, aucun toggle de thème (A5-R2),
  aucun chiffre ni compteur visible (D-333), aucune étape à venir cliquable
  (A6-R1), pied d'urgence conservé partout (D-293).
- Aucun patient hors des trois fictifs (Sophie Nicola, Jennifer Martin,
  Michel Dogné).
