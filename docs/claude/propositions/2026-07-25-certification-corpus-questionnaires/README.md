# Campagne — Certification corpus des questionnaires, ancrage Mon Équilibre, orientation NNPP2

Cadrage acté le 2026-07-25 (plan v1), révisé le même jour après challenge et
intégration d'un audit d'architecture externe (plan v2 — décisions praticien en
§4). Une PR par lot, un worktree par session, fragment `changelog.d/` par lot.

## 1. Doctrine

> **Le RAG certifie, source et explique. Le moteur déterministe calcule. Le
> graphe clinique (règles signées) choisit les explorations possibles. L'IA
> rédige la synthèse.**

Corollaires non négociables :

- Le RAG peut **extraire** un item, **comparer** deux versions, **signaler une
  divergence** — il ne peut **jamais reformuler** ou « améliorer » un item
  validé. Toute modification d'un mot, d'une période de rappel, d'une option ou
  de l'ordre des items crée une **nouvelle version** à réévaluer.
- Le générateur `tools/corpus/claims/questionnaire.mjs` produit un
  questionnaire de **restitution praticien** (contrôle du RAG) ; il ne génère
  jamais un questionnaire clinique destiné aux patients.
- Une certification n'est **jamais globale** : elle vaut pour une version, une
  langue/traduction, une population, un mode d'administration et un objectif
  donnés. Libellé affiché : **« Validé pour l'usage WellNeuro »** (avec son
  périmètre) — jamais « certifié médicalement ».
- Le corpus détecte ; l'**arbitrage est un geste praticien** documenté
  (CHANGELOG). Rien n'atteint l'usage clinique sans claims `VALIDE` signés
  (D-003). Tout l'aval applicatif est sombre derrière un flag fail-closed.

Trois chaînes partagent l'infrastructure corpus existante (pipeline
`tools/corpus/`, barrière D-003, discipline sha-256 de
`web/src/lib/clinical/corpusSyntheseV1.ts`) :

```
Axe 1 : PDF instruments → verbatim canonical.md → banc de comparaison (calculateScore exécuté) → artefact de certification → garde CI
Axe 2 : notebook 01 (12 besoins) → claims VALIDE → traçabilité BESOIN_SOURCES / niveaux A-D → complétude exposée
Axe 3 : fiches de synthèse NNPP2 (déjà au registre) → claims d'orientation (voie lente) → table de règles signée → reco praticien + synthèse IA
```

## 2. Existant vérifié (2026-07-25)

- **Registre = manifeste documentaire** (tableur Drive, miroir dépôt
  `docs/claude/corpus/source_registry.json`) : 391 sources, 13 notebooks
  00–12, dont **204 sources NNPP2_Annee2 déjà enregistrées** — toutes les
  fiches de synthèse NNPP2 y sont, classées par thème (02 sommeil : insomnies
  ×7 ; 03 stress : stades 01–08 ; 04 humeur ; 05 cognition ; 06 douleurs ;
  07 intestin-cerveau ; 11 cas complexes). **Aucun nouveau notebook à créer.**
- 8 sources typées « Questionnaire / échelle », dont 5 portent l'action
  « Certifier questionnaire » (WN-SRC-0048, 0248, 0382, 0383, 0384).
- Décision **A-007** du manifeste : « Créer un fichier Markdown canonique par
  questionnaire : questions, scoring, interprétation et provenance » — l'axe 1
  la matérialise. Décision **A-009** : perfusion, sevrages médicamenteux,
  psychotropes, Alzheimer = **hors moteur** — reprise par l'axe 3 (aucune
  règle d'orientation issue de ces sources). *Amendée le 2026-08-01 pour
  l'orientation (décision f, §5) : seule la perfusion reste exclue.*
