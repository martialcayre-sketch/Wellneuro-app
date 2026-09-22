### « Se déconnecter » purge les brouillons locaux, après avoir dit ce qui sera perdu (2026-09-22)

Le geste livré par `D-241` protégeait l'appareil partagé à moitié :
`lib/questionnaire-draft.ts` conserve les réponses de questionnaire en
`localStorage` **30 jours**, et elles survivaient à la déconnexion. Des données
de santé, que l'application ne restitue pas sans session — mais qui restaient
lisibles par qui ouvre les outils du navigateur.

- **`effacerTousLesBrouillons()`** balaie les quatre familles de clés du module,
  **par préfixe et non par identifiant** : au moment de fermer une session, on ne
  connaît plus les assignations qui ont laissé un brouillon.
- **L'avertissement n'apparaît que s'il y a quelque chose à perdre**
  (`aDesBrouillonsLocaux()`), et dit CE QUI sera perdu — pas « êtes-vous sûr ? ».
  Un dialogue systématique s'apprend par cœur et cesse de protéger.
- **La purge vient APRÈS la confirmation du serveur.** Effacer d'abord ferait
  perdre les brouillons à qui reste connecté parce que la déconnexion a échoué :
  du travail détruit, et l'appareil toujours ouvert.
- **Le confort de lecture n'est pas purgé** — `wellneuro:comfort*` est un réglage
  d'appareil, pas une donnée de santé. L'effacer punirait la personne qui se
  déconnecte, en particulier celle qui en a besoin.
- **`e2e/portail-deconnexion.spec.ts`** *(neuf)* : le parcours manquait à `D-241`.
  Il vérifie ce qu'aucun banc de composant ne voit — que le cookie **disparaît
  réellement du navigateur**, la parité pose ↔ effacement n'étant jusqu'ici
  qu'une promesse d'en-tête.

**Une affirmation de `D-241` §6 est corrigée au passage** : « rien n'alerte le
praticien qu'un patient rebondit » était faux. L'état `entree_refusee` existe
(`lib/fil/nouveauxPatients.ts`). Ce qui est vrai est plus étroit — il ne
s'affiche que si le patient ne s'est **jamais** connecté, donc le rebond d'un
patient déjà entré reste avalé. Lot suivant.
