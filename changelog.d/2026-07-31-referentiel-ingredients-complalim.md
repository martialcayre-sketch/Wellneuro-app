### Ajouté

- **Le référentiel d'ingrédients se peuple depuis la source officielle.** Le
  pivot `supplement_ingredients` était vide, et c'était le bloqueur unique du
  rayon compléments : sans lui aucune composition ne peut être écrite, donc les
  140 148 fiches restent des coquilles. Une voie d'ingestion interne, gardée par
  le même secret partagé que le catalogue, écrit désormais les ingrédients et
  leurs formes depuis le référentiel **Compl'Alim** (DGAL). Couverture mesurée :
  **100 %** des 883 libellés chimiques, 1 021 espèces végétales et
  61 micro-organismes employés par le catalogue — aucun libellé inconnu.

  Le projet initial était de faire **signer à la main** une nomenclature de
  1 955 entrées. Le praticien a objecté que toutes les données viennent de la
  même base ; vérification faite, il avait raison — le référentiel officiel
  existe, il est structuré, et il est interrogeable.

### Sécurité clinique

- **La relation ingrédient → forme suit la source, jamais le libellé.**
  Compl'Alim relie explicitement une forme d'apport à la ou aux substances
  qu'elle apporte. Déduire ce lien du nom conduit à des inversions sur des
  éléments à fenêtre étroite : « Hydrogénosélénite de sodium » se lit
  « sodium » alors que le nutriment est le **sélénium**, « iodure de
  potassium » se lit « potassium » alors que c'est l'**iode**. L'heuristique
  écrite pour la nomenclature manuelle commettait précisément cette erreur ; la
  source officielle ne la commet pas. Un test d'ancrage le verrouille.

- **Une forme peut apporter plusieurs nutriments, et les apporte tous.**
  69 cas mesurés, dont « D-pantothénate de calcium » — vitamine B5 **et**
  calcium. Elle est rattachée à chacun. C'est pourquoi l'unicité, côté forme,
  porte sur le couple (ingrédient, code) et non sur l'identifiant source : un
  index unique sur la provenance aurait refusé la seconde attache et fait
  échouer l'ingestion.

- **La voie d'ingestion ne détourne rien et n'efface rien.** Un code déjà porté
  par une autre entrée — y compris une entrée saisie à la main par le praticien
  — fait échouer le lot avec un message qui le nomme, plutôt que de l'écraser.
  Aucune désactivation, aucune suppression : retirer un ingrédient du service
  reste un geste praticien signé, jamais l'effet de bord d'une synchronisation.

- **Le vocabulaire n'est pas le jugement.** Cette voie n'écrit ni règle
  clinique, ni seuil fonctionnel, ni alerte de sécurité. La frontière est
  vérifiée par un test.

### Modifié

- `supplement_ingredients` et `supplement_ingredient_formes` portent la
  provenance de leur entrée (`source_provenance`, `source_identifiant`), à
  l'image de ce que `supplement_products` porte déjà. C'est la clé de
  re-synchronisation ; sans elle, un réalignement devrait deviner l'appariement
  par le nom. Colonnes **nullables** : une entrée créée à la main n'a pas de
  provenance externe. Le `code` reste lisible (« selenium »,
  « vitamine-b12 ») parce que c'est lui que les règles cliniques manipulent.

Migration **additive** : quatre colonnes, un index unique côté ingrédient, un
index simple côté forme. Aucune colonne modifiée, aucun DROP, aucun backfill.
Aucune donnée patient. La barrière D-003, le rayon corpus et le drapeau
`WN_C4_ENABLED` sont inchangés.

### Provenance et licence

La Licence Ouverte v2.0 (Etalab) couvre `declarations.csv` sur data.gouv, et le
code du service est sous MIT. **Le référentiel, lui, n'est publié sous aucune
licence énoncée** : il n'est ni sur data.gouv, ni complet dans les fixtures du
dépôt. Son contenu transcrit des annexes réglementaires, mais aucun texte ne le
dit. L'intégration a été décidée par le praticien en connaissance de cette
lacune, à réexaminer si le régime est publié. Le détail est consigné dans
`tools/supplements/referentiel/README.md`.
