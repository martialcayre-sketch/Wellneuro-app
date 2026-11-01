# Registre sanitaire du corpus clinique

`source_registry.json` contient 569 notices normalisées : 391 issues du pack WN
Ultimate v2 (`NNFC1_Annee1`, `NNPP2_Annee2`), 116 instruments du cabinet
(`INSTRUMENTS_CABINET`), et 62 sources externes (`SOURCES_EXTERNES` — BP-07 :
avis d'agence, recommandation, essai, règlement, `WN-SRC-0508` à `0511`, puis
pour la position P5 v0.3 une recommandation de l'OMS, `WN-SRC-0555` ; besoin 2 :
trois avis d'agence, un rapport d'évaluation, une recommandation de pratique,
un résumé des caractéristiques du produit et une information de bon usage de
l'ANSM, `WN-SRC-0512` à `0518`, puis pour le zinc un avis du comité
scientifique de l'alimentation, un résumé des caractéristiques du produit, des
recommandations de la DGCCRF, un avis de l'EFSA, une fiche du NIH et un
règlement de l'Union, `WN-SRC-0519` à `0524` ; J3-12e : quinze sources de mesure en accès
libre des besoins 6 à 12 — études de validation, revues, documentation des
auteurs d'instruments —, `WN-SRC-0540` à `0554`, puis trois compléments en
accès libre des besoins 6, 8 et 12, `WN-SRC-0560` à `0562`, et quatre autres
des besoins 6, 8 et 12, `WN-SRC-0563` à `0566`, enfin quatre sources fournies
par le responsable pour les besoins 6, 8, 11 et 12, `WN-SRC-0567` à `0570` ;
besoin 2, magnésium : un avis du comité scientifique de l'alimentation, un
résumé des caractéristiques du produit et une fiche du NIH, `WN-SRC-0571` à
`0573`, les lignes du magnésium de la DGCCRF et de l'annexe XIII étant lues dans
`0521` et `0524` ; porte 4 (D-403) : deux recommandations de pratique sur le
sommeil, sources de contexte de deux bornes déclarées techniques, et les
repères de consommation de l'Assurance Maladie, `WN-SRC-0574` à `0576`, sans
extrait ingéré ; point d'étape (D-407 à D-413, m16) : huit articles et quatre
documentations d'instruments, sources de contexte des candidats écartés pour le
point d'étape, `WN-SRC-0577` à `0588`, sans extrait ingéré),
dont seuls des extraits ciblés sont ingérés. Le manuscrit soumis `WN-SRC-0546`
est `deprecated` : remplacé par sa version publiée `WN-SRC-0564`, ses claims ne
sont pas retenus. Les plages `0525` à `0539` et `0556` à `0559` sont
laissées à une autre session d'ingestion. Il s'agit d'un inventaire documentaire, pas d'un
corpus runtime.

## Politique de publication

- Les `sourceId` sont les seules références de localisation versionnées.
- URL, chemins, identifiants Drive et liens de doublons Drive restent dans un
  registre externe à accès restreint.
- Toutes les notices restent `clinicalReviewStatus: not_reviewed`. Elles
  restent aussi `rightsStatus: to_verify` tant que les droits de la source
  n'ont pas été vérifiés, même quand des extraits sont ingérés. Au 2026-09-27, sept notices sont `verified` : les Fiches MY dont la
  version adaptée est déposée (`WN-SRC-0297`, `0299`, `0300`, `0301`, `0302`,
  `0303`, `0305` ; `D-251` §2) ; au 2026-10-14, une huitième : l'avis EFSA
  `WN-SRC-0508`, licence CC BY-ND, dont les extraits sont ingérés (BP-07) ; puis
  une neuvième, le règlement (UE) n° 432/2012 (`WN-SRC-0511`), texte de l'Union ;
  au 2026-10-18, deux de plus pour le besoin 2 : la synthèse EFSA des limites
  supérieures (`WN-SRC-0513`, reproduction autorisée avec mention de la source)
  et l'avis EFSA sur la vitamine D (`WN-SRC-0514`, CC BY-ND), dont les extraits
  sont ingérés, puis le résumé des caractéristiques du produit publié par la
  Base de données publique des médicaments (`WN-SRC-0517`, Licence Ouverte
  etalab-2.0) ; l'avis de l'Anses, le rapport de la HAS, la recommandation de
  l'Endocrine Society et l'information de l'ANSM (`0512`, `0515`, `0516`,
  `0518`) restent à vérifier ; au 2026-10-20, quatre de plus pour J3-12e, les
  articles sous licence CC BY dont les extraits sont ingérés (`WN-SRC-0545`,
  `0550`, `0553`, `0554`) ; les onze autres sources de mesure (droits de
  l'éditeur, CC BY-NC, manuscrit soumis, pages des auteurs) restent à vérifier ;
  puis une de plus, la version publiée sous CC BY 4.0 de la validation
  française de la DARS (`WN-SRC-0564`) ; les compléments `0560` à `0563`,
  `0565` et `0566` restent à vérifier ; au 2026-10-20 encore, pour le zinc, dont
  les extraits des six sources sont ingérés (`WN-SRC-0519` à `0524`), une de
  plus : le résumé des caractéristiques du produit RUBOZINC (`WN-SRC-0520`,
  Licence Ouverte etalab-2.0) ; les cinq autres sources du zinc (`0519`, `0521`
  à `0524`) restent à vérifier ; au 2026-10-21, pour J3-12e, une de plus : la
  validation française du MLQ sous CC BY 4.0 (`WN-SRC-0569`) ; `0567`, `0568`
  et `0570` (droits de l'éditeur) restent à vérifier ; au 2026-10-21 encore,
  pour le magnésium (`WN-SRC-0571` à `0573`), une de plus : le résumé des
  caractéristiques du produit MAG 2 (`WN-SRC-0572`, Licence Ouverte
  etalab-2.0) ; `0571` et `0573` restent à vérifier ;
  la recommandation de l'OMS (`WN-SRC-0555`, tous droits réservés), dont un
  extrait court est ingéré pour usage interne sur arbitrage du responsable,
  reste à vérifier.
- Quarantaine sanitaire (`lifecycleStatus: quarantined`) : relue au registre
  à chaque déploiement, elle retire la source du rayon du corpus, jamais de
  la file de revue. Au 2026-11-01, 25 notices la portent : celles de
  `WN-SRC-0062`, `0241` et `0358` ont été levées sur relecture de la source
  entière attestée par le responsable (`D-405`).
- `contentHash` reste nul tant que le contenu probant n'a pas été obtenu,
  vérifié et autorisé.
- Aucune notice ne peut alimenter un prompt, un RAG, une règle, un document
  patient ou une décision clinique avant les gates G0–G4.
- Toute migration PostgreSQL/pgvector exige G5 ; le pilote
  sommeil/chronobiologie exige G6.

## État des gates (2026-07-21)

- **G0 acté** par décision utilisateur du 2026-07-21 (verdict global sur les
  droits des supports SIIN — `docs/claude/REGISTRE_FRONTIERES.md`, A9). Le
  passage `rightsStatus: verified` de chaque notice se fait **à l'ingestion
  de la source**, jamais en masse : une notice non ingérée reste `to_verify`.
- **G1–G4** : portés par la machine à états `NOTEBOOK_VALIDATIONS` (verdict
  CONFORME + preuve + validateur + date, par notebook).
- **G5 acté** par la PR #196 (migration `20260721090000_add_pgvector_rag`,
  relue et corrigée après audit).
- **G6** : non ouvert.

La date source déclarée par le pack est le 2026-07-14. L'audit et
l'intégration réels ont été réalisés le 2026-07-13.

## Registres dérivés

Trois registres coexistent, de portées disjointes. Les confondre est l'erreur à
éviter : une source est soit un instrument de mesure, soit une conduite, jamais
les deux.

| Fichier | Ce qu'il désigne | Garde |
|---|---|---|
| `source_registry.json` | l'inventaire documentaire — toutes les notices | — |
| `instrument_registry.json` | les 65 instruments du catalogue et leur certification de **scoring** | `npm run scoring-check`, `registry-check` |
| `nnpp2_interventions_registry.json` | les sources qui portent une **conduite** — fiches de synthèse, ordonnances commentées, protocoles, doctrine d'exploration | `npm run interventions-check` |

`nnpp2_interventions_registry.json` (LOT-00 de la campagne
`2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`) retient **95
sources sur 11 notebooks**, sélectionnées par un critère rejouable — `documentType`
∈ {Protocole / outil décisionnel, Synthèse clinique, Outil clinique} ∪ motif de
titre, moins le notebook 00. Le champ déclaré prime sur le titre : le titre seul
ratait 51 sources sur 99, dont toute la doctrine d'exploration.

Deux propriétés à ne pas défaire :

- **La disjonction avec `instrument_registry.json` est gardée.** Aucune source
  d'intervention n'y est rattachée (mesuré nul au 2026-08-03) ; un instrument
  relève du banc `certify`, pas de la chaîne de claims.
- **Les compteurs de claims sont un instantané daté** (`claims.mesureLe`), lu en
  production. Le garde ne les confronte pas à la base : le CI n'y a pas accès, et
  un compteur périmé ne doit pas rougir le CI.

## Ce que « certifié » veut dire ici (D-034, 2026-08-08)

`statutCertification: scoring_verifie` dans `instrument_registry.json` signifie
**une seule chose** : le code reproduit fidèlement la règle enregistrée — items
servis conformes à la source, moteur de scoring vérifié par le banc `certify`.

Cela ne dit **rien** de la qualité psychométrique de l'instrument : ni validité
de construit, ni fidélité, ni étalonnage des seuils sur une population. Un
instrument peut être `scoring_verifie` et n'avoir jamais été validé — c'est
d'ailleurs le cas des 65.

**Et c'est une décision, pas une lacune.** D-034 (2026-08-08) tranche : la
validation psychométrique **n'entre pas au programme**. Wellneuro sert ces
instruments pour **repérer et préparer une consultation**, pas pour mesurer. Ce
qui suit sur COSMIN en découle et n'est plus une dette ouverte.

## COSMIN : inconnu, et pourquoi (LOT-06, 2026-08-07)

Le champ `cosmin` d'`instrument_registry.json` vaut **`inconnu` pour les 65
instruments** — aucun n'est gradé A, B ou C. Ce n'est ni un oubli ni une lacune
à combler au fil de l'eau, et cela s'écrit une fois ici plutôt que soixante-cinq
fois dans le registre.

- **`inconnu` est la valeur par défaut du vocabulaire fermé** (`A|B|C|inconnu`),
  et c'est la seule qui **n'affirme rien**. Un grade affirme la qualité
  psychométrique d'un instrument ; l'écrire sans l'avoir établi serait le
  défaut que la campagne de certification s'emploie précisément à éviter.
- **Le champ n'est pas alimentable à la main.** Le banc
  `scripts/lib/verifier_registre_instruments.js` refuse tout grade autre
  qu'`inconnu` qui ne soit pas adossé à une **étude concordante** de
  `measurement_evidence.json`, et refuse également une preuve graduée sans
  grade. Renseigner COSMIN suppose donc d'ingérer d'abord les études de
  validation — travail exclu de la campagne de clôture des dettes, qui ne
  produit aucune nouvelle source de savoir.
- **Conséquence à ne pas oublier** : « certifié » au sens de ce registre veut
  dire *le code reproduit la règle enregistrée*. Cela ne dit rien de la qualité
  psychométrique de l'instrument (#560). L'état COSMIN est la mesure de ce
  silence, et il est assumé comme tel.
