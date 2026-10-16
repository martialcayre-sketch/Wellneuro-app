### Biologie : chaque geste NABM journalisé, et le constat « aucun acte » signé à l'écran (M-3c, PR 2, F54, 2026-10-16)

PR 2 du lot M-3c (file A, rang 2) : le code consommateur de la migration
`20261016100000_nabm_journal_constats_v1`, appliquée par la release-db
38862348825 (sentinelle `WN_RELEASE_DB_OK id=38862348825-1`) et constatée par
conteneur le 2026-10-16 (deux tables, RLS sans politique, douze triggers dont
trois différés, aucune ligne de journal ni de constat, cinq signatures
intactes). Ferme la fenêtre où signer et retirer rendaient « Erreur
technique. ».

- **Signature et retrait journalisés** (`correspondancesNabm.ts`) : chaque
  geste écrit sa ligne de `biology_analyte_nabm_journal` dans la même
  transaction ; le retrait y recopie la signature qu'il efface. Un refus
  (état vu introuvable, ligne déjà signée) se juge AVANT la ligne de journal
  et n'écrit rien ; une écriture qui ne touche aucune ligne annule la
  transaction, journal compris. La date de signature est posée par la base,
  puis relue avant d'être rendue : c'est elle que le retrait désigne.
- **Constat signé « aucun acte dans la nomenclature »** (`deciderConstat`,
  route `api/praticien/biologie/nabm/constats`, même garde que les
  correspondances) : seulement pour un analyte que la liste préparée range
  « aucun acte » (`candidatsNabm.ts`), sur le millésime affiché, qui doit être
  le courant et celui où la liste a été relue (V105) — sinon refus
  `liste_a_relire` et bouton retiré, avec sa raison (arbitrage du
  2026-10-16, revue CodeRabbit) ; refusé si l'analyte porte une signature (et une signature est
  refusée s'il porte un constat) — retrait d'abord. Signataire = e-mail de
  session ; date posée par la base et relue.
- **Dérivation** (`remboursable.ts`, écrite une seule fois ; le prédicat
  `constatValable` y est exporté, et l'écran le lit pour dire « périmé ») : sans
  correspondance signée, un constat posé sur le millésime COURANT rend
  `hors_nomenclature` ; posé sur un autre millésime, ou sans nomenclature
  importée, il ne vaut pas et l'analyte reste `non_evalue` (arbitrage du
  2026-10-16). Une signature présente l'emporte. Le régime documentaire ne
  change pas : les deux statuts relèvent du document patient. `catalogue.ts`
  passe le constat et le millésime courant ; `propositionService.ts` n'est
  pas touché (lettre f).
- **Écran** (`CorrespondancesNabmSection.tsx`) : « Constater : aucun acte
  dans la nomenclature (V105) » pour un analyte « aucun acte » sans signature ;
  le constat affiché avec son signataire et « Retirer le constat » (confirmé) ;
  périmé : « Constat périmé (V105) — à renouveler au millésime V106 ».
- **Course avec un import NABM** (réserve R2 de M-3) : chaque geste prend un
  verrou de partage sur `biology_catalog_versions_courantes`, que l'import
  (`SHARE ROW EXCLUSIVE`) attend et fait attendre : le geste lit le millésime
  d'avant ou d'après l'import, et le contrôle des signatures orphelines de
  l'import voit toute signature commise par l'application (une écriture SQL
  hors d'elle ne prend pas ce verrou). L'attente est bornée à 3 s
  (`lock_timeout`) : au-delà, le geste est refusé en `import_en_cours`, rien
  n'est écrit, et la connexion n'est pas retenue pendant l'import. L'attente
  épuisée du verrou de l'analyte (un autre geste en cours) se dit
  `etat_divergent`, jamais « import » (revue CodeRabbit). Puis le
  verrou consultatif de l'analyte (celui des triggers), pour que les refus
  d'exclusion se disent en raisons plutôt qu'en erreur de la base. Les
  transactions sont en READ COMMITTED explicite, le seul niveau que la
  migration admet.
- **Bancs** : Vitest (dérivation, catalogue, écrivain en transaction, routes,
  écran) ; onze mutations les font échouer. Banc de l'écrivain contre
  PostgreSQL `banc-nabm-gestes-prisma.test.ts` (CI et T3) : contre-épreuve
  d'une signature brute refusée sans journal, puis signature, retrait,
  re-signature, constat et retrait acceptés au COMMIT, refus sans écriture,
  date rendue = date de la base, attente du verrou d'un import, refus
  `import_en_cours` au-delà de 3 s ; six mutations de l'écrivain le font
  échouer. Revue `wn-reviewer` : GO avec réserves, quatre P2 corrigés dans le
  lot (attente bornée, isolation explicite, prédicat écrit une fois, portée
  de R2).
