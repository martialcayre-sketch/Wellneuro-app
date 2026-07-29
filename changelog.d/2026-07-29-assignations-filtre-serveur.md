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

### Trouvé par la revue adversariale et corrigé

- **La correction réintroduisait son propre défaut par une autre porte.** Le
  sélecteur n'a pas de debounce — c'est un `<select>` : deux changements dans un
  aller-retour lancent deux requêtes concurrentes, et sans garde c'est la
  dernière **arrivée** qui gagne. La table aurait listé des « Complété » sous un
  sélecteur affichant « En attente », colonne Action à « — » : le praticien en
  aurait conclu qu'il n'a aucun questionnaire ouvert. Le filtre en mémoire d'avant
  en était structurellement immunisé. Une réponse qui contredit le statut affiché
  est désormais **jetée** ; une réponse muette sur son statut (serveur antérieur)
  n'est pas un désaccord et passe.

- **Le seul chemin de chargement déclenché par un geste d'UI n'avait aucune
  gestion d'erreur.** Le chargement initial est protégé, `loadPatientsTable`
  aussi ; celui-ci ne l'était pas. Une coupure réseau ou un 502 rendant du HTML
  laissait le sélecteur sur « En attente » et la table sur l'ensemble précédent,
  sans un mot — le même mensonge, sans même une double manipulation pour le
  déclencher. Pire, une session expirée **remplaçait le panneau praticien entier**
  par un encart d'erreur : changer un filtre d'affichage pouvait faire
  disparaître le formulaire de création et les deux tableaux. L'échec se dit
  maintenant dans un bandeau, la surface reste debout.

- **« Aucune assignation. » parlait de l'ensemble du dossier alors qu'un filtre
  était actif.** Sous « En attente », le message se lit « ce patient n'a rien » —
  ce que cette surface ne sait pas. Il nomme désormais le filtre.

- **Le miroir du filtre était écrit pendant le rendu** — proscrit par React 18 :
  un rendu concurrent abandonné y laisse une valeur jamais commitée, qu'un
  gestionnaire d'événement lit ensuite. Il est mis à jour après commit. Sa
  justification d'origine était par ailleurs inexacte (`loadData` n'est pas
  mémoïsée et se redéclare à chaque rendu) ; le commentaire dit maintenant ce
  qu'il fait vraiment.

- **Rien ne prouvait que les rafraîchissements conservent le filtre.** C'est
  pourtant le seul rôle du paramètre par défaut : sans lui, annuler une
  assignation pendant que le filtre est actif recharge la liste **non filtrée**,
  donc tronquée à 40 — le bug d'origine ressuscité par un geste ordinaire. Un
  test assert l'URL du GET qui suit l'annulation.

### Vérifié en production plutôt que supposé

`SELECT statut … HAVING statut NOT IN (…)` ne rend **aucune ligne** : les trois
valeurs de la liste blanche couvrent la totalité du parc. Une valeur hors
registre n'aurait été atteignable que par « Tous les statuts », donc seulement
dans les 40 plus récentes — le filtre, qui est justement l'échappatoire à la
troncature, ne l'aurait pas proposée.

### Ce que ce lot ne fait pas

- **Pas de pagination des assignations.** Les 64 « Complété » ne deviennent pas
  toutes atteignables : au-delà du plafond, la surface dit qu'elle tronque, elle
  n'offre pas d'aller voir plus loin. Le tri porte sur `date_assignation`, qui
  **n'est pas indexé** — paginer supposerait un index, donc une migration, donc
  un arbitrage séparé.
- Le plafond de 40 n'est pas relevé : cela déplacerait le seuil sans supprimer le
  silence.

- **`FichePatientPanel` porte le même défaut, sur la surface où il coûte le plus
  cher, et ce lot n'y touche pas.** Elle appelle la même route sans paramètre et
  filtre en mémoire les assignations en `modification_demandee`, après la
  troncature à 40, sur les assignations de **tous** les patients du praticien.
  `assignationsModif` pilote l'état de phase, le fil d'actions et la bannière
  « demandes de correction en attente de déblocage » : une demande posée par un
  patient dont l'assignation n'est pas dans les 40 plus récentes **n'apparaît
  nulle part**, et le praticien ne le débloque jamais. Avec 93 assignations en
  base, c'est la situation courante et non un cas limite. Ce n'est pas une
  régression de ce lot — le comportement est identique avant et après — mais
  c'est le lot suivant, et il est plus urgent que celui-ci.

### Preuve par mutation

Trois mutations, trois fois du rouge :

| Mutation | Tests rouges |
|---|---|
| filtre serveur neutralisé (`...(false && statut ? …)`) | **3** |
| garde de fraîcheur neutralisée | **1** |
| remontée d'échec et `.catch` retirés | **2** |

Sans la première, rien ne distinguerait ce correctif d'un simple relèvement de
plafond.

### Réserve, hors périmètre

La branche paginée récupère 40 assignations que **personne ne consomme** :
`loadPatientsTable` ne lit que `patients` et `pagination` de la réponse. C'est
une requête jetée à chaque changement de page et à chaque frappe de recherche.
La supprimer changerait le contrat de la route et sort de ce lot.
