# NOTE DE CADRAGE — Chaîne alimentaire WellNeuro (lecture seule, 2026-08-10)

**Reformulation.** Établir l'état codé de la chaîne alimentaire (instruments Q_ALI, agenda 21 jours, boussole, 12 besoins, carnet/spirale), esquisser un moteur de scoring agenda **en interface, pas en barème** (porte des 21 jours posée par la campagne elle-même), cartographier les chemins vers Mon Équilibre, et esquisser un moteur de propositions alimentaires réutilisant le précédent architectural du moteur d'orientation et le pipeline de synthèse existant. Aucun seuil clinique ne se décide ici.

**Limite de la note.** La lecture de production n'était pas accessible depuis ce contexte ; l'état du recueil cité est celui consigné le 2026-08-07 (`.wn/state.json:64`) : **2 journées, toutes deux du 2026-08-05, sur 1 seule assignation** (dossier de contrôle PAT006). Toute décision de calibrage devra être précédée d'une relecture fraîche via l'outil MCP `execute_sql`.

---

## (a) État des lieux du codé

Les répertoires réels diffèrent des noms supposés : pas de `web/src/lib/food-observation/` nommé « carnet », pas de « boussole » nommée ainsi. La carte réelle :

**Instruments Q_ALI** — `web/src/lib/questionnaires/alimentaire.ts`
- `Q_ALI_01` : **deux formes sous drapeau** `WN_ALI_01_SIIN57` (alimentaire.ts:405-406). Forme SIIN 57 items /90, moteur `seuils_points`, certifiée (alimentaire.ts:52-316, barème :193-256, 12 dimensions descriptives :271-284, sous-score `RYTHME_CHRONO` servi au besoin 3 :302-304, 4 bandes :309-314) ; forme courte 14 items /42, moteur `sum`, seuils provisoires non certifiés (alimentaire.ts:328-394, avertissement :373-384). Le drapeau est **allumé en production, éteint partout ailleurs** (orientationRulesV1.ts:1024-1025).
- `Q_ALI_02` (MEDAS, 14 items /14, certifié — alimentaire.ts:408-455) et `Q_ALI_03` (apports pondérés, débaptisé, **aucun seuil par choix de la source** — alimentaire.ts:505-609). Ni l'un ni l'autre n'alimente Mon Équilibre ni aucune règle d'orientation publiée.
- `Q_ALI_09` (agenda 21 jours) : `sections:[]` et `scoring:{type:'journal'}` **par décision** — « un barème posé avant la première passation serait une donnée clinique inventée » (alimentaire.ts:613-685, spécialement :619-631). Le moteur `journal` rend `scored:false` (questions.ts:3761-3768). Statut registre : `repere`, `sourceMonEquilibre: false` (instrument_registry.json:2794-2831).

**Agenda alimentaire (domaine)** — `web/src/lib/agenda-alimentaire/`
Domaine pur complet : contrat versionné `agenda-alimentaire-v1` (types.ts:44-45), journée 04:00→03:59 (types.ts:56), seuils d'exploitabilité (7 j agrégats, 14 j indice, 4 week-ends, 7 paires de jeûne — types.ts:66-78), bornes de plausibilité (fenêtre 18 h :87, jeûne 24 h :95), trois états par présence (`true`/`false`/`null` abstention — types.ts:116-161). Agrégats calculés en pur : couverture, jeûne médian, fenêtre, écarts-types des ancres, structure repas/hors-repas, fréquences de contenu (agregats.ts:27-64). Persistance append-only, table `agenda_alimentaire_jours`, corrections chaînées par `supersedesJourId` (persistence.ts:6-9). Drapeau `WN_AGENDA_ALI` fail-closed pilotant assignabilité ET visibilité (featureFlag.ts:36-38, angle mort de l'extracteur statique documenté :27-35). Lecteur praticien livré : `web/src/components/agenda-alimentaire/AgendaAlimentairePraticienPanel.tsx` (LOT-05). **Ce qui manque : aucun `cloture.ts`** — contrairement au jumeau sommeil, rien ne transforme le recueil en `QuestionnaireReponse`.

