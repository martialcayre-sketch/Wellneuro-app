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
/wn-lot next
```

ou afficher le prochain lot :

```text
/wn-campaign next
```

Le plan technique s'élabore ensuite dans le mode Plan natif (Shift+Tab, ou
`/model opusplan` quand le plan est le morceau difficile).

Les commandes historiques `/wn-r0` à `/wn-r6` ont été supprimées le 2026-08-07 (chantier R0→R6 clos
le 2026-07-10, stubs de redirection sans contenu). Le flux campagnes est le seul chemin.

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
/code-review
```

(à fort risque — migration, auth, permissions, clinique — déléguer à
`Agent(wn-reviewer)`).

## Principe

- Les fichiers `.claude/skills/*/SKILL.md` deviennent des commandes slash Claude Code.
- Les instructions lourdes ne sont chargées que quand la commande est utilisée.
- Les hooks bloquent par défaut les actions dangereuses : `.env`, migrations, `prisma/schema.prisma`, commandes destructrices.
- `SESSION_LOG.md` devient la mémoire courte entre les lots.
- Les commandes WN orchestrent le chantier (stratégie) ; le mode Plan reste la planification technique détaillée avant toute modification.

## Workflow recommandé (minimal)

1. Lancer `/wn-lot next` pour charger la campagne active et le prochain lot.
2. Passer en mode Plan pour un changement de code non trivial ou à risque.
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

### `/wn-docs`
Entretien documentaire récurrent, indépendant des lots :

- `/wn-docs` ou `/wn-docs audit` réalise un audit en lecture seule ;
- `/wn-docs apply` applique uniquement les corrections documentaires sûres ;
- `/wn-docs verify` contrôle le résultat sans modification.

Le skill vérifie la fidélité des documents au dépôt, les liens, contradictions, doublons et candidats à l’archivage. Il ne supprime, ne déplace et ne fusionne jamais un fichier sans confirmation distincte.

### `/wn-finish`
Produit une entrée courte pour `docs/claude/SESSION_LOG.md` et liste les prochaines actions.

## Attention

Ce kit n’ajoute aucun secret, aucune migration, aucune donnée patient réelle. Les patients fictifs autorisés restent uniquement : Sophie Nicola, Jennifer Martin, Michel Dogné.
