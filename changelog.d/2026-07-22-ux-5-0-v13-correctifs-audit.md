### Refonte visuelle 5.0 — V13, correctifs de l'audit visuel (2026-07-22)

L'audit multi-agents (16 écrans jugés contre la maquette, écarts
contre-vérifiés au pixel) a attrapé quatre défauts réels, dont deux
antérieurs au chantier et présents en production :

- **La police de corps tombait en Times partout, prod incluse.** Les
  variables next/font vivaient sur `<body>` alors que `--font-body`/
  `--font-display` sont déclarées sur `:root` en les référençant — une
  custom property se calcule là où elle est déclarée, la chaîne devenait
  « guaranteed-invalid » et s'héritait invalide partout (diagnostic par
  sonde `getComputedStyle`). Les classes de variables montent sur `<html>` :
  Instrument Sans/Albert Sans/Bricolage s'appliquent enfin.
- **Overlays invisibles, barre basse mobile transparente.** Les
  modificateurs d'opacité (`bg-foreground/35`, `bg-surface/80`,
  `bg-muted/40`, `bg-rail-surface/95`) sur des tokens hex sans jumeau RGB ne
  généraient aucune classe — fond simplement absent. Jumeaux
  `--foreground-rgb`/`--surface-rgb`/`--muted-rgb`/`--rail-surface-rgb`
  ajoutés, tokens passés en forme `rgb(var() / <alpha-value>)`.
- **Cartes du Fil écrasées à 390 px** : `flex-wrap`, les actions passent
  sous le texte en mobile.
- Bannière « Module différé » relevée à 15 % d'ambre ; libellés du rail de
  phases tronqués proprement (la vraie police est plus large que le repli).

Restent notés sans correctif : la hauteur totale fiche patient qui dépasse
900 px avec le chrome au-dessus du cockpit (arbitrage UX à venir).