**Boussole alimentaire (C5)** — `web/src/lib/food-compass/`
Profils intrinsèques Ciqual, lecture contextuelle, assiettes, manifeste de 12 aliments vedettes hashé (manifest.ts:1-20), drapeau `WN_C5_ENABLED` (featureFlag.ts:1-3). Campagne `2026-07-11-boussole-alimentaire-slice-v1` : « terminée — 8/8, activation production demandée » (CAMPAGNE.md frontmatter). C5 « n'est ni un graphe, ni un score patient, ni un moteur autonome de décision » ; consomme priorité C1, protocole C2, faisabilité JA.

**Carnet / spirale alimentaire (JA)** — `web/src/lib/food-observation/`
Épisodes à trois régimes `calibrage | essai | silence` (types.ts:33), carrière d'action (types.ts:89-95), traces d'essai, frictions à registre fermé, journées repères, dérivation d'épisode depuis le protocole diffusé (episodeDepuisProtocole.ts:4-38). Interdits de conception : aucune valeur nutritionnelle, aucun score, **aucune projection vers Q_ALI_01/Q_ALI_02** (types.ts:5-10). Campagne `2026-07-13-journal-alimentaire-21j-v1` (« Ma spirale alimentaire ») : lot `JA5-05` en_cours, **figé depuis le 2026-07-17, en attente d'arbitrage utilisateur** (.wn/state.json:44).

**Mon Équilibre** — `web/src/lib/equilibre/` (voir (c)).

**Scoring transversal** — `web/src/lib/scoring/` : `scoresPourPrompt.ts` (filtre), `reponsesLisibles.ts` (traduction des tranches Q_ALI en libellés pour le modèle — cité alimentaire.ts:40-45), `miniSynthese.ts`, `passationsNonInterpretables.ts`, `rubriques.ts`. Le moteur générique est `computeScoreFromDef` dans `web/src/lib/questions.ts` (dispatch par `sc.type`).

**Fiches conseils** — la campagne `2026-07-11-fiches-conseils-contextuelles-v1` a été **renommée C3 « Documents contextuels multi-destinataires »**, livrée V1 (`web/src/lib/documents/` : blocs, rendu, versioning, bilanPatient). C3 ne possède aucun contenu clinique source. Le « rayon fiches conseils » visé est un **nouvel objet**, distinct aussi de `web/src/lib/supplement-library/rayonCorpus.ts` (hypothèse tranchée) — nommé en lot candidat L5, brainstorming hors périmètre.

---

## (b) Esquisse du moteur de scoring agenda — interface, pas barème

**Entrées réellement disponibles.** Par journée : `prises[{heure, nature}]`, `aucunePrise`, `premierePriseProteines` (bool|null), `soirPlusCopieux` (bool, sans abstention), trois présences tri-état (types.ts:135-161). Par recueil : les ~20 agrégats de `AgregatsAgendaAli` (agregats.ts:27-64), déjà codés et testés, avec leurs dénominateurs de couverture. Recueil réel : **2 journées / 1 assignation** — rien à calibrer, et la campagne l'écrit elle-même (CAMPAGNE.md:123 et :151-152).

**Précédent architectural à copier, pièce par pièce** (agenda du sommeil, seul autre instrument longitudinal scoré) :
1. **Chemin de clôture unique et idempotent** : `web/src/lib/agenda-sommeil/cloture.ts:20-100` — agrégats → `rawAnswers` (pseudo-items `AGD_*`) → `computeScoreFromDef` → `QuestionnaireReponse` **standard** sous verrou de ligne. La compatibilité fiche/inbox/mini-synthèse/équilibre est automatique (cloture.ts:11-16). C'est la pièce absente côté alimentaire.
2. **Scorer dédié dans le dispatch** : `questions.ts:3783-3910` (`agenda_sommeil`) — le gabarit exact : refus sous `minNuits`/couverture week-end avec motif (:3790-3803), plancher de couverture **par axe** (:3819-3825), axe non couvert = `null` renormalisé, jamais 0 (:3827-3844), refus sous 3 axes couverts (:3846), **drapeaux cliniques jamais des points** (:3866-3896). Le futur `agenda_alimentaire` s'insérerait à côté, `Q_ALI_09` passant de `type:'journal'` à ce type à la clôture seulement.
3. **Restitution au modèle de synthèse** : les agrégats bruts pourraient transiter par `scoresPourPrompt`/`reponsesLisibles` comme les autres Q_ALI (synthese/route.ts:253-255) — même sans indice.

