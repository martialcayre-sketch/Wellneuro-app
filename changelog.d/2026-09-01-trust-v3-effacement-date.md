### Le centre d'information patient date l'effacement et la signature HDS : v3 du document confidentialité (2026-09-01)

La v2 promettait aux patients un effacement futur des anciens hébergeurs
(« conservés temporairement… puis vos données y seront effacées, avec
preuve ») et décrivait une période transitoire « moins protégée » en attente
du contrat HDS. Les deux faits sont advenus : annexe HDS signée le
2026-08-30 (`D-121`), Vercel et Supabase définitivement fermés le 2026-09-01
avec preuve d'effacement consignée au registre RGPD (`D-080`/`D-120`).

Conformément à l'immuabilité des versions publiées, la v2 reste intacte et
une **v3** du document `donnees_confidentialite` porte le nouvel état : la
période transitoire est déclarée close, l'effacement est daté avec renvoi à
la preuve, et la liste des prestataires ne nomme plus que les sous-traitants
réels (les anciens hébergeurs restent racontés dans la section
« Où sont hébergées vos données », l'historique des versions garde la v2
consultable). `gouvernance.ts` aligne la ligne Vercel/Supabase sur le même
constat. Hash de version verrouillé par `registre.test.ts`, liste des
documents attendus portée à huit.
