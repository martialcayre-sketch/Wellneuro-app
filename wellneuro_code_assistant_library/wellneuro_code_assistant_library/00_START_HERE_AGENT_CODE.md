# 00 — Point d’entrée pour assistant de code

## Mission

Aider à faire évoluer WellNeuro depuis l’état actuel du dépôt vers l’objectif issu du brainstorming : **fiche patient cockpit + protocole 21 jours minimal + documents validés + compagnon patient simple**.

## Rôle de l’assistant

L’assistant de code doit :

1. lire l’état du dépôt avant d’agir ;
2. proposer une branche courte ;
3. limiter les changements au périmètre demandé ;
4. éviter toute migration non confirmée ;
5. garder tous les textes UI en français ;
6. préserver la logique clinique existante ;
7. ajouter des composants plutôt que réécrire massivement ;
8. fournir critères d’acceptation et tests.

## Positionnement produit

WellNeuro ne doit pas devenir une app de questionnaires. Les questionnaires sont une matière première. Le produit doit aider à répondre :

```text
Où en est ce patient ?
Quelle est sa priorité actuelle ?
Quel protocole minimal réaliste pour 21 jours ?
Qu’est-ce qui manque pour décider ?
Quel document produire et valider ?
```

## Première cible recommandée

Ne pas commencer par les modules les plus risqués comme messagerie libre, biologie réelle, scanner alimentaire ou prescription automatique.

Commencer par :

```text
Vertical slice 1
├── nouveau shell/cockpit praticien
├── fiche patient en sections
├── résumé décisionnel
├── priorités 21 jours
├── charge thérapeutique
├── protocole minimal non persistant ou persistance différée
├── document patient HTML imprimable
└── validation praticien obligatoire
```

## Interdits immédiats

- Ne pas créer de chat patient libre.
- Ne pas stocker de biologie réelle.
- Ne pas générer de prescription automatique.
- Ne pas créer une base exhaustive de compléments.
- Ne pas changer les seuils cliniques sans instruction explicite.
- Ne pas introduire un gros design framework sans justification.
- Ne pas transformer les pages patient en expérience anxiogène à scores rouges.

## Sortie attendue d’un agent de code

Pour toute tâche, l’agent doit produire :

```text
Nom de branche
Objectif
Fichiers impactés probables
Hors périmètre explicite
Étapes
Risques
Critères d’acceptation
Tests manuels et automatiques
```
