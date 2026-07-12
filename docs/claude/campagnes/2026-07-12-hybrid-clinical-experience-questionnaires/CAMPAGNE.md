---
id: "2026-07-12-hybrid-clinical-experience-questionnaires"
titre: "Hybrid Clinical et expérience questionnaires patient"
statut: "à_faire"
créée_le: "2026-07-12"
mise_à_jour: "2026-07-12"
lot_courant: "LOT-00"
---

# Hybrid Clinical et expérience questionnaires patient

## Objectif

Transformer la direction Hybrid Clinical validée en standard UX durable pour WellNeuro :

- shell praticien premium, strictement aligné et fonctionnel ;
- mode praticien `Auto / Jour / Nuit`, avec préférence locale mémorisée ;
- portail patient clair fixe, chaleureux, calme et médicalement rassurant ;
- expérience de questionnaires moins lourde, moins monotone et mieux adaptée aux formats longs ;
- innovation d'affichage sans altération du texte, du sens, du codage ou de la validité des instruments ;
- socle de gouvernance imposant cette direction aux modules futurs.

Cette campagne ne doit pas être traitée comme une simple retouche graphique. Elle définit une architecture d'expérience commune aux interfaces praticien et patient, avec une couche spécifique de sécurité psychométrique pour les questionnaires.

## Résultat observable

À la fin de la campagne :

1. Le praticien dispose d'un shell Hybrid Clinical cohérent : rail sombre structurel, espace de travail clair en mode Jour, environnement sombre atténué en mode Nuit, vraies icônes SVG et grille d'alignement stable.
2. Le mode `Auto` suit `prefers-color-scheme`; les modes `Jour` et `Nuit` forcent le rendu et sont mémorisés localement sans migration de base.
3. Le portail patient applique une charte claire fixe : fond crème, cartes blanches, teal pour l'action, champagne gold pour la progression, rouge limité aux erreurs réelles.
4. Les questionnaires utilisent un moteur de rendu par profils d'expérience : focus, micro-lots, sections guidées, grilles compactes limitées, saisie conditionnelle et résumé avant transmission.
5. L'ordre des réponses n'est jamais mélangé arbitrairement. Toute randomisation est déclarée, déterministe, stable pendant une tentative, testée et limitée aux options nominales réellement non ordonnées.
6. Les échelles validées conservent par défaut l'ordre de leurs items, l'ordre de leurs réponses, leurs libellés, leurs bornes, leur temporalité et leur logique de scoring.
7. Les innovations futures doivent déclarer leur rôle, thème, densité, comportement mobile, action principale, états, accessibilité et politique psychométrique.

## Contraintes non négociables

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les captures, les tests ou les seeds.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux par lot : pas de refactor global non nécessaire.
- Aucune modification de seuil, de formule, de cotation ou d'interprétation clinique sans demande explicite documentée dans `CHANGELOG.md`.
- Aucun questionnaire validé ne peut être « amélioré » en modifiant silencieusement son contenu ou son protocole d'administration.
- Aucune fonction critique ne dépend uniquement du survol.
- Zones tactiles cibles ≥ 44×44 px.
- Focus clavier visible; navigation clavier et lecteur d'écran préservés.
- Aucun état clinique signalé par la seule couleur.
- Pas de tableau horizontal comme rendu patient mobile par défaut.
- Pas de changement de thème patient automatique dans cette campagne : le portail patient reste clair fixe.
- Pas de Storybook, de framework UI massif, de WebGL ou de migration de framework sans demande séparée.

## Décisions validées

### Identité Hybrid Clinical

- Praticien Jour : rail sombre plein hauteur + espace de travail crème/clair + cartes blanches.
- Praticien Nuit : rail sombre + espace deep teal atténué + surfaces légèrement plus claires + texte crème.
- Patient : thème clair fixe, calme, chaleureux, à faible densité.
- Le premium vient de la maîtrise des alignements, de la hiérarchie et de la réduction du bruit, non d'une accumulation d'effets.

### Architecture de thème

Séparer le rôle et le mode colorimétrique :

```html
<div data-theme="praticien" data-color-mode="light|dark">
<div data-theme="patient" data-color-mode="light">
```

Le choix utilisateur praticien est `auto | light | dark`. `auto` suit le système et réagit aux changements de préférence. Le choix est stocké côté client uniquement.

### Bibliothèques

- Conserver Next.js, React, Tailwind et Recharts.
- Introduire Lucide React pour les icônes cohérentes.
- Utiliser Radix UI ou des primitives shadcn/ui sélectionnées uniquement pour les comportements complexes accessibles : dialog, alert dialog, sheet, dropdown, tabs, tooltip et command palette.
- Utiliser Motion uniquement lorsqu'une transition explique un changement d'état ou de structure.
- Ne pas importer une esthétique générique de bibliothèque telle quelle.

### Questionnaires

