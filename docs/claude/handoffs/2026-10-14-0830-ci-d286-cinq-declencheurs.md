# Handoff — 2026-10-14 — D-286 (lettre ci) : cinq événements déclencheurs de la qualification, brouillon soumis au responsable

## Branche et état Git

`docs/ci-d276-cinq-declencheurs`, worktree `.claude/worktrees/ci-d276`,
partie de `origin/main` `7c4eeab2` (#1423). Documentation seule : aucun
code, aucune migration, aucun drapeau. PR ouverte en brouillon avec ce
handoff, en parallèle de la PR S-4 (#1424, code).

## Objectif

Fiche F67 du plan unique (lettre ci, rang 0, geste du responsable, PR
propre) : amender D-276 §2, dont « l'aboutissement du produit » n'avait ni
date ni critère, par cinq événements d'usage ; aligner le registre des
frontières §1 ; signaler le même flou dans D-265 §3 sans l'amender.

## Décisions prises

- Texte des cinq événements repris mot pour mot de la révision de BP-26
  (2026-10-12, hors dépôt) ; le dépôt public n'en porte que la liste.
- Statut « brouillon soumis au responsable » : le texte est de sa main, il
  passe « accepté » à sa lecture, avant le merge ; aucun script du dépôt ne
  lit ce champ.
- Fermetures : seuls les événements 2, 3 et 5 correspondent aux fermetures
  du plan §5 ; l'offre commerciale n'a d'autre préalable écrit que le test
  d'intrusion (D-283 §7) ; l'événement 4 déclenche seulement.
- Interdits de construction attribués au plan §5 (règles de BioFlow), non à
  D-282 §2, qui ne porte que le processus de fond.
- D-276 non réécrite dans son texte (registre append-only) ; campagnes
  closes et handoffs qui citent « aboutissement » laissés en traces.

## Fichiers modifiés

- `docs/DECISIONS.md` (D-286 en tête de la section active) ;
  `docs/claude/REGISTRE_FRONTIERES.md` §1 (deux mentions de D-276).
- Neufs : `changelog.d/2026-10-14-ci-amendement-d276-cinq-declencheurs.md`,
  ce handoff ; `docs/claude/SESSION_LOG.md` (une entrée en fin).

## Validations exécutées

- Relecture adverse par workflow : cinq lecteurs (sources, forme du
  registre, forme opaque, cohérence avec le plan, manques), trois juges
  par constat ; quinze constats, neuf retenus (quatre défauts distincts,
  corrigés avant le commit), six écartés (clôture alors à venir ; D-276 non
  marquée ; documents clos non alignés ; fragment ; flux laboratoire ;
  F67 « §1 »).
- T1 complet (`npm run check`) dans le worktree, client Prisma copié
  depuis la copie principale : code 0, sortie relue dans un fichier.
- Anti-secrets : dans T1.

## Problèmes ouverts

- Le numéro D-286 se relit sur `origin/main` juste avant le merge
  (`scripts/lib/decisions-numerotation.mjs`) ; la branche
  `feat/bioflow-envoi-sans-identite` (worktree verrouillé) n'en prend
  aucun : elle complète D-284.
- La fiche F67 du plan écrit « amendement de D-276 §1 » : c'est le §2 ;
  report à la prochaine version du plan.
- `SESSION_LOG.md` reçoit une entrée de chaque PR parallèle
  (`merge=union`) : la seconde à merger se relit.

## Prochaine action exacte

Lecture du responsable ; sur accord, passer la ligne « Statut » en
« accepté », sortir la PR du mode brouillon, `node scripts/wn-attendre-ci.mjs
<N>`, commentaires en ligne lus, merge un à un après #1424 ; puis S-3 (a, b,
g), que ci précède.

## Interdits encore actifs

- Aucune levée de fermeture (second compte, API, envoi direct, flux
  laboratoire) : D-286 n'en lève aucune.
- Numéro D-xxx réservé au merge, jamais à l'ouverture.
- Aucune identité, aucun détail du dossier BP-26 par module au dépôt.
- Jamais d'auto-merge ; un merge à la fois.
