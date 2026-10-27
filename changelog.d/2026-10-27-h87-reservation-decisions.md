### Outillage : le numéro d'une décision se réserve à la rédaction (H87, D-370)

- `node scripts/wn-reserver-decision.mjs [--nombre N]` réserve le premier
  numéro libre au-dessus de `main` en créant, par l'API GitHub, la référence
  `refs/tags/reserve/D-NNN`, qui ne porte que le numéro. Une référence déjà
  existante fait passer au numéro suivant ; tout autre refus rend « inconnu »,
  sans nouvel essai ; pour plusieurs numéros, les réservés restent et le
  résultat partiel est rendu.
- Le garde du registre tolère sur une PR un trou réservé, en avertissement
  « en vol », et refuse un trou sans réservation, ainsi qu'une décision de la
  base supprimée, même réservée. Sur `main`, un trou n'est
  jamais rouge et le garde ne lit rien à distance. Doublon et désordre au rang
  numérique restent refusés ; un numéro réservé puis abandonné se ferme par
  une pierre tombale.
- Une étape non bloquante du CI signale, sur une PR non documentaire, une
  décision ajoutée sans réservation.
- Le registre se range au rang numérique, du plus haut au plus bas ; les
  règles de merge, D-287 §2 et le plan disent « réservé à la rédaction ».