- Le scoring s'appuie sur les identifiants et valeurs (`id`, `v`), jamais sur la position visuelle.
- Les options ordinales restent ordonnées et orientées de façon stable.
- `Oui / Non`, échelles de fréquence, intensité, accord, douleur ou temporalité ne sont jamais mélangées.
- Les options nominales non ordonnées peuvent être mélangées uniquement si le questionnaire est déclaré compatible.
- `Autre`, `Aucun`, `Ne sait pas`, `Non concerné` restent épinglés à une position définie.
- Une randomisation autorisée est déterministe par tentative et ne change pas au retour arrière, au rechargement ou lors de la reprise d'un brouillon.
- Le mode adaptatif de type CAT n'est pas simulé. Il nécessite une banque d'items calibrée et une campagne clinique/psychométrique distincte.

## Hors périmètre global

- Refonte des formules de scoring.
- Modification du contenu clinique des questionnaires.
- Création d'une banque d'items IRT ou d'un véritable test adaptatif.
- Migration Prisma pour stocker des préférences de thème ou d'affichage.
- Refonte de l'authentification, des tokens patient ou des routes API métier.
- Refonte des documents PDF/booklets au-delà de l'application des tokens visuels communs.
- Personnalisation complète du dashboard par glisser-déposer.
- Application immédiate de toutes les variantes UX à tous les questionnaires sans phase d'inventaire et classification.

## Questions à trancher dans LOT-00

- Quelles pages praticien sont migrées en première vague : shell seul, dashboard, annuaire, fiche patient, synthèse ?
- Le mode Nuit doit-il être accessible depuis le profil ou depuis un contrôle dédié dans la barre supérieure ?
- Quels questionnaires longs sont pilotes pour les nouveaux profils de rendu ?
- Quels instruments sont officiellement validés/licenciés et imposent une fidélité stricte de présentation ?
- Quels questionnaires internes WellNeuro peuvent recevoir des interactions plus innovantes ?
- Quelle donnée locale permet de stabiliser la randomisation sans modifier le schéma de base ?
- Faut-il conserver un mode expert « tableau » côté praticien tout en imposant les cartes côté patient mobile ?

## Dépendances

- C0-UX terminée : le shell actuel existe mais doit être remplacé ou réconcilié, pas empilé.
- `docs/design-system-d1.md` reste la base historique à auditer et faire évoluer sans collision de tokens.
- Les routes et parcours patient existants doivent rester compatibles.
- Les tests Playwright existants constituent le filet de non-régression initial.
- Les travaux C1 sur la décision clinique doivent consommer les nouvelles primitives lorsqu'ils touchent l'interface, sans être bloqués par les lots purement documentaires.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit réel, classification des écrans et arbitrages | à_faire | aucun |
| LOT-01 | Tokens Hybrid Clinical et contrôleur Auto/Jour/Nuit | à_faire | LOT-00 |
| LOT-02 | Shell premium praticien, icônes et alignements | à_faire | LOT-01 |
| LOT-03 | Hiérarchie des surfaces praticien et cockpit patient | à_faire | LOT-02 |
| LOT-04 | Portail patient clair, parcours et composants de confiance | à_faire | LOT-01 |
| LOT-05 | Moteur de rendu des questionnaires par profils d'expérience | à_faire | LOT-04 |
| LOT-06 | Randomisation contrôlée et intégrité psychométrique | à_faire | LOT-05 |
| LOT-07 | Validation transverse, documentation canonique et handoff futur | à_faire | LOT-02 à LOT-06 |

## Commande `/wn` de reproduction

```text
/wn-campaign creer "Hybrid Clinical et expérience questionnaires patient" --source docs/claude/campagnes/2026-07-12-hybrid-clinical-experience-questionnaires/sources --lots 8 --slug hybrid-clinical-experience-questionnaires --prefix-date --auto-final
```

Pour activer cette campagne plus tard, uniquement après arbitrage de la priorité avec C1 :

```text
/wn-campaign creer "Hybrid Clinical et expérience questionnaires patient" --source docs/claude/campagnes/2026-07-12-hybrid-clinical-experience-questionnaires/sources --lots 8 --slug hybrid-clinical-experience-questionnaires --prefix-date --auto-final --activate
```

Ne pas exécuter `--activate` automatiquement depuis cette branche documentaire : `ACTIVE_CAMPAIGN.md` doit être réconcilié manuellement avec l'état réel des campagnes au moment du démarrage.

## Definition of Done de campagne

- [ ] Contrat visuel Hybrid Clinical validé sur desktop, tablette et mobile.
- [ ] Alignement géométrique du rail et des icônes vérifié par captures et mesures.
- [ ] Mode Auto/Jour/Nuit sans flash de mauvais thème et avec préférence mémorisée.
- [ ] Portail patient clair fixe cohérent sur onboarding, hub, questionnaire, lecture seule et correction.
- [ ] Au moins trois profils de rendu questionnaire utilisés sur des instruments pilotes appropriés.
- [ ] Aucun questionnaire validé n'a changé de contenu, d'ordre ou de scoring sans autorisation documentée.
- [ ] Les politiques de randomisation sont explicites, déterministes et couvertes par tests.
- [ ] Les tests existants restent verts; les parcours clavier, tactile et lecteur d'écran sont documentés.
- [ ] Les futures pages/modules disposent d'une checklist de conformité Hybrid Clinical.
- [ ] `docs/design-system-d1.md` ou son successeur canonique est mis à jour.
- [ ] Le handoff final indique les dettes restantes et la stratégie de migration progressive.
