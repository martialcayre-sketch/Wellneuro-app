---
id: "LOT-11"
statut: "terminé"
dépend_de: "LOT-04, LOT-05, LOT-06 (livrés) — et le LOT-08 dépend de LUI"
---

# LOT-11 — Les actes en attente : deux signatures, six arbitrages, neuf dettes

> **LIVRÉ le 2026-08-24 — `D-107`.** Une signature **reportée** au 2026-08-30
> avec son motif, deux campagnes **routées** en file d'attente (curation des
> exclusions, dix orphelines), une borne **déclarée** après descente négative
> (`MAX_AXES_PRIORITAIRES`), `DC-55` laissée **curatoriale** et `DC-58`
> **proposition avec sa mesure**. Les neuf dettes routées une par une, dont
> **trois corrigées** : découpage des conflits, banc de bump de version, tour du
> vérificateur éprouvé sur un dossier portant un signal. **Aucune signature
> posée, aucune migration, aucun drapeau** — il n'en restait aucun à poser.

> **Amendé le 2026-08-24** — les résidus du **LOT-03** ([[D-105]]) et du
> **LOT-07** ([[D-106]]) y sont versés. Aucun n'était perdu : chacun vivait dans
> le handoff ou la décision de son lot. Mais un résidu qui n'a qu'un handoff pour
> domicile n'est retrouvé que par celui qui sait déjà qu'il existe — et le LOT-08
> constate, il ne fouille pas. La provenance de chaque entrée est indiquée.

## Pourquoi ce lot n'est PAS le LOT-08

Le LOT-08 **constate** : il bascule des statuts vérifiés, écrit des renvois,
reconduit une matrice, et il s'interdit explicitement toute modification de
code. Sa propre fiche pose que « le lot ne s'ouvre pas tant qu'un lot reste en
cours — il constate un état, et un état en mouvement ne se constate pas ».

Ce qui est rassemblé ici est de l'autre nature : ce sont des **actes**, dont
deux ont un effet clinique en production. Les verser au LOT-08 ferait un lot qui
change l'état **et** certifie l'état qu'il vient de changer — un relecteur ne
pourrait plus distinguer ce qui a été vérifié de ce qui vient d'être posé.

**Ordre : LOT-07 → LOT-11 → LOT-08.** Le LOT-08 reste le lot terminal.

## A — Deux signatures praticien, et une seule est à poser

**`SAFETY_EI_METADATA` (`safetyEffetIndesirableV1.ts:81`, `validationExterne: false`)**
— `DC-42`. Le drapeau `WN_EI_INTERRUPTION` **vaut déjà `1` en production**
(constaté le 2026-08-24) : l'ordre imposé par [[D-101]] — drapeau d'abord, la
CAPTURE ; signature ensuite, l'INTERRUPTION — est donc à moitié parcouru, et
c'est la signature qui reste. **Ce que le signataire assume, et qui n'est pas
gradué** : un signalement rattaché retire **tous** les candidats du dossier,
quel que soit le protocole visé. Le seul levier du dépôt est l'objet de
sécurité, et il est binaire ; une inhibition ciblée supposerait de relier un
protocole à un axe candidat, ce que rien ne fait. Revue prévue le 2026-08-30.

**`GATE_POPULATION_METADATA` (`gatePopulationV1.ts:81`, `validationExterne: false`)**
— `DC-43`. **À NE PAS SIGNER, et ce lot doit l'écrire plutôt que de laisser la
question ouverte.** [[D-101]] a abandonné la curation de `neCouvrePas` sur
mesure : **0 exclusion déclarée sur 95 interventions**. La gate ne mord donc sur
aucun dossier, et la signer reviendrait à armer un garde sans sujet — ce que le
gate de campagne « aucun banc sans sujet » interdit nommément. Elle se reconduit
en **« écrite, non armée »**, avec son déclencheur : la première exclusion
réellement curée.

## B — Six arbitrages nommés, non rendus

> Provenance indiquée pour chacun. Les entrées **1** et **5** viennent du
> **LOT-03** ([[D-105]]), l'entrée **6** du **LOT-07** ([[D-106]]) : leurs lots
> les ont nommés sans les trancher, et ce lot les recueille plutôt que de les
> laisser dans des handoffs que personne ne relit.

1. **La provenance du `3`** de `source.axes_prioritaires.length > 3`
   (`synthese-praticien.ts:73`) — troisième borne « au maximum 3 » du dépôt,
   après les actions de protocole et les cartes de fil. Les deux autres ont une
   source ; celle-ci n'en a aucune de retracée. *(LOT-03, [[D-105]] — exemptée
   dans `seuilsLitterauxMotives.guard.test.ts` **en étant inscrite comme
   dette**, pas en silence.)*
2. **Ce que fait la gate de population sur un état INCONNU** pour un critère
   exclu. La branche est inatteignable tant que la table est vide ; l'arbitrage
   « se rendra avec les exclusions sous les yeux » (LOT-05) — donc il ne se rend
   pas encore, et ce lot le redit plutôt que de le perdre.
