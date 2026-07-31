---
description: Clôture un lot WellNeuro : validations, mise à jour du statut de campagne et entrée courte dans SESSION_LOG.
argument-hint: "[sujet]"
disable-model-invocation: true
effort: medium
---

# WellNeuro — fin de lot

!`git status --short`
!`git diff --stat`
!`test -f docs/claude/campagnes/ACTIVE_CAMPAIGN.md && cat docs/claude/campagnes/ACTIVE_CAMPAIGN.md || true`

Sujet : `$ARGUMENTS`

1. Vérifier que le périmètre est respecté.
2. Résumer les validations réellement exécutées.
3. Mettre à jour le lot actif s’il existe.
4. Ajouter à `docs/claude/SESSION_LOG.md` une entrée de moins de 150 mots :
   - décisions prises ;
   - options écartées et raison ;
   - prochaine action prioritaire ;
   - questions ouvertes.
5. Ne jamais réécrire les entrées précédentes.
6. Produire ensuite un handoff court.

## Deux promotions à examiner à chaque clôture

Une leçon consignée dans un journal se relit rarement. Avant de clore, poser
les deux questions — et répondre « rien à promouvoir » explicitement plutôt
que de les sauter.

**Une règle oubliée deux fois doit devenir exécutable.** Si le lot a buté sur
une règle *déjà écrite* quelque part, la réécrire une troisième fois ne la fera
pas tenir : ce qui tient est un hook, une permission, un test ou une étape de
`npm run check`. Le lint le montre — présent en CI, absent du palier T1, il a
laissé passer une PR verte en local et rouge en CI ; ce qui l'a réglé est une
commande, pas un paragraphe. Nommer le mécanisme visé et ce qui reste à écrire.

**Une décision structurante appartient à `docs/DECISIONS.md`,** pas au journal
de session : architecture, sécurité, RGPD, hébergement, frontière produit,
choix clinique. Le registre est append-only et porte date, statut, conséquences
et réserves. Le journal raconte une session ; le registre est ce qu'on relit
six mois plus tard. Un renvoi depuis l'entrée de journal suffit à faire le lien.

Ces deux gestes sont des **propositions** : ni le hook, ni l'entrée de registre
ne s'écrivent sans accord.
