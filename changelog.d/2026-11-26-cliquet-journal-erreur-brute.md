### Cliquet : l'erreur d'un `catch` ne part plus en clair dans un `console.*` (2026-11-26)

Relevé en lecture seule de `web/src` (lot autonomie-pieges-restes, partie 20) :
151 appels `console.*` dans 109 fichiers recopient l'erreur de leur `catch` —
l'objet entier (10, routes internes) ou son `message` (141, dont 25 dans les
routes patient). Le message d'un `PrismaClientValidationError` recopie les
arguments de l'appel ; ces lignes vont au journal Scalingo.

Arbitrage du responsable (question `20261126-0758-d`, option C) : un cliquet.
Le banc `web/src/lib/observability/journalErreurBrute.guard.test.ts` gèle le
compte de chaque fichier dans `journalErreurBrute.cliquet.json` : le code neuf
ne l'augmente pas (il passe par `classeEtCode`, `signature`…), et un site
converti oblige à abaisser le compte ; le mode de réécriture
(`WN_CLIQUET_JOURNAL_ECRIRE=true`) refuse toute hausse. Portée : la variable du
`catch` ou du rappel `.catch()` englobant et ses champs déstructurés
(`{ message }`), jamais un nom usuel (`reason`, `raison`) ; `console['error']`
compte comme `console.error`. Limite écrite : une variable intermédiaire
(`const detail = err.message`) n'est pas suivie.
Exemption motivée par `// wn-journal-erreur-sur : <motif>` sur la ligne qui
précède. `logger.*` n'est pas compté (hors de l'option retenue). Aucun site
existant n'est modifié ; la garde stricte des fiches d'assiette (`D-251`)
reste en place.
