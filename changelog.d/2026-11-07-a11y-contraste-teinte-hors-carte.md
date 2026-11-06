### Portail patient : la teinte verte posée hors carte passe au texte courant (2026-11-07)

Défaut WCAG 1.4.3 antérieur, relevé par axe le 2026-11-06. Sur le fond beige de
la page (`--background: #eae0cc`), `text-primary` sur `bg-primary/10` donne
4,09:1 pour 4,5:1 exigés ; le même motif dans une carte (`bg-surface`) donne
5,20:1 et reste en l'état. Aucune logique clinique, aucun texte ne change.

- **Décision de design** : `text-foreground` sur la teinte (10,62:1), sans jeton
  nouveau. C'est la règle déjà posée pour le ton `success` de
  `PatientInlineMessage` (arbitrage du 2026-10-10) : le fond teinté porte seul le
  ton. Un jeton de vert plus sombre ou un `bg-surface` sous la teinte auraient
  laissé le vert dépendre du fond, or c'est l'approfondissement du canevas
  (A5-R2) qui a fait passer ce motif sous le seuil.
- **Corrigés, sur les 16 usages relevés** : le bandeau de rappel du consentement
  de `questionnaires/[idAssignation]`, les bandeaux « Merci » des agendas du
  sommeil et de l'alimentation, et le survol de `PatientButton` `ghost`, posé hors
  carte sur plusieurs écrans. Les 12 autres vivent dans une carte.
- **Garde** : cet écart était le dernier de `ECARTS_CONNUS` (#1895 a retiré
  l'autre) : la liste et son filtre quittent
  `web/e2e/portail-accessibilite-saisie.spec.ts`, où tout nœud fautif redevient un
  échec. Le spec contrôle le bandeau de rappel ; les bandeaux « Merci » et le
  survol, états qu'axe n'y visite pas, sont établis par le calcul.
