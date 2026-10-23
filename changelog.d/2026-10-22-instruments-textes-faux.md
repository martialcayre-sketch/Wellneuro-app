### Instruments des 12 besoins : deux textes faux corrigés (F9b, N1)

- **Infobulle d'un besoin sans source** (`DetailBesoinsPanel`) : « Aucun
  questionnaire source » devient « Aucune réponse de questionnaire exploitable
  pour ce besoin ». L'API ne liste que les sources exploitables : l'ancien
  texte était faux quand un questionnaire est prévu mais pas encore rempli.
  Aucun motif ajouté — les motifs sont le lot 4, après M-2.
- **Échec de lecture** : le message de développeur « Erreur technique.
  Vérifiez le terminal Next.js. » est remplacé, sur le détail des besoins et
  la fiche patient, par « … n'a pas pu être lu(e). » et un bouton
  « Réessayer » qui relance la lecture. Dans la table partagée
  `lib/praticien/messagesDossier.ts`, la clé `exception` dit désormais « Une
  erreur inattendue est survenue. Réessayez dans un instant. » — texte seul,
  lu aussi hors des instruments (rayon Patients, assignations et packs, fiche
  administrative, gestes du dossier).
- Correctif ordinaire de file A, hors D-333 : ni ordre, ni tri, ni cercles,
  ni compte, ni provenance ; rien sous `lib/equilibre`, aucune table, aucune
  D-xxx.
