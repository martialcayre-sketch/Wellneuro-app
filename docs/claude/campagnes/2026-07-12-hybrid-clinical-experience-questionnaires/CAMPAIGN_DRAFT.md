# CAMPAIGN DRAFT — exécution Claude Code

## Finalité

Ce fichier traduit la vision en séquence exécutable. Il ne vaut pas autorisation de modifier tout le front en une seule passe.

## Règle d'exécution

Pour chaque lot :

1. relire `CAMPAGNE.md`, `sources/05_INNOVATIONS_UX_VAGUE_2.md` et le fichier du lot ;
2. auditer les fichiers réels avant de proposer un plan ;
3. utiliser le mode Plan avant toute modification applicative ;
4. limiter le changement au périmètre du lot ;
5. distinguer ce qui est livré, prototypé ou différé ;
6. lancer les validations demandées ;
7. documenter les écarts et décisions ;
8. ne passer au lot suivant qu'après verdict explicite.

## Séquence `/wn`

```text
/wn-campaign status
/wn-campaign next
/wn-campaign-run
/wn-review
```

La campagne n'est pas activée automatiquement sur cette branche. Au démarrage effectif, réconcilier d'abord `ACTIVE_CAMPAIGN.md`, dont le contenu peut être en retard sur `SESSION_LOG.md`.

## Vagues de livraison

### Vague A — fondations

- LOT-00 : audit, classification et arbitrages ;
- LOT-01 : tokens et modes de couleur ;
- LOT-02 : shell premium, vraie recherche et palette de commandes si le contrat est prêt.

### Vague B — expérience clinique avancée

- LOT-03 : dashboard, annuaire, cockpit, mode consultation, timeline, carte de décision, avant/après et prévisualisation patient ;
- le constructeur visuel 21 jours est prototypé seulement si son articulation avec C1 est claire ; sinon handoff vers campagne dédiée.

### Vague C — confiance patient

- LOT-04 : portail patient clair, résumé de session, confort de lecture, sauvegarde/connexion explicite et états actionnables.

### Vague D — questionnaires

- LOT-05 : profils de rendu et formulaires adaptatifs ;
- LOT-06 : randomisation contrôlée et intégrité psychométrique.

### Vague E — stabilisation et gouvernance

- LOT-07 : tests, lexique UX, documentation canonique, migration progressive, capacités différées et handoff.

## Niveaux de maturité obligatoires

Chaque innovation de vague 2 doit être marquée :

- `livrée` : intégrée et testée ;
- `prototype_validé` : comportement et composition validés, connexion métier différée ;
- `spécifiée` : contrat prêt mais aucun code ;
- `différée` : backlog avec prérequis et campagne cible.

Aucune fonctionnalité ne peut être déclarée livrée sur la seule base d'une maquette.

## Priorités P1

Le lot 00 doit arbitrer au minimum :

1. mode consultation ;
2. double niveau de lecture ;
3. timeline clinique ;
4. carte de décision ;
5. comparaison avant / maintenant ;
6. prévisualisation patient.

Le lot 03 doit au minimum prototyper les trois premières capacités structurantes : mode consultation, carte de décision et timeline.

## Branches et commits

Préférence : une branche par lot ou sous-lot significatif. Les commits doivent être ciblés et ne pas mélanger :

- thème et logique questionnaire ;
- refonte shell et scoring ;
- migration visuelle et évolution clinique ;
- prototype UX et intégration métier profonde ;
- documentation et nettoyage non lié.

## Commandes minimales de validation

```bash
bash scripts/check_no_secrets.sh
cd web
npm run type-check
npm run lint
npm run test
npm run test:e2e
```

Ajouter selon le lot :

- captures Playwright 375 / 768 / 1024 / 1440 px ;
- vérification `prefers-reduced-motion` ;
- vérification mode clair/sombre système ;
- navigation clavier complète ;
- audit contraste ;
- comparaison de scoring avant/après pour les questionnaires pilotes ;
- tests d'états vide/chargement/erreur ;
- tests réseau instable et reprise ;
- vérification de la séparation données internes / vue patient ;
- contrôle des dates et conditions dans les comparateurs.

## Stop conditions

Arrêter le lot et demander un arbitrage si :

- une modification de schéma Prisma semble nécessaire ;
- un instrument impose une licence ou un protocole non disponible ;
- l'ordre officiel des items/réponses est incertain ;
- une amélioration UX change la valeur envoyée au scoring ;
- le mode Auto provoque un flash de thème non résolu ;
- une primitive UI impose une dépendance massive ;
- une donnée patient non fictive est détectée ;
- le lot exige une refonte métier hors périmètre ;
- une timeline nécessite d'inventer des événements ;
- un comparateur met en regard des mesures non comparables ;
- une prévisualisation patient expose des notes ou données internes ;
- le builder 21 jours duplique ou contourne le moteur de décision C1 ;
- une innovation P3 est implémentée sans campagne ou validation dédiée.

## Handoff attendu

Le dernier lot doit livrer :

- matrice des pages migrées et non migrées ;
- matrice des questionnaires par niveau de liberté psychométrique ;
- matrice des innovations par niveau de maturité ;
- liste des primitives obligatoires ;
- lexique UX praticien/patient ;
- dette UX résiduelle ;
- plan d'extension aux futurs modules ;
- résultats des tests sur mobile réel si disponibles ;
- articulation avec C1 et éventuelle campagne constructeur 21 jours ;
- prochaine campagne recommandée.
