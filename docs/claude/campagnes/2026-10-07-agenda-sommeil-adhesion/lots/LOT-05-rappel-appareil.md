---
id: "LOT-05"
titre: "Le rappel du matin, posé par le patient sur son téléphone"
statut: "en_cours (2026-10-08)"
dépend_de: "LOT-03"
---

# LOT-05 — Le rappel du matin, posé sur l'appareil

## But

Donner au patient un rappel quotidien de noter sa nuit **sans aucun envoi du
serveur** : `REGISTRE_FRONTIERES.md` interdit toute tâche planifiée et toute
relance déduite d'un état, et le responsable a retenu le rappel côté appareil
plutôt qu'un réarbitrage de la frontière (arbitrage du 2026-10-07).

## Résultat observable

- Sur la frise de l'agenda, une carte « Un rappel chaque matin » : le patient
  choisit une heure (liste au quart d'heure) et touche « Ajouter à mon
  agenda ». Le navigateur fabrique un fichier calendrier (`.ics`) que le
  téléphone propose d'ajouter à son agenda.
- Le rappel court du lendemain jusqu'à la fin de la fenêtre de 21 nuits ; la
  carte disparaît quand il ne reste aucun matin.
- **Le serveur n'est pas appelé** et ne garde aucune trace du choix.
- Le fichier ne porte **ni lien** (une clé de session copiée dans un
  calendrier synchronisé serait une fuite), **ni donnée de santé** : le titre,
  visible sur l'écran verrouillé et dans les agendas partagés, est « Rappel du
  matin ». Heure flottante (heure locale du téléphone), sans fuseau.

## Ce qui ne change pas

Aucune route, aucune migration, aucun envoi, aucun stockage sur l'appareil par
l'application (le fichier téléchargé appartient au patient). Contrat
`agenda-sommeil-v3` inchangé.

## Validation attendue

T1 complet, suites de l'agenda (domaine `rappelCalendrier` et carte du
journal). **Recette sur appareil** à joindre à celle du LOT-03 (même
arbitrage : après merge, avant annonce) : sur iPhone, le fichier téléchargé
ouvre la proposition d'ajout au Calendrier ; sur Android, il s'ouvre avec
l'agenda du téléphone ; le rappel sonne à l'heure choisie.
