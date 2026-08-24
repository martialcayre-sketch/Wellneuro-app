# LOT-11 — les actes en attente : une signature reportée, deux campagnes routées, une borne déclarée

- Date : 2026-08-24
- Campagne : `2026-08-18-doctrine-executable`, LOT-11
- Décision : `D-107`
- Branche : `clinique/lot11-actes`

## Le lot re-constate avant de décider, et rien n'avait bougé

Sa fiche l'exige — « re-constaté au moment d'écrire, pas recopié ». Vérifié le
2026-08-24 : les **six drapeaux** toujours posés en production, les **deux
signatures** toujours à `false`, **zéro** exclusion curée sur 95 interventions,
`DC-42`/`DC-43`/`DC-58` toutes trois en *proposition*, **13** occurrences
d'`**Orpheline**` au grep, et `preconditionsT0Prisma.ts:66` appelant toujours
`contradictionsPourPatient` **sans** les claims cités.

## Les arbitrages rendus

- **`SAFETY_EI_METADATA` reportée au 2026-08-30**, avec son motif. Rien ne se
  perd : `WN_EI_INTERRUPTION` vaut `1`, la CAPTURE est ouverte, les signalements
  sont collectés — seule l'INTERRUPTION reste fermée.
- **La curation des exclusions est ROUVERTE**, ce qui **revient sur `D-101`**.
  `GATE_POPULATION_METADATA` reste **non signée** (signer armerait un garde sans
  sujet), mais `DC-43` **cesse d'être « écrite, non armée »** : elle obtient un
  porteur nommé.
- **Les dix orphelines reçoivent une campagne dédiée.** Les deux options écartées
  le sont avec leur motif — « dettes nommées » **est le régime qui les a rendues
  orphelines**.
- **`DC-55` reste curatoriale** : n'entre au registre que ce que le praticien
  juge significatif, et la règle le dit au lieu de laisser croire à un filtre.
- **`DC-58` reste proposition avec sa mesure.**

Les deux ouvertures sont **routées en file d'attente, pas cadrées** : un cadrage
écrit sans mesure préalable est ce que les trois derniers lots ont dû corriger
après coup.

## La descente sur le `3` des axes prioritaires — négative

- le prompt **ne demande pas trois axes** (`SYSTEM_PROMPT_SYNTHESE` montre un axe
  d'exemple, aucun plafond) ;
- **aucun document source** ne les nomme, contrairement à « trois actions
  maximum » (`RELATION_PRATICIEN_PATIENT_SOURCE.md`) ;
- le commit d'origine (`651a9e98`, 2026-07-25) l'introduit **sans un mot**.

Il devient `MAX_AXES_PRIORITAIRES` — borne de **charge**, dont **la provenance
est l'arbitrage daté du 2026-08-24**, pas un document antérieur : écrire
l'inverse aurait fabriqué une source (`DC-19`). Et le même défaut que `D-105` :
la borne était écrite **trois fois** (validateur + deux fois l'éditeur).

**Le banc du LOT-03 a signalé la bascule tout seul** : dès la constante posée,
son cas « aucune exemption ne survit à ce qu'elle exemptait » a rougi.

## Les neuf dettes, routées une par une — trois corrigées

| Dette | Sort |
|---|---|
| `CS-MAG-01` | → Curation signée (rang 4) |
| Escalade vers T0 | → campagne des orphelines |
| Phrase de conflit trop longue | **corrigée** |
| Dérive documentaire | **corrigée** |
| Tour du vérificateur sans signal | **corrigé** |
| Lecture de consultation (fait, pas schéma) | dette assumée, LOT-08 |
| 33 seuils du catalogue · banc suivant le nom · bump non gardé | bump **corrigé**, les deux autres assumées |

**Le découpage des conflits.** Mesuré d'abord : `CS-BIO-01` fait **569**
caractères. `scinderSousPlafond` coupe aux fins de phrase — à défaut entre deux
mots, **jamais au milieu** — et fait porter `[regleId]` à chaque morceau, sans
quoi `depuisSynthese.ts` cesserait de reconnaître la vigilance. Un cas vérifie
que **recoller rend le texte d'origine** : le texte d'un conflit est signé, le
raccourcir serait modifier du clinique pour tenir dans un gabarit.
`lignesDeVigilance` a déménagé dans un **module feuille** — à côté de Prisma,
elle obligeait tout banc de longueur à provisionner une base, ou à recomposer la
phrase et donc à en mesurer une autre.

**Le banc de bump.** Il n'épingle pas `0,34` : un `toBe` se corrige dans le même
diff que la valeur et ne garde rien. Les valeurs sont épinglées **par version**.
Vu rouge en portant le seuil à `0,40`.

**Le tour du vérificateur.** Premier essai en échec sur « Une priorité ne peut
être sélectionnée avant la levée des bloqueurs » : avec un signal, la carte est
**bloquée** — `DC-12` mord. Le banc garde donc le cas réel, une chaîne
légitimement **dépourvue** de sélection. Fixture **séparée** : enrichir celle de
référence aurait déplacé `CANDIDAT_RANG_1` et toutes les empreintes.

## Un garde du dépôt a attrapé ce lot

Toute spec sensible à `WN_ALI_01_SIIN57` doit tourner dans les **deux positions**
du drapeau. Le banc de bump l'est — il lit `VERSION_SCORE_EQUILIBRE`, qui vaut
`v15` ou `v14` selon la forme servie — et ne tournait que dans une. Inscrit à
`test:court14` ; le banc de drapeau repasse à 8/8.

## Validation

- **T1 vert** (code 0).
- **T2 : segment Vitest entièrement vert** — 458 fichiers, **5 794 tests**,
  1 skip, **0 échec**, bancs neufs compris.
- **Segment E2E : un rouge, démontré étranger.** Signature macOS/WebKit connue
  (« navigation expirée, AUCUNE requête de page émise »), sur un **test différent
  à chaque exécution** de la journée. Le segment relève du CI tant que `D-049`
  tient.

## Ouvert

- **La signature `SAFETY_EI_METADATA`** — revue le 2026-08-30. Inhibition
  **totale**, pas graduée.
- **Deux campagnes à cadrer** : curation des exclusions, dix orphelines.
- **Arbitrage B2 non rendu** : ce que fait la gate sur un état INCONNU — il se
  rendra « avec les exclusions sous les yeux », donc à la curation.
- **Le seuil de significativité du momentum** (`delta > 0` sur `+0,01`).
- **LOT-08** devient le lot courant : c'est la clôture terminale de la campagne.
