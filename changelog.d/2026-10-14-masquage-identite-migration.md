### BioFlow : l'identité masquée avant l'envoi — migration seule (D-284 §5, lot j, 2026-10-14)

- **Migration seule, aucun code consommateur** : la table
  `masquages_comptes_rendus` est créée vide ; rien ne l'écrit ni ne la lit
  avant la `release-db` et son constat. La lecture d'un compte rendu ne change
  pas encore : il part toujours entier jusqu'au lot suivant.
- **Arbitrages du responsable** : le praticien noircit lui-même l'identité à
  l'écran avant la lecture, et seules les pages masquées partiront ; la
  lecture reste bloquée sans zone masquée, sauf la case « aucune identité sur
  ce document », tracée.
- **Ce que la base tient** : 1 à 20 pages JPEG bornées une à une et au total ;
  zones OU déclaration, jamais les deux ; masquage horodaté par la base et
  figé ; ni masquage d'un document purgé, ni pendant une lecture ; **la purge
  du document purge ses pages dans la même instruction**, quel que soit son
  motif ; clés `RESTRICT` ; RLS deny-all. La file connaît un nouveau refus,
  `masquage_absent`.
- **Effacement et retrait** : l'effacement d'un dossier et le retrait d'un
  dépôt suppriment les pages masquées avant le document ; le garde des
  auteurs de suppression les couvre, et aucun code ne peut les modifier.
  Table déclarée au registre RGPD avant sa création.
- **Contrat** : `bio_ingest_masquage_identite_v1_negatif.sql`, joué au CI,
  chaque refus vérifié sous son message ; le contrat du staging compte
  désormais dix fonctions `bio_ingest_*`.
- **Courses du masquage** : le trigger d'insertion verrouille le document
  `FOR UPDATE`. Ce verrou le sérialise avec la purge (revue `wn-reviewer`,
  P1), avec l'ouverture d'un import et avec la demande d'une lecture (revue
  Copilot de #1426 : un `FOR SHARE` ne les gênait pas). Banc à deux sessions
  `banc-masquage-purge-deux-sessions.test.mjs` (cinq courses, trois témoins),
  au CI et en T3.
- **Suite** : écran de masquage, route d'enregistrement, lecture des seules
  pages masquées (lot 2), puis textes patient à signer (lot 3).