**Sorties qui auraient du sens** (à affiner sur données réelles, jamais à livrer maintenant) : restitution brute structurée (jeûne médian, fenêtre, régularité, structure, fréquences de contenu — déjà calculée) ; à terme un indice /100 sur le modèle 4-5 axes /25 renormalisés ; des drapeaux (fenêtre > 18 h récurrente, hors-repas fréquents) — mais **les axes retenus, leurs poids, la borne des 18 h « supposent une distribution réelle »** (alimentaire.ts:627-631). La constante `FENETRE_ALI_MAX_PLAUSIBLE` (types.ts:87) est une borne de plausibilité de recueil, pas un seuil clinique — ne pas la promouvoir.

**Manque nommé, et le vrai bloquant** : ce n'est plus un prérequis technique, c'est le recueil lui-même — arrêté au premier jour depuis le 2026-08-05 (.wn/state.json:37-38). Relancer la saisie (pilote ou vrais patients) est une action humaine préalable à tout LOT-06.

---

## (c) Chemins vers Mon Équilibre / 12 besoins / boussole

**Ce qui existe.**
- `BESOIN_SOURCES` (equilibre/constants.ts:243-292) : besoin 1 « Équilibre de l'assiette » ← `Q_ALI_01` total, **max dérivé de la forme servie, jamais littéral** (:244, justification :2-5) ; besoin 3 « Rythme alimentaire » ← sous-score `RYTHME_CHRONO`, `MAX_RYTHME_CHRONO` dérivé du barème, **vaut 0 drapeau éteint** → besoin non mesuré, jamais 0 (:182-194, :253). Besoins 2, 6, 7, 11 : vides par décision (:247, :277-278, :290).
- Version du score **suit le drapeau** : `VERSION_SCORE_EQUILIBRE = maxTotal===90 ? 'v13' : 'v12'` (constants.ts:171) ; doctrine « versions différentes jamais soustraites » et coût du bump (momentum coupé) documentés :125-131.
- Lecture : `depuisPrisma.ts:38-57` recalcule depuis `scoresJson.rawAnswers` (jamais le score stocké), dernière réponse par questionnaire ; garde `formeAlimentaireServie.guard.test.ts` et `porteursSousScore.guard.test.ts` verrouillent le branchement.
- Registre : le champ `sourceMonEquilibre` de `instrument_registry.json` est contrôlé dans les deux sens par `scripts/lib/verifier_registre_instruments.js` (constants.ts:239-242). `Q_ALI_09` y vaut `false`.
- **L'agenda n'alimente pas le besoin 3, et c'est une décision** (alimentaire.ts:643-649, agenda-alimentaire/types.ts:22-29) : trois porteurs d'un même thème créeraient une double mesure — le piège déjà documenté pour `RYTHME_ALIMENTAIRE`/10 vs `RYTHME_CHRONO`/7.

**Sens des dépendances** (sain, à préserver) : `equilibre/constants.ts` importe le catalogue (`Q_ALI_01`, :5) ; `agenda-alimentaire/` est pur et n'importe rien de l'équilibre ; `food-compass/` est indépendant des deux ; `food-observation/` importe un type de `food-compass` (types.ts:1). Aucun cycle.

**Manques nommés.**
1. **L'objet de discordance rythme déclaré vs observé n'existe pas** — c'est la valeur clinique explicitement visée en remplacement du branchement direct (alimentaire.ts:651-658) ; contrainte déjà posée : rendre `null` (jamais 0) sous la forme courte où `MAX_RYTHME_CHRONO = 0`.
2. Le besoin 1 ne mesure qu'une **exposition déclarée** (alimentaire.ts:47-50) ; aucune source observée ne le complète.
3. `Q_ALI_02` et `Q_ALI_03` n'alimentent rien (ni besoin, ni règle) — sortie brute seulement.
4. La boussole (C5) ne lit aucun score alimentaire : elle lit priorité C1 / protocole C2 / faisabilité JA, par contrat.

