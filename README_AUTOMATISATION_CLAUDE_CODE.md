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
/wn-auto
```

ou lancer un lot précis :

```text
/wn-r0
/wn-r1
/wn-r2
/wn-r3
/wn-r4
/wn-r5
/wn-r6
```

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

1. Lancer `/wn` ou `/wn-auto` pour choisir le lot, le périmètre, les risques et les critères d’acceptation.
2. Passer en mode Plan avant toute modification de code.
3. Valider le plan technique proposé.
4. Exécuter les changements bornés au lot validé.
5. Clôturer avec `/wn-finish`.

## Commandes utiles

### `/wn-auto`
Détermine le prochain lot probable depuis `SESSION_LOG.md`, `docs/roadmap.md` et l’état Git. Produit un cadrage stratégique et délègue explicitement le plan technique au mode Plan avant toute modification.

### `/wn-r0`
Réalignement documentaire ponctuel uniquement.

### `/wn-r1`
Validation E2E du parcours patient unifié, sans modification.

### `/wn-r2`
Finalisation du pack « Base de consultation ».

### `/wn-r3`
Transition progressive vers le registre relationnel avec fallback legacy.

### `/wn-r4`
Harmonisation UX patient / design system.

### `/wn-r5`
Validation synthèse IA enrichie.

### `/wn-r6`
Stabilisation build, tests, go/no-go.

### `/wn-docs`
Entretien documentaire récurrent, indépendant des lots R0-R6 :

- `/wn-docs` ou `/wn-docs audit` réalise un audit en lecture seule ;
- `/wn-docs apply` applique uniquement les corrections documentaires sûres ;
- `/wn-docs verify` contrôle le résultat sans modification.

Le skill vérifie la fidélité des documents au dépôt, les liens, contradictions, doublons et candidats à l’archivage. Il ne supprime, ne déplace et ne fusionne jamais un fichier sans confirmation distincte.

### `/wn-finish`
Produit une entrée courte pour `docs/claude/SESSION_LOG.md` et liste les prochaines actions.

## Attention

Ce kit n’ajoute aucun secret, aucune migration, aucune donnée patient réelle. Les patients fictifs autorisés restent uniquement : Sophie Nicola, Jennifer Martin, Michel Dogne.
