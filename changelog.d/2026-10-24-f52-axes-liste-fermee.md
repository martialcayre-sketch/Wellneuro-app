### Référentiel d'axes biologiques : la cible `axe` fermée sur dix codes (F52, D-348)

- Migration seule : un CHECK ferme `cible_code` sur les dix codes de D-348 §2
  quand `cible_type = 'axe'`. Aucune ligne écrite ; la table des liens reste
  vide jusqu'à F79. Les autres cibles ne changent pas, `schema.prisma` non
  plus (un CHECK n'est pas modélisé par Prisma).
- Contrat SQL négatif `biology_axes_v1_negatif.sql`, joué au CI et en T3 :
  la liste en base est exactement celle de D-348 §2, les dix codes entrent,
  un axe inconnu, préfixé, mal casé ou vide est refusé par ce CHECK, et un
  lien sans claim (absent ou blanc) est refusé pour le bon motif. Le contrat
  structurel du catalogue exige la nouvelle contrainte.
- Préalable relu en production le 2026-10-24, en lecture seule : les
  cinquante fondateurs de D-348 §3 sont tous `VALIDE`, actifs, non
  supplantés, non prescriptifs, typologie `déclaré`, en une seule version ;
  0 ligne dans `biology_analyte_links`.
