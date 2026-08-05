### Karasek — un drapeau de risque non jugeable vaut « on ne sait pas », plus « non »

Dernier résidu du contrat « non mesuré » posé le même jour sur seize moteurs.
`Q_STR_06` y avait échappé : ses axes rendaient bien `total: null`, mais leurs
drapeaux restaient à `false`.

**Mesuré avant d'écrire une ligne** : une passation ne renseignant que la demande
psychologique rendait `LAT`, `SOU` et `REC` à `total: null` **et**
`atRisk: false` — trois verdicts « pas à risque » sur des axes jamais remplis —
et `jobStrain: false`, `isoStrain: false` sur la même base. Un axe *partiellement*
rempli était dans le même cas : `atRisk` y valait `false` alors qu'il n'était pas
jugeable, et c'est précisément l'axe où `karasekValue` sous-estime le plus,
puisqu'il compte l'absence pour zéro.

- **`atRisk` vaut `null` quand l'axe n'est pas jugeable** — non mesuré, ou
  incomplet. Il reste `false` sur un axe **sans seuil publié** (`Q_STR_06/REC`) :
  comportement inchangé, et la consigne de synthèse décrit déjà ce cas-là.
- **Le « et » du Job Strain devient un ET à TROIS valeurs**, monotone comme la
  règle du Berlin : établi **faux** dès qu'un seul opérande est faux — peu importe
  ce qu'on ignore de l'autre —, établi **vrai** si les deux le sont, indéterminé
  sinon. Il est écrit, et non délégué à `&&` : `null && false` vaut `null` en
  JavaScript, là où la réponse est **établie**. Une latitude complète et au-dessus
  de son seuil suffit à exclure le Job Strain, quoi qu'on ignore de la demande —
  s'en remettre à l'opérateur natif donnait le bon résultat sur trois cas et le
  mauvais sur celui-là.
- **« Situation professionnelle équilibrée » exige les deux axes mesurés ET
  établis hors risque.** L'ancienne garde n'exigeait que des totaux non nuls : un
  axe à moitié rempli en a un.

**Une régression introduite par ce lot, corrigée avant le merge.** Remplacer la
garde `mesure()` par le seul test `atRisk === false` la perdait : `atRisk` est
initialisé à `false` et n'est réécrit que si l'axe publie un seuil, si bien qu'un
axe **sans seuil et sans une seule réponse** ressortait « Situation
professionnelle équilibrée ». Aucun instrument du catalogue n'est dans ce cas —
`DEM` et `LAT` publient tous deux le leur —, mais le prochain le sera peut-être.
Relevée en revue adversariale, sur définition forgée, et désormais épinglée.

**Un trou de grille mis au jour, pas créé, et c'est un QUADRANT entier.** Toute
passation complète où **la demande est sous son seuil (≤ 21) et la latitude sous
le sien (< 72)** ne reçoit aucune bande — quels que soient le soutien social et la
reconnaissance. Ce n'est pas une borne : un répondant uniforme à « pas d'accord »
y tombe (demande 19, latitude 54 et soutien 16, ces deux derniers **à risque**).
L'ancienne version y rendait « **Situation professionnelle équilibrée** », en
vert, parce qu'elle ne vérifiait que la présence des totaux. Cette fausse
réassurance disparaît ; en contrepartie **la fiche praticien n'affiche alors
aucune ligne de synthèse** — `buildMiniSynthese` rend une chaîne vide faute
d'interprétation, et les axes du Karasek n'en portent pas —, le praticien voit
quatre nombres et aucun signal qualitatif. Le modèle de Karasek nomme pourtant ce
profil (« job passif »). **Ajouter la bande est une décision de seuil clinique**,
elle ne se prend pas dans un lot de code. Réserve nommée, épinglée par un test.

**Impact sur les passations enregistrées : nul.** `Q_STR_06` ne porte **aucune
assignation ni réponse** en base — lu par `execute_sql`. Et structurellement : les
scores sont calculés une fois à la soumission puis stockés, et le seul chemin qui
rejoue `calculateScore` est « Mon équilibre », dont `Q_STR_06` n'est pas une
source. **Il n'y a donc aucun backfill** : une passation antérieure, s'il en
existait une, garderait indéfiniment son `atRisk: false` et son verdict vert.

**Ce qui n'est PAS couvert**, nommé plutôt que passé sous silence :

- **« Équilibrée » ignore le soutien social.** Demande basse, latitude haute,
  soutien 8/32 pour un seuil à 24 : le verdict reste vert, à côté d'un axe établi
  à risque. Antérieur à ce lot et inchangé par lui — mais c'est désormais le seul
  verdict rassurant que le moteur émette. Y ajouter `SOU` est une décision de
  seuil clinique.
- **Un franchissement de seuil ÉTABLI sur un axe incomplet ressort `null`.**
  `karasekValue` compte l'absence pour zéro : les sommes croissent avec la
  complétude, donc une demande déjà **au-dessus** de son seuil sur 8 items de 9 ne
  peut plus en redescendre. Le verdict est acquis, il est pourtant rendu
  indéterminé. La monotonie invoquée pour le « et » vaut aussi pour les sommes ;
  l'appliquer là demande un arbitrage, pas une ligne.
- **La consigne de synthèse décrit un booléen `null` comme « la question n'a pas
  été posée, ou l'axe n'a pas été mesuré ».** Depuis ce lot, un axe
  **partiellement** rempli en produit un aussi : le modèle peut recevoir
  `{total: 54, max: 96, seuil: 72, atRisk: null}`. La règle qui protège tient — le
  drapeau ne se recalcule pas depuis le total — mais la cause annoncée est
  incomplète. Un bump de version pour une demi-phrase : à faire au prochain lot de
  consigne.

Six tests neufs et **six preuves par mutation**. Une septième a été **retirée de
la liste plutôt que gardée verte** : les `=== true` des branches d'interprétation
disent l'intention mais ne gardent rien — sur un `boolean | null`, `null` et
`false` sont tous deux falsy, le test truthy est strictement équivalent. Aucune
mutation ne peut les faire rougir, et le moteur le dit en commentaire plutôt que
de laisser croire à une sécurité.
