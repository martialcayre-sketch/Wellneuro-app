### Biologie : journal des signatures NABM et constat « aucun acte », la migration seule (M-3c, F54, 2026-10-16)

PR 1 du lot M-3c (file A, rang 2) : migration seule, sans code consommateur.
Rien n'écrit ni ne lit encore les deux tables neuves ; l'écriture du journal
à chaque signature et retrait, le bouton « Constater : aucun acte » et la
dérivation en `hors_nomenclature` viendront dans la PR 2, après la release-db
approuvée et constatée par conteneur.

- **Journal en ajout seul `biology_analyte_nabm_journal`** (migration
  `20261016100000_nabm_journal_constats_v1`) : quatre actes — signature,
  retrait de signature, constat « aucun acte », retrait de constat —, forme
  fixée par acte (CHECK). Un retrait recopie ce qu'il efface (signataire et
  date) : le journal commence à la migration, sans reprise des signatures
  antérieures, et rien de ce qu'elles portent ne se perd au retrait. UPDATE,
  DELETE et TRUNCATE refusés ; date, ordre et transaction posés par la base ;
  une signature journalisée exige un acte présent et actif au millésime
  courant. Ferme la réserve R1 de la revue de M-3.
- **Constat `biology_analyte_nabm_constats`** : au plus un par analyte, pour
  le millésime vu, vérifié égal au millésime courant ; refusé sur un analyte
  inactif ; date posée par la base. Il ne vaut que pour ce millésime : au
  suivant, l'analyte repassera « non évalué » (arbitrage du 2026-10-16,
  appliqué par la PR 2). Table neuve plutôt que colonnes de l'analyte, pour
  ne pas mettre le catalogue en panne entre le déploiement et la release-db.
- **Signature et constat s'excluent** (arbitrage du 2026-10-16) : refus en
  base dans les deux sens, sous un verrou consultatif par analyte ; toute
  écriture qui le prend hors READ COMMITTED est refusée. Une signature ne se
  modifie plus en place (retrait puis signature) et sa date est désormais
  posée par la base.
- **Pas sans journal, en base** (arbitrage du 2026-10-16) : triggers de
  contrainte différés, jugés au COMMIT. Toute signature, tout retrait, tout
  constat et tout retrait de constat exigent la ligne de journal de la même
  transaction et du même contenu, et la dernière ligne de journal de chaque
  clé d'une transaction doit concorder avec l'état final. `TRUNCATE
  biology_analyte_nabm` est refusé dès qu'une ligne est signée. Limites
  écrites dans la migration : les lignes intermédiaires d'une même clé ne
  sont pas jugées ; une ligne qui redit un état déjà en place, ou un retrait
  sur un couple jamais signé, concorde et passe — aucune ne masque une
  signature réelle ; l'administrateur des tables peut désarmer les
  triggers. Conséquence acceptée : entre la release-db et le
  déploiement de la PR 2, signer et retirer depuis la fiche d'analyte
  échouent (rien n'est écrit).
- **Contrats et bancs** : `nabm_journal_constats_v1_negatif.sql`, branché au
  CI, vérifie le motif de chaque refus ; 23 mutations des gardes le font
  échouer. Banc à deux sessions `banc-nabm-exclusion-deux-sessions.test.mjs`
  (CI et T3) : constat et signature concurrents se sérialisent, le second est
  refusé ; il rougit sans le verrou. Le banc d'import NABM
  (`scripts/test-cb-nabm-import.sh`) journalise ses propres signatures et
  suppressions.
- **Revue `wn-reviewer`** (GO avec réserves) : troncature non gardée (P1),
  une ligne de journal pour plusieurs gestes, SERIALIZABLE mêlé à READ
  COMMITTED, dates de signature fixées par l'écrivain, affirmations
  resserrées, contrat sans motifs : corrigés dans ce lot. La course avec un
  import NABM concurrent (réserve R2 de M-3) est routée à la PR 2 (F54).