3. **« Impact clinique significatif » n'est pas mécanisé** (`DC-55`) : **tout**
   conflit déclaré escalade, la sélection se fait à la curation du registre.
   Mécaniser le qualificatif, ou assumer qu'il reste curatorial.
4. **Le portefeuille des dix orphelines** — `DC-03`, `DC-36`, `DC-38`, `DC-39`,
   `DC-40`, `DC-41`, `DC-44`, `DC-45`, `DC-47`, `DC-48`, plus la part de `DC-11`
   hors exclusions. L'arbitrage est **reporté, pas clos** : dettes nommées
   (choix actuel), campagne dédiée, ou rattachement au coup par coup. Le LOT-08
   les **écrit** ; il ne les arbitre pas.
5. **Le sort de `DC-58`** : proposition instruite, sans contre-exemple et sans
   méthode fondée par égalité de valeurs. La laisser proposition, ou la déclarer
   sans objet. La rouvrir suppose un fait neuf, pas une seconde tentative de la
   même mécanisation. *(LOT-03, [[D-105]].)*
6. **Le seuil de significativité du momentum.** `calculerDeltaMomentum`
   (`momentum.ts:43`) déclenche « hausse » sur `delta > 0`, donc sur **`+0,01`** :
   le patient lit « votre indice est en hausse » pour du **bruit de mesure**.
   Poser un seuil est un **changement clinique** — décision `D-xxx`, fragment,
   et bump de `VERSION_SCORE_EQUILIBRE` avec son coût d'historique. Ne pas en
   poser est aussi un arbitrage, et il n'a jamais été rendu explicitement.
   *(LOT-07, [[D-106]].)*

## C — Six dettes de code, plus trois portées de garde déclarées

1. **`CS-MAG-01` attend son épinglage.** Le conflit le plus frontal du corpus —
   `WN-CL-0032-018` (« prescrire du magnésium pour la dépression résistante sans
   plus attendre ») contre `WN-CL-0362-014` (« l'inositol et le magnésium sont
   inefficaces ») — est écarté parce qu'**aucun des deux claims n'est épinglé par
   une table signée**. Deux voisins portent le même désaccord et le seraient plus
   vite : `WN-CL-0327-002` et `WN-CL-0018-013`.
2. **L'escalade n'atteint ni l'extinction ni les préconditions T0.** Le
   branchement s'arrête au cockpit ; `preconditionsT0Prisma` reçoit une liste de
   claims cités **vide**, délibérément. Effet clinique distinct, à arbitrer à
   part.
3. **La phrase d'un conflit ne tient pas dans un point de vigilance.** Mesuré :
   `CS-BIO-01` fait **569** caractères, les deux lignes que `lignesDeVigilance`
   en tirerait feraient **768** et **607**, pour un plafond de **500**. Sans
   effet aujourd'hui — les conflits n'atteignent que le cockpit, qui ne plafonne
   rien. Le jour où un conflit alimentera la **synthèse**, un brouillon serait
   refusé avec un message qui ne nomme pas la cause. Précédent exact : C-STR
   (730 caractères, scindée en 411 + 326). Il faudra **scinder par position**,
   jamais raccourcir le texte curé.
4. **Dérive documentaire dans un fichier clinique** :
   `safetyEffetIndesirableV1.ts:70` écrit que « le drapeau `WN_EI_INTERRUPTION`
   est absent de la production ». Il y vaut `1` depuis le LOT-05. Le mécanisme
   est correct, la phrase est périmée.
5. **Le tour du vérificateur n'est éprouvé sur aucun dossier portant un
   signal** : `ANAMNESE_C1_FIXTURE` n'en porte pas. Le code des deux lectures a
   été vérifié ligne à ligne en revue, **rien ne le garde**.
6. **La garde de lecture de consultation tient au fait, pas au schéma.** Le seul
   chemin d'écriture (`api/portail/valider`) pose `anamnese`, `statut` et
   `dateValidation` dans le même `update` — mais **rien au schéma ne l'impose**.

### Trois portées de garde déclarées, et qui restent des trous

Elles ne sont pas des oublis : chaque lot les a **nommées** en livrant son banc.
Elles sont ici pour que la clôture les compte, et non pour être corrigées au
passage — fermer l'une d'elles est un travail à soi seul.

1. **Les 33 seuils du catalogue ne sont gardés par aucun banc de forme.**
   `seuilsLitterauxMotives.guard.test.ts` exempte le catalogue **par forme** —
   un cut-off écrit dans `questions.ts` est chez lui, c'est lui la source
   déclarée. Les bandes du PSQI, de Horne-Östberg, de Karasek ne sont donc
   couvertes que par la **certification de scoring** et par `DC-17`/`DC-18`,
   c'est-à-dire par une procédure et non par une garde structurelle.
   *(LOT-03, [[D-105]].)*
