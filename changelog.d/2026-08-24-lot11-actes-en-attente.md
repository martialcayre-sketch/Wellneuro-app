### Les actes en attente : une signature reportée, deux campagnes routées, une borne déclarée (2026-08-24)

Décision `D-107`, LOT-11 de « Doctrine exécutable ». Le lot **re-constate avant
de décider**, comme sa fiche l'exige — et rien n'avait bougé : six drapeaux
toujours posés, deux signatures toujours à `false`, **zéro** exclusion curée,
**13** occurrences d'`**Orpheline**` au grep.

- **`SAFETY_EI_METADATA` reportée au 2026-08-30**, avec son motif. Le report
  n'est pas un silence : `WN_EI_INTERRUPTION` vaut déjà `1`, donc la **capture**
  est ouverte et les signalements sont collectés — seule l'**interruption** reste
  fermée. Ce qui sera assumé en signant n'est **pas gradué** : un signalement
  rattaché retirera **tous** les candidats du dossier.
- **La curation des exclusions est ROUVERTE**, et cela revient sur `D-101`, qui
  l'avait abandonnée sur mesure. `neCouvrePas` est null sur les **95**
  interventions : `DC-43` ne peut pas franchir son gate faute de **sujet**, non
  faute de mécanisme. `GATE_POPULATION_METADATA` reste **non signée** — signer
  armerait un garde sans sujet —, mais `DC-43` **cesse d'être « écrite, non
  armée »** : elle obtient un porteur nommé, routé en file d'attente.
- **Les dix orphelines reçoivent une campagne dédiée.** L'arbitrage était reporté
  depuis le LOT-01 ; les deux options écartées le sont avec leur motif — « dettes
  nommées » **est le régime qui les a rendues orphelines**, et le coup par coup
  ne fait remonter aucune règle sans porteur.

**Le `3` des axes prioritaires : descente faite, verdict négatif.** Le prompt ne
demande pas trois axes, aucun document source ne les nomme, et le commit
d'origine (`651a9e98`) n'écrit aucun motif. Il devient
`MAX_AXES_PRIORITAIRES` — borne de **charge de la restitution praticien**, dont
**la provenance est l'arbitrage daté du 2026-08-24 et non un document antérieur**
(écrire l'inverse aurait fabriqué une source, `DC-19`). La valeur ne change pas.

Et le même défaut que `D-105` : la borne était écrite **trois fois** — le
validateur, et deux fois `SynthesePraticienEditor.tsx`. La porter à quatre côté
serveur laissait l'écran en bloquer trois, sans message.

**Le banc du LOT-03 a signalé la bascule tout seul** : dès la constante posée,
son cas « aucune exemption ne survit à ce qu'elle exemptait » a rougi sur
l'entrée devenue morte. C'est la preuve qu'il mord.

**`DC-55` et `DC-58` tranchées.** « Impact clinique significatif » **reste
curatorial** : n'entre au registre que ce que le praticien juge significatif, et
la règle le dit au lieu de laisser croire à un filtre automatique. `DC-58`
**reste proposition avec sa mesure** — instruite, sans contre-exemple, sans
méthode fondée.

**Les neuf dettes routées une par une.** `CS-MAG-01` → Curation signée ;
l'escalade vers T0 et le tour du vérificateur → campagne des orphelines ; la
lecture de consultation et les deux portées de garde restantes → dettes
assumées, recomptées au LOT-08. **Trois corrigées ici :**

- **Le découpage des conflits.** Mesuré d'abord : `CS-BIO-01` fait **569**
  caractères à elle seule. `scinderSousPlafond` coupe aux fins de phrase — à
  défaut entre deux mots, **jamais au milieu** — et fait porter `[regleId]` à
  chaque morceau, sans quoi `depuisSynthese.ts` cesserait de reconnaître la
  vigilance. Un cas vérifie que **recoller rend le texte d'origine** : le texte
  d'un conflit est une donnée signée, le raccourcir serait modifier du clinique
  pour tenir dans un gabarit (`DC-19`). `lignesDeVigilance` a déménagé dans un
  module **feuille** : la loger à côté de Prisma obligeait tout banc de longueur
  à provisionner une base — ou à recomposer la phrase, donc à en mesurer une
  autre.
- **Le banc de bump.** Il n'épingle pas `0,34` : un `toBe` se corrige dans le
  même diff que la valeur et ne garde rien. Les valeurs sont épinglées **par
  version**, les deux positions du drapeau couvertes. Vu rouge en portant le
  seuil à `0,40`.
- **Le tour du vérificateur, éprouvé sur un dossier portant un signal.** Le
  premier essai a échoué sur « Une priorité ne peut être sélectionnée avant la
  levée des bloqueurs » : avec un signal, la carte est **bloquée** — `DC-12`
  mord. Le banc garde donc le cas réel, une chaîne légitimement **dépourvue** de
  sélection. Fixture **séparée** : enrichir celle de référence aurait déplacé
  `CANDIDAT_RANG_1` et toutes les empreintes qui en dérivent.

**Et la dérive documentaire corrigée** : `safetyEffetIndesirableV1.ts:70` disait
le drapeau « absent de la production ». Vrai à la livraison, faux depuis le
LOT-05. Une phrase périmée dans un fichier clinique se corrige — c'est elle qu'un
relecteur croit avant de croire le code.

**Un garde du dépôt a attrapé le lot** : toute spec sensible à
`WN_ALI_01_SIIN57` doit tourner dans les **deux positions** du drapeau. Le banc
de bump l'est (il lit `VERSION_SCORE_EQUILIBRE`) et ne tournait que dans une ;
inscrit à `test:court14`.

Les deux ouvertures sont **routées**, pas cadrées : un cadrage écrit sans mesure
préalable est ce que les trois derniers lots ont dû corriger après coup.
