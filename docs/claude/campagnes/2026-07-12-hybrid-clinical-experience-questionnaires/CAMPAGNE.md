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
- expérience clinique avancée : mode consultation, timeline, cartes de décision, comparaison avant/après et prévisualisation patient ;
- productivité et sécurité : palette de commandes, états vides actionnables, réversibilité et vues opérationnelles ;
- socle de gouvernance imposant cette direction aux modules futurs.

Cette campagne ne doit pas être traitée comme une simple retouche graphique. Elle définit une architecture d'expérience commune aux interfaces praticien et patient, avec une couche spécifique de sécurité psychométrique pour les questionnaires et une seconde vague d'innovations cliniques hiérarchisées.

## Règle directrice

> Chaque écran doit aider à comprendre, décider ou agir. Tout élément qui ne remplit aucune de ces fonctions doit être retiré, regroupé ou relégué.

## Résultat observable

À la fin de la campagne :

1. Le praticien dispose d'un shell Hybrid Clinical cohérent : rail sombre structurel, espace de travail clair en mode Jour, environnement sombre atténué en mode Nuit, vraies icônes SVG et grille d'alignement stable.
2. Le mode `Auto` suit `prefers-color-scheme`; les modes `Jour` et `Nuit` forcent le rendu et sont mémorisés localement sans migration de base.
3. Le portail patient applique une charte claire fixe : fond crème, cartes blanches, teal pour l'action, champagne gold pour la progression, rouge limité aux erreurs réelles.
4. Les questionnaires utilisent un moteur de rendu par profils d'expérience : focus, micro-lots, sections guidées, grilles compactes limitées, saisie conditionnelle et résumé avant transmission.
5. L'ordre des réponses n'est jamais mélangé arbitrairement. Toute randomisation est déclarée, déterministe, stable pendant une tentative, testée et limitée aux options nominales réellement non ordonnées.
6. Les échelles validées conservent par défaut l'ordre de leurs items, l'ordre de leurs réponses, leurs libellés, leurs bornes, leur temporalité et leur logique de scoring.
7. Les surfaces praticien disposent d'une double profondeur : lecture immédiate puis lecture experte.
8. Le mode consultation, la carte de décision et la timeline clinique disposent au minimum d'un prototype validé et d'un contrat d'intégration.
9. Le suivi à 21 jours prévoit une comparaison avant/maintenant avec dates, comparabilité et limites explicites.
10. Le praticien peut prévisualiser ce que recevra le patient sans exposer les données internes.
11. Le portail patient explique ce qui a changé, ce qui est sauvegardé et la prochaine action attendue.
12. Les innovations futures doivent déclarer leur rôle, thème, densité, comportement mobile, action principale, états, accessibilité, politique psychométrique et niveau de maturité.

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
- Aucune innovation complexe ne passe directement de l'idée au code métier : contrat UX et prototype requis.
- Aucune proposition IA, prescription, transmission ou action clinique n'est exécutée sans validation humaine explicite.

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

### Expérience clinique avancée

Priorité P1 :

- mode consultation sans distraction ;
- double niveau de lecture ;
- timeline clinique longitudinale ;
- carte de décision avec justification, confiance, limites et données manquantes ;
- comparateur avant / maintenant ;
- prévisualisation de la vue patient.

Priorité P2 :

- palette de commandes praticien ;
- vues opérationnelles utiles ;
- états vides actionnables ;
- prévention des erreurs et réversibilité ;
- résumé de session patient ;
- confort de lecture ;
- état de sauvegarde et de connexion explicite ;
- lexique éditorial WellNeuro.

Priorité P3, à préparer sans implémentation prématurée :

- personnalisation avancée du dashboard ;
- recherche globale étendue ;
- visualisations complexes ;
- carte corporelle riche ;
- véritable CAT avec banque d'items calibrée.

Le constructeur visuel de protocoles 21 jours est P2 mais dépend de l'état réel de C1. Il doit être prototypé ou confié à une campagne dédiée si son implémentation élargit trop LOT-03.

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
- Enregistrement audio, transcription ou captation implicite en mode consultation.
- Implémentation complète du constructeur de protocoles si elle nécessite une évolution métier profonde hors C1.

## Questions à trancher dans LOT-00

- Quelles pages praticien sont migrées en première vague : shell seul, dashboard, annuaire, fiche patient, synthèse ?
- Le mode Nuit doit-il être accessible depuis le profil ou depuis un contrôle dédié dans la barre supérieure ?
- Quels questionnaires longs sont pilotes pour les nouveaux profils de rendu ?
- Quels instruments sont officiellement validés/licenciés et imposent une fidélité stricte de présentation ?
- Quels questionnaires internes WellNeuro peuvent recevoir des interactions plus innovantes ?
- Quelle donnée locale permet de stabiliser la randomisation sans modifier le schéma de base ?
- Faut-il conserver un mode expert « tableau » côté praticien tout en imposant les cartes côté patient mobile ?
- Quel périmètre minimal du mode consultation apporte une valeur réelle sans dupliquer la fiche patient ?
- Quelles données réelles existent déjà pour alimenter une timeline sans inventer d'événements ?
- Le comparateur avant/maintenant peut-il garantir la comparabilité des mesures pilotes ?
- Le constructeur 21 jours reste-t-il dans LOT-03 ou devient-il une campagne liée à C1 ?

