# Handoff — 2026-10-10 — BIO-PARCOURS : BP-26 clos, qualification différée (D-276)

## Branche et état Git

`docs/bp26-decision-qualification-differee`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, tirée de `origin/main` (`f3bb761d`,
#1391 mergée). La copie principale n'a pas été touchée. Une PR, une finalité :
consigner BP-26.

## Objectif

Écrire la décision publique de BP-26 et amender la porte de `D-266` §2, selon
la forme confirmée par le responsable (« A oui B amende C oui »).

## Décisions prises

- **`D-276`** : aucune fonction retirée ni réduite ; chaque fonction porte la
  ligne « qualification différée à l'aboutissement du produit ; usage du
  praticien » ; qualification MDR/IVDR reprise au plus tard avant toute offre
  commerciale ; **ne conclut pas** qu'une fonction est hors champ. Détail par
  module hors dépôt.
- **`D-266` §2 amendé** : l'étage assistant ouvre au fil de sa livraison,
  derrière drapeau, sur ses preuves propres. La séparation en deux étages
  reste une discipline de livraison, sans lecture réglementaire. Gate G4 de
  BioFlow levé.
- LOT-26 terminé. La campagne passe **en pause** (l'audit refuse « en cours »
  sans lot courant) : l'ordre arrêté met d'abord les lots de sécurité, puis
  la priorité libre (5A), puis la source des seuils (8B) ; reprise par BP-07.
- Case « déploiement constaté » de BIO-INGEST LOT-12 versée (`f3bb761d`,
  `one-off-6075`).

## Fichiers modifiés

- `docs/DECISIONS.md` (`D-276`), `changelog.d/2026-10-10-bp26-qualification-differee.md`
- `docs/claude/REGISTRE_FRONTIERES.md` §1, `docs/ROADMAP_PRODUIT.md`,
  `docs/architecture/bioflow/BIOFLOW_ROADMAP.md`
- `docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md`, fiche LOT-26
- `docs/claude/campagnes/2026-09-30-bio-ingest/lots/LOT-12-cloture.md`
- `.wn/state.json` (`active_lot` à la main, puis `wn-cycle --appliquer`),
  `docs/claude/campagnes/ACTIVE_CAMPAIGN.md`, `docs/claude/SESSION_LOG.md`

## Validations exécutées

- `npm run check:rapide` vert ; `npm run check` : un rouge sur la cohérence
  `.wn/state.json` ↔ CAMPAGNE.md, corrigé, puis rejoué (voir la PR).
- Aucun code : T2 sans objet.

## Problèmes ouverts

- **Le lot 10A est déjà livré par `D-275`** (encart 3114/15/112/114 toujours
  visible, constat `SAF-QUEST-01` signé, carte au Fil), constaté en
  production le 2026-10-10. Restes non cadrés : geste de lettre offert sans
  consultation porteuse ; date « depuis » du Fil = celle de la porteuse.
- Suivi BioFlow (hors dépôt) à mettre à jour : LOT-26 terminé, G4 levé.

## Prochaine action exacte

PR, CI par `wn-attendre-ci`, commentaires en ligne, merge. Puis étape 2 de
l'ordre : faire dire au responsable ce qui manque à 10A après `D-275`, sinon
passer aux lots de sécurité 11A.

## Interdits encore actifs

- Rien du dossier par module au dépôt (public).
- Aucune règle clinique, aucun seuil sans décision ; 8B cherche une source,
  n'en invente pas.
