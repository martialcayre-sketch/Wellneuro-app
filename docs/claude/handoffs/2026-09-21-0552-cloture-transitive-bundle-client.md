# Handoff — 2026-09-21 — La clôture transitive du paquet client (D-238)

## 1. Branche et état Git

`wn-cloture-transitive-bundle-2026-09-21`, partie de `origin/main` à
`f4512705`. Aucune migration, aucun `schema.prisma`.

## 2. Objectif de la session

Fermer la réserve rapportée — non corrigée — par le lot [[D-237]] : le garde du
paquet client ne voyait que le PREMIER pas d'une chaîne d'imports, si bien que
la couche clinique atteignait le navigateur par un module voisin sans qu'un seul
spécifieur `@/lib/clinical/` figure dans un fichier client.

## 3. Ce que le lot livre

**Un module feuille** (`biology-library/vocabulaireStatuts.ts`) qui porte le
vocabulaire des statuts de panel — le type `StatutPanel` ET le prédicat
`STATUTS_PROPOSES` —, `statuts.ts` les ré-exportant. **Un garde élargi à la
clôture transitive** des imports de valeur, `export … from` compris, avec la
règle des feuilles vérifiée et non déclarée, et le CHEMIN ENTIER rapporté à
l'échec. **Une décision** et son fragment.

## 4. LE FAIT QUI COMMANDE LE LOT

Le constat avait été **rapporté par déduction** sur les imports. Il a été
**mesuré sur l'artefact**, et la mesure l'a corrigé dans les deux sens.

AVANT — chunk `app/dashboard/patients/[idPatient]/page-*.js`, **403 Ko** : les
**20 règles d'orientation sur 20**, **52 identifiants de claims**, les bornes de
comparaison (`4, 7, 10, 14, 17`), les couleurs de zone, le `sha256` de portée
module, **crypto-browserify**. Mais **pas** le texte du corpus — que le chapeau
du garde annonçait pourtant — ni la table des indications d'assiette. Et le nom
du fichier **n'est pas énumérable publiquement** : le manifeste de build public
ne le cite pas.

APRÈS — **0 règle, 0 identifiant de claim, 0 seuil, 0 crypto**, et 28 Ko de
moins (374 422 octets).

## 5. Décisions prises