## Dépendances

- C0-UX terminée : le shell actuel existe mais doit être remplacé ou réconcilié, pas empilé.
- `docs/design-system-d1.md` reste la base historique à auditer et faire évoluer sans collision de tokens.
- Les routes et parcours patient existants doivent rester compatibles.
- Les tests Playwright existants constituent le filet de non-régression initial.
- Les travaux C1 sur la décision clinique doivent consommer les nouvelles primitives lorsqu'ils touchent l'interface, sans être bloqués par les lots purement documentaires.
- Les cartes de décision, comparateurs et protocoles doivent utiliser les contrats cliniques de C1 lorsqu'ils existent, sans en inventer un modèle parallèle.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit réel, classification des écrans, questionnaires et innovations | à_faire | aucun |
| LOT-01 | Tokens Hybrid Clinical et contrôleur Auto/Jour/Nuit | à_faire | LOT-00 |
| LOT-02 | Shell premium, palette de commandes, icônes et alignements | à_faire | LOT-01 |
| LOT-03 | Surfaces praticien, mode consultation et expérience clinique avancée | à_faire | LOT-02 |
| LOT-04 | Portail patient clair, confiance, reprise et confort | à_faire | LOT-01 |
| LOT-05 | Moteur de rendu des questionnaires et formulaires adaptatifs | à_faire | LOT-04 |
| LOT-06 | Randomisation contrôlée et intégrité psychométrique | à_faire | LOT-05 |
| LOT-07 | Validation transverse, lexique, gouvernance et handoff futur | à_faire | LOT-02 à LOT-06 |

## Commande `/wn` de reproduction

La commande ci-dessous sert uniquement à reproduire le squelette depuis les sources dans un autre contexte. Ne pas l'exécuter sur ce dossier existant sans `--overwrite` et sans intention explicite de régénération.

```text
/wn-campaign creer "Hybrid Clinical et expérience questionnaires patient" --source docs/claude/campagnes/2026-07-12-hybrid-clinical-experience-questionnaires/sources --lots 8 --slug hybrid-clinical-experience-questionnaires --prefix-date --auto-final
```

## Activation de la campagne existante

Le skill actuel ne fournit pas de sous-commande dédiée `activate <id>` pour une campagne déjà créée. Au moment du démarrage :

1. exécuter `/wn-campaign status` ;
2. réconcilier l'état réel avec `docs/claude/SESSION_LOG.md` ;
3. mettre à jour manuellement `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` pour pointer vers cette campagne ;
4. vérifier `/wn-campaign next` ;
5. démarrer LOT-00 uniquement sur instruction explicite.

Ne pas recréer la campagne pour l'activer et ne pas écraser automatiquement le pointeur actuel depuis cette branche documentaire.

## Definition of Done de campagne

- [ ] Contrat visuel Hybrid Clinical validé sur desktop, tablette et mobile.
- [ ] Alignement géométrique du rail et des icônes vérifié par captures et mesures.
- [ ] Mode Auto/Jour/Nuit sans flash de mauvais thème et avec préférence mémorisée.
- [ ] Portail patient clair fixe cohérent sur onboarding, hub, questionnaire, lecture seule et correction.
- [ ] Au moins trois profils de rendu questionnaire utilisés sur des instruments pilotes appropriés.
- [ ] Aucun questionnaire validé n'a changé de contenu, d'ordre ou de scoring sans autorisation documentée.
- [ ] Les politiques de randomisation sont explicites, déterministes et couvertes par tests.
- [ ] Le mode consultation, la timeline et la carte de décision disposent d'un prototype et d'un arbitrage documenté.
- [ ] La comparaison avant/maintenant n'affiche que des mesures comparables avec dates et limites.
- [ ] La prévisualisation patient protège les informations internes.
- [ ] Le portail patient distingue clairement conservation locale, synchronisation et transmission.
- [ ] Les états vides, erreurs et confirmations sont actionnables et cohérents.
- [ ] Les tests existants restent verts; les parcours clavier, tactile et lecteur d'écran sont documentés.
- [ ] Les futures pages/modules disposent d'une checklist de conformité Hybrid Clinical.
- [ ] Un lexique UX praticien/patient est livré.
- [ ] `docs/design-system-d1.md` ou son successeur canonique est mis à jour.
- [ ] Le handoff final indique les dettes restantes, capacités différées et stratégie de migration progressive.
