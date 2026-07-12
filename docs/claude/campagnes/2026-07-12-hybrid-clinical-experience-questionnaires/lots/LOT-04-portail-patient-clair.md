---
id: "LOT-04-portail-patient-clair"
titre: "Portail patient clair, parcours et composants de confiance"
statut: "à_faire"
dépend_de: ["LOT-01"]
---

# LOT-04 — Portail patient clair, parcours et composants de confiance

## But

Appliquer la charte Patient Zen claire à l'ensemble du portail et rendre le parcours plus compréhensible, rassurant et facile à reprendre.

## Périmètre

- gate email ;
- consentement ;
- fiche de renseignements ;
- anamnèse ;
- écran de fin d'onboarding ;
- hub questionnaires ;
- en-têtes, états, messages et navigation ;
- lecture seule et demande de correction ;
- préparation des primitives du futur renderer.

## Fichiers probables

- `web/src/app/portail/[token]/page.tsx`
- `web/src/app/portail/[token]/questionnaires/page.tsx`
- `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.tsx`
- `web/src/components/patient/ConsentScreen.tsx`
- `web/src/components/patient/ConsultationScreen.tsx`
- `web/src/components/patient/PlaintesForm.tsx`
- composants UI patient partagés à créer
- `web/src/app/globals.css`
- tests `web/e2e/portail-parcours.spec.ts`

## Interdits

- ne pas introduire de mode sombre patient dans ce lot ;
- ne pas changer les textes légaux sans validation ;
- ne pas modifier le flux de token/session ;
- ne pas afficher de score ou interprétation clinique non prévue ;
- ne pas ajouter de gamification ;
- ne pas utiliser de données réelles.

## Principes

- fond crème ;
- cartes blanches ;
- teal pour action ;
- gold pour progression ;
- rouge seulement pour erreur réelle ;
- corps lisible, largeur de lecture contrôlée ;
- une action principale ;
- étape suivante expliquée ;
- sauvegarde et confidentialité visibles au bon moment.

## Parcours cible

Afficher un repère global :

1. consentement ;
2. informations ;
3. situation/anamnèse ;
4. questionnaires ;
5. analyse du praticien ;
6. restitution ou suite.

Les étapes futures doivent être présentées sans promettre un délai non maîtrisé.

## Hub cible

- progression globale ;
- durée restante approximative ;
- action recommandée maintenant ;
- autres questionnaires disponibles ;
- transmis/correction/expiré dans des sections secondaires ;
- explication de ce qui se passe après la transmission.

## Étapes

1. Extraire les constantes de style locales en composants/tokens.
2. Créer une enveloppe patient commune.
3. Ajouter un composant de progression de parcours.
4. Segmenter fiche et anamnèse en sections plus digestes sans changer les données collectées.
5. Clarifier autosave/reprise lorsque disponible.
6. Reconcevoir le hub autour de l'action recommandée.
7. Harmoniser lecture seule et correction.
8. Remplacer les confirmations natives concernées par des dialogs accessibles si le périmètre le permet.
9. Vérifier les textes français et la tonalité.

## Tests

- parcours E2E complet existant ;
- mobile 375 px ;
- zoom 200 % ;
- clavier ;
- lecteur d'écran sur gate, consentement et première section ;
- session expirée ;
- erreur réseau ;
- brouillon ;
- correction/déverrouillage ;
- aucun débordement ;
- thème clair même si le système est sombre.

## Done

- [ ] Portail entièrement cohérent visuellement.
- [ ] Parcours global compréhensible.
- [ ] Hub orienté prochaine action.
- [ ] Mobile et accessibilité validés.
- [ ] Tests existants verts.
- [ ] LOT-05 autorisé.
