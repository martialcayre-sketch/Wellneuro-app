### Collecte documentaire : le dépôt, l'écran du praticien et la ligne « Transmis », sous drapeau éteint (D-330 §4, J3-collecte) (2026-10-19)

- Le patient dépose un document depuis son espace (`/portail/[token]/documents`),
  derrière `WN_PORTAIL_DEPOT_DOCUMENTS`, **éteint** jusqu'à ACT-4. Bornes du
  compte rendu : PDF, JPEG, PNG ou WebP, 10 Mio, signature des octets, image
  réencodée sans métadonnées, nom de fichier jamais gardé. Il propose une
  catégorie. Fermé à un dossier mineur, sans date de naissance ou clos.
- Les plafonds (10 dépôts par 24 heures, 3 documents non consultés) se
  rejugent sous le verrou du dossier que prend la base, en READ COMMITTED ; un
  même fichier non retiré est refusé « déjà déposé ». Un banc sur base réelle
  constate que deux dépôts concurrents attendent ce verrou et qu'un seul passe.
- Le praticien du dossier voit les documents déposés au cockpit, sans que la
  liste charge un document. Il ouvre un document (seule la première ouverture
  est tracée, avant de le servir), corrige sa catégorie (chaque correction
  datée) ou le retire (contenu effacé, ligne gardée avec motif et date).
- « Mes échanges » montre chaque dépôt comme « Transmis · Document déposé »,
  daté, sans nom de fichier, sous le même drapeau. L'écran de dépôt porte
  l'encart d'urgence avec sa phrase validée et le texte de collecte de G-11
  tel quel.
- Aucune erreur n'est journalisée avec son message : une contrainte refusée
  recopie la ligne. Ni migration, ni schéma, ni règle clinique.