2. **Le banc de nature du total suit la valeur par son NOM.** Une variable
   intermédiaire (`const total = objets.indiceGlobal`), un spread d'attributs ou
   un renommage du champ côté API la lui font perdre. Fermer cette limite
   suppose une analyse de flot de données, pas une expression régulière de plus.
   *(LOT-07, [[D-106]].)*
3. **Rien ne garde le bump de `VERSION_SCORE_EQUILIBRE`.** `constants.ts` exige
   désormais **en toutes lettres** qu'une modification de `SEUIL_EFFONDREMENT`
   ou de `PLAFOND_FONDATION_CRITIQUE` s'accompagne d'un bump — la règle est
   **déclarée, vérifiée par aucun banc**. C'est le patron exact de la « décision
   due » que `DC-21` porte déjà : une règle écrite qu'aucun contrôle n'oppose.
   *(LOT-07, [[D-106]].)*

## D — Les drapeaux : il n'en reste aucun à poser

Constaté en production le 2026-08-24 (`scalingo env`, application `wellneuro`) :

| Drapeau | Valeur | Ce qu'il ouvre |
|---|---|---|
| `WN_EI_INTERRUPTION` | `1` | la **capture** ; l'interruption attend la signature |
| `WN_ENABLE_CONTRADICTIONS_NNPP2` | `1` | les constats de contradiction et de conflit |
| `WN_CB_ENABLED` | `true` | le catalogue de biologie |
| `WN_CB_PROPOSITION` | `true` | la proposition de bilan |
| `WN_ALI_01_SIIN57` | `true` | la forme longue de `Q_ALI_01` |
| `WN_DOSSIER_DEUX_VOIX` | `true` | le dossier à deux voix |

**La question « quels drapeaux reste-t-il à poser ? » a pour réponse zéro**, et
c'est un résultat, pas une omission : ce qui reste fermé l'est par une
**signature** manquante, jamais par une variable.

## E — Le gate qui n'est pas franchi : trois preuves, deux livrées

Le gate de campagne exige **trois** preuves pour fermer une règle — une décision
`D-xxx`, un banc qui la fait mordre, et le statut basculé. Trois règles en ont
**deux** :

| Règle | Décision | Banc | Statut | Ce qui manque |
|---|---|---|---|---|
| `DC-42` | [[D-101]] | oui | *Proposition* | la **signature** `SAFETY_EI_METADATA` (section A) |
| `DC-43` | [[D-101]] | oui | *Proposition* | un **sujet** — 0 exclusion curée ; à reconduire non armée |
| `DC-58` | [[D-105]] | sans objet | *Proposition* | un **contre-exemple** ; mesurée sans sujet |

`DC-22` **a franchi le gate** au LOT-07 ([[D-106]]) : décision, banc
(`natureIndiceGlobal.guard.test.ts`, vu rouge sous six mutations), statut
basculé. Elle est citée ici pour que la clôture n'ait pas à la recompter — et
parce que sa bascule s'est faite par la **seconde branche** de son énoncé, ce
qui se lit mal si on ne le dit pas : le total n'est pas retiré, il est identifié.

**La fenêtre `D-093` court toujours** — recommandations élargies ouvertes sur
trois dossiers pour six semaines depuis le 2026-08-23, relecture praticien avant
chaque remise. Elle n'est ni franchie ni échue ; le LOT-05 en a couvert le point
nommé comme non couvert, sans la refermer ni l'élargir.

## Ce que ce lot NE fait pas

- **Il ne signe rien de sa propre initiative** : une signature est un acte
  praticien, et la seule à poser (`SAFETY_EI_METADATA`) ouvre une inhibition
  **totale**. Le lot prépare la relecture, il ne l'anticipe pas.
- **Il ne reprend pas ce qui appartient au LOT-08** : renvois `DC-50`/`DC-51`,
  dettes sans véhicule `DC-39`/`DC-41`, écriture des dix orphelines, reconduite
  des quatre règles non armées, matrice claim par claim routée vers Curation
  signée, `DC-26` partiel, audit et `FILE_ATTENTE.md`.
- **Il ne traite pas les dettes de la section C** : il les rassemble et les rend
  arbitrables. Chacune qui serait traitée ici exige sa décision propre.

## Critères de done

- [ ] `SAFETY_EI_METADATA` : soit signée avec sa décision, soit **explicitement
      reportée** avec le motif et la date de revue — jamais laissée sans verdict.
- [ ] `GATE_POPULATION_METADATA` reconduite « écrite, non armée », déclencheur
      nommé.
- [ ] Les **six** arbitrages de la section B : chacun rendu, ou reporté avec sa
      raison et son porteur.
- [ ] Les **six dettes et trois portées de garde** de la section C : chacune
      routée (lot, campagne, ou dette assumée) — aucune laissée sans destination.
- [ ] L'état des drapeaux **re-constaté** en production au moment d'écrire, pas
      recopié de cette fiche.
- [ ] Les trois règles du gate incomplet tranchées : franchir, ou reconduire en
      disant ce qui manque.
