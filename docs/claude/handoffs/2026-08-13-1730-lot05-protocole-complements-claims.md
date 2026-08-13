# LOT-05 — Protocole structuré et compléments avant biologie : le moteur livré, la permission non ouverte

- **Branche** : `claude/lot-05-campagne-t0`, vivante, partie de `459e0a7867ee`
  (`origin/main` contenu).
- **Campagne** : chaîne T0 opérationnelle. Lot actif LOT-08 → LOT-05
  (bookkeeping resynchronisé dans ce diff — `ACTIVE_CAMPAIGN.md` avait dérivé
  depuis l'ouverture).
- **Décision** : `D-056` (six arbitrages), au registre, acceptée par arbitrage
  utilisateur du 2026-08-13 après relecture de la production.

## Le fait qui a décidé de la forme du lot

Relu en production (`execute_sql`, lecture seule, 2026-08-13) **avant** d'écrire
une ligne : la couche *matière* du catalogue C4 est peuplée
(`supplement_ingredients` 3 444, `supplement_products` 140 148) ; la couche
*décision* est **entièrement vide** — `clinical_rules`, `clinical_intent_tags`,
`supplement_source_references`, `supplement_safety_alerts`,
`ingredient_functional_thresholds`, `functional_categories` : zéro ligne, aucun
seed, et `clinical_rules` porte des FK non nulles vers deux tables vides.

Deux conséquences, et la seconde est le vrai danger :

1. la condition 1 de la spec (règle C4 validée) est **insatisfiable** ;
2. les conditions négatives — « aucune alerte active », « seuils respectés » —
   seraient **vraies par vacuité** : elles passeraient parce que rien n'a été
   examiné, non parce que le complément est sûr.

C'est le **quatrième exemplaire** du même motif : `D-052` (le `VALID`
tautologique), `D-053`/`D-055` (le `group_majority` muet), #482/#489 (`[]` lu
« aucun conflit » là où il faut lire « rien n'a été examiné »).

Arbitrage retenu : **le lot livre le moteur, pas la permission.**

## Ce que le lot livre

1. **Contrat V4** (`c1-protocol-draft-v4`, payload JSON, aucune migration) :
   `observation`, `medical_referral`, statut d'intervention à cinq valeurs,
   `waitFor` biologique, phases V1. Le statut est **requis** en V4, **interdit**
   avant, **sans repli sur « active »**. Les phases citent des `actionId`.
2. **Empreintes V1/V3 prouvées inchangées** — mesurées des deux côtés du
   changement (`git stash` des fichiers touchés, sonde rejouée, valeurs
   identiques) puis figées dans `protocolV4.test.ts`. La clé `phases` n'est
   ajoutée qu'en V4 et `canonicalJson` ignore les `undefined`.
3. **Règle de décision fail-closed** (`decisionAvantBiologie.ts`, module pur) :
   verdict motivé, jamais un booléen. Alertes gardées au niveau **catalogue**,
   seuils au niveau **ingrédient** — les deux tables ne se lisent pas de la même
   manière, et confondre les deux grains rendrait l'un des deux gardes inutile.
   Condition supplémentaire illisible ⇒ refus. Déclencheur = tableau clinique ;
   test négatif tyrosine/mélatonine.
4. **Garde LLM compléments** : nom du catalogue **en contexte prescriptif**,
   recherche par **mot entier** (« ferritine » ne vaut pas « fer »), fonction
   **séparée** du garde d'orientation.
5. **Rendu patient** : « en attente de confirmation par votre bilan », phrase
   patient jamais dérivée de `waitFor.cible`.

## Deux pièges rencontrés, à ne pas re-découvrir

- **`buildProtocolDraft` retire les références gouvernées** (`foodCompassRef`,
  `supplementCatalogRef`) : le patron du dépôt est une fonction d'attache
  dédiée après construction (`attachFoodCompassRef`), qui rehache et bump la
  version. Ne pas « corriger » le builder en croyant à un oubli.
- **`patientProtocolView.ts` porte sa propre liste `ACTION_TYPES`**, distincte
  de celle du builder — à dessein : ce qu'un patient a le droit de voir n'est
  pas ce qu'un praticien a le droit de composer. Tout nouveau type d'action doit
  être ajouté aux **deux**, sinon la diffusion échoue.

## Validation

- **T1 vert** (`npm run check`, 313/313).
- **Suite Vitest complète verte** : 400 fichiers, 4 708 tests, 1 ignoré.
- **T2/T3 non jouables dans ce conteneur** : `wn-test-worktree.sh` commence par
  `npx playwright install chromium webkit`, et la politique réseau de
  l'environnement distant refuse le CDN Playwright (403). Ce n'est pas un
  échec de code — les E2E relèvent du Mac et du CI (`D-049`). **Le segment E2E
  reste à jouer avant merge.**

## Dettes nommées, non résolues ici

- **Peupler le catalogue de décision C4** — contenu clinique sourcé (claims
  certifiés, validation praticien) : lot distinct. C'est le seul déblocage réel.
- **`DC-39`** : distinguer interventions compatibles simultanément et à tester
  séquentiellement est un arbitrage clinique par type d'intervention, à
  instruire depuis des sources, jamais à déduire (`DC-19`).
- **Vigilances de discordance** (moitié non livrée de l'étape 5 du LOT-01) :
  **PR séparée**, diff d'une seule finalité. `fusionnerVigilance`
  (`synthese/route.ts:386` et `:529`) existe et sert déjà les vigilances
  d'anamnèse ; seule la source discordance manque.

## Prochaine action

Revue `wn-reviewer` (lot clinique), puis PR brouillon et CI. Vérifier après
merge, en lecture seule, qu'aucune intention de complément n'existe et que le
catalogue de décision est toujours vide — la démonstration que le lot n'a rien
ouvert.
