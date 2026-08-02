---
id: "CB-08"
titre: "ui-rayon-biologie"
statut: "à_faire"
dépend_de: "CB-05, CB-06"
---

# CB-08 — UI : rayon biologie dans la bibliothèque, fiche patient, fil

## But

Remplacer progressivement le placeholder `dashboard/biologie`, ajouter
l'encart « explorations biologiques suggérées » sur la fiche patient et les
cartes de suivi dans le Fil du jour.

## Résultat observable

- Rayon documentaire consultable dans la bibliothèque : catalogue, fiches
  d'analytes avec les **deux référentiels** de valeurs côte à côte (laboratoire
  / fonctionnel), jamais fusionnés en une colonne unique ; bandeau HDS présent
  sur tout ce qui touche aux résultats.
- Encart « explorations biologiques suggérées » sur la fiche patient — pendant
  de l'encart questionnaires du lot 10 certification : instrument à tiroir
  ouvert depuis la zone focale du protocole, jamais écran de classement
  autonome ; **aucun score global**, justification à un clic.
- Cartes de suivi (signée, transmise, retour à consigner) dans le Fil, comme
  les cartes existantes (projection recalculée).
- `EstimeMesurePanel` reste en « second temps », inchangé, jusqu'à l'étage 2.

## Périmètre

- `web/src/app/dashboard/biologie/page.tsx` (remplacement progressif du
  placeholder statique).
- Composants de fiche analyte, encart fiche patient, cartes du Fil.
- Textes UI en français, vocabulaire imposé (jamais « prescription » etc.).

## Hors périmètre

- Toute saisie ou affichage de résultat biologique réel (étage 2, CB-09).
- La logique du moteur, de la machine à états, de la diffusion (déjà faites).

## Fichiers probables

- `web/src/app/dashboard/biologie/page.tsx`
- `web/src/components/EstimeMesurePanel.tsx` (ne pas sortir du « second temps »)
- `web/src/components/**` (nouveaux composants de fiche analyte, encart)
- Rayon compléments C4 UI (`web/src/lib/supplement-library/`) comme patron

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Aucune migration ici (lecture seule du catalogue et des propositions déjà
  en base).
- Pas de score global affiché nulle part sur ce rayon.
- Pas de refactor hors lot.
- Textes UI en français uniquement.

## Étapes

- [ ] Vérifier les hypothèses (patron C4 UI, placeholder actuel).
- [ ] Implémenter le rayon documentaire (catalogue, fiches analytes).
- [ ] Implémenter l'encart fiche patient et les cartes du Fil.
- [ ] Exécuter les validations (T2, captures de revue pour tout nouvel écran).
- [ ] Relire le diff (UI, français, vocabulaire).
- [ ] Documenter les résultats.

## Tests

- T2 avant tout commit UI.
- Vérification manuelle : bandeau HDS visible partout où c'est requis, deux
  référentiels toujours côte à côte, aucun score global.

## Critères de done

- Placeholder remplacé pour l'étage documentaire.
- Encart et cartes fonctionnels et testés.
- Revue UI (français, vocabulaire, HDS) faite.

## Résultats

À compléter à la clôture.
