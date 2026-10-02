### BIO-INGEST LOT-02 : migration du staging d'import biologique (D-256 A2/A5) (2026-10-01)

- **Trois tables nouvelles, filles du dossier patient.** Aucun code ne les
  alimente encore : le dépôt, l'extraction et l'écran de validation arriveront
  en PR 2, après le `release-db` approuvé et l'application constatée par
  conteneur (D-087).
  - `comptes_rendus_biologiques` : le compte rendu déposé, conservé en base
    HDS (A2). Il est figé et conservé en entier : aucun masquage, aucun nom de
    fichier.
  - `imports_biologiques` : une extraction de ce document. Elle porte son
    modèle et sa version du procédé dès sa création, donc aussi en cas
    d'échec (promesse de `usage_ia` v4), et le laboratoire tel que lu sur
    l'en-tête, posé à la terminaison (A5 ; arbitrage du 2026-10-01).
  - `lignes_biologiques_candidates` : ce que l'extraction a lu (libellé,
    valeur, unité, date du prélèvement, page), puis la décision du praticien.
    Une ligne validée désigne le résultat créé (A5). `resultats_biologiques`
    ne reçoit ni colonne, ni index, ni contrainte.
- **Ce que la base refuse :**
  - un type hors PDF, JPEG, PNG ou WebP, un document de plus de 10 Mo, une
    empreinte qui n'est pas celle du document, et le même document deux fois
    dans un dossier ;
  - un compte rendu, une extraction ou un résultat d'un autre dossier, à
    quelque maillon de la chaîne que ce soit ;
  - une ligne rattachée à un résultat saisi avant la fin de son extraction :
    une saisie manuelle ne passe pas pour la provenance d'un document (revue
    `wn-reviewer`, arbitrage du 2026-10-01). Le résultat validé garde
    `source = saisie_praticien`, et `import_labo` reste réservé au LOT-05 ;
  - la réécriture de ce qui a été lu, une seconde décision sur une ligne, une
    décision avant la fin de l'extraction, une ligne ajoutée après elle, et
    une extraction en échec qui garderait des lignes ;
  - un motif d'échec ou d'écart en texte libre.
  - Les instants (dépôt, lancement, fin, décision) sont posés par la base, à
    l'instant de la transition (`clock_timestamp()`, pas le début de la
    transaction), en UTC explicite, comme Prisma écrit `saisi_le`. Un `now()`
    nu suivrait le fuseau de la session (Europe/Paris sur la base locale du
    Mac), et une décision pourrait être datée avant le résultat qu'elle
    désigne.
- **Effacement IDP2 étendu** : les lignes, puis les imports, puis les comptes
  rendus, avant les résultats biologiques.
- **Garde de dépôt** : `biology-library/staging.guard.test.ts` vérifie que
  seul l'effacement supprime dans ces tables.
- **RLS deny-all** sur les trois tables.
- **Dossier RGPD, rubrique 5** : les trois modèles sont nommés.
- **Contrat SQL négatif** : `bio_ingest_staging_v1_negatif.sql`, joué au CI.
  Il est joué en fuseau Europe/Paris. 79 mutants ont été tués en session.
