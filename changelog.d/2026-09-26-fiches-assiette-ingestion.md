### Fiche d'assiette : la voie d'ingestion des brouillons (2026-09-26)

- **Lot 4 de `D-251`.** Une route interne,
  `POST /api/internal/fiches-assiette/ingest`, sous le secret partagé du corpus.
  L'outil hors ligne du lot 5 y dépose une adaptation de Fiche MY, qui reste un
  **brouillon** : rien n'y est servi à un patient.
- La route refuse (422) :
  - tout champ d'acte ou de validation, nommément (`DC-16`), et tout champ que
    pose le serveur (numéro, empreinte) ;
  - tout champ inconnu, à chaque niveau du contenu ;
  - un appariement faux, où la fiche d'une assiette arrive sous le code d'une
    autre ;
  - un claim cité qui n'est pas VALIDE au corpus ;
  - toute anomalie des contrôles du lot 2 : nombre hors source, verbatim
    introuvable, réserve de sécurité omise, lexique proscrit.
- Le numéro de version se calcule sous le même verrou que le trigger de la
  migration M1. L'empreinte du contenu est calculée côté serveur. Le même dépôt
  rejoué ne crée pas de doublon.
- Aucun texte de fiche n'entre dans un journal ni dans une réponse d'erreur.
- Une garde de source établit que seule cette voie crée une version, et
  qu'aucun code ne crée d'acte, ne réécrit ni n'efface.
