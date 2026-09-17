### Le catalogue de conduites passe d’une à trois lignes, et la relecture des sources entières complète six désignations (2026-09-17)

Les deux lignes que `D-224` avait retenues le matin — `insomnie_depression` et
`insomnie_anxiete` — sont attestées (`D-227`). Le périmètre signé passe d’une
ligne et deux claims à trois lignes et quatorze claims ; `dateValidation` et
`shaPerimetre` sont remplacés, pas complétés, parce qu'un périmètre se hache en
entier.

**La consigne de `D-224` a été appliquée avant d'écrire** : chaque claim a été lu
en production, et les trois sources concernées ont été lues ENTIÈRES plutôt qu'aux
seuls identifiants proposés. Les six désignations de la surface se sont révélées
exactes — et **six claims de plus ont été trouvés** :

- une interdiction explicite que la surface ne citait pas (`WN-CL-0315-004`) ;
- la **levée partielle** d'une interdiction de prescription, qui vivait deux
  claims plus loin (`WN-CL-0316-029`) : désigner l'interdiction seule aurait
  affiché au praticien une défense sans son exception, dans un outil qui prescrit
  des compléments alimentaires ;
- la règle d'ordre de prise en charge cadrée exactement sur le tableau de la
  ligne anxiété (`WN-CL-0316-016`) ;
- les deux claims **prescriptifs** de `WN-SRC-0318` qui nomment chacun leur
  tableau (`WN-CL-0318-018`, `WN-CL-0318-023`), analogues de celui qui avait
  renforcé la ligne déjà signée.

`WN-CL-0320-002`, écarté le matin de la ligne qui se déclenche sur l'IRLS, entre
là où il est juste : il fonde l'emploi du HAD, donc l'instrument de ces deux
lignes-ci.

**La ligne dépression reçoit un `raccourciAssume` que la surface ne prévoyait
pas** : son déclencheur lit une bande du HAD quand ses claims fondent l'indication
sur la dépression constatée. Les trois lignes déclarent désormais ce pas.

Contrat SQL de fraîcheur : douze paires de plus, `exige_prescriptif = false`
inchangé — arbitrage désormais **vérifié** plutôt que prévu, cinq des quatorze
claims étant descriptifs. Aucun écran ne change ; le catalogue n'a toujours aucun
appelant de production.
