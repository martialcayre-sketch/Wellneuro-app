### Outillage — les citations s'ancrent sur du texte, et le classificateur E2E cesse de se taire (`D-100`)

- **Une citation de la doctrine s'ancre désormais sur du TEXTE**, pas sur un
  numéro de ligne : `[« texte exact »](chemin)` ou `` [`symbole`](chemin) ``, le
  numéro devenant une commodité que rien ne vérifie. Le motif est mesuré — le
  LOT-09 avait faussé **huit** citations d'un coup en décalant un fichier de
  onze lignes, et **toutes étaient dans les bornes** : le contrôle qu'on
  écrirait spontanément n'en aurait attrapé aucune.
- **L'ancre et son texte sont liés dans un seul lien**, jamais posés côte à
  côte. L'attribution par proximité invente des morts : la mesure de cadrage
  avait déclaré morte `drapeauxAnamnese.ts:28` en lui imputant un libellé qui
  appartenait à l'ancre **voisine**, où il figure toujours. Sur « deux citations
  mortes », il y en avait **une**.
- **Un contrôle sans arithmétique de ligne** (`wn-ancres-doctrine.mjs`, joué par
  `npm run check`) : le texte cité existe-t-il encore dans le fichier cité ?
  Quatre ancres vérifiées, **252 citations de l'ancienne forme comptées et non
  jugées** — le grandfathering est un chiffre, et une sentinelle refuse qu'il
  s'effondre en silence.
- **Un verbatim élidé ou trop court est une violation, jamais un silence.**
  Sans cela il suffirait d'élider une citation fausse pour la dispenser du
  contrôle censé refuser les élisions — c'est ce que faisait la première
  rédaction, et c'est le banc qui l'a trouvé.
- **Une ancre cite ce qui EST, jamais ce qui FUT** : le registre raconte aussi
  des états révolus, et les ancrer condamnerait à réécrire l'histoire pour faire
  taire un contrôle.
- **Le classificateur E2E se taisait pour DEUX raisons, pas une.** Outre le
  prédicat `page.goto` déjà identifié, le prédicat « journal réseau vide »
  lâchait dès qu'un test montait son décor par `page.request.post(...)` :
  l'entrée s'écrit dans le même journal, avant la navigation qui, elle, n'émet
  rien. Mesuré sur **deux artefacts réels de deux sessions distinctes** — 2 723
  octets pour une seule ligne. Le fait discriminant devient **« aucune requête
  de page »**, Playwright marquant `_apiRequest` les requêtes d'API.
- **Une trace Playwright ne peut jamais servir de fixture committée** : son
  journal réseau transporte les en-têtes complets, cookie de session compris.
  Les cas de non-régression reproduisent la forme observée, jamais l'artefact.
- Corrigé au passage : le lecteur ZIP visait la taille compressée pour délimiter
  une entrée stockée, et la reconnaissance de lien a franchi puis cessé de
  franchir les renvois `[[D-xxx]]` — une « ancre » de 51 000 caractères, trouvée
  par le contrôle sur le corpus réel.
