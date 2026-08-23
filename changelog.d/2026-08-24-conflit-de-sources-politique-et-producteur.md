### La politique de résolution ne compare rien, et elle le dit (2026-08-24)

Décision `D-103`, LOT-06 de « Doctrine exécutable ». La forme
`CONFLIT_SOURCES` avait un type depuis `D-041` et aucun producteur ; `DC-54` et
`DC-55` n'étaient écrites nulle part. Elles le sont — et la mesure a retourné
le lot.

- **Aucun des quatre axes de `DC-54` n'est comparable**, là où le cadrage en
  annonçait trois. Sur les 8 224 claims `VALIDE` de la production :
  `niveau_preuve` renseigné sur **45 claims (0,55 %)** en 32 valeurs libres
  (« B », « AE », « élevé », « Niveau 1 / Niveau 2 », « evidence based »),
  `classe_autorite` sur **154 (1,87 %)** en 73 valeurs libres mêlant
  institutions et **noms d'auteurs**, **un seul claim porte les deux**. La
  population est hors du claim (`D-095`), et `valide_at` est la date de
  validation praticien — pas celle de la source.
- **La politique déclare donc ses quatre axes non comparés**, chacun avec son
  motif mesuré, et conclut à l'escalade praticien : la position la plus prudente,
  une fois la mesure faite, est de ne pas trancher. Un banc épingle qu'aucun axe
  n'est comparable — le jour où l'un le devient, il rougit et force à écrire la
  comparaison au lieu de la laisser manquer.
- **Le piège de l'axe « date »**, nommé plutôt que contourné : c'est le seul dont
  la colonne est peuplée partout, et il aurait donné une réponse — en tranchant
  une question de preuve par l'ordre d'ingestion de deux documents.
- **Un conflit se déclare, il ne se détecte pas.** Rien au schéma ne dit que deux
  claims parlent du même objet ; la seule détection possible serait générative,
  ce que `DC-01` et `DC-02` interdisent ici. Le registre est curé à la main,
  relu en PR, signé — patron de `contradictionsV1.ts`.
- **Le conflit déclaré était déjà vécu dans le dépôt.** `CS-BIO-01` oppose
  `WN-CL-0312-018` (bilan complet recommandé une fois par an) à
  `WN-CL-0387-013` (le bilan complet n'est pas à réaliser systématiquement) :
  `indicationsBiologieV1.ts` fonde la répétition annuelle sur le premier et
  invoque le second, en commentaire, pour justifier qu'un panel n'ait pas de
  répétition. Deux claims du même corpus certifié à sens opposés dans un même
  fichier signé.
- **Le constat naît sur un claim cité, pas sur les deux** : le cas dangereux est
  celui où le dossier ne s'appuie que sur l'une des deux positions.
  Correspondance sur la paire `(claimId, versionClaim)`, comme le contrat de
  fraîcheur — qui porte désormais les deux claims.
- **Deux conflits examinés puis écartés avec leur motif** : le magnésium dans la
  dépression (réel et frontal, mais aucun de ses claims n'est épinglé — le
  constat n'atteindrait personne) et le magnésium plasmatique contre
  érythrocytaire (faux conflit : deux analytes distincts).
- **`DC-29` — descente de provenance faite, verdict négatif.** Zéro claim sur
  « sources indépendantes », zéro sur « triangulation », et les dix-neuf
  candidats des autres requêtes sont tous des claims de contenu. Aucune source
  ne fonde une graduation par nombre de sources indépendantes : la forme
  `CONVERGENCE` **reste vide**, état légitime, et un banc refuse désormais toute
  règle qui la porterait.

Le cockpit praticien apprend du même geste à **nommer la forme** d'un constat —
« Conflit entre sources du corpus » et non « Contradiction entre instruments »,
qui envoyait chercher deux questionnaires inexistants — et à **dire un constat
escaladé avec son motif**, là où il ne disait l'état que s'il valait « ouverte ».

**Rien ne change en production** : le registre est livré non signé, la signature
est un acte praticien distinct. Verrou fermé, le cockpit ne fait pas une requête
de plus qu'avant. `DC-54` et `DC-55` restent au statut proposition jusque-là.
