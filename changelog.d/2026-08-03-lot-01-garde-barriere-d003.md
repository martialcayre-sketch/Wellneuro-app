### Corpus — la barrière D-003 a enfin un garde (LOT-01)

- **La revue des claims d'intervention est terminée, et ce lot ne l'a pas faite.**
  Les 755 claims en attente ont été signés le 2026-08-03 par le praticien, hors
  de la machinerie de campagne. Constaté au cadrage en lisant la base de
  production plutôt que le fichier de lot : le périmètre des 95 sources est à
  **2002 VALIDE / 0 en attente**, et le corpus actif entier à **8224 / 0**. Les
  2002 portent tous `validateur` et `valide_at`. Trois des quatre critères de
  done du lot étaient donc déjà satisfaits avant son ouverture.
- **Ce qui manquait, et qui est livré** : le test de non-régression que le lot
  demandait — « un claim `EN_ATTENTE_VALIDATION` reste invisible de toute
  surface **de restitution** ». La précision n'est pas cosmétique : l'établi de
  validation voit légitimement les claims en attente, c'est son objet. Aucun banc
  ne couvrait la fermeture. Il est **plus** nécessaire depuis que le
  compteur est à zéro, pas moins : sans claim en attente en production, rien ne
  signalerait une régression de la barrière avant la prochaine ingestion, qui en
  recréera — `store.ts` insère toujours en `EN_ATTENTE_VALIDATION`.
- `web/prisma/checks/rag_claim_barriere_d003_v1.sql` éprouve
  `match_wellneuro_rag_claims`, seule voie de restitution du corpus, par sept
  fixtures : un claim signé et rattaché à un verbatim remonte ; un claim en
  attente, rejeté, désactivé, orphelin de source, hors périmètre de sources ou
  sous le seuil de similarité ne remonte jamais.
- **Le contrat assère aussi ce qui empêche de CONTOURNER la fonction** — ajouté
  à la revue, qui a vu qu'il prouvait que la porte ferme pendant qu'on pouvait
  entrer par la fenêtre. `EXECUTE` refusé à `anon` et `authenticated`
  (conditionné à l'existence du rôle : vide en CI, mordant en production, c'est
  le piège « `REVOKE FROM PUBLIC` ne révoque rien »), et RLS active sur les deux
  tables. Un `DROP FUNCTION` + `CREATE` — le `CREATE OR REPLACE`, lui, conserve
  les grants — rendrait sinon les claims en attente lisibles par PostgREST sans
  jamais appeler la barrière.
- **Le contrat crée ses fixtures et les annule** (`ROLLBACK`). La base du CI est
  construite vide par `migrate deploy` seul : un contrat purement observateur y
  passerait **par vacuité**, et se lirait pourtant comme un garde.
- **Deux des cinq conditions ne sont pas falsifiables par FIXTURE.**
  `patient_identifiable = false` et `compartment = 'ACTIF'` sont tenues par des
  `CHECK` de table : l'`INSERT` échouerait avant l'assertion. Ce n'est pas une
  impossibilité — le DDL est transactionnel — mais un choix : tant que le `CHECK`
  tient, le prédicat de la fonction est redondant, et sa disparition est attrapée
  **structurellement** dans `pg_constraint`. Une des deux couches tient toujours.
- **Un embedding de fixture nul aurait rendu le contrat vert quoi qu'il arrive.**
  Le patron copié des autres contrats (`repeat('0,', 1535)`) donne un vecteur
  nul, dont la distance cosinus est indéfinie : `1 - (embedding <=> query)` vaut
  `NaN`, le seuil de similarité est faux, et le contrôle positif ne remonte
  jamais. Un garde qui ne rend rien passe pour vert. Vecteur `[1,0,…,0]`,
  interrogé avec lui-même.
- **L'ordre des assertions décide de ce qu'un échec raconte.** Écrites
  compte-d'abord, les quatre assertions par cas étaient **inatteignables** : un
  compte de 1 valant la fixture conforme implique l'absence des quatre autres.
  Mesuré en falsifiant le cas « en attente » — l'échec rendait une disjonction
  au lieu de nommer le coupable. Réordonné… ce qui a **déplacé le point mort sur
  le contrôle positif** : après les quatre `EXISTS` et le compte, la ligne unique
  ne pouvait plus être que la bonne, donc son assertion d'identité ne pouvait
  plus tirer. Vu par la revue adversariale, pas par moi. Ordre final : contrôle
  positif, puis les cas nommés, puis le compte en filet.
- **Le garde a été vu échouer avant d'être livré, sept fois.** Une falsification
  par assertion nommée, chacune rendant SON message et aucun autre, le témoin
  restant vert — c'est ce qui prouve qu'il ne reste plus d'assertion muette.
  Dont celle qui prive le contrôle positif de sa source : une fonction rendant
  zéro ligne est détectée, et non déclarée conforme.
- **Câblage vérifié par exécution.** `wn-test-worktree.sh` n'exécute pas le
  contenu du dossier : il extrait la liste depuis `.github/workflows/ci.yml`.
  Un fichier posé dans `prisma/checks/` sans étape déclarée ne tournerait **nulle
  part** — précédent dans le dépôt : `c4_referentiel_provenance_v1.sql`, annoncé
  câblé alors qu'il ne l'était pas. 11 contrats déclarés avant, 12 après, 12
  joués au palier T3.
- **Quatre modules lisent les claims sans filtrer `statut`** (`revue.ts`,
  `recherche.ts`, `questionnaire.ts`, `evaluation.ts`) : ce sont l'établi de
  validation, pas une restitution clinique. Le fait était mesuré mais non écrit ;
  il est désormais consigné dans `VALIDATION_CLAIMS_DEUX_VITESSES.md`, avec la
  modalité de la revue et sa répartition par jour.