[[D-238]], sept points. Les deux qui commandent : le vocabulaire voyage **en
entier** (déplacer la seule constante aurait séparé le prédicat de son
vocabulaire, ce que la doctrine d'origine interdit explicitement) ; et le garde
rapporte **la chaîne entière**, parce que le défaut tenait à un import au MILIEU
et qu'un message nommant ses deux bouts enverrait corriger le mauvais fichier.

## 6. Fichiers

**NEUF EN TOUT — TROIS NEUFS, SIX MODIFIÉS**, relus sur l'index juste avant le
commit.

**ET CE COMPTE A ÉTÉ ÉCRIT FAUX ICI MÊME**, une première fois : « sept en tout,
deux neufs, cinq modifiés », avec le handoff mis entre parenthèses au lieu d'être
compté, et une énumération de SIX modifiés sous un titre qui en annonçait cinq.
C'est la cinquième fois que ce compte est faux dans cette lignée de lots, et
toujours de la même façon : **un total écrit avant que la liste ne soit finie**.
Le seul procédé qui tienne est celui-ci — énumérer d'abord, compter ensuite, et
relire l'index, pas sa mémoire.

**TROIS NEUFS** — `web/src/lib/biology-library/vocabulaireStatuts.ts` ·
`changelog.d/2026-09-21-cloture-transitive-bundle-client.md` · ce handoff.

**SIX MODIFIÉS** — `web/src/lib/clinical/bundleClient.guard.test.ts` (le
parcours transitif) · `web/src/lib/biology-library/statuts.ts` (ré-export) ·
`web/src/components/patient-cockpit/PropositionBilanPanel.tsx` (l'import, goulot
des six chaînes) · `docs/DECISIONS.md` · `docs/claude/MATRICE_CONSOMMATION.md`
(régénérée) · `docs/claude/campagnes/FILE_ATTENTE.md` (la réserve se ferme).

## 7. Validations exécutées

- **T1 vert**, `T1-EXIT=0` lu dans le fichier redirigé.
- **T3 complet** joué sur l'état final.
- **Mesure avant/après sur l'artefact**, deux builds.
- **La matrice de consommation corrobore**, sans rien savoir du lot : deux
  sources cliniques perdent une surface cliente — corpus de synthèse 29 → 28,
  table d'indications biologiques 5 → 4.
- **UNE MUTATION, DEUX ROUGES CIBLÉS** : remettre l'import sur `courrier` fait
  rougir le cas du parcours transitif ET celui du goulot. Sauvegarde par `cp`,
  application vérifiée avant de conclure.
- **UN BUILD A ÉCHOUÉ EN CHEMIN, ET L'EXIT A ÉTÉ LU DANS LE FICHIER** :
  `BUILD-EXIT=1`, `DATABASE_URL` absente — un échec d'ENVIRONNEMENT, à la
  collecte des données de page, donc après la compilation des chunks. La mesure
  n'a pas été annoncée sur cette foi : c'est la SUBSTANCE du chunk qui a été
  vérifiée (0 règle, 0 claim, 0 crypto), pas sa taille.

## 8. Ce que le lot a trouvé au passage

**UN FAUX POSITIF INTRODUIT PUIS RETIRÉ, ÉCRIT PARCE QU'IL ATTEND LE PROCHAIN.**
Le module feuille s'appelait d'abord `statutsVocabulaire.ts`. La matrice s'est
alors mise à déclarer le panneau **consommateur DIRECT** de la table biologique,
et l'orientation à **GAGNER** une surface — l'inverse de ce que fait le lot.
Cause : `wn-matrice-consommation.mjs` rapproche module et consommateur par
**sous-chaîne** sur l'alias, et `…/statutsVocabulaire` contient `…/statuts`.
Renommé `vocabulaireStatuts.ts`. **Tout module dont le nom PRÉFIXE celui d'un
autre du même dossier fausse cette matrice** — rapporté, non corrigé : poser une
frontière de mot changerait d'autres lignes d'un document d'audit, et cela
demande son propre lot.

## 8 bis. Copilot a poussé sur la branche, et il avait raison

**LE CI N'A JAMAIS TOURNÉ** : `wn-attendre-ci` a rendu `2` avec sa cause écrite —
le commit de tête était attribué à Copilot, donc le run passe en
`action_required`. Piège connu, et la réparation est de pousser un commit réel
sous le compte du dépôt.

**MAIS SES DEUX COMMITS CORRIGENT UN VRAI DÉFAUT DU MIEN.**
`feuillesAutorisees()` mesurait « ce module n'importe rien » sur les chemins
RÉSOLUS — donc en écartant les paquets npm. `corpusSyntheseV1.ts`, dont l'unique
import de valeur est `createHash` de `'crypto'`, était donc classé FEUILLE : un
composant client aurait pu l'importer, corpus compris, **et le garde l'aurait
autorisé**. Vérifié sur pièce avant d'accepter, puis par mutation — rendre la
règle à ma version fait rougir le cas neuf, et lui seul. Neuf modules restent
feuilles ; le corpus n'en est plus.

Le défaut est le mien, et sa forme mérite d'être retenue : j'ai séparé la
détection (transitive, sur chemins) de l'exception (sur la même fonction), si
bien que **l'exception a cessé de voir ce que la détection avait appris**.

## 9. Problèmes ouverts

- **Le défaut de `mentionne()` reste ouvert** (ci-dessus). Aucun lot.
- **Douze chaînes indirectes subsistent**, toutes vers des modules FEUILLES, ce
  que le garde autorise à juste titre. Elles ne sont pas un défaut ; elles sont
  la raison pour laquelle l'exception des feuilles doit rester **vérifiée** et
  jamais déclarée — un import ajouté à l'un d'eux rouvrirait une porte.
- **Le chunk cockpit pèse encore 374 Ko.** Ce lot ferme la porte de
  `lib/clinical`, et rien d'autre : il ne prétend pas que le paquet soit sain.
- **`catalogueConduitesV1` est toujours sans consommateur** et absente de la
  matrice. Rapporté depuis [[D-237]], toujours pas corrigé.
- **Le drapeau `WN_ASSIETTES_INDIQUEES` reste POSÉ, NON CONSTATÉ** — le journal
  d'accès ne portait toujours pas la route au 2026-09-21 03:33 UTC. Le constat
  attend une SESSION praticien, pas un correctif. Consignation : PR #1205, tenue
  par une session voisine.

## 10. Prochaine action exacte

1. Commit, PR avec `--body-file`, CI par `node scripts/wn-attendre-ci.mjs <N>`
   en un seul appel bloquant.
2. **Lire la revue Copilot aux TROIS emplacements** — et la DEMANDER après
   chaque push : elle ne se relance pas seule, son aperçu le dit lui-même.
3. Merge `--squash` **avec `--subject`**, et vérifier au préalable que `D-238`
   est toujours libre : deux PR de documentation sont ouvertes (#1205, #1206).
4. Ne rien poser en production : ce lot n'a **aucun drapeau** et aucun geste
   d'exploitation.

## 11. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Base de production en **lecture seule** par conteneur détaché ; écriture par
  migration relue puis release-db approuvée. **Ce lot n'écrit rien.**
- Aucun contenu clinique du corpus au dépôt.
- **Aucun seuil ni règle touché** — le vocabulaire déplacé est quatre chaînes de
  caractères et un type.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
