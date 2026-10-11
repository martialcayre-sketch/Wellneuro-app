---
id: "LOT-11"
titre: "Le rappel dit où toucher — une consigne par téléphone"
statut: "en_cours (2026-10-11)"
dépend_de: "LOT-05"
---

# LOT-11 — Le rappel dit où toucher

## Constat

Question du responsable après la recette sur appareil du 2026-10-10 : comment
le rappel du matin peut-il entrer dans l’agenda du patient sans qu’il ait à
« l’enregistrer puis l’importer » ? Recherche du 2026-10-11, en quatre angles
(iOS, Android, plateforme web, abonnements), chacun relu par un vérificateur
adverse :

- **Aucune page web ne peut écrire dans l’agenda d’un téléphone.** Il n’existe
  pas d’API pour cela (la Calendar API du W3C est close depuis 2014, et elle ne
  visait que la lecture), ni de notification programmée sur l’appareil (les
  Notification Triggers de Chrome sont abandonnées). Le téléphone demande
  toujours une confirmation ; seule une application installée écrirait
  directement, après une autorisation.
- **Sur Android, Chrome passe par son message de téléchargement** : le geste
  « Ouvrir » ne peut pas être sauté par la page.
- Le message affiché après le téléchargement disait « ouvrez-le » sans dire où
  toucher.

Pistes écartées :

| Piste | Motif |
|---|---|
| Lien « Ajouter à Google Agenda » | L’alarme ne suit plus l’heure choisie mais le réglage par défaut de Google Agenda ; compte Google connecté requis ; Samsung Agenda contourné ; données de l’événement transmises à Google. |
| Fichier servi par le serveur | Ouverture directe sur iPhone non prouvée (témoignages seulement), et contraire à « fabriqué côté appareil, jamais émis par le serveur » (`REGISTRE_FRONTIERES.md`). |
| Intent Android d’ajout d’événement | Activité très probablement inaccessible depuis Chrome, sans rappel possible. |
| Partage du fichier | Chrome refuse les fichiers `.ics` au partage (liste des types admis dans Chromium). |
| Abonnement `webcal://` | Flux serveur propre à chaque patient (interdit), non pris en charge par Google Agenda sur Android, alarmes retirées ou ignorées. |
| Lien `data:` | Bloqué dans Safari depuis iOS 26.5, selon un rapport de développeur. |

## Arbitrage

Responsable, 2026-10-11 : garder le fichier `.ics` — seule voie qui sonne à
l’heure choisie sans rien émettre du serveur — et nommer le geste que le
téléphone impose.

## Ce qui change

Après « Ajouter à mon agenda », le message suit l’appareil :

- **iPhone et iPad** : « Touchez « Télécharger » si on vous le demande, puis
  confirmez l’ajout au Calendrier. Si rien ne s’ouvre, le fichier
  « rappel-du-matin.ics » est dans l’app Fichiers : touchez-le. » Aucun
  navigateur n’est nommé : Chrome et Firefox sur iPhone demandent aussi
  « Télécharger », et rangent le fichier dans leur propre dossier de Fichiers.
- **Android** : « Touchez « Ouvrir » dans le message de téléchargement, puis
  confirmez l’ajout dans votre agenda. Si le message a disparu, le fichier
  « rappel-du-matin.ics » est dans vos téléchargements : touchez-le. »
- **Ordinateur** : « Le fichier « rappel-du-matin.ics » est prêt : ouvrez-le
  pour l’ajouter à votre agenda. Pour qu’il sonne sur votre téléphone,
  ajoutez-le plutôt depuis votre téléphone. » Le message d’avant y promettait
  « l’agenda de votre téléphone », faux pour un agenda d’ordinateur qui ne se
  synchronise pas.

La phrase sur le second rappel suit chacun. L’appareil se lit dans le
navigateur, au clic ; l’iPad, qui se présente comme un Mac, se reconnaît à son
écran tactile.

## Ce qui ne change pas

Le fichier (contenu, nom, alarme, récurrence), la carte, le bouton, et la
frontière : rien n’est envoyé, rien n’est gardé.

## Reste à observer

Les libellés exacts (« Télécharger », « Ouvrir », l’écran d’ajout) varient
avec la version du téléphone et du navigateur : à revoir sur Android et au
simulateur iOS à la prochaine recette. *Inconnu faute de preuve* : ces
libellés sur un vrai iPhone ou iPad (seul le simulateur a été vu) ; et le
navigateur intégré d’une messagerie Android peut ne pas savoir télécharger le
fichier — la recette du 2026-10-10 y a vu le fichier arriver sur un téléphone
(LOT-05), et la consigne ne détecte pas ce cas, faute de pouvoir le distinguer
d’un navigateur intégré qui fonctionne.

## Validation

- Bancs unitaires de la consigne : iPhone, iPad qui se dit Mac, vrai Mac,
  Android (Chrome et navigateur intégré), ordinateur.
- E2E de la saisie : consigne iPhone au gabarit iPhone 13 (choisie d’après le
  user-agent du gabarit, pas le nom du projet), consigne d’ordinateur au
  bureau.
- Revue adverse en trois angles (détection, texte patient, tests et docs),
  chaque constat relu par un vérificateur : un constat retenu, le message
  d’ordinateur qui promettait le téléphone. Retenus aussi, comme corrections
  évidentes : aucun navigateur nommé sur iPhone, le repli par l’app Fichiers.
  Écartés avec motif : détecter les navigateurs intégrés (on ne distingue pas
  celui qui télécharge de celui qui échoue, et la recette en a vu un
  fonctionner), la ré-annonce d’un message identique au second clic
  (antérieure au lot).
- T1 complet ; CI (WebKit compris).
