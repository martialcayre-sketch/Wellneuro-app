### Bancs de garde : imports lus par le parseur et résolus (2026-11-13)

Lot `bp17-extension-bancs-garde` (file C), routé par la PR 4 de BP-17. Ce que
la garde « aucun lecteur » de la bibliothèque des options (D-480 §8) avait
reçu s'étend aux autres bancs de garde qui jugent des imports : lecture par
le parseur TypeScript (commentaire glissé, échappement, concaténation
constante, `require`, `import()`, ré-export, import latéral), résolution
comme le fait TypeScript avec les options de `web/tsconfig.json` (alias,
liens symboliques suivis), et règle commune : un import non constant ou un
nom nu qui n'est ni une dépendance déclarée ni un module natif est un lecteur
possible. La résolution est partagée (`bio-parcours/resolutionImports.ts`) ;
les verrous de configuration qui la rendent fidèle au bundler passent dans un
banc commun (`resolutionImports.guard.test.ts`), à l'identique. Vingt bancs
migrés, aucune liste admise modifiée ; chacun a été vu rouge sur une
mutation réelle que l'ancienne lecture ne voyait pas. Le parcours du parseur
sous Vitest coûtait dix fois le parseur lui-même : il est ramené à son coût
(le banc de la bibliothèque passe d'une minute à une dizaine de secondes).
