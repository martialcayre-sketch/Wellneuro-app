### Fiche patient : au radar des douze besoins, un besoin non mesuré est un axe sans point, nommé « non mesuré » — plus jamais un zéro (D-301, J2-radar, sans migration, 2026-10-18)

- **L'écart corrigé** (`DC-24`) : l'onglet « Les 12 besoins » traçait à zéro
  un besoin sans couverture calculée (`couverture ?? 0`). Un besoin que rien
  ne mesure se lisait comme un besoin effondré.
- **Le rendu** : l'axe reste sur le radar, son libellé porte « non mesuré »,
  et il n'a pas de point. Le contour s'interrompt sur cet axe au lieu de
  plonger au centre ; un contour ouvert n'est plus rempli. Chaque mesure porte
  son point. Le tableau voisin, qui affichait déjà « — », ne change pas.
- **Pourquoi un tracé à trous** : recharts 3.9 place une valeur absente au
  centre, c'est-à-dire qu'il la trace comme un zéro. Son `Polygon` coupe en
  revanche le tracé sur un sommet invalide. Le module pur
  `components/ui/scoreRadarPoints.ts` porte la règle ; le radar s'en sert par
  une forme personnalisée.
- **Bancs** : la règle pure (une couverture absente reste absente, un `0`
  mesuré est une mesure) ; le vrai `Polygon` de recharts, qui trace deux
  segments ouverts sans passer par l'axe vide, avec la contre-épreuve « tout
  mesuré, contour fermé et rempli » ; un E2E
  (`e2e/fiche-radar-besoins.spec.ts`) qui constate à l'écran deux axes « non
  mesuré » et un point pour chacune des dix mesures.
- Aucun calcul de couverture modifié, aucune règle ni seuil. Aucune
  migration. Lève la porte 3 au déploiement.
