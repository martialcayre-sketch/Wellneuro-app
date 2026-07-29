### Corrigé

- **Le filtre par statut des assignations masquait ce qu'il prétendait montrer.**
  `GET /api/praticien/patients` rend les **40 assignations les plus récentes** du
  praticien (`MAX_ASSIGNATIONS`), tous statuts confondus ; le filtre par statut
  était ensuite appliqué **en mémoire, après réception**, sur cette liste déjà
  tronquée. Un filtre posé après une troncature ne cache pas des lignes en trop :
  il en cache en moins, et sans le dire.

  Mesuré en production le 2026-07-29 : **53 assignations sur 93 étaient hors
  d'atteinte de cette surface**, dont **8 « En attente »** — ouvertes, et donc ni
  consultables ni annulables depuis le tableau praticien. Ces 8 lignes
  redeviennent visibles, le statut étant désormais filtré **en base** : les 25
  assignations en attente tiennent sous le plafond et sortent toutes.

  Un statut inconnu est **ignoré**, pas rejeté — même choix que `sortBy` : un 400
  sur un paramètre d'affichage priverait le praticien de sa liste entière pour
  une faute de frappe dans une URL. Le filtre **s'ajoute** à
  `filtrePatientsDuPraticien`, il ne la remplace pas ; un test le vérifie pour
  chaque statut.

- **Le compte affiché se présentait comme un total alors qu'il était plafonné.**
  L'en-tête disait `Assignations récentes (17)` sans un mot sur les lignes
  laissées de côté. La route rend maintenant le **compte en base** du même
  ensemble que la liste — un `count` sur le `where` exact du `findMany`, faute de
  quoi « 40 sur 48 » parlerait de deux ensembles différents. La surface affiche
  la troncature **quand elle a lieu, et seulement alors** : « 40 sur 48 » si le
  total dépasse ce qui est rendu, « 17 » sinon.

  Un compte absent n'est pas un compte nul : sans `assignationsMeta`, rien n'est
  affirmé. Trois tests tiennent les trois cas — troncature dite, troncature non
  inventée, silence quand le serveur n'a rien rendu.

### Contrat

- `PatientsApiResponse` gagne `assignationsMeta` — `{ total, plafond, statut }`,
  **facultatif**. Distinct de `pagination`, qui décrit les patients. Aucune
  migration Prisma, aucun changement de schéma.
- La route accepte `?statut=` sur ses **deux** branches, paginée et historique.

### Ce que ce lot ne fait pas

- **Pas de pagination des assignations.** Les 64 « Complété » ne deviennent pas
  toutes atteignables : au-delà du plafond, la surface dit qu'elle tronque, elle
  n'offre pas d'aller voir plus loin. Le tri porte sur `date_assignation`, qui
  **n'est pas indexé** — paginer supposerait un index, donc une migration, donc
  un arbitrage séparé.
- Le plafond de 40 n'est pas relevé : cela déplacerait le seuil sans supprimer le
  silence.

### Preuve par mutation

Neutraliser le filtre serveur (`...(false && statut ? …)`) rend **3 tests
rouges** — ceux qui vérifient que le statut atteint le `where` Prisma. Sans cette
preuve, rien ne distinguerait ce correctif d'un simple relèvement de plafond.

### Réserve, hors périmètre

La branche paginée récupère 40 assignations que **personne ne consomme** :
`loadPatientsTable` ne lit que `patients` et `pagination` de la réponse. C'est
une requête jetée à chaque changement de page et à chaque frappe de recherche.
La supprimer changerait le contrat de la route et sort de ce lot.