---

## (d) Esquisse du moteur de propositions alimentaires

**Le précédent architectural est complet et réutilisable tel quel.**
- **Moteur déterministe pur** : `clinical/orientationEngine.ts:610-804` — règles `publiee` seulement, ET logique des déclencheurs, traçabilité claim par claim obligatoire (:618-620), filtre dur d'administrabilité fail-closed (:591-608), absorption pack/membres (:702-795), tri déterministe. Gardes de recueil partiel et de plancher (:157-313, :380-483).
- **Table de règles versionnée** : `clinical/orientationRulesV1.ts` — et il existe **déjà une règle alimentaire publiée** : `R2-ALI-01` (:997-1076), qui lit la bande globale /90 de `Q_ALI_01` **verbatim** (solidaire du drapeau : la forme courte ne déclenche pas, :1031-1043) et propose le pack digestif sur le claim `WN-CL-0287-009`.
- **Recalcul depuis `rawAnswers`** : `orientationService` ignore le score stocké (orientationEngine.ts:11-16) — piège de banc : deux gestes nécessaires (`WN_ENABLE_ORIENTATION_NNPP2` + `rawAnswers`, .wn/state.json:41).
- **Injection dans la synthèse IA** : `api/praticien/synthese/route.ts:176-211` (`buildBlocOrientation` — version + SHA-256 de la table dans le prompt), :213-263 (filtrage/traduction des scores). `VERSION_PROMPT_SYNTHESE = 'synthese-v19'` (anthropic.ts:207) ; « la couche déterministe décide, le LLM formule » (règle clinique du dépôt).
- **Aval praticien** : `clinical-engine/protocolDraft.ts`, `decisionCard.ts`, `patientProtocolView.ts` (protocole proposé → validé → diffusé) ; puis `food-observation/episodeDepuisProtocole.ts:4-38` (épisode d'essai dérivé du protocole diffusé, calibrage avant protocole :25-38), `actionCareer.ts` (adhésion à travers les tours), météo d'adhésion praticien seul (`meteo-praticien-seul.guard.test.ts`), restitution patient « Ma spirale » (campagne sp-spi **livrée**).

**Le flux visé se décompose donc ainsi** : pack de base tour 1 (`PACK_BASE` seed.ts:73-81 : `Q_MOD_03, Q_MOD_01, Q_INF_03, Q_SOM_09, Q_ALI_01` — `Q_ALI_09` retiré le 2026-08-07, D-033) → première synthèse (orientation injectée) → assignations second tour (Q_ALI_02/03, agenda…) → **[manque 1]** règles de proposition de parcours alimentaire → **[manque 2]** objet « proposition de parcours alimentaire » persisté → synthèse IA de la proposition (pipeline existant, bump de `VERSION_PROMPT_SYNTHESE`) → protocole praticien (protocolDraft, existant) → adhésion/suivi (food-observation, existant mais JA5-05 figé).

**Manques nommés.** (1) Aucune règle publiée ne *compose* un parcours — `R2-ALI-01` propose un pack d'exploration, pas un parcours d'intervention ; chaque règle nouvelle exige un claim sourcé et une décision clinique. (2) L'objet « parcours alimentaire » n'existe ni en type ni en table — sa persistance appellerait une migration (règle PR séparée). (3) La synthèse ne reçoit rien de l'agenda (`Q_ALI_09` sans réponse tant qu'aucune clôture n'existe). (4) La boucle d'adhésion existe mais son activation (JA5-05) est figée et la campagne en attente d'arbitrage ; la campagne `boucle-clinique-producteur` vit uniquement dans un worktree non mergé (.wn/state.json:44).

---

## Lots candidats (dépendances et décisions préalables)

| Lot | Taille | Contenu | Dépend de | Décision utilisateur préalable |
|---|---|---|---|---|
| **L1 — Clôture technique de l'agenda alimentaire** | petit | `agenda-alimentaire/cloture.ts` calqué sur cloture.ts sommeil : agrégats → `rawAnswers`, `QuestionnaireReponse` standard `scored:false`, idempotence sous verrou. Aucun barème, aucune migration. | rien | Oui : figer la **liste des pseudo-items** transmis contredit la position actuelle du catalogue (alimentaire.ts:619-625) — D-xxx nommant les agrégats transmis, sans poids ni seuil. |
| **L2 — LOT-06 : barème et indice agenda** | moyen | Scorer `agenda_alimentaire` (gabarit questions.ts:3783-3910), axes /25 renormalisés, drapeaux. | L1 + **porte des 21 jours** (CAMPAGNE.md:123, :151) + relance humaine du recueil | Oui, entièrement clinique : axes, poids, bornes = D-xxx après observation de la distribution réelle. |
| **L3 — Objet de discordance rythme déclaré/observé** | moyen | `RYTHME_CHRONO` (Q_ALI_01/90) vs rythme observé (agenda) ; `null` sous forme courte, jamais 0 (alimentaire.ts:651-658). | L1 (L2 pour la version chiffrée) | Oui : définition et restitution de la discordance = décision clinique D-xxx ; drapeau `WN_ALI_01_SIIN57` doit être tenu allumé. |
| **L4 — Moteur de propositions de parcours alimentaire** | grand | Extension de la table d'orientation (règles alimentaires claims-tracées), objet « proposition de parcours » (migration séparée du code, PR distinctes), bloc de synthèse dédié (bump `synthese-v19` → v20). | rien de dur ; enrichi par L1-L3 | Oui, la plus lourde : chaque règle = claim sourcé + D-xxx ; périmètre de l'objet parcours ; arbitrage du dégel JA5-05 pour la boucle d'adhésion aval. |
| **L5 — Rayon fiches conseils (nouveau rayon)** | à cadrer | Nommé seulement — brainstorming hors périmètre de cette note ; distinct de `supplement-library/rayonCorpus.ts` et de C3. | L4 pour le contexte de diffusion | Oui : cadrage complet à ouvrir. |

**Recommandation unique.** Ouvrir **L1 seul** maintenant (petit, sans clinique hormis la D-xxx de nommage des agrégats, il rend l'agenda visible dans le dossier et débloque L2/L3 le jour où le recueil existera), et porter en parallèle la **question non technique** : relancer le recueil — sans données, L2 et L3 restent des interfaces. L4 se planifie ensuite, en mode Plan, lot par lot.

## Contraintes de gouvernance qui bordent la suite

- **Porte des 21 jours** : LOT-06 « pas avant un recueil suffisant pour calibrer (clôture des 21 jours) » — posée par la campagne elle-même (CAMPAGNE.md:123, :151-152) ; le recueil est arrêté au premier jour (.wn/state.json:37).
- **D-034** (DECISIONS.md:104-109) : Wellneuro repère et prépare, il ne mesure pas — aucun indice agenda ne peut revendiquer une validité psychométrique ; niveau de preuve D, longitudinal, jamais diagnostique (agenda-alimentaire/types.ts:15-20).
- **D-033** (DECISIONS.md:121-137) : « suspendu » est un état de drapeau — tout raisonnement sur `Q_ALI_09` doit être vrai **dans les deux positions** de `WN_AGENDA_ALI` (et de `WN_ALI_01_SIIN57` pour L3).
- **Migration et code dépendant en PR séparées** (ou drapeau éteint) — concerne L4 (objet parcours persisté) ; L1/L2/L3 n'exigent aucune migration.
- Toute modification clinique documentée en `changelog.d/` ; les lots de cette campagne passent en mode Plan avant édition (CAMPAGNE.md:150-152) ; `seuils_points` de `Q_ALI_01` ne garde que le recueil vide — fermer ce moteur est une décision clinique séparée, déjà nommée (.wn/state.json:30, orientationEngine.ts:222-234).
