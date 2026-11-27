# Fiches d'usage — la rédaction hors ligne du besoin 2

Lot BP-12a (`D-314` §4), sur le patron de `tools/corpus/fiches/`. L'outil
rédige le texte des fiches d'usage, rubrique par rubrique, et les libellés de
leur vocabulaire (hypothèses, populations d'usage), puis les dépose en base
comme **brouillons**. La validation reste un acte du responsable, rubrique
par rubrique et libellé par libellé, posé dans l'application (rayon « Fiches
d'usage » de la page « Biologie fonctionnelle », `D-314` §9), jamais ici
(`DC-16`).

**Aucun texte de fiche ni libellé n'entre au dépôt**, qui est public (`D-251`
§4). Les sorties vivent sous `~/.wellneuro/corpus/fiches-usage/<identifiant>/`,
et le terminal n'imprime que des comptes, des codes et des chemins.

## Avant le premier envoi

- **La structure doit déclarer des fiches.** Elle est livrée vide
  (`web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts`) : sans fiche ni terme,
  l'outil ne rédige rien.
- **Les deux consignes se relisent par le responsable.** Elles disent ce
  qu'un modèle a le droit d'écrire ; elles ne définissent pas le contenu
  clinique des rubriques, que seuls les claims portent.
- **Le document TRUST** (`docs/TRUST_IA_FICHES_USAGE.md`) nomme les
  fournisseurs ; la mention au dossier RGPD (rubrique 6) est posée.

## Prérequis

- Une fois, les SDK : `npm --prefix tools/corpus ci`.
- L'instantané local des claims (`--claims` pour en nommer un autre que
  celui de `tools/corpus/fiches/lib/entrees.mjs`). Chaque claim épinglé par la
  structure doit y figurer, à sa version, et redonner son empreinte.
- Les clés, dans `web/.env.local` : `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, et
  pour déposer, `RAG_INTERNAL_SECRET`.

Toutes les commandes se lancent **depuis la racine du dépôt**.

## 1. Rédiger — `rediger.mjs`

```bash
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/fiches-usage/rediger.mjs [--fiche FU_…[,…] --designations <fichier>] \
  [--terme HYP_…|POP_…[,…]] [--claims <instantané>]
```

Sans `--fiche` ni `--terme`, l'outil traite toutes les fiches et tous les
termes de la structure. Pour chaque fiche :

1. **Entrées.** La fiche de la structure (identifiants seulement) et les
   claims qu'elle épingle, lus dans l'instantané. Un claim absent arrête la
   fiche. Aucune donnée patient n'entre dans la consigne.
2. **Rédaction.** Claude rédige toutes les rubriques attendues, sous
   `consignes/redaction.md`. Une réponse qui n'a pas exactement ces
   rubriques arrête la fiche.
3. **Contre-lecture.** GPT relit chaque rubrique, dans le contexte des
   autres, sous `consignes/contre-lecture.md`. Au plus 4 appels à la fois.
4. **DC-03** (`D-266` §7). `verifierDc03`, importé de `web/src`, refuse tout
   identifiant ou nombre absent de ce que le rédacteur a reçu.
5. **Tout ou rien.** Un désaccord, un échec technique ou un DC-03 négatif sur
   UNE rubrique fait échouer la fiche : une version sans l'une de ses
   rubriques ne serait jamais valide. Le rapport de revue dit laquelle et
   pourquoi.
6. **Contrat et structure**, importés de `web/src`, rejoués sur le brouillon
   retenu, puis écriture de `<horodatage>-brouillon.json`.

Un libellé suit le même chemin, sur les claims des fiches qui citent son
terme. Les modèles se changent par `WN_FICHES_USAGE_CLAUDE_MODEL` et
`WN_FICHES_USAGE_OPENAI_MODEL` ; leurs noms partent avec le brouillon.

## 2. Contrôler puis déposer — `deposer.mjs`

```bash
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/fiches-usage/deposer.mjs --validate <brouillon.json>…
node --env-file=web/.env.local --import ./tools/corpus/lib/register-alias.mjs \
  tools/corpus/fiches-usage/deposer.mjs --cible https://app.wellneuro.fr <brouillon.json>…
