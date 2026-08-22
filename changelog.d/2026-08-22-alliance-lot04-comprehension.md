### « Ce que j'ai compris de vous » : une synthèse qui se publie, un désaccord qui ne s'efface pas (2026-08-22)

Alliance 6.0-A, LOT-04. Le praticien écrit ce qu'il a compris du patient, le
publie sous garde, et le patient peut répondre « ce n'est pas exactement ça ».
Aucune migration : les cinq tables sont en production depuis le LOT-01.

- **La synthèse de compréhension est versionnée, jamais mise à jour.** Réviser
  ajoute une ligne chaînée ; la version précédente reste lisible. `publiee_le`
  à `NULL` est un brouillon que le patient ne voit pas ; publier renseigne la
  date **à l'insert**, sur une ligne neuve. L'arête `supersedes` ne porte
  qu'une seule sémantique — « remplace » — et l'état publié vit dans la
  colonne, pas dans l'arête.
- **Le patient voit la version publiée la plus récente, et rien ne la lui
  retire.** Il n'existe aucune dépublication : publier engage, corriger se fait
  en publiant une version qui corrige. Un brouillon de révision ne retire donc
  rien — c'est la correction d'un défaut trouvé en revue, où le filtre par tête
  de chaîne dépubliait de fait dès qu'un brouillon supplantait une version
  publiée, et où l'écran patient présentait ce retrait comme « rien n'a jamais
  été publié ».
- **Le désaccord référence la version EXACTE contestée** et lui survit : réécrire
  ce qu'un désaccord conteste ne le fait pas disparaître. Il n'a ni état
  « supprimé », ni fermeture, ni transformation en note privée — les routes
  n'exposent aucun verbe pour cela, et une garde structurelle l'oppose à tout
  `src/app/api/**` et `src/lib/**`.
- **L'accusé de lecture praticien, sans une colonne de plus.** Le schéma refuse
  une colonne mutable, qui contredirait l'append-only. « Vu » est le journal
  d'accès existant (`G-TRUST-04`) ; « répondu » est **dérivé** à chaque lecture
  — il existe une version publiée, postérieure au désaccord, qui descend de la
  version contestée. Les deux conditions comptent, aucune ne suffit seule.
- **Cinquième chemin de la carte des chemins sortants, premier depuis le Socle**
  — et il en occupe deux lignes : refus **confirmable** à la publication,
  **journalisant** au service portail (`D-090` : le régime suit le geste, pas le
  texte). Les deux bancs de débranchement ont été **vus rouges** avant d'être
  déclarés verts.
- **Drapeau neuf et éteint `WN_COMPREHENSION`.** Il garde trois gestes : la
  route du portail (503), l'écran (404) et **la publication** côté praticien.
  Le troisième évite un stock de synthèses que le praticien croirait remises et
  qui atteindraient toutes le patient d'un coup à l'allumage. Le brouillon,
  lui, reste possible : préparer n'est pas remettre.
- **Rien n'est compté, noté ni moyenné** : ni « 2 désaccords », ni taux
  d'accord, ni échelle. Une garde structurelle refuse toute propriété de mesure
  ordonnée dans le module et les deux routes.
- **Aucun gabarit de message ajouté** : le portail est en modèle « pull », le
  patient lit en venant. Rien ne pousse, donc rien n'entre au registre.
