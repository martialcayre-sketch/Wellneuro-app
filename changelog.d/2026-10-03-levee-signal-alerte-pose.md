### Levée du blocage par signal d'alerte : drapeau posé en production (`D-257`) (2026-10-03)

`WN_LEVEE_ADRESSAGE` est posé en production (build `dfe28cb`, conteneurs web
recréés, valeur relue par conteneur) : une lettre d'adressage consignée lève
désormais, signal par signal, l'abstention qu'elle couvre. Constaté à l'écran
sur le premier dossier adressé, dont le blocage est levé. Une première annonce
de pose s'était révélée fausse — la variable était absente — et la relecture par
`env` et par conteneur l'a établi avant tout correctif de code.
