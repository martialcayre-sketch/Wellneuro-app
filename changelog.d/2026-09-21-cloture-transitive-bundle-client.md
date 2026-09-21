### La table de règles cliniques ne part plus au navigateur — le garde suivait le premier pas, pas le chemin (2026-09-21)

**Un import de quatre chaînes de caractères tirait la couche clinique entière au
paquet du navigateur.** `PropositionBilanPanel` porte `'use client'` et prenait
`STATUTS_PROPOSES` chez `biology-library/courrier`, qui le prend de `statuts`,
lequel importe `evaluerDeclencheur` et `sha256`. Le garde du paquet client ne
voyait rien : il n'accepte que les spécifieurs `@/lib/clinical/…` écrits **dans**
un fichier client, et cette chaîne-là passe par un voisin. Le défaut était en
place depuis le 2026-08-18.

**Le constat a d'abord été rapporté par déduction, puis MESURÉ sur l'artefact —
et la mesure l'a corrigé dans les deux sens.** Le chunk du cockpit patient,
**403 Ko**, portait les **vingt règles d'orientation sur vingt**, **cinquante-deux
identifiants de claims**, les bornes de comparaison, les couleurs de zone, le
`sha256` de portée module et **crypto-browserify**. En revanche le **texte du
corpus n'y était pas** — ce que le chapeau du garde affirmait pourtant — ni la
table des indications d'assiette. Et le nom du fichier n'est pas énumérable
publiquement : il faut avoir chargé le cockpit, donc s'être authentifié, pour
l'apprendre. L'exposition est réelle et bornée ; dire « aucune authentification »
était vrai du fichier et trompeur sur l'exposition. Rectifié dans le garde.

**Ce qui a rendu le lot petit, c'est la mesure de son ampleur.** La clôture
transitive depuis les 131 composants clients donne 24 chemins vers
`lib/clinical`, dont 21 indirects — mais presque tous visent des modules
FEUILLES, que le garde exempte à juste titre. Restaient **six chaînes fautives**,
vers deux cibles, depuis trois composants — et **toutes passaient par le même
import**. Un goulot se coupe ; une nappe se refactore.

**Le remède honore la doctrine qu'il déplace.** `STATUTS_PROPOSES` portait cette
phrase : « le prédicat vit ICI, dans le module qui possède le vocabulaire des
statuts », avec son motif — deux artefacts divergents diraient au patient et au
médecin deux propositions différentes. Déplacer la seule constante aurait séparé
le prédicat de son vocabulaire. C'est donc le **vocabulaire entier** qui entre
dans un module feuille, et `statuts.ts` le ré-exporte : **aucun appelant serveur
ne change**.

**Le garde suit maintenant les chemins, et dit lequel.** Parcours en largeur,
`export … from` compris — les oublier rouvrirait le trou par la ré-export. La
règle des feuilles est vérifiée, jamais déclarée. Et le message d'échec rapporte
**la chaîne entière** : le défaut tenait à un import au MILIEU, et nommer
seulement ses deux bouts enverrait corriger le mauvais fichier. Un cas garde le
parcours contre sa propre vacuité — un balayage qui ne cherche pas et un dépôt
sain rendent le même vert.

**Mesuré après correction** : zéro règle, zéro identifiant de claim, zéro seuil,
zéro crypto dans le chunk du cockpit, qui perd 28 Ko. La matrice de consommation
le confirme de son côté, sans rien savoir du lot : deux sources cliniques
perdent une surface cliente — le corpus de synthèse passe de 29 à 28, la table
d'indications biologiques de 5 à 4.

**Un faux positif a été introduit puis retiré en chemin, et il est écrit parce
qu'il attend le prochain.** Le module feuille s'appelait d'abord
`statutsVocabulaire.ts` ; la matrice s'est mise à déclarer le panneau
consommateur DIRECT de la table biologique et l'orientation à GAGNER une surface
— l'inverse de ce que fait le lot. Cause : le rapprochement module ↔ consommateur
se fait par sous-chaîne sur l'alias, et `…/statutsVocabulaire` contient
`…/statuts`. Le fichier est renommé `vocabulaireStatuts.ts`. Le défaut de l'outil
est rapporté sans être corrigé : **tout module dont le nom préfixe celui d'un
autre du même dossier fausse cette matrice**. Aucune règle, aucun seuil,
aucun claim, aucune signature n'a été touché — le vocabulaire déplacé est quatre
chaînes de caractères et un type.
