### Une adresse qui ne mène nulle part parle enfin français (2026-09-03)

Complément direct du lot précédent, et correction d'une lacune constatée **en
production** juste après son déploiement : Next distingue deux cas qu'on
confond aisément. Un `notFound()` appelé dans une page est traité par le
`not-found.tsx` de son segment — celui du portail, livré plus tôt dans la
journée, couvre bien ses cinq appels. Mais une URL qui ne correspond à AUCUNE
route ne remonte qu'à la racine, et il n'y avait rien : `/portail/connexion/…`
inexistant rendait « This page could not be found », en anglais, sans rien du
produit. C'est pourtant le cas le plus banal des deux — une adresse tronquée
par une messagerie.

`app/not-found.tsx` le remplace pour tout le site. Il propose **deux entrées
nommées plutôt qu'un bouton « accueil »** : la page est servie aux deux
publics et `/` redirige selon la session, donc une personne suivie, sans
session praticien, y serait envoyée vers l'écran de connexion praticien — une
seconde impasse après la première. Un banc fige ce choix, avec l'absence de
lien vers `/` qui le rendrait au piège.

Note de méthode : la vérification initiale avait conclu à tort que le
`not-found.tsx` du portail ne fonctionnait pas. L'URL de test tombait en
réalité dans la route dynamique `/portail/[token]` — elle n'était donc pas un
404. Le diagnostic n'a tenu qu'une fois l'essai refait sur une adresse ne
matchant réellement aucune route.
