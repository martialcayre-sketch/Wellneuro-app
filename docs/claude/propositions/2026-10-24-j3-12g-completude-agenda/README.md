# J3-12g — complétude de l'agenda du sommeil au snapshot (2026-10-24)

Lot J3-12g (file A, `docs/claude/PLAN_WELLNEURO.md`, table des lots des 12
besoins), résidu de [[D-329]] §2. Ce dossier porte les deux préalables
inscrits au plan — l'inventaire « rubrique de l'agenda → lecteurs du moteur »
et le compte des diffusions actives — et les arbitrages du responsable du
2026-10-24 qu'en tire [[D-359]].

Agrégats seulement : aucun identifiant de dossier n'accompagne une mesure.

## 1. Inventaire : rubrique de l'agenda → lecteurs du moteur

L'agenda `Q_SOM_09` n'a pas de réponses : ses 27 rubriques `AGD_*` sont des
agrégats écrits à la clôture (`web/src/lib/agenda-sommeil/cloture.ts:63`,
`agregats.ts:332`). Sous le seuil d'agrégation (`agregats.ts:334`), la
clôture n'écrit que `AGD_NB_NUITS` ; une métrique non couverte reste `null`.

| Rubriques | Lecteurs |
|---|---|
| `AGD_NB_NUITS`, `AGD_INDICE_ELIGIBLE`, `AGD_TST_MOY`, `AGD_EFF_MOY`, `AGD_REG_ECT`, `AGD_QUAL_MOY`, `AGD_NB_NUITS_TST`, `AGD_NB_NUITS_EFF` | indice /100 du scoring `agenda_sommeil` (`web/src/lib/questions.ts:3883`) ; seule valeur qui monte au besoin 5 (`web/src/lib/equilibre/constants.ts:332`) |
| `AGD_NB_NUITS_AIDE`, `AGD_FREQ_CRITERE_SEM` | drapeaux de l'indice, jamais des points (`questions.ts:3987`, `:4002`) |
| `AGD_TIB_MOY`, `AGD_PRELIT_MOY`, `AGD_LAT_MED`, `AGD_WASO_MOY`, `AGD_TWAK_MOY`, `AGD_FREQ_LAT30_SEM`, `AGD_FREQ_WASO30_SEM`, `AGD_NB_NUITS_PRELIT`, `AGD_NB_NUITS_TWAK`, `AGD_NB_NUITS_LAT`, `AGD_NB_NUITS_FREQ_WASO`, `AGD_NB_NUITS_FREQ`, `AGD_NB_NUITS_AIDE_CONNU`, `AGD_NB_NUITS_WE` | affichage praticien (`web/src/components/agenda-sommeil/AgendaSommeilPraticienPanel.tsx:41-172`) et export du dossier |
| `AGD_REV_MOY`, `AGD_NB_NUITS_REV`, `AGD_FENETRE_MOY` | export du dossier seulement (`web/src/lib/export-dossier/libellesAgendas.ts:25`) |
| les 27 | snapshot clinique : présence seulement, jamais la valeur (`web/src/lib/clinical-engine/clinicalSnapshot.ts:86`) |

Les deux familles de lecteurs du moteur :

- **Routes** (cockpit, portail, historique, momentum, check-ins) : elles
  recalculent l'indice depuis `rawAnswers`, sans filtre de complétude
  (`web/src/lib/equilibre/score.ts:161`) ; appelants
  `api/praticien/equilibre/route.ts:134`, `api/praticien/besoins/route.ts:90`,
  `lib/equilibre/lecturePatient.ts:48`, `momentumParBesoin.ts:163`,
  `depuisPrisma.ts:230`. La chaîne C1 recalcule de même chaque passation
  incluse (`clinical-engine/chaineC1.ts:177`).
- **Snapshot** : avant [[D-359]], le prédicat générique exigeait chaque item
  présent et numérique (`clinicalSnapshot.ts:31`) et écartait l'agenda entier
  pour une seule rubrique absente ou nulle — passation `not_calculable`,
  finding `missing_data` (`clinicalReview.ts:156`), source `to_verify`
  (`clinicalSnapshot.ts:323`).
- **Cartes** : `questionnaireFindings`, `sourceRefs` et le besoin 5 entrent
  dans l'empreinte du snapshot (`clinicalSnapshot.ts:351`), donc dans celle de
  la carte, que le portail rejoue avant de servir un protocole
  (`rejeuCarteDecision.ts:35`).

## 2. Compte en production (conteneur, lecture seule, 2026-10-24)

- 13 agendas clôturés, tous `VALID`. Trois formes : sous le seuil
  d'agrégation (le seul nombre de nuits), clôturé avant le contrat v4 de
  [[D-271]] (sans `AGD_NB_NUITS_LAT` ni `AGD_NB_NUITS_FREQ_WASO`, que
  l'indice ne lit pas), complet ; répartition par forme et par indice masquée
  (moins de cinq dossiers, [[D-298]] §3). Aucune valeur `null` stockée.
- Le snapshot n'acceptait que l'agenda complet, quand les routes comptent tout
  agenda à indice : l'écart est réel ; effectif et répartition masqués (moins
  de cinq dossiers).
- Assignations en attente : 12 dossiers ; les autres statuts sont masqués
  (moins de cinq dossiers).
- 8 épisodes confirmés incluent un agenda (7 dossiers), tous en `v15`.
- Approbations de diffusion actives : 3 dossiers ; répartition masquée
  (moins de cinq dossiers). Une partie repose sur un épisode qui inclut un
  agenda que le snapshot écartait.

## 3. Ce que l'entrée au snapshot fait dériver

- Valeurs servies : aucune. Les routes comptaient déjà l'agenda.
- Version du score : inchangée. `calculerEquilibre` ne change pas ; seul le
  filtre d'entrée du snapshot change. Un changement de version, comme un
  changement de version du schéma du snapshot, éteindrait toutes les
  approbations actives ([[D-329]] §4).
- Cartes : celles dont l'épisode inclut un agenda que le snapshot écartait.
  Un agenda sans indice cesse d'être `not_calculable` : son finding
  `missing_data` disparaît et sa source passe à `calculated`, ce qui change
  l'empreinte sans changer de chiffre. En production, les approbations
  concernées sont à réapprouver (§4) ; effectif et répartition masqués (moins
  de cinq dossiers).

## 4. Arbitrages du responsable (2026-10-24, questions à options)

1. **Découpage** : deux lots, J3-12g d'abord, r3_10 ensuite. Le motif de
   r3_10 décrit les routes et ne nomme que l'écart qui reste.
2. **Règle** : le snapshot accepte tout agenda clôturé — la passation entière
   est ce que la clôture a écrit. Écartées : « seulement l'agenda à indice »
   (un agenda court resterait dit « incomplet ») et « les rubriques que
   l'indice lit » (même défaut pour les agendas sous le seuil d'agrégation).
3. **Diffusions actives** : réapprobation par le praticien après le
   déploiement, sans changement de version ; constat par conteneur ensuite.
4. **Emplacement de l'inventaire** : ce dossier.