- Catalogue : 63 questionnaires dans `web/src/lib/questions.ts` (source unique,
  PR #355). Certification actuelle `certification:{source:'drive', status}` —
  aucune référence bibliographique machine-lisible. Garde :
  `scripts/check_questionnaire_certification.js`.
- **Divergences déjà constatées sur pièces (2026-07-25, cibles pilotes du
  banc)** :
  - `Q_SOM_07` MFI-20 : 2 sections au lieu des 4-5 dimensions publiées, somme
    brute /80 **sans inversion d'items** (l'original en inverse ~10) ;
  - `Q_SOM_03` Berlin : 9 items adaptés (l'original en a 10), IMC en saisie
    numérique — version et droits à contrôler ;
  - `Q_SOM_01` PSQI : forme adaptée, fidélité du `type:'psqi'` à l'algorithme
    officiel (7 composantes /21) à prouver par tests de référence ;
  - `Q_SOM_04` IRLS : champs `protocol` (conduites cliniques) mêlés aux bandes
    d'interprétation du scoring.
  Aucune correction automatique : ces constats alimentent les arbitrages du
  lot 4.
- `BESOIN_SOURCES` (besoins 3/6/7/11 sans source) et `NIVEAU_PREUVE_PAR_SOURCE`
  (« PROPOSITION INITIALE, PAS ENCORE VALIDÉE CLINIQUEMENT ») dans
  `web/src/lib/equilibre/constants.ts`.
- Orientation : inexistante — `packsRecommandes` statiques dans
  `web/src/lib/questionnaires-functional.ts`, rien ne reboucle les scores vers
  une suggestion. La synthèse IA ne consomme pas le RAG.

## 3. Lots

| Lot | Axe | Contenu | Gates |
|---|---|---|---|
| 0 | — | Ce dossier de cadrage | aucun |
| 1 | 1 | `docs/claude/corpus/instrument_registry.json` **schéma v2** (axes séparés cosmin/droits/statut de certification, cycle de vie, politique de suivi) + `measurement_evidence.json` (squelette) + passes de cohérence dans le garde CI | aucun |
| 2 | 1 | Verbatims canoniques des instruments (pipeline triple lecture + **invariant psychométrique** seuils/bornes) ; chunks tagués `metadata.questionnaire_id`, claims typés instruments (metadata), provenance par item (page, sha, statut de contenu) | coût API + écriture pgvector prod |
| 3 | 1 | Banc `tools/corpus/certify/` : spec structurée contre-vérifiée (= la **ScoringSpecification**) + comparaison **déterministe** au comportement servi en **exécutant `calculateScore`** (golden tests : bornes, inversions, sous-échelles, manquants, exemples officiels) → `rapports/<Q_ID>.md` + `certifications.json`. Pilotes : PSQI, Berlin, MFI-20, PSS-10 témoin | coût API |
| 4 | 1 | Bloc `certification.corpus` (additif) dans `questions.ts` + garde CI + colonne matrice + arbitrages datés + **audit des libellés chiffrés** (« sensibilité 90,5 % »… → référence ou statut provisoire) ; sortie des champs `protocol` = décision gatée dédiée | aucun (T3) |
| 5 | 2 | Ingestion notebook 01 → `web/src/lib/equilibre/mappingTracabilite.ts` (dark) + fiche `DECISION_NIVEAUX_PREUVE.md` + **exposition additive de la complétude par besoin** (aucun changement de calcul, pas de bump) | coût + prod + validation Atelier |
| 6 | 2 | Besoins 3/6/7/11 + rôles PRIMARY/CONFIRMATORY et pondérations par source (proposition) ; si acté : bump `VERSION_SCORE_EQUILIBRE` v3 + frontière momentum | décision praticien |
| 7 | 3 | `orientationRulesV1.ts` (**contrat v2** : déclencheurs multiples en ET, suggestions au grain questionnaire avec priorité/objectif et/ou pack, needIds, statut de règle — table vide, sha-256) + `orientationEngine.ts` (pur, filtre dur droits/certification branché au lot 10) + route `GET /api/praticien/orientation` (double verrou fail-closed) | aucun |
| 8 | 3 | Ingestion des fiches de synthèse (lots thématiques, sources déjà au registre) → claims `metadata.usage:'orientation'`, voie lente obligatoire ; exclusions A-009 par construction | coût + prod + validation claim par claim |
| 9 | 3 | `tools/corpus/orientation/compile.mjs` + route interne d'export (filtre SQL + compteur) → régénération de la table de règles **par PR revue** ; classement v2 (redondance, récence, charge patient) | signature praticien |
| 10 | 3 | `PatientsPanel` (suggestions dynamiques + motifs traçables) + encart fiche patient — pack cible hiérarchisé 4-6 (vigilance → discriminant → complémentaires → ancrage momentum) — aucun auto-assign | flag |
| 11 | 3 | Synthèse **v3** : le LLM ne reçoit que les **candidats autorisés** par le moteur ; champs déterministes (couverture besoins, mesures manquantes) **calculés serveur et fusionnés** (patron `fusionnerVigilance`) ; champ `questionnaires_exploration` traçable (`statut: a_valider_par_le_praticien`) ; parsing tolérant | décision actée (champ dédié) |
| 12 | 2 | **Momentum v2** : noyau d'instruments d'ancrage T0/J21/J42/J90 (converge avec le pack de réévaluation), annotations « changement fiable » (MDC/MCID depuis `measurement_evidence` quand publiés), complétude affichée — **pas d'indice composite**, doctrine « points mesurés seulement » conservée | décision praticien |
| 13 | 1 | Horodatage d'intégrité des scores : versions + hashes **additifs** dans `scoresJson` au moment du calcul | décision praticien |

Ordre : 0 → {1, 7} démarrables sans document externe ; 2→3→4 dès les PDF
fournis (pilotes sommeil d'abord) ; 5→6 et 8→9→flag→10/11 sur gates
praticien ; 12/13 ensuite. **La priorité immédiate est la certification
(lots 1-4)** — l'orientation adaptative n'active rien avant la table signée.

### Grille de priorisation des instruments (lot 2-3)

1. Scoring complexe ou seuils de vigilance (PSQI, Berlin, MFI-20, MMSE…) ;
2. instruments validés externes potentiellement protégés (PSQI, QLQ, HIT-6,
   Conners, MMSE, Epworth…) ;
3. sources de Mon Équilibre (`BESOIN_SOURCES` : Q_ALI_01, Q_SOM_06, Q_GAS_01,
   Q_INF_01, Q_SOM_01, Q_MOD_01, Q_NEU_11, Q_STR_01/02/03, Q_INF_03) ;
4. ancrages du suivi momentum ;
5. outils SIIN internes ;
6. outils dont items/scores/seuils ont été adaptés localement.

## 4. Décisions praticien actées

1. **Premiers lots : 0 + 1 + 7** (2026-07-25).
2. **Pas de nouveaux notebooks** — réutiliser l'ingestion prévue par le
   registre existant (2026-07-25).
3. **Synthèse IA : champ de sortie dédié** `explorations`/`questionnaires_exploration`,
   en plus de l'injection au prompt (2026-07-25).
4. **Audit externe intégré** (2026-07-25) : doctrine de séparation,
   certification par version/usage, cycle de vie, claims typés instruments,
   sorties séparées niveau/confiance/complétude, momentum « changement
   fiable », prudence réglementaire. Écartés : nouvelles tables en base
   (artefacts JSON/TS versionnés à la place), compilateur remplaçant
   `calculateScore` (différé, sauf divergence systémique prouvée), formule
   composite de momentum, champs déterministes produits par le LLM.
5. **Arbitrages de la revue indépendante** (2026-07-25, lots 1 et 7) :
   - **Forme publiée ≠ version servie** : `instrument.formePubliee` décrit la
     publication d'origine ; `versionServie.description` reste **null** tant
     que le banc (lot 3) ne l'a pas établie contre le catalogue. Renseigner le
     servi de mémoire ferait disparaître les divergences que la campagne
     cherche à révéler.
   - **Vérification bibliographique tracée** : `references.dateVerification` /
     `verifiePar` — tant qu'ils sont null, auteurs et année sont *identifiés,
     non vérifiés* contre la source primaire.
   - **Filtre dur au grain pack** : un pack tombe **entièrement** dès qu'un de
     ses membres connus est non administrable — proposer un pack amputé en
     silence changerait ce que le praticien croit assigner.
   - **Traçabilité obligatoire** : une règle d'orientation sans claim
     justificatif ne recommande rien (vérifié par le moteur, pas seulement
     annoncé par un commentaire).
   - **Niveau d'une cible partagée** : le plus fondamental gagne
     (socle < approfondissement < specialise), indépendant de l'ordre de table.
   - **Verrou auto-portant** : la route exige `validationExterne` **et**
     `dateValidation` **et** `claimsSource` non vide — un flip de booléen isolé
     n'ouvre rien.
   - **WN-SRC-0048 et WN-SRC-0248** ne sont rattachés à aucune entrée du
     registre : ce sont des documents **transverses** (recueils de
     questionnaires fonctionnels), pas la source d'un instrument unique. Ils
     seront exploités au lot 2 comme sources de plusieurs instruments à la
     fois, une fois leurs items extraits.
   - **Palier T1** : `scoring-check` est ajouté à `npm run check` (leçon
     LOT-01b) et le banc du validateur entre au CI.
6. **Droits du référentiel SIIN — usage cabinet** (2026-07-25). Les
   questionnaires issus du corpus SIIN sont **libres d'usage dans le cadre de la
   pratique du cabinet de neuronutrition**, la licence ne s'appliquant pas à
   l'usage par le praticien. Acté sur les **13 entrées**
   `statutBibliographique: referentiel_interne_siin` du registre
   (`droits.statut: permission_obtenue`, détail et date portés dans l'entrée).
   **Périmètre** : administration aux patients du cabinet, scoring, restitution
   praticien et patient, indexation dans le corpus RAG interne — la barrière
   D-003 garantit que les claims ne sortent pas de l'application. **Ne couvre
   pas** la rediffusion hors cabinet, la publication du verbatim, ni la cession
   à un tiers. Pour un instrument SIIN qui **adapte une échelle publiée par un
   tiers** (diète méditerranéenne, auto-évaluation de l'anxiété…), la
   déclaration porte sur l'adaptation et laisse intacts les droits de l'échelle
   d'origine : à traiter entrée par entrée au banc.
7. **Rapatriement des sources** (2026-07-25) : 123 PDF du dossier Drive
   rapatriés dans `~/.wellneuro/corpus/`, 116 notices au registre sous le
   notebook « 13 — Instruments du cabinet ». La question (a) ci-dessous est
   close pour les instruments du cabinet.

8. **Droits des instruments tiers et périmètre d'ingestion** (2026-07-26) —
   clôt la question (b).

   **Fait établi qui a motivé la décision** : les mentions de droits relevées
   *dans les documents sources eux-mêmes* (champ `mentionsDroits` du banc, 59
   instruments) ne décrivent pas le corpus qu'on croyait. **30 sources portent
   l'en-tête SIIN seul** ; 7 portent SIIN **et** une attribution tierce
   (Terman/Williams, Johns, Maslach-Pines, Lagrue/Légeron, Galvin, GRECO,
   Bristol) ; 7 ne portent **qu'une** attribution tierce (Beck, FIQ de
   Burckhardt, Tinetti, Sabbagh, Dubois, Monnier, Perrot/Bouhassira) ; 15 n'en
   portent aucune. L'estimation antérieure — « la quasi-totalité des sources
   sont des échelles tierces sous copyright » — était fausse.

   **Décision A — ingestion complète des 106 sources d'instruments**, verbatim
   compris, au titre de l'usage strictement interne au cabinet et de la
   barrière D-003. Les claims entrent en `EN_ATTENTE_VALIDATION`, comme tout le
   reste du corpus.

   **Décision B — la déclaration du praticien est étendue** aux 7 instruments
   dont la source ne porte qu'une attribution tierce, avec le même périmètre et
   les mêmes exclusions que la décision 6. **Portée juridique inscrite au
   registre sans l'adoucir** : la déclaration enregistre la position du
   praticien et l'engage ; elle ne constitue pas une licence et n'éteint aucun
   droit détenu par l'auteur ou l'éditeur de l'échelle d'origine. Aucune
   autorisation n'a été sollicitée auprès des ayants droit.

   **Restent à `a_verifier`** : les 15 sources sans aucune mention de droits et
   les 7 sources SIIN + tiers, dont l'adaptation SIIN est couverte par la
   décision 6 mais dont l'échelle d'origine ne l'est pas. Ingérées comme les
   autres au titre de la décision A ; leur statut de droits reste ouvert au
   registre, daté et visible.

   **Distinction technique retenue** : la table des claims n'a aucune colonne
   pointant vers un chunk, et la voie servie à l'IA comme au patient
   (`match_wellneuro_rag_claims`) ne lit **que les claims**. Les chunks —
   seuls porteurs du verbatim — ne sont lus que par le contrôle de santé, la
   vérification et l'écran de revue.

   **État d'exécution au 2026-07-27 — la décision A n'est faite qu'à moitié.**
   Le verbatim est passé : `LOT_006_2026-07-26` porte **140 chunks pour 106
   sources** du notebook « 13 — Instruments du cabinet ». Les claims, eux,
   n'ont jamais été produits : **0 claim** rattaché à ce lot. Le praticien a
   tranché le 2026-07-27 ([décision 6](../2026-07-27-arbitrages-praticien/README.md))
   de commencer par un **pilote de 10 sources** dont on mesurera le taux
   d'exclusion, plutôt que d'engager les 106 d'un bloc. Motif : sur le
   `LOT_007`, les deux seuls chunks de nature *questionnaire* ont vu **14 claims
   sur 14 exclus pour infidélité**, le rédacteur transformant des intitulés de
   sections en énoncés de causalité absents de la source. Si le pilote le
   confirme, c'est la décision A qu'il faudra amender — un instrument n'est
   peut-être pas une source de connaissance.

## 5. Décisions praticien en attente

| # | Question | Bloque |
|---|---|---|
| ~~a~~ | ~~Fourniture des PDF sources primaires~~ — **close le 2026-07-25** (123 PDF rapatriés, 116 notices) | — |
| ~~b~~ | ~~Droits/licences des instruments **tiers**~~ — **close le 2026-07-26** (décision 8 : ingestion complète des 106 sources ; déclaration étendue à 7 instruments ; 22 restent `a_verifier`) | — |
| ~~c~~ | ~~Hiérarchie en cas de divergence Drive ↔ source primaire~~ — **close le 2026-07-27** ([décision 1](../2026-07-27-arbitrages-praticien/README.md) : la **publication primaire fait foi**) | — |
| d | Validation des niveaux de preuve A/B/C/D (`NIVEAU_PREUVE_PAR_SOURCE`) | Lot 5 |
| e | Besoins 3/6/7/11 : rester à couverture null, ou mapper de nouvelles sources (⇒ bump v3) | Lot 6 |
| ~~f~~ | ~~Confirmation du périmètre A-009 appliqué à l'orientation~~ — **close le 2026-08-01, périmètre AMENDÉ** : seule la **perfusion** reste exclue du moteur d'orientation ; sevrages médicamenteux, psychotropes et Alzheimer sont **réintégrés** dans le drafting (chaque claim reste soumis à la validation praticien claim par claim, barrière D-003 inchangée). Lancement acté le même jour : **lot sommeil complet** (17 fiches) en premier | — |
| ~~g~~ | ~~Sortie des champs `protocol` des bandes d'interprétation (IRLS…)~~ — **close le 2026-07-27** ([décision 5](../2026-07-27-arbitrages-praticien/README.md) : champ praticien distinct, non transmis au prompt patient, 11 instruments) | — |
| ~~h~~ | ~~Libellés chiffrés du catalogue (« sensibilité 90,5 % »…) : adosser à une référence ou marquer provisoires~~ — **close le 2026-08-02 : MARQUER PROVISOIRES**. L'audit ne trouve que **deux** affirmations chiffrées de performance dans tout le catalogue : Q_FIB_01 (FiRST, « sensibilité 90,5 % » — `questionnaires-catalog.ts`) et Q_GEO_06 (Test des 5 mots, « 85 % / 90 % » attribuées à Dubois 2002 — `questionnaires/gerontologie.ts`). Aucune des deux n'a de `doi`, `pmid` ni `dateVerification` au registre. Les deux textes servis portent désormais la mention « non vérifiée contre la source primaire », et le registre une `reserveMetrologique`. Même doctrine que le plafond de Q_GEO_04 : l'application n'affirme pas ce qu'elle n'a pas vérifié | — |

**Veille réglementaire** : la « validation pour l'usage WellNeuro » reste
distincte d'une qualification de logiciel médical (MDCG 2019-11 rév. 2025). Si
les scores ou l'orientation servent directement des décisions
diagnostiques/thérapeutiques, une analyse réglementaire dédiée sera nécessaire.

## 6. Formats d'artefacts

**`instrument_registry.json` (schéma v2, lot 1)** — une entrée par
questionnaire du catalogue. Axes **séparés** (jamais fusionnés) :

```json
{
  "questionnaireId": "Q_STR_02",
  "instrument": { "nomOfficiel": "Perceived Stress Scale (PSS-10)", "auteurs": "…", "anneePublication": 1988, "formePubliee": "10 items, coté 1-5 (brut 10-50)", "proprietaireDroits": null },
  "versionServie": { "description": null, "langue": "fr", "traductionValidee": "Bellinghausen et al. 2009 (à confirmer)", "statutContenu": "a_auditer" },
  "references": { "doi": null, "pmid": null, "dateVerification": null, "verifiePar": null },
  "droits": { "statut": "a_verifier", "detail": "…", "dateVerification": null },
  "cosmin": "inconnu",
  "statutCertification": "repere",
  "politiqueSuivi": { "readministrable": null, "intervalleMinJours": null },
  "sourceMonEquilibre": true,
  "sourceIds": [], "driveMd": "…", "statutBibliographique": "reference_identifiee"
}
```

- `instrument.formePubliee` décrit **la publication d'origine** ;
  `versionServie.description` décrit **ce que l'application administre** et
  reste `null` tant que `statutContenu` vaut `a_auditer` (le garde le refuse
  autrement). C'est le banc du lot 3 qui l'établit.
- `references.dateVerification` / `verifiePar` null = auteurs et année
  **identifiés, non vérifiés** contre la source primaire.

- `statutCertification` (cycle de vie) : `repere → source_obtenue →
  droits_verifies → contenu_verrouille → scoring_verifie → psychometrie_revue
  → mapping_clinique_approuve → publie` (+ `suspendu`, `remplace`).
- `statutContenu` (version servie) : `verbatim | traduit | adapte |
  cree_localement | a_auditer`.
- `cosmin` : `A | B | C | inconnu` — qualité psychométrique publiée, à
  renseigner depuis `measurement_evidence.json`, **jamais confondue** avec les
  niveaux A/B/C/D WellNeuro (`NIVEAU_PREUVE_PAR_SOURCE` reste la source unique
  de cet axe-là, dans `equilibre/constants.ts` — non dupliqué ici).
- Aucun DOI/PMID inventé : null tant que non vérifié.

**`measurement_evidence.json` (lot 1, squelette ; rempli aux lots 2-3)** — une
ligne par étude × propriété psychométrique : population, langue, n, propriété
(validité, fidélité, erreur de mesure, sensibilité au changement, MDC/MCID…),
résultat, conclusion, DOI/PMID/sourceId, claim validé correspondant.

**`certifications.json` (lot 3)** — journal de décision par questionnaire :
sourceId, sha du canonical, verdict (`conforme | divergences_mineures |
divergences_cliniques | non_certifiable`), divergences détaillées, arbitrage
daté (`code_maintenu | correction_actee` + motif), date du banc, version de
l'outil.

**Règle d'orientation (contrat v2, lots 7/9)** — typée sur
`questionnaires-functional.ts` :

```ts
{
  id, statut: 'brouillon'|'publiee'|'suspendue',
  declencheurs: [ // ET logique
    { type:'zone', idQuestionnaire, sousScore?, zone } |
    { type:'comparaison', idQuestionnaire, sousScore?, operateur:'>='|'<='|'>'|'<'|'==', valeur }
  ],
  suggestions: [{ questionnaireId? | packId?, priorite, objectif? }],
  needIds?, categoriesCibles?,
  justificationClaims: [{ claimId, versionClaim }],
  niveau: 'socle'|'approfondissement'|'specialise'
}
```

Chaque proposition affichée est traçable : réponse patient → score versionné →
règle → claims NNPP2 validés → chunk → PDF source → décision praticien — une
règle sans claim justificatif ne recommande rien. Les droits et la
certification sont un **filtre dur** à l'administration, jamais une pénalité de
classement : un pack tombe entièrement dès qu'un de ses membres connus est non
administrable.

**Typologie de claims instruments (lot 2, `metadata` JSONB — sans
migration)** : `instrument_item`, `option_reponse`, `item_inverse`,
`appartenance_sous_echelle`, `formule_scoring`, `regle_donnees_manquantes`,
`seuil_interpretation`, `population_cible`, `resultat_validation`,
`indication_clinique`, `intervalle_suivi`, `condition_droits` — chaque item
avec page source, sha du PDF et statut de contenu.

## 7. Vérification

T1 après chaque édition — `npm run check` inclut désormais `scoring-check`
(leçon LOT-01b : un palier qui ne couvre pas ce que le CI vérifie ne protège de
rien) ; le banc du validateur de registre tourne en CI et via
`npm run registry-check`. T2 avant tout commit UI/API (lots 4, 7, 10, 11) ; T3
avant les PR touchant `questions.ts` ou la clinique. Lot 3 : golden tests **exécutant `calculateScore`** (bornes, items
inversés, sous-échelles, données manquantes, exemples officiels) — jamais une
inspection statique seule. Les fixtures inchangées aux lots 1 et 4 sont la
preuve mécanique de zéro changement clinique. Post-ingestion :
`GET /api/internal/rag/health` + comptages `execute_sql` en lecture seule.
**Aucune migration Prisma dans la campagne** (metadata JSONB ; artefacts
JSON/TS versionnés).

## 8. Hors périmètre

- Toute correction de seuil/item détectée par le banc — lots d'arbitrage
  séparés, CHANGELOG (MFI-20, Berlin, PSQI, IRLS `protocol` en tête).
- Réécriture du moteur de scoring (compilateur de spécifications) — non, sauf
  divergence systémique prouvée par l'audit des lots 2-4.
- Brancher la synthèse IA sur le RAG général (remplacer `corpusSyntheseV1`) —
  chantier distinct.
- Qualification réglementaire logiciel médical — analyse dédiée si nécessaire.
- Auto-assignation de questionnaires — jamais : le praticien décide.
