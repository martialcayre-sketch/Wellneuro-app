---
id: "LOT-05"
titre: "UX patient Jardin"
statut: "terminé — UX patient Jardin qualitative et isolée"
dépend_de: "LOT-04 + protocole approuvé"
---

# LOT-05 — UX patient « Jardin »

## But

Présenter une lecture alimentaire qualitative, rassurante et strictement bornée
aux actions approuvées pour le patient.

## Résultat observable

Le patient voit un résumé dans son protocole actif et son espace alimentation,
puis un zoom profond autorisé, sans chiffre, classement ni couleur morale.

## Périmètre

- Alignement qualitatif, raisons, source, limites et une alternative validée.
- Résumé dans le protocole actif et la page alimentation.
- Zoom /portail/[token]/alimentation/boussole/[foodRef].
- Route GET /api/portail/boussole/[foodRef] avec session portail obligatoire.
- Autorisation uniquement si foodRef appartient à une action du protocole
  approuvé et diffusé pour ce patient.
- Réponse 404 pour toute référence absente ou non autorisée.

## Hors périmètre

Score 0–100, percentile, classement, profil intrinsèque brut, nouvelle navigation
principale, catalogue libre et recommandation non approuvée.

## Fichiers probables

Portail patient, page alimentation, résumé protocole, route portail,
autorisation par action diffusée et tests E2E.

## Interdits

- Aucun chiffre, jauge, podium ou code couleur bon/mauvais.
- Aucune distinction permettant d'énumérer des références interdites.
- Aucune donnée d'un autre patient.
- Aucun accès si le protocole est brouillon, caduc ou révoqué.

## Étapes

- [x] Figer le vocabulaire qualitatif patient.
- [x] Implémenter l'autorisation depuis le protocole diffusé.
- [x] Ajouter le résumé aux deux surfaces existantes.
- [x] Ajouter le zoom profond sans item principal.
- [x] Tester isolation, accessibilité et langage non culpabilisant.

## Tests

API 401/404, référence d'un autre patient, protocole non diffusé ou caduc,
aliment absent, aucune fuite d'existence, desktop/tablette/mobile, clavier,
zoom 200 %, contraste et textes français.

## Critères de done

- Aucun champ numérique intrinsèque ou contextuel n'atteint la vue patient.
- Un foodRef non autorisé répond toujours 404.
- Le zoom n'est accessible que depuis une action diffusée.
- Toute réserve comporte une limite claire et, si disponible, une alternative.

## Risques / points de vigilance

Le token de portail ne suffit pas : l'autorisation doit joindre session,
patient, protocole diffusé, action et foodRef dans une même décision serveur.

## Résultats

- La Boussole est intégrée au protocole actif et à l'espace alimentation, avec
  un zoom profond par aliment et sans nouvelle navigation principale.
- La route portail exige le cookie signé, un suivi actif, la dernière version
  V2 relue puis approuvée, l'action alimentaire correspondante et une référence
  reconstruite depuis le référentiel Ciqual officiel. Une absence, une
  révocation, une version caduque, un autre patient ou un profil partiel
  produisent une réponse 404 identique, sans énumération.
- La projection patient contient exclusivement le libellé, une lecture
  qualitative, ses raisons, la source, les limites et une alternative nullable.
  Aucun score, percentile, rang, poids, PRAL, hash ou version interne ne sort du
  serveur. Les doublons d'un même aliment sont éliminés.
- Le changement de token patient vide immédiatement l'état local avant une
  nouvelle lecture, en défense supplémentaire sur appareil partagé.
- Validation : 93 fichiers et 536 tests Vitest, type-check, build production,
  scoring-check, audit documentaire, anti-secrets et diff-check verts. Revue
  indépendante : GO, aucun P0/P1. Le lint conserve deux warnings historiques
  hors C5 dans `GenericQuestionnaire`.
- Les contrôles humains finaux clavier, zoom 200 %, contraste et appareils sont
  regroupés dans le go/no-go LOT-07. Aucune alternative n'est inventée avant le
  catalogue validé du LOT-06 ; le champ reste donc absent lorsque non disponible.
