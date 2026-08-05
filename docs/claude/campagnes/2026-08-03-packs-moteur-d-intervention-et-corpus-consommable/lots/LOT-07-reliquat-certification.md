---
id: "LOT-07"
titre: "Reliquat de certification — bibliographie et psychométrie"
statut: "livré"
dépend_de: "aucun"
palier: "T1"
---

# LOT-07 — Reliquat de certification : bibliographie et psychométrie

## But

Solder ce qui reste vraiment de la certification des questionnaires, et écrire
noir sur blanc ce que le mot « certifié » recouvre — et ce qu'il ne recouvre pas.

## Le constat

La campagne de certification est close (`#528`) et le score-check est vert. Mais
le vert porte sur le **calcul**, pas sur l'instrument :

| Champ | État au 2026-08-03 |
|---|---|
| `statutBibliographique: a_completer` | 11 entrées sur 64 |
| `cosmin` | `inconnu` sur les 64 |
| `measurement_evidence.json` | 0 étude |

`statutCertification: scoring_verifie` (60 entrées sur 64) atteste que le scoring
a passé le banc `certify`. Un lecteur pressé y lira « instrument validé ». Rien,
aujourd'hui, ne l'en empêche.

## Résultat observable

- Les 11 entrées `a_completer` portent une référence ou un motif écrit
  d'impossibilité.
- La documentation de gouvernance distingue explicitement scoring vérifié et
  validité psychométrique.

## Périmètre

- Compléter les 11 entrées `statutBibliographique: a_completer` de
  `docs/claude/corpus/instrument_registry.json`.
- Renseigner `cosmin` là où une preuve existe ; laisser `inconnu` et le dire
  ailleurs.
- Amorcer `measurement_evidence.json` avec les études effectivement trouvées.
- Écrire la distinction dans `docs/gouvernance-questionnaires-scoring.md`.

## Hors périmètre

- Toute modification de scoring, de seuil ou d'interprétation.
- Toute réouverture de `Q_GEO_04` ou `Q_PED_03`.
- Toute promotion de statut de certification sur la seule foi d'une référence
  bibliographique.

## Fichiers probables

- `docs/claude/corpus/instrument_registry.json`
- `docs/claude/corpus/measurement_evidence.json`
- `docs/gouvernance-questionnaires-scoring.md`
- `scripts/check_questionnaire_certification.js`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de référence inventée : une entrée sans preuve reste `a_completer` avec son
  motif.
- Pas de changement de logique clinique.
- Pas de refactor hors lot.

## Étapes

- [ ] Lister les 11 entrées et ce qui manque à chacune.
- [ ] Chercher les références ; consigner les impasses comme telles.
- [ ] Amorcer `measurement_evidence.json`.
- [ ] Écrire la distinction scoring / psychométrie dans la gouvernance.
- [ ] `node scripts/check_questionnaire_certification.js` puis `npm run check`.

## Tests

- Le score-check reste vert sur les 64.
- Une entrée `a_completer` sans motif écrit fait échouer le garde.

## Critères de done

- [ ] Les 11 entrées sont complétées ou motivées.
- [ ] La distinction est écrite dans la gouvernance.
- [ ] Aucun statut de certification n'a été promu.

## Résultats

Clos le 2026-08-04. Le lot annonçait 64 instruments et 11 entrées `a_completer` :
le dépôt en portait **65** et **12**.

**Ce qui a été trouvé.** Sur les dix instruments publiés, trois seulement ont une
publication d'origine assortie d'un identifiant vérifiable : `Q_SOM_06`
(PMID 6524792), `Q_PED_01` (PMID 15971640 + DOI) et `Q_ALI_03` (PMID 11431607).
Trois autres ont une référence d'origine **localisée mais non indexée**
(`Q_NEU_03`, `Q_TAB_01`, `Q_TAB_03`) ; quatre n'en ont aucune (`Q_STR_03`,
`Q_NEU_12`, `Q_FIB_03`, `Q_URO_02`), et deux n'en auront jamais — `Q_SOM_09` et
`Q_ALI_09` sont des instruments créés par WellNeuro.

**Deux promotions, pas trois.** `Q_ALI_03` a été redescendue en `a_completer` en
revue : le code déclare l'instrument **débaptisé** — « il n'est plus selon
Monnier » — et sert 23 items quand la publication en décrit 8. Attacher son PMID
aurait fait certifier par un identifiant une forme qu'il ne certifie pas. Le lien
reste documentaire, dans le motif. État final : 43 `reference_identifiee`,
12 `referentiel_interne_siin`, 10 `a_completer` toutes motivées, **2 entrées
seulement** portant un DOI ou un PMID.

**Ce que le lot a découvert et n'a pas tranché** — trois écarts cliniques,
remontés au praticien : `Q_STR_03` (source cotée 1-6, étendue 11-66 ; le dépôt
sert 0-5, `maxTotal: 55`, et alimente Mon Équilibre), `Q_FIB_03` (si l'item servi
est l'examen des 18 points sensibles, sa source est le critère ACR 1990, pas
l'ELFE), `Q_NEU_03` (l'éditeur date le manuel de 1998, le registre de 1992).
Aucune `verdictScoring.reserve` n'a été posée : c'est une décision clinique.

**Ce que le lot ouvrait sans le voir.** Écrire les trois premières lignes de
`measurement_evidence.json` rendait le barreau `psychometrie_revue` franchissable
pour `Q_PED_01` — son garde ne testait que la **présence** d'une preuve, jamais sa
conclusion, et les trois lignes concluent `inconnu`. Trouvé en revue adversariale,
fermé dans le lot : le barreau exige désormais une preuve **graduée** et un
`cosmin` posé. Le CI classait par ailleurs `measurement_evidence.json` en
`docs_only` — il pouvait être édité seul, `verify` vert, sans qu'aucun contrôle
ne le lise ; il rejoint le registre du côté « code ».

**Le banc a été vu échouer.** Quatre mutations éprouvées, dont deux ont survécu
au premier passage : le **déplacement** du contrôle hors de la boucle (banc à une
seule entrée — angle mort déjà rencontré le 2026-08-03), puis, après correctif,
le déplacement vers la **dernière** entrée. Refermés par un cas à trois entrées,
faute au milieu. 65 tests, T1 vert.
