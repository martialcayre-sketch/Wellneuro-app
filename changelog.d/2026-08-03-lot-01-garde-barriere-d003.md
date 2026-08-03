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
  surface ». Aucun banc ne le couvrait. Il est **plus** nécessaire depuis que le
  compteur est à zéro, pas moins : sans claim en attente en production, rien ne
  signalerait une régression de la barrière avant la prochaine ingestion, qui en
  recréera — `store.ts` insère toujours en `EN_ATTENTE_VALIDATION`.
- `web/prisma/checks/rag_claim_barriere_d003_v1.sql` éprouve
  `match_wellneuro_rag_claims`, seule voie de restitution du corpus, par cinq
  fixtures : un claim signé et rattaché à un verbatim remonte ; un claim en
  attente, rejeté, désactivé, ou orphelin de source ne remonte jamais.
- **Le contrat crée ses fixtures et les annule** (`ROLLBACK`). La base du CI est
  construite vide par `migrate deploy` seul : un contrat purement observateur y
  passerait **par vacuité**, et se lirait pourtant comme un garde.
- **Deux des cinq conditions de la barrière ne sont pas falsifiables par
  fixture.** `patient_identifiable = false` et `compartment = 'ACTIF'` sont
  tenues par des `CHECK` de table : un `INSERT` qui les viole échoue à
  l'`INSERT`, pas à l'assertion — le test ne dirait pas ce qu'il croit dire.
  Elles sont assérées **structurellement** dans `pg_constraint`, ce qui détecte
  leur disparition.
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
  (« non signé, désactivé ou orphelin ») au lieu de nommer le coupable.
  Réordonné : les cas d'abord, le compte en filet.
- **Le garde a été vu échouer avant d'être livré.** Quatre falsifications jouées
  contre la base éphémère, chacune produisant son message propre, le témoin
  restant vert — dont une qui prive le contrôle positif de sa source et vérifie
  qu'une fonction rendant zéro ligne est détectée, non déclarée conforme.
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
