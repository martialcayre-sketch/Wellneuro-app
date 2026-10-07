### Transmission du compte rendu par le patient : la migration, seule dans sa PR (BIO-INGEST LOT-04, 2026-10-07)

- **Migration `bio_ingest_transmission_patient_v1`** (`D-269` §2-§3), sur
  `comptes_rendus_biologiques` :
  - **origine** `praticien` | `patient`, `praticien` par défaut pour les
    dépôts existants ;
  - `depose_par` nullable, la base tenant l'équivalence « praticien ⇔ auteur
    nommé » ;
  - **écart** (`ecarte_le`, `ecarte_par`, `motif_ecart` fermé : `illisible`
    | `document_non_conforme`), posé par la même écriture que la purge, motif
    `ecarte` ;
  - un index (dossier, origine, date de dépôt).
- **La base juge l'écart** (trigger de purge étendu) :
  - seul un document transmis par le patient s'écarte ;
  - jamais si une ligne est validée, ni pendant une extraction ;
  - auteur et motif sont exigés ;
  - l'écart et la purge sont datés par la base, en UTC ;
  - un autre motif de purge ne pose aucun écart, et l'origine est figée.
- **Réciproque, tenue par le trigger des lignes** (revue `wn-reviewer`, P1) :
  après l'écart, aucune ligne de ce document ne se valide plus, mais elle
  peut encore s'écarter. Un verrou partagé sur le compte rendu sérialise
  l'écart et la validation, dans les deux sens.
- **Banc à deux sessions** `banc-ecart-validation-deux-sessions.test.mjs`
  (revue Copilot de #1352). Il joue l'écart d'abord, la validation
  d'abord, et leurs deux témoins annulés. Chaque course constate d'abord
  que la seconde session attend un verrou. Avec l'ancienne fonction des
  lignes, les quatre courses échouent. Le banc est branché au CI et à T3.
- **Contrat SQL négatif** `bio_ingest_transmission_patient_v1_negatif.sql`,
  branché au CI. Le contrat de staging gagne les nouvelles colonnes et
  l'index.
- **Seul code** : le type de lecture du compte rendu accepte un déposant
  NULL. Rien ne dépose pour le patient ni n'écarte avant l'application
  constatée par conteneur.
