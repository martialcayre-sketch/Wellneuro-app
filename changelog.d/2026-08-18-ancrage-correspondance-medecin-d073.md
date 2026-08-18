### LOT-06 — l'ancrage de provenance des correspondances médecin (migration seule, D-073)

- **Deux colonnes neuves** sur `correspondances_medecin` : `ancrage_sha256` et
  `ancrage_version`. Le courrier biologie est dérivé d'une table clinique
  **signée** ; son bloc portait déjà le SHA du périmètre et sa version, mais
  rien ne pouvait les recevoir en base. Consigner la lettre revenait à perdre
  ce par quoi elle s'explique (`DC-34`) — c'est pourquoi `D-071` avait écarté la
  consignation. La dette est soldée.
- **Une colonne, pas une ligne de prose** : une ancre écrite dans le corps de la
  lettre n'est vérifiable par personne et se retouche avec le texte. Le
  programme `D-063`→`D-067` a rendu la péremption détectable en posant des SHA
  qu'une garde compare ; une ancre en prose serait à la traçabilité ce qu'un
  JSDoc est à une garde.
- **Nullables à dessein** : une correspondance saisie à la main n'est dérivée
  d'aucune table, et lui inventer une ancre serait pire que l'absence (`DC-24`).
- **Les deux termes voyagent ensemble ou pas du tout** (CHECK) ; le SHA doit
  faire 64 caractères (borne technique, aucune sémantique clinique).
- **Contrat SQL dédié**, joué par le CI et éprouvé par avant/après : il échoue
  sur la table d'origine, passe après la migration. **Quatre mutations le
  tuent**, dont « ancre rendue obligatoire » — qui casserait la saisie manuelle
  sans que rien d'autre ne parle.
- **Aucun code dépendant** : le branchement du courrier suit dans une PR
  distincte, après `release-db`.
