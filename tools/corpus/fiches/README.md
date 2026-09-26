# Fiches d'assiette — l'adaptation hors ligne des Fiches MY

Lot 5 de `D-251`. L'outil adapte pour le patient la Fiche MY de chaque assiette
d'indication (`WN-SRC-0296 → 0307`), puis dépose l'adaptation en base comme
**brouillon**. La validation reste un acte du responsable, posé dans
l'application (lot 6), jamais ici (`DC-16`).

**Aucun texte de fiche n'entre au dépôt**, qui est public (`D-251` §4). Les
sorties vivent sous `~/.wellneuro/corpus/fiches/<sourceId>/`, et le terminal
n'imprime que des comptes, des codes et des chemins.

## Prérequis

- Une fois, les SDK : `npm --prefix tools/corpus ci`.
- Le snapshot et l'extraction de la fiche :
  - `~/.wellneuro/corpus/manifest.json`, pour l'empreinte du PDF ;
  - `~/.wellneuro/corpus/extracted/<sourceId>/`, pour `canonical.md` et les
    pages.
- L'instantané local des claims :
  `~/.wellneuro/corpus/claims/draft-LOT_004_2026-07-25.json` (`--claims` pour
  en nommer un autre).
- Les clés, dans `web/.env.local` : `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, et
  pour déposer, `RAG_INTERNAL_SECRET`.

Toutes les commandes se lancent **depuis la racine du dépôt**. Le hook d'alias
résout `@/` depuis le répertoire courant.

## 1. Adapter — `augmenter.mjs`

```bash
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/fiches/augmenter.mjs [--source WN-SRC-0300,WN-SRC-0297]
```

Sans `--source`, l'outil traite les sept fiches des assiettes choisissables
(`D-251` §10). Pour chaque fiche :

1. **Entrées vérifiées.**
   - L'empreinte du PDF est recalculée et doit égaler celle du manifeste.
   - Le nombre de pages extraites doit égaler le nombre de marqueurs de
     `canonical.md`.
   - Chaque claim de l'instantané doit redonner son empreinte.
   - Les réserves de sécurité de l'assiette viennent de
     `clesSecuriteDeLAssiette`, la même fonction que le serveur.
2. **Rédaction.** Sonnet rédige sous `consignes/redaction.md`.
   - Le texte source envoyé est `canonical.md` **entier**, marqueurs compris :
     c'est la lecture B (transcription par vision), pas le texte brut du PDF.
   - Aucune donnée patient n'entre dans la consigne.
3. **Contrôles.** Le contrat du lot 4 (`lireBrouillonFiche`) et les contrôles du
   lot 2 (`controlerFiche`) sont **importés de `web/src`**, jamais recopiés. Une
   anomalie arrête la fiche avant toute contre-lecture. Ce que ces contrôles
   vérifient :
   - un verbatim se retrouve dans **une seule** ligne ou cellule de la source,
     balisage retiré ;
   - chaque nombre, et chaque nom à chiffre (« oméga-3 »), existe dans la
     source ou dans un claim cité ;
   - le texte patient ne porte ni balisage ni marqueur ;
   - aucun mot proscrit.
4. **Contre-lecture.** GPT relit chaque élément sous
   `consignes/contre-lecture.md`, **dans son contexte** : un bloc sous le titre
   de sa section, un titre avec ses blocs. Un désaccord ou un doute exclut
   l'élément, **sans repêchage** :

   | Élément refusé | Effet |
   | --- | --- |
   | bloc | exclu |
   | titre de section | section exclue |
   | section vidée | exclue |
   | précaution | **la fiche échoue** : une réserve ne part jamais tronquée ni absente (`D-227` §3) |
   | titre de la fiche | la fiche échoue |

   Une contre-lecture **incomplète** fait échouer la fiche entière : un appel
   en erreur, une réponse coupée ou un verdict illisible ne vaut ni accord ni
   refus. Au plus 4 appels partent à la fois.
5. **Sections amputées relues entières.** Une section qui a perdu un bloc
   repasse en contre-lecture comme un tout : un bloc gardé ne doit pas avoir
   perdu la borne ou la condition que portait son voisin exclu. Un refus exclut
   la section.
6. **Contrôles rejoués** sur la fiche retenue, puis écriture :
   - `<horodatage>-brouillon.json` : exactement ce que la route recevra ;
   - `<horodatage>-revue.json` : ce qui a été exclu et pourquoi, ou les
     anomalies d'un échec.

Les modèles se changent par `WN_FICHES_CLAUDE_MODEL` et
`WN_FICHES_OPENAI_MODEL`. Par défaut : `claude-sonnet-5` et `gpt-5.4`. Leurs
noms partent avec le brouillon.

## 2. Contrôler puis déposer — `deposer.mjs`

```bash
# contrôle seul, sans réseau
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/fiches/deposer.mjs --validate ~/.wellneuro/corpus/fiches/WN-SRC-0300/<…>-brouillon.json

