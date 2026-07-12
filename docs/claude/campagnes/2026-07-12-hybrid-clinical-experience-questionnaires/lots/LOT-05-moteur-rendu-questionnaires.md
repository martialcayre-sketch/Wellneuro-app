---
id: "LOT-05-moteur-rendu-questionnaires"
titre: "Moteur de rendu des questionnaires par profils d'expérience"
statut: "à_faire"
dépend_de: ["LOT-04"]
---

# LOT-05 — Moteur de rendu des questionnaires par profils d'expérience

## But

Remplacer le rendu uniforme par un moteur commun capable de choisir une présentation adaptée au questionnaire tout en conservant le contenu, les identifiants et les valeurs.

## Périmètre

- contrat de profil d'expérience ;
- renderers `focus`, `micro_batch`, `guided_sections`, `compact_repeated_scale` ;
- progression, autosave, reprise, navigation et résumé final ;
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
- ne pas utiliser de slider pour une échelle verbale discrète sans validation.

## Contrat cible

Le profil doit pouvoir être défini statiquement dans le catalogue ou une table de configuration sans migration de base.

Exemple conceptuel :

```ts
type ExperienceProfile = {
  administrationPolicy: 'strict' | 'layout_only' | 'nominal_shuffle_allowed' | 'internal_flexible';
  renderer: 'focus' | 'micro_batch' | 'guided_sections' | 'compact_repeated_scale';
  groupSize?: number;
  allowSectionNavigation?: boolean;
  reviewBeforeSubmit?: boolean;
};
```

Le choix par défaut doit reproduire l'existant de façon sûre.

## Étapes

1. Extraire la logique d'état et de soumission du rendu visuel.
2. Définir un modèle de progression basé sur les items requis.
3. Définir un contrat de groupe/page stable.
4. Construire `focus`.
5. Construire `micro_batch` avec groupement sémantique ou explicite.
6. Construire `guided_sections` pour les formulaires internes.
7. Construire `compact_repeated_scale` avec fallback mobile en cartes.
8. Unifier autosave et supprimer l'action redondante si elle n'a pas de sens distinct.
9. Ajouter reprise au dernier groupe.
10. Ajouter résumé avant transmission et navigation vers les éléments incomplets.
11. Remplacer `window.confirm()` par un dialog accessible.
12. Migrer trois pilotes seulement.
13. Comparer les payloads soumis à ceux du renderer historique.

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
- correction après déverrouillage.

## Done

- [ ] Contrat de profil documenté et typé.
- [ ] Quatre renderers disponibles ou périmètre réduit explicitement justifié.
- [ ] Trois pilotes migrés.
- [ ] Payloads et scoring inchangés.
- [ ] Autosave/reprise clarifiés.
- [ ] Résumé final accessible.
- [ ] LOT-06 autorisé.
