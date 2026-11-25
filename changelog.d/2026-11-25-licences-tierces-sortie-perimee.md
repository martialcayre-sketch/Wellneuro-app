### Mentions tierces : le fichier d'un build précédent ne survit plus à un refus du plugin (2026-11-25)

Quand `PluginLicencesTierces` (`web/scripts/licences-tierces.mjs`) refuse
d'émettre — liste incomplète, le build rougit —, il retire désormais le
`public/licences-tierces.txt` qu'un build précédent avait laissé : en local,
`next start` aurait continué de le servir, décrivant un autre bundle (reste P2
de la revue du lot `licences-tierces-bundle`, sans effet en CI ni sur
Scalingo, où le clone est neuf). Banc : `licencesTierces.test.ts` (un fichier
périmé, une compilation refusée, le fichier absent ; rouge sans le correctif).
L'empreinte du plugin figée par `resolutionImports.guard.test.ts` est ajustée :
le changement ne touche ni `normalModuleFactory`, ni `contextModuleFactory`, ni
`compiler.options`, ni aucun crochet de résolution. Hors périmètre : le graphe
de détection, les exclusions, `next.config.mjs`.
