### Agenda du sommeil — de la clôture au dossier exporté, testé de bout en bout (2026-10-10)

Campagne `2026-10-07-agenda-sommeil-adhesion`, LOT-10. Tests seulement : aucun
code applicatif, seuil, contrat ni libellé modifié.

- **Trou fermé** (nommé au LOT-08) : un agenda de sept nuits « je ne sais pas »
  pour l’endormissement, clôturé, donne un dossier exporté qui écrit la
  médiane d’endormissement « Non calculé : données insuffisantes », jamais 0,
  dans ses deux versions. Un témoin à endormissement connu doit y paraître
  chiffré (« 8 min »), et la qualité moyenne prouve que la clôture a agrégé.
- Nouveau lecteur `e2e/helpers/textePdf.ts` : le texte d’un PDF exporté se lit
  désormais en CI, sans `pdftotext`.
