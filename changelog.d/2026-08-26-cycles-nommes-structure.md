### Les cycles peuvent être nommés `T0`, `T1`, `T2` — structure seule (`D-113`)

Première des deux PR. **Elle ne change aucun comportement** : rien n'ouvre
encore de second cycle, `construireTrajectoire` filtre toujours sur `T0`, et la
suite complète est verte à l'identique.

**Le défaut qu'elle prépare à supprimer.** Chaque cycle s'ouvrait par un épisode
`T0`, donc deux cycles produisaient deux `T0` et la lecture retenait « le plus
récent » — ouvrir un second cycle **déplaçait l'ancre du premier** et refermait
ses fenêtres de jalon **par effet de bord**. Un patient à J85 perdait sa question
J90 le jour d'un nouveau départ. Une ancre nommée ne se déplace plus.

- **`JalonMomentum` n'est plus une union fermée** : les ancres forment une série
  ouverte (`AncreCycle = \`T${number}\``), les mesures restent trois
  (`JalonMesure`).
- **Conséquence mesurée, pas supposée** : `Record<JalonMomentum, number>`
  dégénère en **signature d'index**. `JOURS_JALON['T1']` était typé `number` tout
  en valant `undefined` — un `NaN` silencieux dans un calcul de date, avec `tsc`
  au vert. La table porte donc les **seuls jalons de mesure**, et l'offset d'une
  ancre est **nul par définition**.
- **Les cadences ne bougent pas** : 21, 42, 90 et la tolérance de ±8 sont
  inchangées. Le changement porte sur une **clé**, pas sur un seuil — aucune
  modification clinique au sens de `DC-17`/`DC-18`.
- **Deux `Object.keys(JOURS_JALON)` auraient perdu la lecture de référence en
  silence** (`depuisPrisma`, `momentumParBesoin`) : ils énuméraient `T0` par
  l'entrée `T0: 0` de la table. Aucun type ne les signalait — corrigés à la main,
  offsets explicites.
- **La dépendance ne va que dans un sens** : `equilibre/constants.ts` est une
  table clinique et n'importe pas le protocole. La règle « une ancre est le jour
  0 » vit dans `lib/protocol/fenetreJalon.ts`.
- **L'ordre des cycles vient du rang, la chronologie de la date** — et la
  divergence se **signale** (`discordanceDOrdre`), elle ne se corrige pas
  (`DC-30`). `T01` est refusé comme `TA`.
- La garde `G7` du LOT-05 est **portée** : la dérivation « table moins l'ancre »
  devient une **égalité** avec les jalons de mesure, et une nouvelle assertion
  interdit qu'une ancre redevienne une clé de cadence. `estJalonObjectif` refuse
  désormais **toute** ancre, pas seulement `T0`.

Le moment est le moins cher possible : `assessment_episodes` est **vide en
production**, zéro épisode tous jalons confondus. Aucune donnée à migrer.

Dette nommée : `milestone` reste une colonne `String` **sans CHECK** — rien en
base n'empêche `T01`, `TA` ni `J7`. Migration à part, confirmation distincte.
