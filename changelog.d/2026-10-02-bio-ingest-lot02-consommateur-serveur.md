### BIO-INGEST LOT-02 : import d'un compte rendu, côté serveur (D-256 A2/A4/A5) (2026-10-02)

- **Le code qui alimente le staging**, derrière un drapeau neuf et **éteint**,
  `WN_BIO_INGEST_ENABLED`, qui exige aussi l'étage résultats. Ses conditions
  de pose (§2 ter du dossier RGPD) sont écrites à sa ligne de
  `docs/FEATURE_FLAGS.md`. L'écran de validation viendra en PR 2b.
- **Cinq routes** sous `api/praticien/biologie/import`, toutes derrière la
  garde des résultats :
  - liste des comptes rendus d'un dossier ;
  - dépôt d'un PDF : 10 Mo au plus, signature `%PDF-` lue sur les octets,
    aucun nom de fichier gardé, le même document refusé une seconde fois. Le
    corps n'est lu qu'après le drapeau, la session, l'appartenance et une
    longueur annoncée (411 sans elle). Les images attendent le LOT-03 ;
  - extraction ;
  - lecture d'un compte rendu et de ses lignes ;
  - retrait d'un dépôt erroné ;
  - décisions du praticien.
- **Extraction** par `claude-sonnet-5-5` (modifiable par `WN_BIO_INGEST_MODEL`).
  - Le compte rendu part **entier**, sans aucun masquage.
  - Le modèle relève libellé, valeur, unité, page, **date du prélèvement** et
    laboratoire tels qu'écrits. Il n'interprète rien, ne convertit rien et ne
    choisit aucun analyte.
  - Sa sortie est structurée, puis re-jugée par un schéma fermé aux bornes de
    la base.
  - **Le modèle et la version du procédé (`bio-extraction-v1`) sont
    enregistrés sur l'import avant l'appel**, échec compris (promesse de
    `usage_ia` v4).
  - Les lignes et la terminaison s'écrivent dans une seule transaction, les
    lignes d'abord. Des lignes que la base refuse closent l'import en
    `reponse_invalide`.
- **Resolver libellé → analyte** (`resolverLibellesV1`, module signé) : les
  libellés du catalogue et des synonymes de laboratoire, comparés au libellé
  entier. Une parenthèse n'est jamais retirée, parce qu'elle peut dire la
  matrice. Les libellés qui taisent la matrice (« Zinc », « Cuivre »,
  « Zonuline »…) ne sont pas rattachés, même quand ils viennent du catalogue.
  - Il est **livré non signé** : tant que la signature manque, toute ligne
    sort `inconnu` et le praticien choisit l'analyte.
  - Un libellé générique dont la matrice n'est pas dite n'est pas rattaché.
- **Décisions** (valider ou écarter), seul chemin d'un import vers
  `resultats_biologiques`, en tout ou rien.
  - La validation crée le résultat (`saisie_praticien`, sans `saisiLe`, unité
    relue au catalogue), puis décide la ligne.
  - Seules les lignes de l'extraction **courante** du compte rendu se
    décident.
  - Valeur et date sont corrigeables. La casse d'une unité compte (« mUI »
    n'est pas « MUI »), sauf pour le litre. Le « u » d'une impression ASCII
    vaut « µ » devant mol, g ou L.
  - Sont refusées : une ligne lue non quantitative, une unité lue qui n'est
    pas celle de l'analyte (aucune conversion, D-157) et un doublon au
    dossier.
  - Un `P2002` (saisie manuelle intercalée) est rendu tel quel, sans repli.
- **Retrait d'un dépôt erroné**, tant qu'aucune ligne n'est validée, y
  compris sur un dossier clos. Il devient
  le second auteur de suppression admis par `staging.guard.test.ts`.
- **Rubrique 8 du dossier RGPD** : l'arbitrage du 2026-10-02 (purge du PDF
  après décision) y est consigné, mais n'est pas encore en œuvre, faute de la
  migration.
- **Journaux** : seulement la classe et le code d'une erreur. Le banc
  `journaux.guard.test.ts` couvre désormais l'import.
