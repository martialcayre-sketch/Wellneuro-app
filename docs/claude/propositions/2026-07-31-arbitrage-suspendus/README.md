# Arbitrage du 2026-07-31 — les suspendus, et la règle du nombre d'items

Demande du praticien : « reconstruire Q_NEU_06 ; Q_SOM_09 est en cours de recueil
de données donc pas de score pour l'instant, normal ; PSQI doit servir 24 items ;
trancher le reste. »

Trois instruments sont traités dans le lot qui porte ce document. Ce texte tranche
les autres, chacun sur pièce, et pose la règle que la campagne cherchait depuis
le 2026-07-30.

---

## 1. La règle du « nombre d'items » n'existe pas

Elle était formulée comme un compteur — « le servi doit avoir autant d'items que
sa source » — et appliquée dans un seul sens, ce qui la rendait à la fois trop
sévère et trop laxiste. En regardant les cinq cas côte à côte, le compteur cache
**trois classes qui n'ont rien à voir**.

| Instrument | Source | Servi | Classe |
|---|---|---|---|
| `Q_GEO_01` Tinetti | 16 | 20 | **Décomposition** |
| `Q_SOM_01` PSQI | 24 | 18 → 24 | **Omission d'une section non cotée** |
| `Q_NEU_12` IDTAS-AE | 36 | 48 | **Restructuration d'un axe** |
| `Q_ALI_03` Monnier | 39 | 10 | **Amputation** |
| `Q_PED_02` Conners | 28 | 28 | **Substitution** |

