### BP-10 : l'acte de lecture d'un import validé, sous drapeau éteint (D-268, 2026-10-06)

- **Code consommateur** de la table `lectures_imports_biologiques`, derrière
  `WN_BIO_LECTURE_ENABLED` (éteint : comportement actuel). La migration est
  appliquée et constatée par conteneur depuis le 2026-10-06.
- **Carte du Fil « compte rendu à lire »** (`import_biologique_a_lire`) : un
  import dont au moins une ligne est validée et qu'aucune lecture active ne
  couvre. Elle ne s'écarte pas, ne s'acquitte pas par lecture, n'est pas
  plafonnée. Une révocation la rouvre. Dossier clos : seulement si l'import est
  entièrement décidé. Si son calcul échoue, le Fil le dit à l'écran.
- **Acte au cockpit biologie** : « Consigner ma lecture » une fois toutes les
  lignes décidées ; révocation par un code de la liste fermée, jamais un texte
  libre. L'écran dit qu'on lit la restitution, pas le document, et que ce
  n'est pas un filet de sécurité.
- **Route** `POST /api/praticien/biologie/import/lecture` : garde de l'import,
  appartenance du dossier, une instruction hors transaction (READ COMMITTED).
- **Bancs** : module pur, route, Fil, écran, et un banc à deux sessions joué
  en CI et en T3 (deux lectures concurrentes, témoin REPEATABLE READ, lecture
  contre la dernière décision commise puis annulée), plus un banc du vrai
  écrivain contre PostgreSQL : deux requêtes simultanées, course forcée par un
  verrou, une seule acceptée et un refus nommé.
- **`D-268` §8 précisé** : les dossiers inactifs ne produisent pas de carte
  (régime commun du Fil).
