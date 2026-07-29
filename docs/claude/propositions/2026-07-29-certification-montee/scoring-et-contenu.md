# Contenu servi et scoring — ce qui monte, ce qui bloque, ce qui a été trouvé en chemin

Dossier d'arbitrage. Le banc constate ; le praticien tranche. Rien n'est décidé ici.

## Méthode

Six lecteurs ont établi, sur pièce, le `statutContenu` et la `description` de la
version servie — à partir du rapport du banc, de `empreinte-servie.json` et de l'entrée
de registre. Six réfuteurs ont ensuite été chargés de **casser** ces verdicts, pas de
les confirmer : recompter les items, vérifier que la description décrit bien le servi
et non la publication, traquer le verbatim de source recopié.

**11 propositions sur 54 ont été corrigées par la réfutation**, et aucune n'a échappé à
la vérification. Le travail a porté sur 54 instruments ; seuls **11** ont finalement
des droits assez dégagés pour que leur contenu soit verrouillé — les autres restent au
barreau des droits (voir `droits.md`). Le recensement reste au dossier : il servira dès
que les droits seront instruits.

## Ce qui est monté

| Barreau | Avant | Après |
|---|---|---|
| `repere` | 60 | 1 |
| `source_obtenue` | 4 | 49 |
| `droits_verifies` | 0 | 1 |
| `contenu_verrouille` | 0 | 1 |
| `scoring_verifie` | 0 | **10** |
| `suspendu` | 0 | 2 |

Les dix à `scoring_verifie` : `Q_STR_01`, `Q_INF_01`, `Q_INF_02`, `Q_INF_03`,
`Q_GAS_01`, `Q_CAR_01`, `Q_MOD_01`, `Q_MOD_02`, `Q_MOD_03`, `Q_ALI_02`.

Répartition du contenu des 11 verrouillés : 8 `cree_localement`, 3 `adapte`,
**0 `verbatim`**, 0 `traduit`.

Ce zéro mérite d'être lu : parmi les instruments examinés sur pièce, **aucun ne
reproduit une forme publiée à l'identique**. Un seul verdict `verbatim` a été proposé
sur les 54 (`Q_TAB_01`) ; il a été ramené à `adapte`, sa propre réserve constatant
qu'aucune forme publiée n'est documentée au registre — `verbatim` y affirmait une
fidélité à une référence absente.

## 1. Le seul bloqué par une divergence critique

`Q_INF_05` (auto-évaluation de l'anxiété, référentiel SIIN) : contenu verrouillé,
scoring refusé sur une divergence critique — **total numérique absent**.

Il est seul parce que les six autres qui l'accompagnaient — `Q_FIB_01`, `Q_FIB_02`,
`Q_ALI_03`, `Q_GEO_01`, `Q_GEO_03`, `Q_GEO_06` — sont redescendus au barreau des
droits après la contre-revue (voir `droits.md`, « les sept rétrogradés »).

**21 instruments** portent une ou plusieurs divergences critiques au banc, et **41**
n'en portent aucune. Tous ceux qui ne sont pas montés butent plus bas, sur les droits
ou sur une suspension : leur verdict est inscrit au registre (`verdictScoring`) et les
attend. Le jour où les droits d'une échelle seront instruits, la montée ne demandera
plus qu'un verrouillage de contenu.

## 2. `Q_ALI_01` — le banc mesurait la mauvaise forme

C'est la trouvaille de la passe de réfutation, et elle dépasse cet instrument.

`empreinte-servie.json` documentait la **forme courte à 14 items sur 42**. La
production sert la forme **SIIN 57 items sur 90** depuis le 2026-07-28, drapeau
`WN_ALI_01_SIIN57` allumé. Le banc, lui, tourne **drapeau éteint** : il comparait la
source à une forme que l'application ne sert plus, et rendait une divergence critique
« 57 items côté source contre 14 servis » qui était un artefact du banc, pas un défaut
du produit.

Recomparé drapeau allumé — sans aucun appel de modèle, `--recomparer` rejouant depuis
le cache :

- la divergence `nombre_items` **disparaît** ;
- il reste **une** critique : `echelle_de_cotation`, source « 0–2 » contre servi
  « 0–15 » ;
- l'empreinte devient : 57 items, 12 sections, `seuils_points`, maximum déclaré 90,
  4 bandes.

`Q_ALI_01` reste à `droits_verifies` : son contenu n'a pas été verrouillé, la
description issue du recensement mélangeant les deux formes. Elle est à refaire sur
l'empreinte régénérée.

**Deux conséquences à arbitrer.**

**a) Le banc doit connaître les drapeaux.** `npm run check` lance déjà la vérification
de certification **deux fois**, drapeau éteint puis allumé. Le banc de certification,
lui, n'a qu'une position. Aucun autre instrument n'est aujourd'hui sous drapeau — la
portée est limitée à `Q_ALI_01`, mais la lacune est générale.

