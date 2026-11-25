### Gardes : commentaires de `dansLeDepot` alignés sur la copie du client Prisma (2026-11-25)

Reste de la partie 11 d'`autonomie-pieges-restes` (#2305). Les commentaires de
`dansLeDepot` et de ses contre-épreuves, dans
`web/src/lib/bio-parcours/outillageBancs.guard.test.ts` et
`web/src/lib/atelier-bibliotheque-options/cockpit.guard.test.ts`, disaient
encore que le contrôle de fusion pose `web/src/generated/prisma` en lien
symbolique. Il le copie depuis #2305 : les commentaires le disent, et
présentent la compensation comme valant pour tout arbre où le client serait
relié. Commentaires seulement ; la compensation, les contre-épreuves et les
noms de cas sont inchangés.
