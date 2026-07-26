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
  en PR, ou rien. L'empreinte et sa commande de reproduction sont consignées
  dans l'audit de source.
- **Le contrat du catalogue biologie est rejoué juste après l'import**, sur la
  base de production. C'est sa **première exécution là où il existe des
  données** : en intégration continue il ne rencontre qu'une base vide, où ses
  invariants de données ne disent rien.
- **Quatre cas de banc** (`scripts/test-cb-nabm-import.sh` passe de neuf à
  treize) : millésime non épinglé et contenu changé sous millésime inchangé,
  tous deux refusés ; puis le chemin nominal du build et son rejeu, qui
  manquaient — deux épingles n'ayant que des tests négatifs peuvent être mal
  branchées sans que rien ne le dise.

### Sécurité

- **Une variable d'armement oubliée en place ne peut plus rien importer en
  silence, ni gêner les déploiements suivants.** C'était le risque propre au
  câblage dans un build. Trois mécanismes s'y opposent : les épingles de
  millésime et d'empreinte font **échouer** le build plutôt que de le laisser
  écrire une nomenclature que personne n'a relue ; le jeton de confirmation
  **porte le millésime**, de sorte qu'une PR qui l'incrémente ne suffise pas à
  relancer l'import sur sa seule autorité ; et lorsque la base sert déjà le
  millésime épinglé avec l'empreinte épinglée, l'import **sort sans appeler la
  source** — sans quoi une variable oubliée aurait fait interroger l'ANS à
  chaque déploiement de production, puis échouer tous les déploiements dès le
  millésime suivant, correctif urgent compris.
- Les forçages qui demandent un jugement humain (`--remplace-pointeur`,
  `--accepte-orphelines`, `--allow-shrink`) ne sont délibérément pas câblés.
