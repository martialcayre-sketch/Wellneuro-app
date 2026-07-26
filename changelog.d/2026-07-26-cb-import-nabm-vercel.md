### Ajouté

- **L'import de la nomenclature NABM passe par le build de production.**
  `scripts/vercel-build.sh` l'exécute après `migrate deploy`, sur le patron de
  l'import C5 CIQUAL, armé par deux variables Vercel de scope Production :
  `WN_CB_NABM_IMPORT_CONFIRMATION`, qui porte le jeton, et
  `WN_CB_NABM_IMPORT_BASE`, qui doit **nommer l'hôte** de
  `MIGRATE_DATABASE_URL`. Absentes, le build est identique à avant. La seconde
  n'est pas une redondance : elle oblige la personne qui arme l'import à savoir
  sur quelle base il va écrire, ce qui protégera le jour où cette connexion
  changera d'hôte. Ce chemin évite surtout de sortir la connexion de production
  de son coffre pour un import manuel — elle n'existe sur aucun poste, et ne
  doit pas y exister.
- **Le contenu importé est épinglé dans le script relu**, pas seulement le
  jeton : le millésime attendu (`V105`) et l'empreinte SHA-256 de son contenu
  canonique. Nouvelle option `--sha256` de l'import, symétrique de `--version`.
  Ensemble elles rendent l'import **reproductible** — il écrit ce qui a été relu
  en PR, ou rien.
- **Deux cas de banc** sur ces épingles (`scripts/test-cb-nabm-import.sh` passe
  de neuf à onze cas) : un millésime non épinglé et un contenu changé sous un
  millésime inchangé sont l'un et l'autre refusés.

### Sécurité

- **Une variable d'armement oubliée en place ne peut plus rien importer en
  silence.** C'était le risque propre au câblage dans un build : des mois plus
  tard, un déploiement quelconque aurait importé le millésime publié
  entre-temps par l'ANS, sans relecture, en déplaçant le catalogue servi — donc
  ce qui est proposé au patient et ce qui part au médecin traitant. Les
  épingles de millésime et d'empreinte font échouer ce build au lieu de le
  laisser écrire. Les forçages qui demandent un jugement humain
  (`--remplace-pointeur`, `--accepte-orphelines`, `--allow-shrink`) ne sont
  délibérément pas câblés.
