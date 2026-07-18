---
id: "LOT-05"
titre: "UX patient Jardin"
statut: "à_faire"
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

- [ ] Figer le vocabulaire qualitatif patient.
- [ ] Implémenter l'autorisation depuis le protocole diffusé.
- [ ] Ajouter le résumé aux deux surfaces existantes.
- [ ] Ajouter le zoom profond sans item principal.
- [ ] Tester isolation, accessibilité et langage non culpabilisant.

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

À renseigner lors de la clôture du lot.
