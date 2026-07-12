---
id: "LOT-04-portail-patient-clair"
titre: "Portail patient clair, confiance, reprise et confort"
statut: "à_faire"
dépend_de: ["LOT-01"]
---

# LOT-04 — Portail patient clair, confiance, reprise et confort

## But

Appliquer la charte Patient Zen claire à l'ensemble du portail et rendre le parcours plus compréhensible, rassurant, facile à reprendre et transparent sur ce qui est enregistré ou transmis.

## Périmètre

- gate email ;
- consentement ;
- fiche de renseignements ;
- anamnèse ;
- écran de fin d'onboarding ;
- hub questionnaires ;
- en-têtes, états, messages et navigation ;
- lecture seule et demande de correction ;
- résumé de session patient ;
- confort de lecture ;
- états de sauvegarde, synchronisation et connexion ;
- états vides et erreurs actionnables ;
- préparation des primitives du futur renderer ;
- cohérence avec la prévisualisation patient côté praticien.

## Fichiers probables

- `web/src/app/portail/[token]/page.tsx`
- `web/src/app/portail/[token]/questionnaires/page.tsx`
- `web/src/app/portail/[token]/questionnaires/[idAssignation]/page.tsx`
- `web/src/components/patient/ConsentScreen.tsx`
- `web/src/components/patient/ConsultationScreen.tsx`
- `web/src/components/patient/PlaintesForm.tsx`
- composants UI patient partagés à créer
- éventuels composants `PatientJourney`, `SessionSummary`, `ReadingComfort`, `SaveStatus`
- `web/src/app/globals.css`
- tests `web/e2e/portail-parcours.spec.ts`

## Interdits

- ne pas introduire de mode sombre patient dans ce lot ;
- ne pas changer les textes légaux sans validation ;
- ne pas modifier le flux de token/session ;
- ne pas afficher de score ou interprétation clinique non prévue ;
- ne pas ajouter de gamification ;
- ne pas utiliser de données réelles ;
- ne pas promettre un délai de traitement non maîtrisé ;
- ne pas afficher `Enregistré` si les réponses sont seulement conservées localement ;
- ne pas exposer les statuts techniques internes ;
- ne pas multiplier les réglages de confort au point de complexifier le portail.

## Principes

- fond crème ;
- cartes blanches ;
- teal pour action ;
- gold pour progression ;
- rouge seulement pour erreur réelle ;
- corps lisible, largeur de lecture contrôlée ;
- une action principale ;
- étape suivante expliquée ;
- sauvegarde et confidentialité visibles au bon moment ;
- langage patient cohérent ;
- chaque retour dans le portail répond à `Qu'est-ce qui a changé ?` et `Que dois-je faire maintenant ?`.

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
- résumé de ce qui a changé depuis la dernière visite ;
- autres questionnaires disponibles ;
- transmis/correction/expiré dans des sections secondaires ;
- explication de ce qui se passe après la transmission.

## Résumé de session patient

Le résumé peut afficher uniquement des faits confirmés :

- questionnaire transmis ;
- réception confirmée ;
- demande de correction ;
- questionnaire déverrouillé ;
- action attendue du patient ;
- document ou restitution disponible, si réellement disponible.

Ne pas exposer :

- notes internes ;
- brouillons praticien ;
- hypothèses non validées ;
- détail des processus IA ;
- dates promises non garanties.

## Confort de lecture

Contrôle discret et simple :

- texte standard ou agrandi ;
- espacement renforcé ;
- réduction des animations ;
- contraste renforcé uniquement si nécessaire et validé.

Les préférences peuvent être locales et non cliniques. Le portail doit rester utilisable sans modifier ces réglages.

## Sauvegarde et connexion

Distinguer explicitement :

- `Conservé sur cet appareil` ;
- `Synchronisé` si une sauvegarde serveur existe réellement ;
- `Transmis au praticien` ;
- `Connexion interrompue` ;
- `Transmission non terminée`.

Afficher la dernière sauvegarde réussie lorsque l'information est fiable. En cas de réseau instable, expliquer ce qui reste conservé et ce qui devra être repris.

## États vides et erreurs

Un état doit préciser :

- ce qui s'est passé ;
- si les réponses sont conservées ;
- l'action possible ;
- comment demander de l'aide si aucune action n'est possible.

Éviter les codes techniques, messages génériques ou erreurs culpabilisantes.

## Cohérence avec la prévisualisation praticien

Le rendu utilisé par `Voir ce que recevra le patient` doit partager les mêmes composants, tokens ou contrats que le portail réel. Toute divergence doit être documentée et testée.

## Étapes

1. Extraire les constantes de style locales en composants/tokens.
2. Créer une enveloppe patient commune.
3. Ajouter un composant de progression de parcours.
4. Segmenter fiche et anamnèse en sections plus digestes sans changer les données collectées.
5. Clarifier autosave/reprise et distinguer conservation locale, synchronisation et transmission.
6. Reconcevoir le hub autour de l'action recommandée et du résumé de session.
7. Ajouter un contrôle de confort de lecture minimal.
8. Harmoniser lecture seule et correction.
9. Créer des états vides, réseau et erreur actionnables.
10. Remplacer les confirmations natives concernées par des dialogs accessibles si le périmètre le permet.
11. Vérifier les textes français et la tonalité.
12. Vérifier la compatibilité avec la prévisualisation praticien.

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
- thème clair même si le système est sombre ;
- confort de lecture ;
- résumé de session sans donnée interne ;
- distinction locale/synchronisée/transmise ;
- reprise après connexion instable ;
- cohérence portail/prévisualisation.

## Done

- [ ] Portail entièrement cohérent visuellement.
- [ ] Parcours global compréhensible.
- [ ] Hub orienté prochaine action.
- [ ] Résumé de session fondé sur des états réels.
- [ ] Sauvegarde et transmission clairement distinguées.
- [ ] Confort de lecture simple et accessible.
- [ ] États vides et erreurs actionnables.
- [ ] Mobile et accessibilité validés.
- [ ] Tests existants verts.
- [ ] LOT-05 autorisé.