```

Le contrat et le contrôle contre la structure repassent sur le fichier tel
qu'il est. `--cible` est obligatoire, `https` hors de la machine locale, sans
redirection. Une version part vers `/api/internal/fiches-usage/ingest`, un
libellé vers `/api/internal/fiches-usage/libelles/ingest`. Un dépôt identique
rejoué rend `BROUILLON_INCHANGE`.

## La consigne versionnée

`versionConsigne` vaut `fiche-usage-v16+<empreinte des deux consignes>`,
épinglée dans `lib/consigne.mjs` et gardée par `lib/consigne.test.mjs`.

Depuis la v2 (`D-501`), le message d'une fiche porte ses cinq axes signés,
en identifiants, au rédacteur comme au contre-lecteur. Les claims sous
réserve d'indication (`D-465` §3, `D-498`), lus dans
`web/src/lib/fiches-usage/reserveIndication.ts`, y portent la marque
`[SOUS RÉSERVE D'INDICATION]`. La consigne dit ce que les axes et la marque
interdisent, et ce que nomme le libellé d'une hypothèse (`D-477` §2).

Depuis la v3 (`D-501` §5), une fiche ne se rédige qu'avec ses
**désignations approuvées**, passées par `--designations <fichier>` (local,
hors dépôt) : `{ "termes": { "POP_…|HYP_…": "<libellé validé>" },
"analytes": { "BIO_…": "<libellé du catalogue>" } }`. Il est tiré de la
production en lecture seule, par conteneur : les libellés **validés** sur
l'empreinte de la structure en cours, et les libellés de `biology_analytes`.
L'usage décisionnel se désigne par la table de `D-266` §3, dans le code.
Une fiche dont la population, une hypothèse ou un analyte n'a pas de
désignation est refusée avant tout appel : un identifiant seul ne fonde
aucun sens. Le rédacteur peut refuser une fiche dont les claims contredisent
le cadre signé (`refus_redacteur`).

Depuis la v4 (`D-501` §7), la rubrique « question » se compose des seules
désignations approuvées et de la réserve qu'impose le statut d'usage : elle
pose la question d'usage sans l'affirmer, et la contre-lecture la juge
fidèle sans claim de l'usage. Tout autre élément y est un fait.

Depuis la v5 (`D-501` §8), la qualification d'état fonctionnel que `D-477`
§2 impose au libellé d'une hypothèse est jugée comme une forme du cadre
signé, pas comme un fait : le libellé reste fidèle sans claim qui la nomme,
pourvu qu'il désigne le nutriment et le sens que décrivent les claims. Tout
autre élément y est un fait. La rédaction d'un libellé lit aussi une réponse
rendue nue, sur une ligne, sans l'objet JSON demandé (`lireReponseLibelle`).

Depuis la v6 (`D-501` §9), la rubrique « question » s'écrit en une phrase
interrogative. Aucune phrase ne dit ce que les sources taisent, hors la
phrase d'absence pour une rubrique non documentée. La rubrique « population »
ne nomme que la population d'usage. L'objet de chaque rubrique, repris du
cadrage v3 §3.2, est donné au rédacteur comme au contre-lecteur.

Depuis la v7 (`D-501` §10), un fait se restitue avec toutes les conditions
que son claim lui attache, ou ne s'écrit pas ; aucune phrase n'ajoute de
commentaire, de comparaison ou de conséquence aux claims, et les axes ne
s'énoncent pas comme des faits. Un fait ne s'écrit que dans la rubrique dont
il relève. La réserve de la « question » est celle du statut de la fiche, et
une fiche sans analyte y désigne la mesure par « cet examen ».

Depuis la v8 (`D-501` §11), la rubrique « population » nomme toujours la
population d'usage par sa désignation, même sans claim, et ne prend jamais
la phrase d'absence. Les quantités se jugent selon leur fonction : une
teneur de composition et un seuil qui borne une observation se restituent
avec leurs conditions ; une quantité à prendre, une fréquence, un
fractionnement ou une durée de prise ne s'écrivent pas. Aucune spécialité
ni posologie ; la catégorie « médicaments » est admise dans un fait
descriptif de sécurité ou de comparaison. Un claim fourni n'a pas à être
employé : une rubrique n'écrit que les claims qui portent sur son objet.

Depuis la v9 (`D-501` §12), un fait auquel son claim attache une quantité
de prise ne s'écrit ni entier, ni privé de cette quantité. Une rubrique dont
tous les faits sont ainsi empêchés prend une phrase fixe de quantité,
distincte de la phrase d'absence. La « question » admet les seuls mots « le
dosage de » devant la désignation de l'analyte. La phrase d'absence s'écrit
si, et seulement si, aucun claim fourni ne porte sur l'objet de la rubrique,
dont la v9 précise le sens pour « interpretations » et
« resultats_consequences ». La contre-lecture examine alors tous les claims
fournis.

Depuis la v10 (`D-501` §13), un niveau d'apport qu'une source déclare sans
problème de sécurité est une limite supérieure de sécurité, même exprimé en
quantité consommée : il s'écrit en constat, attribué à sa source, avec sa
population, ses exceptions et ses réserves. Une mention de dose ou d'apport
sans valeur chiffrée n'est pas une quantité de prise ; la clause de doute ne
vise plus qu'une valeur chiffrée. Sous « preuves_limitees », un claim qui
recommande lui-même l'usage de l'examen s'écrit attribué à sa source, la
phrase se terminant par « , mais cet usage n'est pas établi. ». Deux critères
concrets disent quand un claim porte sur « resultats_consequences » (il nomme
un résultat possible de l'analyte) et sur « limites » (il énonce une limite
de l'examen ou de son marqueur).

Depuis la v11 (`D-501` §14), un moment de prise est une quantité de prise ;
la forme attribuée et réservée de la v10 vaut dans toute rubrique,
« precautions » comprise ; une limite de la littérature sur un supplément ou
une option ne porte pas sur « limites » ; un argument de causalité ne porte
pas sur « surveillance_arret » ; dans « resultats_consequences », un résultat
se nomme sans être interprété, et sous « preuves_limitees » aucune
conséquence décisionnelle ne s'y écrit.

Depuis la v12 (`D-501` §16), le mode « libellé » cite, des deux côtés, les
douze termes que `D-535` refuse dans le libellé d'une hypothèse, tels que
les tient `web/src/lib/fiches-usage/registreLibelleHypothese.ts` : un mot qui
en contient un tombe sous lui, et le libellé se reformule en gardant le
nutriment et le sens bas. La liste ne vise pas les populations. Le banc v12
relit le registre du code : un terme ajouté ou retiré d'un seul côté rougit.

Depuis la v13 (`D-501` §17), le rédacteur relit son libellé contre la liste
avant de répondre, et le message d'une hypothèse se termine par ce rappel,
après les claims. Surtout, l'outil applique au libellé d'une hypothèse le
registre du code (`termesHorsRegistre`, `D-535`) **avant** la contre-lecture :
un terme écarté vaut une seule demande de correction, dans la même passe, avec
la réponse entière du rédacteur (réflexion comprise) ; si le terme reste, la
passe échoue (`registre_d535`) sans appel au contre-lecteur. Les populations
ne passent pas par ce garde.

Depuis la v14 (`D-501` §18), trois règles se précisent des deux côtés, après
des refus stables sur les fiches du zinc : une phrase de « interpretations »
nomme à la fois un résultat de l'examen et ce qu'il permet ou interdit de
conclure, sinon elle n'y entre pas (et la phrase d'absence n'est pas un
défaut quand aucun claim ne relie un résultat à une conclusion) ; un mot de
fréquence ou de régularité d'une prise, et un apport situé par rapport à une
référence, sont des quantités de prise ; dans « surveillance_arret », un
contrôle biologique dit utile, conseillé, fréquent ou habituel est un usage,
qui s'écrit attribué et réservé ou pas du tout. Le §19 s'y joint : dans « precautions », pour une
fiche dont le marqueur sécurité / admissibilité est « oui », une condition
propre à une spécialité nommée s'écrit attribuée à sa source avec toutes ses
restrictions, sans posologie, et une interaction attribuée nomme ses
principes actifs, avec le délai entre prises qu'elle porte.

La v15 (`D-501` §20) précise, des deux côtés : dans « interpretations »,
seul l'analyte de la fiche est un résultat de l'examen (pas un déficit ni un
statut du nutriment), et la limite que le claim attache au résultat s'écrit
avec lui ; la « question » emploie toujours « permet-il de » suivi de
l'usage ; la « population » est la seule désignation ; une limite des
apports de référence n'est pas une limite de l'examen ; l'exception du §19
exclut aussi une consigne de posologie sans valeur et les effets
indésirables ou surdosages d'une spécialité nommée. Côté contre-lecture, une
sous-population gardée du claim n'est pas une restriction de la désignation.

La v16 (`D-501` §21) précise, des deux côtés : la « question » relie ses
désignations par une liste fermée de mots de liaison (« chez », « pour
l'hypothèse de », « de » après « confirmer une hypothèse », la virgule) ;
dans « interpretations », le résultat, sa conclusion et sa limite
s'écrivent dans une même phrase, et une limite générale du marqueur
relève de « limites » ; un fait dont le claim nomme des populations hors
de la population d'usage s'écrit pour celles qui y sont comprises
seulement, sauf une population que nomme une condition de sécurité ou
d'admissibilité, qui se garde ; une indication d'une spécialité nommée
énoncée pour elle-même ne relève pas de l'exception du §19, mais celle qui
restreint une condition admise s'écrit avec elle. Côté rédaction seulement, la population que le claim
attache au résultat reste dans la phrase d'« interpretations ».

## Ce que l'outil ne voit pas

- **Le statut VALIDE des claims** : seule la production le connaît, et le
  contrat de fraîcheur des tables signées le garde.
- **Ce que le contrôle machine ne lit pas** : un nombre en lettres, un sens
  déplacé, une population élargie. La contre-lecture les cherche, et **la
  relecture intégrale du praticien** reste la dernière porte (`D-195` §1).

## Bancs

`lib/*.test.mjs`, joués par `scripts/run-certify-bancs.sh` (T1 et CI) : le
cœur pur, la consigne épinglée, et le chargement du **vrai** contrat, du
**vrai** contrôle et du **vrai** DC-03 par le hook d'alias. Texte synthétique
seulement ; aucun modèle appelé.
