### Décisions

- **D-045 — Le moteur de propositions de parcours ouvre avec quatre règles,
  chacune sur un signal exact, et la dysphagie n'y devient pas une vigilance.**
  Décision utilisateur du 2026-08-11, LOT-03 de la campagne
  `2026-08-10-chaine-alimentaire`. Le dossier de règles candidates (PR #654)
  listait huit parcours déclenchables au tour 1 ; l'arbitrage en publie
  **quatre**, et elles seules :
  - **`R-PARC-ALI-01` — assiette de détoxication** (`WN-CL-0287-009`,
    « lorsque le score global de l'enquête alimentaire SiiN détaillée est
    défavorable »). Déclencheur `Q_ALI_01` en zone `{type:'interpretation'}`,
    citant au caractère près les **deux bandes défavorables** de la forme
    SIIN57 (`alimentaire.ts:312-313`) ; la bande `info` (51-70) reste dehors,
    comme `R2-ALI-01` l'a tranché le 2026-08-04. **Aucun claim neuf** : c'est
    la seconde branche de `WN-CL-0287-009`, celle que `R2-ALI-01` a dû
    abandonner faute de cible parcours (`orientationRulesV1.ts:1082-1084` —
    l'assiette de détoxication « n'est PAS un questionnaire »).
  - **`R-PARC-ALI-02` — éviction du gluten / méditerranéen adapté**
    (`WN-CL-0072-031`, `WN-CL-0076-018`, « en cas d'intolérance au gluten ») :
    drapeau `intolerancesAlimentaires` = « Gluten ».
  - **`R-PARC-ALI-03` — régime à faible teneur en histamine**
    (`WN-CL-0250-001`, `WN-CL-0251-011`, « chez les sujets présentant des
    symptômes d'intolérance à l'histamine ») : `intolerancesAlimentaires` =
    « Histamine ».
  - **`R-PARC-ALI-04` — alimentation mixée** (`WN-CL-0389-024`,
    `WN-CL-0386-008`, `WN-CL-0387-016`, « en cas de troubles de la
    déglutition ») : `symptomesFonctionnels` = « Difficultés à avaler /
    troubles de la déglutition ».

  Bornes non négociables inscrites par la décision : **jamais
  d'auto-assignation** (le praticien lit, valide, amende) ; une **dysphagie
  récente inexpliquée reste un motif d'adressage** — `R-PARC-ALI-04` propose une
  texture *à côté* de cet avis, sans l'éteindre ni le retarder, et
  `symptomes_fonctionnels` **reste hors `extraireVigilanceDeterministe`** (une
  vigilance dysphagie serait une décision propre) ; **fail-closed, `null` jamais
  `0`** ; les **anamnèses antérieures à la PR #655 restent muettes** (pas de
  rattrapage rétroactif) ; le **texte libre** « Allergies et intolérances
  connues » n'est jamais un déclencheur ; **rien de la biologie** (groupe B
  §4.B hors moteur) ; **aucun des 16 claims porte-seuil** n'est mobilisé. Le
  drapeau `WN_ALI_01_SIIN57` est respecté **par construction** : citer les
  bandes verbatim — et non une couleur — fait que la règle cesse d'elle-même de
  mordre en forme COURT14.

  Écarté : **publier tout le groupe A** (7 parcours — le psychobiotique dépend
  de l'axe A5, gaté par la porte des 21 jours ; le sérotoninergique demande un
  appariement non tranché) ; **déclencher sur un antécédent adjacent** façon
  `R2-GAS-02` (« Digestif (SII…) » pour le gluten, « Allergies / atopie » pour
  l'histamine), écarté au profit du signal exact capté en #655 ; **lire le texte
  libre** ; **porter la dysphagie en vigilance** dans le même geste.

Aucun code moteur, aucune migration, aucun seuil clinique dans ce commit — la
décision d'abord. Le moteur lui-même (table de règles, cible parcours, objet
persisté en migration séparée, derrière drapeau éteint) suit.