**b) Le plafond réel de `Q_ALI_01`.** Le balayage du moteur rend **29 → 52** pour un
maximum déclaré à **90**. Si ce balayage est exhaustif, aucun patient ne peut sortir de
la fourchette 32 %–58 % d'un score présenté sur 90. À vérifier avant toute lecture
clinique ; à ne pas confondre avec le plafond à 50 corrigé en #436, qui portait sur une
cause différente.

## 3. Anomalies de moteur relevées en chemin

Vérifiées directement sur `empreinte-servie.json`, pas sur la seule parole des
lecteurs. Elles ne relèvent pas de la certification : elles alimentent le lot moteur,
qui est séparé.

| Instrument | Fait mesuré | Portée |
|---|---|---|
| `Q_NEU_05` (UPPS) | Le balayage rend un **minimum (120) supérieur au maximum (105)**, aucun total maximal déclaré. | L'étendue réellement servie n'est pas établie. |
| `Q_TAB_04` | Maximum déclaré **32**, total réellement atteignable **36**. | Un score peut dépasser son propre plafond affiché. |
| `Q_ALI_01` | Balayage **29 → 52** pour un maximum déclaré **90** ; **20 inversions appliquées, 0 déclarée**. | Voir §2. |
| `Q_STR_06` (Karasek) | **5 inversions appliquées, 0 déclarée** ; aucune borne exécutable. | L'inversion n'est vérifiable que par le comportement du moteur. |
| `Q_STR_04` (DASS-21) | **3 bandes sans bornes ni libellé.** | La sévérité par sous-échelle n'est rattachée à aucun palier. |
| `Q_MOD_01` | **7 bandes sans bornes.** | La couche d'interprétation servie s'écarte du référentiel SIIN. |
| `Q_URO_01` (IPSS) | **2 bandes vides** : ni bornes, ni libellé, ni conduite. | — |

À rapprocher des deux défauts réservés au lot moteur : le repli de `interpretRanges`
sur la **dernière** bande quand aucune ne correspond, et l'absence de parade anti-zéro
sur les `subScores`. Une bande sans bornes ne peut jamais correspondre — elle tombe
donc dans ce repli.

`Q_MOD_01` est **à `scoring_verifie`** malgré ses 7 bandes sans bornes : le banc
compare le servi à sa source et n'y voit aucune divergence critique. C'est la limite du
barreau — il atteste une fidélité à la source, pas une santé du moteur.

## 4. Le verdict du banc est désormais au registre

Le critère de `scoring_verifie` reposait sur une chaîne cherchée dans un fichier hors
dépôt, sur une seule machine : ni rejouable, ni relisible en revue. Chaque entrée porte
maintenant un `verdictScoring` — `{ banc, date, divergencesCritiques }` — et c'est lui
que le CI exige.

Renseigné sur **62 entrées sur 64**. Les deux manquantes, `Q_PED_02` et `Q_PED_03`,
n'ont jamais été passées au banc.

L'extraction croise deux lectures du même rapport — le décompte des divergences par
lecture et la conclusion écrite par le banc — et **s'arrête** si les deux ne
s'accordent pas. Sans ce recoupement, un motif d'extraction mal cadré rendait un
verdict muet, et **aucun** instrument ne montait : c'est ce qui s'est produit au premier
essai, le nom du lecteur (« C (GPT) ») portant une espace.

## Ce que ce lot n'a pas fait

- Il n'a **certifié** aucun instrument au sens du libellé « Validé pour l'usage
  WellNeuro » : le barreau le plus haut atteint est `scoring_verifie`, cinquième sur
  huit.
- Il n'a pas rempli `measurement_evidence.json` : `cosmin` reste `inconnu` sur 64/64 et
  personne ne peut atteindre `psychometrie_revue`.
- Il n'a modifié **aucun barème, aucun seuil, aucune valeur servie**, ni rescoré aucune
  passation.
- Il n'a pas lancé le banc payant sur `Q_PED_02` / `Q_PED_03`.
