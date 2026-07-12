---
id: "LOT-05-moteur-rendu-questionnaires"
titre: "Moteur de rendu des questionnaires et formulaires adaptatifs"
statut: "à_faire"
dépend_de: ["LOT-04"]
---

# LOT-05 — Moteur de rendu des questionnaires et formulaires adaptatifs

## But

Remplacer le rendu uniforme par un moteur commun capable de choisir une présentation adaptée au questionnaire ou au formulaire tout en conservant le contenu, les identifiants, les valeurs et la sécurité psychométrique.

## Périmètre

- contrat de profil d'expérience ;
- renderers `focus`, `micro_batch`, `guided_sections`, `compact_repeated_scale` ;
- profils internes `progressive_disclosure`, `timeline_input`, `frequency_routine`, `priority_sort` lorsque validés ;
- progression, autosave, reprise, navigation et résumé final ;
- navigation par sections pour les formulaires longs ;
- cartes répétables pour traitements et compléments internes ;
- alternative textuelle pour toute carte corporelle pilote ;
- adaptation responsive ;
- trois questionnaires pilotes ;
- compatibilité avec le flux portail permanent et, si nécessaire, legacy sans duplication.

## Fichiers probables

- `web/src/lib/questionnaire-types.ts`
- `web/src/lib/questions.ts`
- `web/src/components/patient/GenericQuestionnaire.tsx`
- `web/src/components/patient/QuestionField.tsx`
- nouveaux composants sous `web/src/components/patient/questionnaire/**`
- `web/src/lib/questionnaire-draft.ts`
- page portail questionnaire
- tests Vitest et Playwright

## Interdits

- ne pas changer les formules de scoring ;
- ne pas modifier le texte des instruments ;
- ne pas introduire de randomisation dans ce lot sauf stubs de politique désactivés ;
- ne pas créer un renderer spécifique dupliqué par questionnaire sans justification ;
- ne pas migrer tous les questionnaires d'un coup ;
- ne pas utiliser de slider pour une échelle verbale discrète sans validation ;
- ne pas transformer une échelle validée en timeline, classement, carte corporelle ou interaction riche ;
- ne pas masquer un item requis par progressive disclosure ;
- ne pas utiliser la variation de rendu comme gamification ;
- ne pas annoncer une sauvegarde serveur si seule la sauvegarde locale existe.

## Contrat cible

Le profil doit pouvoir être défini statiquement dans le catalogue ou une table de configuration sans migration de base.

Exemple conceptuel :

```ts
type ExperienceProfile = {
  administrationPolicy: 'strict' | 'layout_only' | 'nominal_shuffle_allowed' | 'internal_flexible';
  renderer:
    | 'focus'
    | 'micro_batch'
    | 'guided_sections'
    | 'compact_repeated_scale'
    | 'progressive_disclosure'
    | 'timeline_input'
    | 'frequency_routine'
    | 'priority_sort';
  groupSize?: number;
  allowSectionNavigation?: boolean;
  reviewBeforeSubmit?: boolean;
  saveMode?: 'local' | 'server' | 'hybrid';
};
```

Le choix par défaut doit reproduire l'existant de façon sûre. Les profils riches sont réservés aux instruments déclarés compatibles.

## Modes de saisie

### `focus`

Une question principale par écran ou viewport pour items sensibles, complexes ou contexte de fatigue.

### `micro_batch`

Deux à cinq items cohérents par page. Le regroupement doit être explicite ou sémantiquement stable, jamais aléatoire.

### `guided_sections`

Introduction courte, objectif, durée estimée et progression par section.

### `compact_repeated_scale`

Grille compacte uniquement lorsque les items partagent la même échelle et restent lisibles. Fallback cartes sur mobile.

### `progressive_disclosure`

Révélation des questions internes conditionnelles, sans masquer un item requis d'un instrument validé.

### `timeline_input`

Saisie chronologique pour histoire des symptômes ou événements internes non scorés.

### `frequency_routine`

Saisie structurée des moments, fréquences et routines, avec cartes mobile.

### `priority_sort`

Classement des attentes ou priorités qualitatives internes. Alternative boutons/clavier obligatoire si drag-and-drop.

### Cartes répétables

Pour médicaments, compléments ou habitudes internes : nom, dose, moment, durée et effet perçu selon le contrat du formulaire.

### Carte corporelle

Seulement si un besoin clinique clair est validé, avec :

- alternative textuelle complète ;
- clavier et mobile ;
- aucune perte de précision ;
- aucune dépendance exclusive au dessin.

## Étapes

1. Extraire la logique d'état et de soumission du rendu visuel.
2. Définir un modèle de progression basé sur les items requis.
3. Définir un contrat de groupe/page stable.
4. Construire `focus`.
5. Construire `micro_batch` avec groupement sémantique ou explicite.
6. Construire `guided_sections` pour les formulaires internes.
7. Construire `compact_repeated_scale` avec fallback mobile en cartes.
8. Ajouter uniquement les profils internes validés en LOT-00.
9. Unifier autosave et supprimer l'action redondante si elle n'a pas de sens distinct.
10. Afficher le vrai statut de conservation locale, synchronisation et transmission.
11. Ajouter reprise au dernier groupe.
12. Ajouter navigation par sections lorsque compatible.
13. Ajouter résumé avant transmission et navigation vers les éléments incomplets.
14. Remplacer `window.confirm()` par un dialog accessible.
15. Migrer trois pilotes seulement.
16. Comparer les payloads soumis à ceux du renderer historique.

## Questionnaires pilotes

À sélectionner en LOT-00 parmi :

- un questionnaire court strict ;
- un questionnaire long répétitif ;
- un formulaire interne flexible avec conditionnels.

Les noms définitifs doivent être documentés avant code.

## Tests

- même payload et même scoring pour jeu de référence ;
- progression correcte avec conditionnels ;
- reprise locale ;
- retour arrière ;
- erreurs proches des champs ;
- résumé avant soumission ;
- mobile, clavier, zoom, reduced motion ;
- matrice -> cartes en mobile ;
- lecture seule cohérente ;
- correction après déverrouillage ;
- section navigation stable ;
- drag-and-drop accompagné d'une alternative si utilisé ;
- carte corporelle accompagnée d'une alternative textuelle si utilisée ;
- libellé exact du statut de sauvegarde ;
- absence de regroupement aléatoire des items.

## Done

- [ ] Contrat de profil documenté et typé.
- [ ] Quatre renderers de base disponibles ou périmètre réduit explicitement justifié.
- [ ] Profils internes retenus documentés et limités aux formulaires compatibles.
- [ ] Trois pilotes migrés.
- [ ] Payloads et scoring inchangés.
- [ ] Autosave/reprise clarifiés.
- [ ] Statut local/synchronisé/transmis exact.
- [ ] Résumé final accessible.
- [ ] Navigation longue moins monotone sans altération clinique.
- [ ] LOT-06 autorisé.
