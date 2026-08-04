### Orientation — la table est signée, et le dernier trou de recueil partiel est fermé

**La table d'orientation est signée** (`validationExterne: true`, 2026-08-04,
23 claims). Vingt règles sur deux tours, chacune adossée à des claims relus en
base le jour même — `statut = 'VALIDE'`, `prescriptif = true`, `active = true`,
`version_claim = 'v1.0'` sur les 23.

**Signer n'allume rien.** `orientationActive()` est un ET : la route reste
fail-closed tant que `WN_ENABLE_ORIENTATION_NNPP2` n'est pas posé côté Vercel.
Signer est un acte clinique, déployer un acte d'exploitation — le verrou est un ET
précisément pour que les deux aient deux responsables.

**Un banc pose l'égalité exacte entre `claimsSource` et les claims réellement
cités**, dans les deux sens. Sans lui, ajouter une règle citant un claim jamais
relu laissait la table « signée » sur un périmètre qui n'existait plus. Le défaut
n'est pas hypothétique : la première rédaction de la liste en portait **24** au
lieu de 23 — `WN-CL-0178-016` n'apparaît dans le fichier que dans un commentaire.
Le banc a rougi à sa première exécution, sur la liste de celui qui l'écrivait.

**Le PSQI ne publie plus de bande sur un recueil partiel.** Le trou nommé et
laissé ouvert par le lot précédent était plus étroit qu'annoncé, et bien réel :
une passation à qui il manque une composante entière ne produisait déjà ni total
ni bande, mais sept composantes ayant chacune **au moins un** item suffisaient à
en produire. Les items manquants de `C2`, `C5` et `C7` sont comptés à un défaut, le plus
souvent le plus **favorable** de leur échelle — `Q2` fait exception, son défaut de
30 min pouvant relever le total. Le biais net va vers le bas.

Mesuré : `Q1 Q2 Q3 Q4 Q5b Q6 Q7 Q8` — huit items sur dix-huit, avec `Q5b` à sa
**pire** valeur — sortaient un total de 1 sur 21, « Pas de trouble du sommeil ».
`R-SOM-01` lisait cette bande. Le moteur publie désormais `missing`/`repondus`
sur ses 18 items cotés, retire la bande sur recueil partiel, et le total reste
servi à côté de ses comptes (même arbitrage que `sum` depuis #561). Le volet
conjoint (`Q10`, `Q11a-e`), `horsBareme`, n'entre pas dans le compte.

Effet de bord voulu, par le même chemin : un PSQI partiel cesse de contribuer à la
couverture d'un besoin dans le score d'équilibre.

**Une alerte s'est révélée fausse et est retirée.** Une note portée sur `R-STR-02`
disait que `WN-CL-0105-001` « porte sur l'éducation à un modèle alimentaire
méditerranéen » et proposait de le remplacer. Relu à la source : il porte sur
« la prise en charge globale du stress [qui] comprend un bilan personnalisé,
suivi d'un rééquilibrage sur 21 jours… » — mot pour mot l'objectif de la règle. Le
claim est conservé. Une citation ne se juge pas sur son numéro, mais sur son texte
relu en base.

**Deux défauts trouvés par la revue adversariale, tous deux réparés.**

Le premier : **la garde du PSQI ne s'appliquait qu'aux passations à venir.** Le
score est calculé une fois à la soumission et persisté ; le moteur d'orientation
relisait cet instantané. Un dossier déjà en base gardait sa bande d'origine, et
`R-SOM-01` s'y serait allumée le jour où le drapeau serait posé — alors que trois
documents annonçaient le trou fermé. Classe de la PR #202 : aucune ligne fautive,
un rattrapage absent. Le moteur d'orientation **recalcule** désormais depuis
`rawAnswers` et **écarte** ce qui n'est pas recalculable, ce qui ferme la classe
et non le cas : toute garde de scoring future s'applique d'office au passé.
Décision `D-018`. Mesuré avant de décider — 15 lignes sur 99 sans `rawAnswers`,
toutes d'une forme antérieure au moteur actuel, donc déjà inertes.

Le second : **« Mon équilibre » changeait sans bump de version.** `Q_SOM_01` est
source du besoin 5 en `inverser: true` — y retirer une mesure basse est
*rassurant*, pas protecteur. Un PSQI à 14/21 renseigné à 17 items sur 18 tombait
sous le seuil d'effondrement 0,34, plafonnant le score global à 50 ; la garde le
rend « non mesuré », le plafond tombe et le score **remonte**.
`VERSION_SCORE_EQUILIBRE` passe de v8/v9 à **v10/v11**, comme le fichier l'exige.

Corrigé au passage : le banc du `sha256` de la table était **tautologique** — il
recalculait ce qu'il comparait, et trois mutations de règles restaient vertes. Il
porte désormais un littéral, ce qui rend `D-017` exécutable. `FEATURE_FLAGS.md`
annonçait encore « 6 règles, `validationExterne: false` → fermé ». Et le total du
scénario fondateur valait **1**, pas 2 : le banc l'épingle à l'unité plutôt que
de le borner.

**Registre des décisions** : `D-017` et `D-018`. Deux `D-015` coexistaient depuis la veille
(lots #562 et #565) ; celui du lot orientation devient `D-016`, et un pointeur
faux du handoff (`D-015` attribué à #561 au lieu de `D-014`) est corrigé.

**Campagne close.** `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`
passe à `terminé` : sept critères sur huit sont vrais et cochés avec leur preuve.
Le huitième — la route sert réellement des recommandations — est **explicitement
non coché**, et attend le drapeau d'environnement. La campagne
`2026-08-02-certification-questionnaires-consolidation`, dont les quatre lots
étaient `terminé` depuis deux jours, est close elle aussi.

Réserve conservée et écrite : `tfd` (`Q_GAS_01`, cible de `R-GAS-01`) ne publie
aucun compte à la racine et reste hors de cette classe de garde.
