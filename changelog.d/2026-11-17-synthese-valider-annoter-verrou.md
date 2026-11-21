### Synthèse : « valider », « annoter » et « rejeter » relisent la synthèse sous le verrou du dossier (file D, 2026-11-17)

- Le PATCH `api/praticien/synthese` lisait la synthèse hors verrou. Ensuite,
  « valider », « annoter » et « rejeter » réécrivaient le statut, le texte et
  la date de validation tels qu'ils avaient été lus. Un onglet resté ouvert
  pouvait donc :
  - revalider une synthèse déjà validée ou imprimée ;
  - remettre en brouillon une synthèse validée entre-temps ;
  - retirer du portail une synthèse envoyée.
- Toutes les actions passent désormais sous le verrou que prennent
  l'impression et « enregistrer » (#2221). Seul « vider » ne relit pas la
  synthèse : il la réinitialise quel que soit son statut, et le contrôle
  d'impression le garde. Les autres actions relisent le statut et le modèle,
  et refusent (409, « La synthèse a été modifiée entre-temps. Rechargez-la
  avant de recommencer. ») s'ils ont changé.
- Le serveur ne valide plus qu'un brouillon, comme l'écran le propose déjà.
- Une note se pose toujours sur une synthèse imprimée, puisqu'elle va au
  booklet.
