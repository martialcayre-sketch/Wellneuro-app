### Agenda du sommeil — un rappel du matin, posé par le patient sur son téléphone (2026-10-08)

Campagne `2026-10-07-agenda-sommeil-adhesion`, LOT-05. Aucun rappel n'existait
côté patient : la relance du praticien est manuelle, et tout envoi programmé
par le serveur est exclu par le registre des frontières (« aucune tâche
planifiée ni relance déduite d'un état »). Le responsable a retenu le rappel
**côté appareil** (arbitrage du 2026-10-07).

- Sur la frise de l'agenda, une carte « Un rappel chaque matin » : le patient
  choisit l'heure et touche « Ajouter à mon agenda ». Le **navigateur**
  fabrique un fichier calendrier que le téléphone propose d'ajouter à son
  agenda ; c'est le téléphone qui sonne, du lendemain jusqu'à la fin des 21
  nuits.
- **Le serveur n'est pas appelé** et ne garde rien du choix.
- Le fichier ne porte **ni lien** — une clé de session copiée dans un agenda
  synchronisé serait une fuite — **ni donnée de santé** : son titre, visible
  sur l'écran verrouillé, est « Rappel du matin ».

Aucune route, aucune migration, aucun changement de contrat ni de mesure.
Recette sur appareil (iPhone, Android) jointe à celle du LOT-03, après merge.
