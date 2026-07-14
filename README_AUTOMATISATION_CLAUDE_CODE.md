# Kit d’automatisation Claude Code — WellNeuro

Objectif : réduire au maximum la saisie dans Claude Code et limiter la consommation de tokens.

## Installation rapide

Dézipper ce kit à la racine du dépôt `Wellneuro-app`.

```bash
unzip wellneuro_claude_automation_kit.zip -d /chemin/vers/Wellneuro-app
cd /chemin/vers/Wellneuro-app
chmod +x scripts/wn-check-automation.sh
node --version
scripts/wn-check-automation.sh
```

Dans Claude Code, taper ensuite seulement :

```text
/wn-campaign-run
```

ou afficher le prochain lot :

```text
/wn-campaign next
/wn-plan
```

Les commandes historiques `/wn-r0` à `/wn-r6` sont conservées en compatibilité mais redirigées vers le flux
campagnes. Elles ne sont plus le chemin principal.

Pour entretenir la base documentaire :

```text
/wn-docs
/wn-docs apply
/wn-docs verify
```

À la fin d’un lot :

```text
/wn-finish
```

Pour relire le diff sans modifier :

```text
/wn-review
```

## Principe

- Les fichiers `.claude/skills/*/SKILL.md` deviennent des commandes slash Claude Code.
- Les instructions lourdes ne sont chargées que quand la commande est utilisée.
- Les hooks bloquent par défaut les actions dangereuses : `.env`, migrations, `prisma/schema.prisma`, commandes destructrices.
- `SESSION_LOG.md` devient la mémoire courte entre les lots.
- Les commandes WN orchestrent le chantier (stratégie) ; le mode Plan reste la planification technique détaillée avant toute modification.

## Workflow recommandé (minimal)

1. Lancer `/wn-campaign-run` pour charger la campagne active et le prochain lot.
2. Passer en mode Plan avant toute modification de code.
3. Valider le plan technique proposé.
4. Exécuter les changements bornés au lot validé.
5. Clôturer avec `/wn-finish`.

## Organisation Git cible

- Une campagne vit sur une branche dédiée, stable pendant toute sa durée.
- Chaque lot vit sur une branche dérivée de la branche de campagne.
- La PR d’un lot cible la branche de campagne, jamais `main`.
- La PR finale de campagne cible `main` une fois tous les lots validés.
- Cette convention est active à partir du lot suivant la validation de LOT-04.
- Les commandes d’orchestration doivent afficher explicitement la campagne active, la branche de campagne, la branche du lot courant et la cible de merge attendue.

## Commandes utiles

### `/wn-campaign-run`
Charge la campagne active, affiche le prochain lot et cadre l'exécution bornée du lot en cours.

### `/wn-plan`
Prépare le plan d'implémentation détaillé avant toute modification.

### `/wn-r0`
Commande legacy redirigée vers le flux campagnes.

### `/wn-r1`
Commande legacy redirigée vers le flux campagnes.

### `/wn-r2`
Commande legacy redirigée vers le flux campagnes.

### `/wn-r3`
Commande legacy redirigée vers le flux campagnes.

### `/wn-r4`
Commande legacy redirigée vers le flux campagnes.

### `/wn-r5`
Commande legacy redirigée vers le flux campagnes.

### `/wn-r6`
Commande legacy redirigée vers le flux campagnes.

### `/wn-docs`
Entretien documentaire récurrent, indépendant des lots R0-R6 :

- `/wn-docs` ou `/wn-docs audit` réalise un audit en lecture seule ;
- `/wn-docs apply` applique uniquement les corrections documentaires sûres ;
- `/wn-docs verify` contrôle le résultat sans modification.

Le skill vérifie la fidélité des documents au dépôt, les liens, contradictions, doublons et candidats à l’archivage. Il ne supprime, ne déplace et ne fusionne jamais un fichier sans confirmation distincte.

### `/wn-finish`
Produit une entrée courte pour `docs/claude/SESSION_LOG.md` et liste les prochaines actions.

## Attention

Ce kit n’ajoute aucun secret, aucune migration, aucune donnée patient réelle. Les patients fictifs autorisés restent uniquement : Sophie Nicola, Jennifer Martin, Michel Dogné.
