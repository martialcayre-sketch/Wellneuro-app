# Alliance 6.0-A — clôture de campagne, constat du gate, et ce qu'on en a fait

Date : 2026-08-23 · Campagne close · `D-092`, `D-093`.

## Ce que la campagne laisse

Six lots mergés le jour de leur ouverture : les cinq tables (#748), l'EVA sans
interprétation (#750, `D-088`), l'objectif négocié (#754), « ce qui compte »
(#755), la synthèse de compréhension et son désaccord (#757, `D-090`), l'écran
du dossier à deux voix et la ratification (#760, `D-092`). Une seule migration,
au LOT-01, constatée par conteneur.

**Le dossier à deux voix est ouvert en production.** Les trois drapeaux —
`WN_CE_QUI_COMPTE`, `WN_COMPREHENSION`, `WN_DOSSIER_DEUX_VOIX` — sont posés, et
le build servi les porte : les trois routes portail répondent **401 et non 503**
sans session, ce qui est la preuve que le drapeau est vivant dans le build (le
piège `D-071` est évité, le déploiement `561e66ed` étant postérieur au merge).

## Le constat du gate — ce qu'il dit, et ce qu'il ne dit pas

Fait le 2026-08-22 depuis un conteneur one-off, en lecture seule : **les cinq
tables de l'alliance sont vides** en production — zéro ratification, zéro
désaccord, zéro synthèse publiée, zéro objectif, zéro entrée.

Le gate structurel est donc constaté. Il ne vaut **ni constat d'usage réel**, ni
activation élargie. Et le zéro s'explique par l'absence de `WN_DOSSIER_DEUX_VOIX`
au moment du constat, **pas** par l'extinction des trois drapeaux — le motif que
`D-092` avançait initialement était faux, sa conclusion juste.

## Le fait qui a changé la décision d'activation

**Le gate n'a jamais été un drapeau.** `tablePrioritesSignee()` rend `true`
depuis le 2026-08-15 (`D-061`, re-signée le 16 par `D-067`) ;
`chaineC1.ts:364` ne produit des candidats que sous ce verrou, ouvert ;
`WN_ENABLE_ORIENTATION_NNPP2` est allumé. Le mécanisme était **déjà vivant** :
« activer » signifiait s'autoriser à s'en réclamer, pas basculer quelque chose.

Deux faits ont borné `D-093` :

1. **Le classement n'est couvert par aucune ligne signée.** Producteur de
   candidats, ordre de présentation et textes `LIMITATION_*` vivent dans
   `chaineC1.ts`, hors du SHA ; l'ordre d'évaluation des motifs d'abstention est
   « mécanique, mais non relu » — le fichier le dit lui-même. Or l'ordre EST la
   recommandation. La dette bloquante de `D-054`, elle, est bien close par
   `D-062`.
2. **Aucun patient n'a encore répondu.** La capacité de contredire est ouverte,
   elle n'est pas exercée.

`D-093` ouvre donc en **périmètre restreint et observé** : `PAT006`, `PAT007`,
`PAT017` (par identifiant — jamais un nom ni une adresse dans le dépôt),
relecture praticien de chaque recommandation avant remise, sortie conditionnée à
**une réponse patient réelle ET** un bilan écrit sur le classement, borne de six
semaines au bout desquelles **le périmètre se referme**. Une absence de constat
n'est pas un feu vert — `DC-24` appliqué à la gouvernance.

## Ce qui reste ouvert

- **Précondition non levée** : aucun des trois dossiers ne porte d'objectif
  négocié. Sans objectif, rien à ratifier, donc la condition de sortie ne peut
  pas se produire. Les objectifs se rédigeront au fil du développement — la
  fenêtre des six semaines court néanmoins depuis le 2026-08-23.
- **La borne de trois dossiers est une consigne, pas un verrou** : rien dans le
  code ne la tient. Elle repose sur la relecture praticien avant remise.
- **Condition nommée de la généralisation** : faire entrer le classement, les
  textes `LIMITATION_*` et l'ordre d'évaluation des motifs d'abstention dans un
  périmètre **signé** (`DC-01`, `DC-26`).
- **Aucune cadence** sur la ratification — première écriture patient
  irréversible de la campagne, sans plafond de fréquence.
- **Rien ne prévient le praticien** qu'une ratification est arrivée : modèle
  « pull » assumé côté patient, appliqué ici au praticien. Surface non cadrée.
- **`messageJournalisable` dupliqué dans trois routes**, non factorisé.
- **E2E** : la position « drapeau éteint » n'est pas couverte — les drapeaux
  sont armés au build, la position de production n'est pas jouable dans le run.

## Deux pièges de cette clôture, à ne pas rejouer

**Un numéro de décision se réserve dans `main`, jamais dans une branche.**
`origin/main` a avancé deux fois pendant le LOT-06 ; la première a pris `D-091`,
le numéro que le lot visait. Vérifier au moment d'écrire, pas au moment de
planifier.

**Une décision écrite avant son constat doit être relue après.** `D-092` et le
fragment de changelog du LOT-06 annonçaient le constat comme « restant dû »,
parce qu'ils ont été écrits quand la lecture de production était impossible.
Une fois le constat fait, le registre disait deux choses opposées à deux
endroits — et le registre des décisions, lu seul, laissait conclure que le gate
était resté ouvert. Corrigé par deux paragraphes datés qui disent explicitement
qu'ils décrivent deux moments.

**Et une hygiène** : les commandes envoyées en conteneur one-off sont
**recopiées telles quelles dans les logs Scalingo**. Ne jamais y mettre d'e-mail
ni d'identité — un dossier réel se désigne par son identifiant, en base comme
au dépôt.