# dépôt : la cible s'écrit en toutes lettres
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/fiches/deposer.mjs --cible https://app.wellneuro.fr ~/.wellneuro/corpus/fiches/WN-SRC-0300/<…>-brouillon.json
```

- **Contrôles rejoués.** Le contrat et les contrôles repassent sur le fichier
  tel qu'il est : un brouillon retouché à la main ne part pas sans eux.
- **La cible.** `--cible` est **obligatoire** et n'est jamais lue dans
  l'environnement. Hors de la machine locale, `https` est exigé, et une
  redirection est refusée.
- **Les rapports.** Ils s'écrivent à côté du brouillon (`…-controles.json`,
  `…-refus.json`), jamais par-dessus, quel que soit son nom.
- **Ce que tranche la route.** La route du lot 4 revérifie tout, et tranche
  seule le statut VALIDE des claims, que l'instantané local ne connaît pas.
  - En cas de refus, le détail s'écrit à côté du brouillon
    (`…-refus.json`).
  - Un dépôt identique rejoué rend `BROUILLON_INCHANGE`.

## La consigne versionnée

`versionConsigne` vaut `fiche-assiette-v1+<empreinte des deux consignes>`.
L'empreinte est épinglée dans `lib/consigne.mjs` et gardée par
`lib/consigne.test.mjs`. Changer un octet d'une consigne impose d'augmenter
`VERSION_CONSIGNE`, puis d'épingler la nouvelle empreinte. L'outil refuse de
tourner sinon.

## Ce que l'outil ne voit pas

- **Le statut VALIDE des claims.** Seule la production le connaît, et la route
  refuse un claim qui ne l'est plus.
- **Ce que le contrôle machine ne lit pas.** Un nombre en lettres, un sens
  déplacé, une population élargie, une précaution tronquée : la contre-lecture
  les cherche (liste dans `consignes/contre-lecture.md`), et **la relecture
  intégrale du responsable** reste la dernière porte (`D-195` §1).
- **Le contenu des figures non transcrites.** Le relecteur ouvre
  `extracted/<sourceId>/png/` pour ces pages.

## Après un dépôt

Le passage `rightsStatus: verified` de la notice se fait **notice par notice**,
au dépôt réel de sa fiche (`D-251` §2). C'est une modification de
documentation, séparée de l'outil.

## Bancs

`lib/*.test.mjs` tournent avec les autres bancs du corpus
(`scripts/run-certify-bancs.sh`, T1 et CI) :

- l'assemblage ;
- la consigne épinglée ;
- les contrôles ;
- les entrées, sur un corpus synthétique en dossier temporaire ;
- le chargement du **vrai** contrat et des **vrais** contrôles par le hook
  d'alias (`chargement-web.test.mjs`).

Ces bancs n'emploient que du texte synthétique et n'appellent aucun modèle.
