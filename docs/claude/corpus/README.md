# Registre sanitaire du corpus clinique

`source_registry.json` contient 391 notices normalisées issues du pack WN
Ultimate v2. Il s'agit d'un inventaire documentaire, pas d'un corpus runtime.

## Politique de publication

- Les `sourceId` sont les seules références de localisation versionnées.
- URL, chemins, identifiants Drive et liens de doublons Drive restent dans un
  registre externe à accès restreint.
- Toutes les notices restent `rightsStatus: to_verify` et
  `clinicalReviewStatus: not_reviewed`.
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
