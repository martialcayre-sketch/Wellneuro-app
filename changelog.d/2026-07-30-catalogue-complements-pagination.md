### Sécurité clinique

- **Une fiche sans composition connue ne rend plus de verdict positif.** Poser
  une intention clinique faisait passer « Compatibilité protocole » à
  **Compatible** et « Cumul vs seuils » à **Aucun cumul** sur des fiches dont la
  composition est inconnue — c'est le cas des 140 148 fiches de production. Les
  deux dimensions se lisent par intersection avec la composition : une
  intersection vide l'était par **ignorance**, jamais par absence de conflit.
  Un code d'intention **inconnu** suffisait à déclencher ces deux verdicts, la
  sentinelle rendant alors une liste vide lue comme « aucun signal ». Les deux
  dimensions restent désormais **non évaluées** tant que la composition n'est
  pas connue, et une intention non résolue n'ouvre plus aucune lecture. Même
  principe que partout ailleurs dans l'application : non renseigné n'est pas
  zéro, et l'absence de signal ne vaut pas absence de risque.

  Changement de sémantique clinique, dans le sens de l'abstention, sur demande
  explicite du praticien après revue adversariale. Défaut antérieur à ce lot,
  mais que ce lot rendait visible pour la première fois — l'écran ne s'étant
  jamais chargé jusqu'ici.

### Corrigé

- **Rayon compléments : le catalogue se charge de nouveau.** `listerCatalogue`
  lisait les **140 148 fiches** de production sans borne, calculait leurs huit
  dimensions en mémoire, puis filtrait et triait le tout avant de le sérialiser
  — soit une réponse d'environ 250 Mo pour une limite de fonction à ~4,5 Mo.
  L'écran affichait « Impossible de charger le catalogue » quels que soient les
  critères. Sélection, filtres, tri, comptage et pagination passent en base ;
  seules les fiches de la page servie (25 par défaut, 50 au plus) traversent le
  calcul des dimensions, dont la sémantique est inchangée. Les seuils
  fonctionnels ne sont plus chargés que pour les ingrédients de la page.

- **Une réponse périmée n'écrase plus l'affichage courant.** Enchaîner deux
  critères — une recherche lente puis un clic sur une facette — pouvait laisser
  la réponse la plus lente repeindre l'écran par-dessus la plus récente : des
  fiches hors critère s'affichaient sous une facette cochée, et le total avec.
  Un jeton de séquence réserve l'écriture à la dernière requête émise, et le
  voyant de chargement ne s'éteint plus sur une réponse abandonnée.
- **Le nombre de pages annoncé est celui des pages réellement atteignables.**
  L'écran affichait « page 1 sur 5606 » là où le service refuse au-delà de la
  401ᵉ ; il ne promet plus une navigation qui n'existe pas.
- **Le champ de recherche cherche ce qui y est écrit.** `_` et `%` étaient
  interprétés comme des jokers : « B_12 » remontait « B-12 » et « B912 »,
  « 100% » tout ce qui commence par « 100 ». Ils sont désormais échappés.

### Modifié

- **L'écran Bibliothèque n'interroge plus rien tant qu'aucun critère n'est
  posé** — recherche par nom ou marque, intention clinique, ou facette. Le mur
  est délibéré : sans critère, la requête porterait sur le catalogue entier.
- **Recherche par nom commercial ou marque** (insensible à la casse) et
  navigation page par page, avec le total réel du catalogue affiché.
- **Les critères sans donnée sont refusés, jamais ignorés.** Grade de preuve,
  biodisponibilité, compatibilité protocole, cumul vs seuils et le tri par
  nombre de règles correspondantes dépendent de la composition des produits et
  des règles cliniques — deux tables vides en production. Ils sont grisés à
  l'écran et l'API répond 400 si le paramètre arrive quand même : un filtre
  silencieusement écarté aurait rendu des fiches hors critère en laissant
  croire qu'il s'était appliqué. Ils reviendront avec l'import des compositions.
- Contrat du catalogue en `c4-catalogue-v2` : `page`, `parPage` et un `total`
  qui compte les fiches correspondant aux critères, et non la taille de la page.

Sans migration, sans changement de schéma. La barrière D-003 et le rayon corpus
(preuves certifiées) sont inchangés, comme les gardes de session et le drapeau
`WN_C4_ENABLED`.
