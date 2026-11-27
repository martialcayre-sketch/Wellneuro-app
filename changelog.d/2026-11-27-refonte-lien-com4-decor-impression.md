### Refonte Lien, COM-4 : le décor `LienDecor` se masque toujours à l'impression (2026-11-27)

Micro-lot commun issu du constat du banc E2E de PRA-3a (#2385). Le responsable
a retenu la piste (b) par écrit le 2026-11-27.

- **Défaut** : `print:hidden` dans le socle de la primitive perdait contre une
  classe d'affichage de l'appelant à variante arbitraire
  (`[@container(min-width:118px)]:block`, que Tailwind émet après les variantes
  d'impression) ou marquée importante (`!block`, `md:!block`). Le décor restait
  imprimé.
- **Correctif** : le socle force `print:!hidden`. Aucune classe d'appelant n'est
  retirée. Le rendu à l'écran est inchangé. Le `print:hidden` de l'enveloppe
  PRA-3a est gardé.
- **Bancs** : `e2e/fiche-entete-decor.spec.ts` retire de la page le masquage de
  l'enveloppe, puis vérifie que le motif reste masqué à l'impression par la seule
  primitive, au bureau sous Chromium et au téléphone sous WebKit. Sans le
  correctif, ce test échoue sur les deux moteurs. Les bancs Vitest de la primitive
  et des poses épinglent `print:!hidden`.