**Décomposition.** Le Tinetti servi éclate deux items de la source en sous-items
— la rotation de 360° en deux temps, la longueur et hauteur du pas en quatre
(pied droit, pied gauche, en balancement puis en élévation). C'est le découpage
canonique du POMA. Les deux axes sont identiques, leurs maximums aussi (16 pour
l'équilibre, 12 pour la marche), et le total /28 est le même des deux côtés. Les
neuf libellés à similarité 0,00 sont un **artefact d'alignement** : le banc
compare par POSITION, et les positions se décalent après le premier éclatement.
→ **Pas une divergence.** À requalifier avec cette preuve.

**Omission d'une section non cotée.** Le PSQI ne servait pas le volet du conjoint
— non coté, mais porteur des deux seuls signaux d'apnée qu'un tiers peut
rapporter. Réel, et **soldé dans ce lot**.

**Restructuration.** L'IDTAS-AE est le cas trompeur : 48 contre 36 laisse croire
à une décomposition, comme le Tinetti. Ce n'en est pas une. La source pose
**six énoncés** par liste mensuelle (« J'ai tendance à me sentir le moins bien »,
« … à manger davantage », …), chacun coché sur les mois concernés. Le servi pose
**un item par mois** et par liste, soit 12 + 12, et écrase les six énoncés en une
notation unique. Ce n'est pas le même recueil, et il alimente `winterPatternLikely`,
un booléen clinique servi au modèle de synthèse.
→ **Divergence réelle, non traitée à ce jour. Lot dédié.**

**Amputation et substitution** : traitées plus bas.

### La règle, écrite

> Le nombre d'items ne se compare pas. Ce qui se compare, ce sont **les axes, leur
> composition et le total** — c'est-à-dire ce par quoi le nombre d'items atteint
> le score. Un écart de comptage à axes et total identiques est une mise en forme ;
> un comptage identique à contenus différents est une substitution, et c'est le
> cas le plus dangereux, parce que c'est le seul que le compteur déclare conforme.

`Q_PED_02` en est la démonstration : 28 items des deux côtés, cotés 0-3 des deux
côtés, **zéro divergence critique** — et un instrument entièrement différent.

---

## 2. Les huit suspendus, tranchés

### `Q_SOM_07` — MFI-20 → **RECONSTRUIRE**. Priorité la plus haute du reste.

Trois divergences critiques, et c'est l'instrument le plus abîmé du catalogue :
échelle d'accord 1→5 de la source servie en 0→4 ; **aucune des dix inversions
appliquée** ; cinq sous-échelles servies en deux sections ; et trois bandes sur
/80 quand la source écrit « Il n'y a pas de barème interprétation ». S'y ajoute,
mesuré ici : **onze des vingt libellés servis ne sont pas ceux de la source**, et
plusieurs ont la polarité inverse — l'item 14 de la source dit « Physiquement, je
me sens en mauvaise condition », le servi dit « en état de faire beaucoup de
choses ».

Additionner sans inverser revient à sommer la fatigue et la vigueur dans le même
sens : le total enregistré n'est pas une mesure. Quatre passations existent en
production, déjà neutralisées par `MOTIFS_PASSATION_NON_INTERPRETABLE`.

**Tout le nécessaire est au dossier**, y compris ce que la lecture automatique
n'avait pas su rendre : la grille de correction de la source, lue en image, donne
l'affectation item par sous-échelle — Générale 1/5/12/16, Physique 2/8/14/20,
Mentale 7/11/13/19, Activité 3/6/10/17, Motivation 4/9/15/18 — et les dix
inversions (1, 3, 4, 6, 7, 8, 11, 12, 15, 20) la recoupent exactement.

**Deux obstacles techniques identifiés, à traiter dans le lot** :

1. Le moteur `subscore` appelle `totalSousScore(sub.items, [])` — **liste
   d'inversions vide, en dur**. Aucune sous-échelle du catalogue ne peut
   aujourd'hui inverser un item. Il faut passer `sub.reversed`.
2. `MOTIFS_PASSATION_NON_INTERPRETABLE` est indexé **par instrument, pas par
   passation** — le fichier le dit lui-même et nomme ce piège. Reconstruire puis
   réactiver marquerait à tort les passations neuves. Le remède existe déjà à
   côté, sous forme de date (`RETRAIT_EN_SERVICE_LE` pour les synthèses).

**Résidu à déclarer** : les seuils de la source dépendent du sexe et de l'âge
(hommes ≥ 9 / 11 / 14, femmes ≥ 11 / 12 / 14 selon trois tranches, pour la seule
fatigue générale). Le moteur ne reçoit que des réponses : ils iront en `note`,
pas en bandes.

### `Q_ALI_03` — Monnier → **RECONSTRUIRE**, sur les 39 items de la source

Dix items servis sur 39 : un quart de l'instrument. La règle ci-dessus tranche
sans hésiter — les axes ne peuvent pas être ceux de la source quand les trois
quarts des items manquent. Une passation existe en production.

**Réserve déjà écrite, toujours ouverte** : ses cinq sous-scores continuent
d'alimenter le prompt de synthèse, calculés sur 10 items de 39. L'ajouter à
`MOTIFS_PASSATION_NON_INTERPRETABLE` est la décision qui ferme le réservoir, et
elle n'a pas été prise.

### `Q_PED_02` — Conners enseignant → **DÉBAPTISER**, plutôt que reconstruire

Les deux options étaient ouvertes depuis le 2026-07-30. Je tranche pour la
seconde, et voici pourquoi : le servi n'est pas un Conners abîmé, c'est **une
grille DSM du TDAH cohérente avec elle-même**. La reconstruire en Conners jetterait
un instrument utilisable pour en fabriquer un autre dont les droits ne sont pas
dégagés (© MHS). La débaptiser coûte un titre et une entrée de registre, et rend
honnête ce qui est déjà servi.

**Non négociable dans les deux cas** : le sous-score intitulé « Opposition /
Impulsivité » ne contient **aucun item d'opposition** — ses cinq items mesurent
l'impulsivité. Il doit être renommé quoi qu'il arrive, et c'est le seul point de
ce dossier qui touche une lecture clinique.

### `Q_PED_03` — Conners 3 parent → **RELANCER LE BANC**, lecture découpée

Motif de blocage unique et technique : la lecture croisée a échoué deux fois, aux
positions 8503 puis 11715 — 108 items, le plus gros questionnaire du catalogue.
Rien n'est confirmé par deux lectures, donc rien n'est jugé. Découper la lecture C
par parties lèvera l'obstacle. Coût : un passage payant.

Les deux items « manquants » (110 lus / 108 servis) sont les questions ouvertes
Q109/Q110, écartées faute de champ texte dans l'UI patient — déjà documenté dans
le code, ce n'est pas un motif.

### `Q_TAB_04` — cannabis → **CORRIGER, mais NE PAS réactiver**

> **Rectification du 2026-07-31, après exécution.** Ce dossier concluait
> « réactiver après deux corrections ». C'était une inconséquence : le motif de
> sa fermeture est l'IDENTITÉ — « on ne sait pas dire ce qu'il est » — et
> corriger une grille ne dit pas ce qu'est un instrument. Lui appliquer une barre
> plus basse qu'à `Q_NEU_06`, fermé la veille pour exactement cette raison,
> aurait refait le renversement de charge du VQ11. Les deux corrections sont
> faites ; l'instrument reste fermé, jusqu'à identification de sa source.

Zéro divergence critique, droits couverts par la déclaration du praticien.
Suspendu pour documentation seule. Mais la relecture donne **deux défauts réels
que la suspension masquait** :

1. **`maxTotal` déclaré 32, maximum réellement atteignable 36.** Compté sur les
   items : 4×4 + 4×1 + 4×3 + 4×1 = 36. Sa fiche afficherait donc « 34/32 » — un
   score au-dessus de son propre dénominateur.

   *Rectification (revue du 2026-07-31)* : une première rédaction ajoutait qu'un
   patient à 33-36 **ne recevrait aucune bande**. C'est faux, et le code le dit :
   `interpretRanges` traite nommément le dépassement de plafond et rend la bande
   de tête — le commentaire cite `Q_TAB_04` en exemple (« plafond 32, total
   atteignable 36 »). Il ne reste donc que le dénominateur menteur, ce qui est
   moins grave que ce qui était écrit. C'est la classe de défaut qui revient dans
   cette campagne : une conclusion juste sur le fond, tirée d'une prémisse que
   personne n'était allé vérifier.
2. **La grille d'interprétation n'est pas celle de la source.** La source pose
   trois bandes (0-5 « risque faible », 6-15 « risque réel », 16-36 « risque
   aigu ») ; le servi en pose quatre, à des coupures différentes (0-6, 7-14,
   15-21, 22-32).

Le premier point est un bug, à corriger. Le second est un **arbitrage clinique** :
aligner sur la source fait passer de quatre conduites à trois, et décider laquelle
disparaît n'est pas une décision d'outillage.

> **Arbitrage rendu le 2026-07-31** : aligner sur les trois bandes de la source.
> Aucune conduite n'est abandonnée — les deux plus sévères sont **fusionnées**,
> la source réunissant leurs intervalles (15-21 et 22-32 deviennent 16-36).
>
> **Ce que la fusion coûte, mesuré** : la conduite rendue change pour **23 des
> 37 totaux**, et non pour deux comme une première rédaction l'annonçait. Un
> score de 6 devient « risque réel » (plus sévère) ; un score de 15 aussi (moins
> sévère) ; 16 à 21 reçoivent en plus la prise en charge spécialisée que
> l'ancienne grille réservait à 22+. Surtout, **un score de 16 et un score de 30
> rendent désormais le même verdict** : la distinction « usage nocif » /
> « dépendance » disparaît, et c'était la seule information que portait la
> quatrième bande. Épinglé par `reactivations20260731.guard.test.ts`, pour que sa
> restauration se rediscute au lieu de se perdre.

### `Q_PNE_01` — VQ11 (Ninot et al., 2010) → **RÉACTIVÉ le 2026-07-31**

**Zéro divergence, d'aucune gravité** : 11 items, trois composantes, tout
correspond. C'est l'instrument le mieux aligné du catalogue.

Sa réactivation du 2026-07-30 avait été annulée à juste titre, mais pour un motif
qui ne le vise plus : elle s'appuyait sur « la source ne porte que la mention SIIN,
donc c'est du référentiel interne », un renversement de charge. L'identification
correcte — c'est le VQ11 publié — ne ferme rien par elle-même : l'extension du
2026-07-29 couvre explicitement « les instruments tiers reproduits dans les
supports de formation du SIIN ». Il relève donc du même régime que les huit autres
déclarés couverts, **réserve conservée au dossier**, ni plus ni moins.

> **Fait le 2026-07-31.** Une condition contraire, posée le 2026-07-30 —
> « réouverture conditionnée à l'instruction de ces droits » — restait au
> registre : elle y est désormais marquée superséde, avec son motif. Les droits
> de Ninot et al. ne sont toujours pas instruits, et l'entrée ne prétend pas le
> contraire ; ce qui a changé, c'est que cinq instruments dans exactement la
> même position sont ouverts depuis le 2026-07-30. Maintenir celui-ci fermé
> aurait été une exception sans fondement.
>
> **Une réserve que le banc ne pouvait pas voir** a été trouvée au passage : ses
> zéro divergence portent sur le couple *servi ↔ support SIIN*, jamais sur
> *support ↔ instrument publié*. Le support reproduit le VQ11 avec **quatre**
> niveaux de réponse là où la forme publiée en compte **cinq**. Portée bornée —
> aucune bande, aucune norme publiée appliquée — et gardée par un test.

### `Q_GEO_04` — MMSE GRECO → **RÉACTIVER en passation praticien**

Zéro divergence critique, 30 items des deux côtés. Deux motifs l'avaient fermé,
et ils se traitent séparément :

- **Droits** (© PAR) : même régime que les huit autres, déclaration du praticien,
  réserve conservée.
- **Passation** : c'est un test administré par un clinicien — le motif est écrit
  dans le code depuis le 2026-07-29, et il est **indépendant de la licence**.

**La surface manque toujours, et ce lot en a fait l'expérience.** Une première
rédaction créait la position « entrée de catalogue `actif: false` (route fermée)
plus ligne `PASSATION_PRATICIEN` (grille affichée) » et l'inaugurait sur
`Q_NEU_06`. Deux gardes existants l'ont refusée, à raison : `PASSATION_PRATICIEN`
affiche le **verbatim**, que la déclaration du praticien exclut explicitement de
son périmètre, et la décision du 2026-07-29 interdit d'y laisser un instrument
sous réserve. Rouvrir le MMSE demande donc d'abord de **décider ce qu'est une
surface de consultation** qui ne publie pas le verbatim — une consigne
d'administration sans grille, par exemple. C'est une décision produit, pas un
aménagement de garde.

### `Q_FIB_03` — ELFE → **RESTE FERMÉ**, et c'est le seul

Deux divergences critiques, 7 items à la source contre 12 servis, échelle 0-10
contre celle du servi, aucun score produit (`type: 'journal'`). Jamais déployé,
jamais assigné. Instrument à usage professionnel dont la place dans un portail
patient ne se pose même pas.

Le fermer ne coûte rien à personne, et le reconstruire ne servirait aujourd'hui
aucun usage. **À rouvrir le jour où un usage le demande**, pas avant.

---

## 3. Ce que ce document ne fait pas

Il ne réactive rien. Chaque réactivation reprend l'échelle de certification à
`repere` et demande ses pièces — c'est le verrou du vérificateur, et il tient.
Les lots restants, par ordre de valeur clinique décroissante :

1. `Q_SOM_07` (MFI-20) — un résultat enregistré qui n'est pas une mesure ;
2. ~~`Q_PNE_01`~~ **fait le 2026-07-31** ; `Q_TAB_04` corrigé mais maintenu fermé
   (identité non instruite) ; `Q_GEO_04` bloqué sur la même question que
   `Q_NEU_06` — une surface de consultation qui n'expose pas le verbatim ;
3. `Q_GEO_01` — requalification sur preuve, aucun code à changer ;
4. `Q_ALI_03` (Monnier), puis `Q_PED_02` (débaptiser) ;
5. `Q_NEU_12` — la restructuration de la partie 3, seule divergence encore
   inconnue du dossier avant aujourd'hui ;
6. `Q_PED_03` — un passage de banc, lecture découpée.
