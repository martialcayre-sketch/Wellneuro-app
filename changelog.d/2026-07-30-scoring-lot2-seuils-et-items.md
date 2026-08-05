### Scoring — frontières et seuils alignés sur leurs sources, trois adaptations déclarées, une suspension

Campagne du 2026-07-30, lot 2 — application des arbitrages praticien rendus sur le
dossier #469. **Ce lot change des valeurs servies**, et chaque changement dit sur
quoi il repose : la source, ou un arbitrage, jamais l'un déguisé en l'autre.

**La découverte qui a réduit le lot : six des neuf « seuils manquants » étaient
déjà servis.** Le banc ne lisait que l'interprétation déclarée du catalogue,
aveugle aux bandes codées dans les moteurs. Le « ≤ 7 » de l'IPSS est la bande 0–7 ;
le « ≤ 7 » du HAD, les bandes A/D 0–7 ; le « == 0 » du QIF, la bande codée
`total === 0` ; le « > 5 » de l'IDTAS, `partie1DepressionThreshold`. Les ajouter
aurait créé des doublons. Chaque cas est consigné dans `verdictScoring.revision`.

**Ce qui change réellement, et pourquoi :**

- **QDRS (`Q_GEO_05`) — la grille entière est alignée sur la source** (0–1 /
  1,5–5,5 / 6–12 / 12,5–17 / 17,5–30, relevée à l'identique par les deux lectures
  du banc). Les bandes servies chevauchaient leurs bornes, et `interpretRanges`
  prenant la première, **le patient le plus atteint recevait la bande la plus
  rassurante** : 1,5 sortait « Normal » au lieu de MCI, 12,5 « démence légère » au
  lieu de modérée, 17,5 « légère à modérée » au lieu de sévère.
- **Berlin (`Q_SOM_03`) — la catégorie somnolence exige DEUX réponses positives**,
  comme la source. Une seule suffisait : un patient positif au seul « fatigue au
  réveil », avec une HTA, sortait « Risque élevé d'apnée — polysomnographie
  recommandée ».
- **Epworth (`Q_SOM_02`) — les trous à 6 et 15 sont comblés par ARBITRAGE
  praticien**, et déclarés comme tels : ce sont des trous de la source elle-même
  (« < 6 », « == 7 », « == 8 », « >= 9 », « <= 14 », « > 15 »). 6 reçoit la bande
  moyenne, 15 la bande 9–15 — la règle la moins affirmante chaque fois.
- **Horne (`Q_SOM_05`) — 70 reste « Tout à fait du matin »**, comme la table
  publiée de Horne & Östberg (70–86). Le « > 70 » de la traduction du support est
  un écart assumé, documenté au registre.

**Deux gardes de classe neuves.** Aucune grille du catalogue ne peut plus partager
une borne entre deux bandes — le balayage a attrapé les deux bornes restantes du
QDRS à sa première exécution, et il porte une exemption unique et motivée (la
grille par population de l'AUDIT, que le moteur n'interroge pas). Et la catégorie 2
du Berlin est éprouvée dans les deux sens.

**Trois adaptations d'items déclarées** (`statutContenu: adapte`) : PSQI 18 items
pour 24, IDTAS-AE 48 pour 36 — la source pose six énoncés par liste saisonnière,
que le servi AFFAISSE en un comptage mensuel par liste, et la description le dit
désormais en ces termes —, Tinetti 20 pour 16. Les totaux et seuils publiés restent
ceux des sources.

**`Q_ALI_03` suspendu** (`actif: false` + `suspendu`) : 10 items servis sur 39 —
un quart d'un instrument n'est pas une adaptation (précédent `Q_SOM_07`). Motif de
CONTENU, pas de droits. Réserve nommée au registre : ses 5 sous-scores stockés
continuent d'alimenter le prompt de synthèse, et l'ajout à
`MOTIFS_PASSATION_NON_INTERPRETABLE` est une décision praticien non prise ici.

**`Q_INF_05` volontairement bloqué** (relecture de source demandée), et
**`Q_NEU_06` réarmé** : la relecture de son rapport montre que les 10 libellés
servis ne partagent rien avec la source (MMT administré : orientation, trois mots,
calcul) et que le sens de l'échelle est inversé. C'est la classe `Q_ALI_03` — la
critique est restaurée, l'arbitrage (suspendre ou reconstruire) est praticien.

**Une revue adversariale a refusé la première rédaction de ce lot, et ses cinq
constats sont tous appliqués** : les deux bornes QDRS restantes (le correctif ne
couvrait que la première — corriger un cas nommé laisse ses voisins, sixième
occurrence du motif) ; l'Epworth présenté « conforme à la source » alors que les
deux trous étaient identiques ; le Horne déplacé contre le « ≤ 69 » de sa propre
source ; la requalification Berlin qui visait la règle finale au lieu de la
catégorie 1 pendant que le vrai écart (catégorie 2) restait servi ; et trois
compteurs de divergences décrémentés alors que leur propre note disait l'écart
ouvert — restaurés (`Q_NEU_06`, `Q_SOM_01`, `Q_FIB_02`), un compteur à zéro sous
une prose qui dit le contraire ouvrirait `scoring_verifie` à tort.

**Impact sur les passations enregistrées : nul, mesuré ligne à ligne** (Epworth
stocké à 3, Horne à 61, trois Berlin dont les verdicts stockés ne sont pas
recalculés, aucun QDRS). Pas de backfill : les scores sont calculés à la
soumission puis stockés.

Cinq tests neufs, **sept preuves par mutation** — dont les deux qui rouvrent les
chevauchements du QDRS, celle qui raffaiblit la catégorie 2 du Berlin, et celle
qui rouvre le trou à 15.

Effet mesuré : les instruments porteurs d'une divergence critique passent de 13 à
**10, dont 5 suspendus** — `Q_ALI_01` (échelle 0–2/0–15 à confronter au malentendu
barème/quantités de #452), `Q_INF_05` (bloqué à dessein), `Q_NEU_06` (réarmé),
`Q_SOM_01` et `Q_FIB_02` (bornes atteignables, lot dédié).
