### Le total de « Mon équilibre » n'a pas d'interprétation clinique, et il le dit (2026-08-24)

Décision `D-106`, LOT-07 de « Doctrine exécutable ». `DC-22` **bascule à acté** —
par la seconde branche de son énoncé, pas la première : le total n'est pas
retiré, il est **identifié** (`DC-20`).

- **La mesure qui a rendu l'arbitrage décidable.** **Aucun consommateur** ne lit
  le total : `GLOBAL_BALANCE` est bien émis comme objet clinique portant sa
  valeur, mais tous les producteurs de constats émettent
  `clinicalObjectCodes: []` et les consommateurs ne lisent que
  `balanceAssessment.needs` — seule la **nullité** de `scoreGlobal` est lue. Le
  patient n'en voit jamais le chiffre (`showValue={false}`). **Mais sa variation
  est un signal présenté aux deux surfaces** — et c'est elle, pas lui, que le
  patient lisait.
- **Le praticien la lisait même en couleur.** `MomentumCard` colorait le delta du
  total en `success` sur une hausse et `warning` sur une baisse : une
  interprétation clinique servie sous forme de couleur au lieu de mots. Le badge
  devient **neutre dans les trois sens**, et la carte porte la mention. Corriger
  la phrase patient en laissant la couleur aurait retiré l'énoncé et gardé le
  jugement.
- **Le chiffre porte désormais sa nature** : « Repère de suivi, pas un score
  clinique », au seul endroit du dépôt où il s'affiche — la fiche praticien. Le
  patient ne reçoit pas la mention : lui servir « pas un score clinique »
  l'obligerait à démentir un score qu'il n'a jamais lu.
- **Un libellé patient affirmait une amélioration ; il ne l'affirme plus.**
  « En progression depuis votre dernier bilan » → « Votre repère de suivi est en
  hausse depuis votre dernier bilan ». `progression` était l'interprétation
  clinique que la décision refuse au total.
- **L'asymétrie des trois libellés est conservée**, et c'est délibéré : `D7`
  « construction, jamais dégradation » interdit d'annoncer une chute au patient.
  Symétriser aurait cassé une règle en croyant en servir une autre.

**Deux arbitrages adjacents, rendus avec la mesure sous les yeux :**

- **`SEUIL_EFFONDREMENT = 0,34` et `PLAFOND_FONDATION_CRITIQUE = 50` sont validés
  tels quels.** Les deux portaient depuis l'origine « calibrage v1, à valider par
  le praticien », jamais fait — alors qu'ils commandent le plafonnement
  anti-moyenne. **Aucun bump de `VERSION_SCORE_EQUILIBRE`** : aucune valeur ne
  bouge, donc aucun historique n'est cassé.
- **L'égalité entre besoins d'une même strate est motivée** (`DC-21`). C'était
  une pondération **tacite** : les deux autres étages sont motivés sur place, pas
  celui-là. Motivation rendue — la hiérarchie clinique est portée par le
  mécanisme des **fondations critiques**, jamais par des poids ; en superposer un
  second rendrait illisible un besoin à la fois sous-pondéré et fondation
  critique.

**La garde, et les deux fail-open refusés avant de la retenir.**
`natureIndiceGlobal.guard.test.ts` lit **l'élément JSX qui reçoit
`indiceGlobal`**, et lui seul. Deux versions ont été **vues vertes sous
injection** puis rejetées : l'une cherchait la mention n'importe où dans le
fichier (l'`import` suffisait), l'autre raisonnait par fichier (une jauge servie
`showValue={false}` ailleurs dispensait toutes les autres).

**Un piège que le lot a failli poser**, désormais gardé : en sortant les libellés
patient de `components/patient`, il les sortait du balayage de
`gamification-patient.guard.test.ts`, qui ne lit que des chemins **déclarés**. Un
texte patient déplacé est un texte patient **dégardé** tant que son nouveau
chemin n'est pas inscrit.

Aucune valeur calculée ne change, aucune version de score ne bouge, et le
périmètre reste le **total agrégé** — pas les scores qui l'alimentent.
