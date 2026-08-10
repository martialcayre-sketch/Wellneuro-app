### Ajouté

- **La file d'envoi se valide désormais là où le praticien travaille, plus
  seulement dans la Bibliothèque.** Le constat (2026-08-09, patient réel) :
  les questionnaires ajoutés depuis les recommandations post-synthèse NNPP2
  s'annonçaient « dans la file d'envoi » sans qu'aucun bouton d'envoi ne soit
  visible — il fallait savoir que la validation vivait dans la Bibliothèque.
  La doctrine D-030 ne change pas de nature : rien ne part sans validation ;
  la validation change d'écran.

  - **Accueil (Fil du jour)** : nouveau bloc « File d'envoi » dans l'aside
    (`FileEnvoiAside`), sous l'inbox de réception — fusion des deux inbox
    écartée par arbitrage propriétaire du 2026-08-10, deux logiques
    distinctes. Cartes par patient avec items, badge « Indisponible », bouton
    « Envoyer (N) — un seul mail », et lien vers la Bibliothèque pour éditer
    la file. Une file illisible est dite indisponible, jamais présentée vide.
  - **Panneau d'orientation NNPP2** : le même bouton d'envoi apparaît sous
    les suggestions dès que le brouillon du patient existe. Il envoie le
    brouillon ENTIER (items ajoutés depuis la Bibliothèque compris — le
    libellé porte le compte), puis relit l'orientation pour que les lignes
    passent à « déjà assigné » par lecture serveur, jamais par déduction
    locale. Sans email patient, le panneau reste en lecture seule, envoi
    compris.

  Les deux écrans appellent la route d'envoi existante
  (`POST /api/praticien/file-envoi/envoyer`) : claim atomique, dédup sous
  verrou, un seul mail — aucun changement d'API. Bancs : `FileEnvoiAside`
  (6 cas) et `OrientationPanel` (5 cas d'envoi ajoutés).
