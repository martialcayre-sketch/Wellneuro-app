### Certification corpus — rapatriement Drive et banc SOURCE ↔ SERVI (LOT-02/03) (2026-07-25)

La chaîne de certification des questionnaires est complète de bout en bout : du
PDF sur Drive jusqu'à un rapport de divergences opposable.

**Rapatriement** — `tools/corpus/snapshot/fetch-drive.mjs` comble le maillon
manquant : `snapshot.mjs` appariait des fichiers déjà rapatriés sans savoir les
télécharger. Le nouveau script descend un dossier Drive en **lecture seule**,
écrit sous `~/.wellneuro/corpus/drive-dump/`, et n'écrit ni n'affiche aucun
Drive ID. Le nom de fichier est conservé à l'identique : c'est la clé de
jointure avec le `title` des notices. Téléchargement en fichier partiel puis
renommage atomique, pour qu'un snapshot ne voie jamais un PDF tronqué.

**Banc de certification** — `tools/corpus/certify/` compare ce que dit la
source à ce que sert l'application. Deux modèles transforment indépendamment le
verbatim en spécification JSON, **sans accès au catalogue** ; une divergence vue
par les deux est confirmée, vue par une seule elle reste à confirmer, et si une
lecture échoue **rien** n'est confirmé. Les bornes de score ne sont pas lues
dans `maxTotal` : elles sont obtenues **en exécutant `calculateScore`** sur les
jeux de réponses extrêmes — une borne déclarée peut mentir, une borne exécutée
non.

Le comparateur est un module pur couvert par 27 cas (`npm run certify-check`,
au CI) qui prouvent qu'il échoue quand il doit échouer **et qu'il se tait quand
il doit se taire** : une inversion matérialisée dans la clé de réponse (cas
PSS-10, où « Jamais » vaut 5 aux items positifs) n'est pas une divergence. Ce
cas a d'abord produit un faux positif ; le comparateur détecte désormais aussi
l'inversion **partielle**, plus trompeuse qu'une absence totale.

Le chargement du catalogue TypeScript passe dans `scripts/lib/charger_catalogue.js`,
partagé avec le garde `check_questionnaire_certification.js` : le banc compare
au catalogue réellement servi, pas à une copie.

**Constats du pilote** (PSQI, Berlin, MFI-20, PSS-10 témoin) — aucune correction
appliquée, les arbitrages restent au praticien. Le PSS-10 ressort **sans aucune
divergence**. Le MFI-20 en accumule trois critiques : cotation 0-4 au lieu de
1-5, **dix items que la source impose d'inverser et qui ne le sont pas**, et
trois bandes d'interprétation alors que la source écrit qu'aucun barème global
n'existe. Le PSQI sert 18 items pour 24 en source. Le Berlin est conforme sur
ses items — l'écart « 9 items au lieu de 10 » supposé jusqu'ici n'existe pas
dans la source du cabinet.

Huit notices (`WN-SRC-0392` à `WN-SRC-0399`) entrent au registre des sources
sous un corpus `INSTRUMENTS_CABINET`, et les quatre instruments pilotes passent
de `repere` à `source_obtenue`. Aucun changement clinique, aucun scoring
modifié, aucune migration.
