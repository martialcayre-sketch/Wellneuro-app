# CAMPAIGN DRAFT — exécution Claude Code

## Finalité

Ce fichier traduit la vision en séquence exécutable. Il ne vaut pas autorisation de modifier tout le front en une seule passe.

## Règle d'exécution

Pour chaque lot :

1. relire `CAMPAGNE.md` et le fichier du lot ;
2. auditer les fichiers réels avant de proposer un plan ;
3. utiliser le mode Plan avant toute modification applicative ;
4. limiter le changement au périmètre du lot ;
5. lancer les validations demandées ;
6. documenter les écarts et décisions ;
7. ne passer au lot suivant qu'après verdict explicite.

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

- LOT-00 : audit et arbitrages ;
- LOT-01 : tokens et modes de couleur ;
- LOT-02 : shell premium.

### Vague B — surfaces métier

- LOT-03 : dashboard, annuaire et cockpit praticien ;
- LOT-04 : portail patient clair.

### Vague C — questionnaires

- LOT-05 : profils de rendu ;
- LOT-06 : randomisation contrôlée et intégrité psychométrique.

### Vague D — stabilisation

- LOT-07 : tests, documentation canonique, migration progressive et handoff.

## Branches et commits

Préférence : une branche par lot ou sous-lot significatif. Les commits doivent être ciblés et ne pas mélanger :

- thème et logique questionnaire ;
- refonte shell et scoring ;
- migration visuelle et évolution clinique ;
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
- comparaison de scoring avant/après pour les questionnaires pilotes.

## Stop conditions

Arrêter le lot et demander un arbitrage si :

- une modification de schéma Prisma semble nécessaire ;
- un instrument impose une licence ou un protocole non disponible ;
- l'ordre officiel des items/réponses est incertain ;
- une amélioration UX change la valeur envoyée au scoring ;
- le mode Auto provoque un flash de thème non résolu ;
- une primitive UI impose une dépendance massive ;
- une donnée patient non fictive est détectée ;
- le lot exige une refonte métier hors périmètre.

## Handoff attendu

Le dernier lot doit livrer :

- matrice des pages migrées et non migrées ;
- matrice des questionnaires par niveau de liberté psychométrique ;
- liste des primitives obligatoires ;
- dette UX résiduelle ;
- plan d'extension aux futurs modules ;
- résultats des tests sur mobile réel si disponibles ;
- prochaine campagne recommandée.
