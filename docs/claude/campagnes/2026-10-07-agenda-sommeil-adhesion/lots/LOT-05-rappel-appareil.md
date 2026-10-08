---
id: "LOT-05"
titre: "Le rappel du matin, posé par le patient sur son téléphone"
statut: "terminé (2026-10-08, #1364) — recette sur appareil après merge, avant annonce"
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
arbitrage : après merge, avant annonce). Le comportement d'un `.ics`
téléchargé dépend du téléphone ; le texte affiché au patient ne promet donc
qu'un fichier « à ouvrir », et la recette tranche :

- **iPhone, Safari** : le téléchargement aboutit (l'URL n'est révoquée qu'après
  40 s, Safari demandant d'abord « Télécharger ? »), le fichier ouvre l'ajout
  au Calendrier, le rappel sonne à l'heure choisie. À refaire depuis l'app
  posée sur l'écran d'accueil et depuis le navigateur d'une messagerie.
- **Android** : sur un téléphone Samsung (Samsung Agenda) **et** sur un
  téléphone sans (Google Agenda seul). Google Agenda n'ouvre pas toujours un
  `.ics` téléchargé et ignore souvent l'alarme du fichier : si la recette le
  confirme, le texte d'aide doit le dire avant l'annonce.

Relecture `wn-reviewer` : GO conditionnel, P1 (révocation trop tôt, promesse
d'ouverture) et P2 corrigés dans la PR (PRODID neutre, repli d'identifiant,
message d'échec, zone `aria-live` toujours montée, avertissement contre le
double ajout, texte « enregistré dans votre agenda, pas chez nous »).
