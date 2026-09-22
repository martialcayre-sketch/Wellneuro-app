### « Se déconnecter » purge les brouillons locaux, après avoir dit ce qui sera perdu (2026-09-22)

Le geste livré par `D-241` protégeait l'appareil partagé à moitié :
`lib/questionnaire-draft.ts` conserve les réponses de questionnaire en
`localStorage` **30 jours**, et elles survivaient à la déconnexion. Des données
de santé, que l'application ne restitue pas sans session — mais qui restaient
lisibles par qui ouvre les outils du navigateur.

- **`lib/portail/stockageAppareil.ts`** tient l'inventaire des sept familles de
  clés que le portail dépose sur l'appareil — `localStorage` **et**
  `sessionStorage` —, et `effacerDonneesPatientLocales()` les balaie **par
  préfixe, pas par identifiant**. `sessionStorage` est la moitié qui manquait :
  il survit à la redirection dans le même onglet, et porte le wizard
  fiche/anamnèse et l'agenda alimentaire patient.
- **Un garde de CLASSE** (`stockageAppareil.guard.test.ts`) balaie les surfaces
  patient et refuse toute clé `wellneuro:` non déclarée — purgée, ou exemptée
  avec motif. Sans lui, la prochaine famille de clés rouvrirait le trou en
  silence, comme celle-ci l'avait fait.
- **L'avertissement n'apparaît que s'il y a quelque chose à perdre**
  (`aDesDonneesPatientLocales()`), et dit CE QUI sera perdu — pas « êtes-vous
  sûr ? ». Un dialogue systématique s'apprend par cœur et cesse de protéger.
  Une métadonnée orpheline, un brouillon vide ou un brouillon **périmé** ne le
  déclenchent donc pas : le texte promettait de pouvoir ressaisir des réponses
  que l'application n'aurait jamais restituées.
- **Le dialogue est `PatientConfirmDialog`**, celui des écrans voisins du même
  parcours — pas un panneau maison. `role="alertdialog"` n'a pas d'`aria-live`
  implicite : sans déplacement du focus, un lecteur d'écran n'annonçait rien,
  c'est-à-dire que le seul texte que ce lot existe pour faire lire ne se lisait
  pas.
- **La purge vient APRÈS la confirmation du serveur.** Effacer d'abord ferait
  perdre les brouillons à qui reste connecté parce que la déconnexion a échoué :
  du travail détruit, et l'appareil toujours ouvert.
- **Le confort de lecture n'est pas purgé** — `wellneuro:portail:confort` est un
  réglage d'appareil, pas une donnée de santé. Exempté nommément, avec motif
  écrit. *(La première version gardait `wellneuro:comfort`, une clé que rien
  n'écrit : le banc ne protégeait rien.)*
- **`e2e/portail-deconnexion.spec.ts`** *(neuf)* : le parcours manquait à `D-241`.
  Il vérifie ce qu'aucun banc de composant ne voit — que le cookie **disparaît
  réellement du navigateur**, la parité pose ↔ effacement n'étant jusqu'ici
  qu'une promesse d'en-tête.

**Une affirmation de `D-241` §6 est corrigée au passage** : « rien n'alerte le
praticien qu'un patient rebondit » était faux. L'état `entree_refusee` existe
(`lib/fil/nouveauxPatients.ts`). Ce qui est vrai est plus étroit — il ne
s'affiche que si le patient ne s'est **jamais** connecté, donc le rebond d'un
patient déjà entré reste avalé. Lot suivant.
