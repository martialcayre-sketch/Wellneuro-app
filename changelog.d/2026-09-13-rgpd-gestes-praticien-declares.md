### RGPD — les deux tables de gestes praticien motivés, déclarées ensemble (2026-09-13)

`DecisionPrioritySelection` (`D-127`) et `EcartementProposition` (`D-178`) ont la
même anatomie : un dossier nommé, un motif écrit obligatoire, l'auteur et
l'horodatage posés côté serveur, un chaînage append-only. Ce qu'elles portent n'est
ni une mesure ni un score, mais une phrase écrite par un soignant sur une personne
identifiée. Elles sont désormais déclarées en rubrique 5 sous **une même entrée** :
les séparer aurait invité deux qualifications possiblement divergentes sur une même
nature d'objet.

**La déclaration est faite, la qualification reste due.** Classer une table en
catégorie particulière au sens de l'article 9 est un acte juridique, qui appartient
au responsable de traitement avec son conseil — la table des dettes le dit déjà,
échéance 2026-10-21. Ce lot ne tranche donc rien : il DÉCRIT les deux tables champ
par champ et les rapproche pour que la question se pose une fois.

`DecisionPrioritySelection` quitte de ce fait la dette nommée du 2026-09-09, qui
passe de dix-sept à seize tables non déclarées — elle ne devait que rétrécir. Le
banc exige maintenant qu'elle reste déclarée : vérifié par mutation, en retirant
son nom de la rubrique.

Ce qui ne dépendait pas de cette qualification était déjà tenu, et a été vérifié
plutôt que supposé : les deux tables entrent dans la transaction d'effacement IDP2,
portent la RLS, et aucune surface du portail patient ne les lit.
