### ba : « Validé par votre praticien le … » en tête de la page du protocole servi (D-369, H35)

- Lot de code de la lettre ba ([[D-369]] §1) : la page du protocole servi au
  portail porte en tête, une fois, « Validé par votre praticien le 24 octobre
  2026 » — la date de l'approbation de diffusion de la version servie, en
  toutes lettres, au jour civil de Paris (« 1er » le premier du mois). Une
  nouvelle version approuvée porte sa propre date ([[D-368]] §4).
- La route `api/portail/protocole` sert `valideLe` (instant ISO de
  l'approbation) seulement quand une vue est servie ; rien sur un protocole
  indisponible ni sans protocole. Le texte vit dans un module pur
  (`lib/portail/texteMentionValidation.ts`), dont le banc relit la citation de
  D-369 §1. Lue hors du détail replié, et en fin de cycle aussi.
- Sans drapeau ni migration (D-369 « Ne touche pas ») ; hors file C, constat
  par lecture sur la page servie (§2). Le badge des documents remis
  (`lib/documents/rendu.ts`) est inchangé.
