---
id: "LOT-01"
titre: "Inventaire des surfaces + décision produit D-030"
statut: "livré (2026-08-06) — matrice + D-030 ; revue wn-reviewer NO-GO corrigé puis GO en contre-revue"
dépend_de: "LOT-00"
---

# LOT-01 — Inventaire des surfaces et décision produit

## But

Établir sur pièces, avant tout retrait, la matrice exhaustive de ce qui
consomme les packs non-base — puis écrire la décision produit formelle dans
`docs/DECISIONS.md`. Un retrait décidé sur une liste incomplète reproduit la
classe de défaut « toutes les portes du parcours doivent connaître
l'exemption ».

## Résultat observable

- Une matrice datée dans ce lot : surface → pack(s) consommé(s) → comportement
  après retrait → geste requis.
- Une entrée D-030 dans `docs/DECISIONS.md` portant les trois arbitrages du
  2026-08-06 (le second pack praticien « Florence 1 » désactivé aussi ; geste =
  file d'envoi ; un seul pack actif restant, « Base de consultation »).

## Périmètre

Surfaces déjà identifiées au cadrage, à vérifier et compléter :

- **Orientation** : 6 suggestions ciblent 3 `packId` —
  `R2-SOM-05` (sommeil), `R2-STR-02` et `R-STR-02` (stress), `R2-GAS-02`,
  `R2-ALI-01` et `R-GAS-01` (digestif), dans
  `web/src/lib/clinical/orientationRulesV1.ts`. Vérifier **règle par règle**
  si des cibles `questionnaireId` de repli existent ; lister la composition de
  remplacement attendue (l'absorption pack→membres de
  `orientationEngine.ts:686-748` disparaît avec les packs).
- **Réévaluation portail** : `web/src/app/api/portail/pack-reevaluation/route.ts`
  replie sur `parDefaut` quand le pack de la dernière consultation validée est
  désactivé — qualifier ce comportement (acceptable / à ajuster au LOT-03).
- **UI praticien** : `web/src/components/PacksPanel.tsx` (pas de réactivation
  possible depuis l'UI — badge inactif seulement) et la suture
  `suggestedPackSelection` de `PatientsPanel.tsx`.
- **PackProposition** (`web/prisma/schema.prisma:1347`) et
  `web/src/app/api/praticien/packs/assign/route.ts` (devient sans objet hors
  pack de base).
- **Doctrine** : `web/src/lib/questionnaires-functional.ts` — 16 packs
  déclarés, 6 avec `idPackBase`, 10 jamais créés ; sort des déclarations
  `phase_2`.

## Hors périmètre

- Aucun code applicatif — ce lot produit de l'inventaire et une décision.
- Aucune écriture en base.

## Fichiers probables

- `docs/DECISIONS.md`
- Ce fichier (matrice).

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase.
- Pas de refactor hors lot.

## Étapes

- [x] Vérifier règle par règle les 6 suggestions à `packId` (cibles de repli).
- [x] Compléter la matrice des surfaces (celles ci-dessus + recherche d'appelants oubliés).
- [x] Qualifier le repli `pack-reevaluation`.
- [x] Écrire D-030 dans `docs/DECISIONS.md`.
- [x] Relire la matrice contre le dépôt (pas contre la mémoire de session) — revue `wn-reviewer` indépendante, puis contre-revue des correctifs.

## Tests

- T1 après l'édition de `docs/DECISIONS.md` (lint des docs si couvert).
- Pas de test applicatif : lot documentaire.

## Critères de done

- Matrice exhaustive datée, chaque ligne avec preuve (chemin:ligne).
- D-030 mergée.
- Les compositions de remplacement des 6 suggestions sont écrites et prêtes
  pour le LOT-02.

## Résultats

Matrice datée du **2026-08-06**, relue directement dans le worktree
`lot01-inventaire-surfaces-packs` (tête du LOT-00, PR #596). Unité : **une
ligne = une surface de code** (route, composant, module, test, script) — pas
une règle métier, pas un fichier agrégé. Chaque `chemin:ligne` a été relu ici,
le même jour ; là où le cadrage multi-agents (`wi9359734.output`) se trompait,
c'est noté explicitement — **le code gagne**.

### Quatre corrections au texte initial du lot

1. **`PackProposition` n'est pas « sans objet ».** Écrivain runtime confirmé :
   `web/src/app/api/portail/pack-reevaluation/route.ts:173` (`create`, statut
   `acceptee`/`declinee`, acteur `patient`), lecteur `route.ts:66`, purge RGPD
   `web/src/lib/patient/effacement.ts:101`. **0 ligne en production au
   2026-08-06** (lecture SQL ci-dessous), mais le modèle reste vivant et
   survit au retrait puisque « Base de consultation » reste actif.
2. **Porte oubliée par le texte initial du lot : le bloc « Packs suggérés ».**
   `packsRecommandes` déclaré dans `web/src/lib/questionnaires-functional.ts:78`
   (type) et `:209-268` (10 questionnaires), servi par
   `GET /api/praticien/questionnaires/route.ts:14,45`, rendu en boutons
   cliquables dans `web/src/components/PatientsPanel.tsx:750,900-928` — c'est ce
   bouton qui produit `setSuggestedPackSelection` (`:912`).
3. **L'absorption pack→membres est à `orientationEngine.ts:739-775`**, pas
   `686-748` comme l'écrivait le texte initial (le commentaire commence en
   682, le code exécutable en 739).
4. **Deux fail-closed silencieux, pas un.** Moteur :
   `orientationEngine.ts:571-587` (`packAdministrable` — rend `true` en sortie
   immédiate quand `entree.estAdministrable` n'est pas fourni, donc n'est PAS
   fail-closed par défaut, seulement quand un filtre d'administrabilité est
   fourni par l'appelant) et `:621-632` (le filtre qui pousse ou non la
   cible). Service : `orientationService.ts:260-269`, inconditionnel. **Aucun
   code d'événement n'existe pour la perte de cible d'une règle** :
   `eventCodes.ts:77-86,124` ne porte que `ASSIGNATION_PACK_*` et
   `PACK_REGISTRE_REPLI_LEGACY` — rien pour « une règle publiée n'a plus de
   cible ». C'est un geste LOT-03.

### Orientation

Les 3 packs ciblés (`pack_sommeil_chronobiologie`, `pack_stress_chronique_burnout`,
`pack_digestif_intestin_cerveau`) sont tous les trois désactivés par la
décision de retrait (5 packs de doctrine actifs + Florence 1) : les 6 règles
ci-dessous perdent donc **toutes** leur seule cible dès l'application de
LOT-03, pas de façon hypothétique.

| Surface (chemin:ligne) | Pack(s) consommé(s) | Comportement après retrait (constaté) | Geste requis |
|---|---|---|---|
| `orientationRulesV1.ts:535` (id), `:558` (suggestion) — règle `R2-SOM-05` | `pack_sommeil_chronobiologie` | Seule suggestion `{packId}`, aucun `questionnaireId` en plus. Pack désactivé ⇒ absent de `compositionPacks` (le service ne charge que `actif:true`) ⇒ `packAdministrable` rend `false` ⇒ la cible n'est jamais poussée (`orientationEngine.ts:630-632`) ⇒ **la règle ne produit plus aucune recommandation, silencieusement**. | LOT-02 |
| `orientationRulesV1.ts:630,649` (`R2-STR-02`) + `:1107,1149` (`R-STR-02`) | `pack_stress_chronique_burnout` | Deux règles distinctes (1er et 2e tour) perdent leur seule cible, même mécanisme. | LOT-02 |
| `orientationRulesV1.ts:861,901` (`R2-GAS-02`), `:910,1008` (`R2-ALI-01`), `:1158,1199` (`R-GAS-01`) | `pack_digestif_intestin_cerveau` | Trois règles perdent leur seule cible. `R2-GAS-02`/`R2-ALI-01` sont deux portes d'entrée distinctes du même pack (1er tour, contextuelle vs mesurée) ; `R-GAS-01` est le 2e tour — un retrait partiel (une seule des trois) laisserait les deux autres pointer vers un pack muet. | LOT-02 |
| `orientationRulesV1.ts:118` — type `OrientationSuggestion` | (structurel, les 3 packs) | Union stricte confirmée par lecture : `{questionnaireId, packId?}` ou `{questionnaireId?, packId}`. Pour ces 6 règles, `suggestions` ne porte qu'UNE entrée, `packId` seul. **Aucun mécanisme de repli intra-règle n'existe dans le type.** | LOT-02 (écrire les nouvelles suggestions) |
| `orientationEngine.ts:571-587` — `packAdministrable` | idem | `if (!entree.estAdministrable) return true` (`:572`) : le fail-closed ne s'active QUE si l'appelant fournit un filtre. En production `orientationService.ts` le fournit toujours (`estAdministrableParLaRoute`) ; un appelant nu (test, futur consommateur) ne l'hérite pas. | aucun (déjà correct pour la route en production) |
| `orientationEngine.ts:621-632` — filtre des cibles poussées | idem | Un pack non administrable n'est jamais ajouté aux `cibles` — ni le pack, ni un repli. | LOT-02 (fournit le repli en amont, dans la table) |
| `orientationEngine.ts:739-775` — absorption pack→membres | idem | Ne s'exécute que si un pack EST recommandé — donc jamais pour ces 3, une fois désactivés. `if (!Array.isArray(composition)) continue` (`:744`). Devient du code mort pour ces 3 packs après LOT-02, reste utile pour un futur pack de doctrine recommandé. | aucun |
| `orientationEngine.ts:125,671` — `NIVEAU_PACK` (**point vérifié en revue**) | idem | `NIVEAU_PACK = new Map(PACKS_REGISTRY.map(pack => [pack.id, pack.niveau]))` (`:125`), lu à `:671` pour décider le `niveau` d'une cible pack. Vérifié le 2026-08-06 : les 6 règles et les 3 packs qu'elles ciblent portent tous `niveau: 'approfondissement'` — `NIVEAU_PACK.get(...)` et `regle.niveau` coïncident systématiquement, donc **aucun décalage de niveau ne se produit** sur ce périmètre, ni avant ni après retrait. | aucun |
| `orientationService.ts:143-177` — lecture DB + traduction `PackId → id_pack` | idem | `prisma.pack.findMany({where:{actif:true}})` (`:143`) : un pack désactivé n'entre jamais dans `compositionPacks`. Déjà correct. | aucun |
| `orientationService.ts:260-269` — second fail-closed, inconditionnel | idem | Filtre indépendant du moteur, même verdict pour une composition absente. Redondant en production, protège un appelant qui oublierait `estAdministrable`. | aucun |
| `web/src/lib/clinical/verifierRestitutionOrientation.ts:1` | `PACKS_REGISTRY` (16 packs doctrine) | Garde de restitution IA : vérifie qu'un pack cité dans la synthèse appartient au vocabulaire fermé. Déclaratif, indépendant de `actif` — mais plus aucune synthèse ne citera ces 3 packs puisque l'orientation ne les recommande plus. | aucun |
| `web/src/components/patient-cockpit/OrientationPanel.tsx:6,30,205` (libellé) et `:271,295` (le bouton lui-même — **correction** : ces trois premières lignes construisent le libellé et décident si le bouton est actif, mais ne le portent pas ; l'infobulle « Assigner ce pack déclenche un e-mail au patient. » est à `:271`, le bouton « Assigner ce pack » à `:295`) | `PACKS_REGISTRY` | Construit le libellé du pack recommandé, décide si le bouton d'assignation est actif (via `idPackBase`, doctrine — pas `actif` DB). N'exécute plus ce chemin pour les 3 packs, faute de recommandation. | **LOT-02**, pas LOT-03 — `LOT-02-implementation.md:24-26` pose « plus de bouton « Assigner ce pack » » comme résultat observable du lot qui re-cible les règles, avant tout retrait de pack en base |
| `web/src/app/api/praticien/synthese/route.ts:44,97,361,414` — `packsTransmis` | idem | Allowlist des packs citables par Claude dans la synthèse, lue depuis `ResultatOrientation`. Devient vide en pratique une fois qu'aucune recommandation `pack` ne sort du moteur. | aucun immédiat — dette de code mort, à évaluer LOT-03/04 |
| `web/src/lib/anthropic.ts:326` | idem | Instructions système de citation de pack au modèle. Simplement jamais sollicité pour ces 3 packs. | aucun |
| `orientationRulesV1.test.ts:104-113` — SHA épinglé | idem | `SHA_SIGNE_2026_08_04 = '528004de…'` comparé au hash calculé. Toute modification des 6 règles fait ROUGIR ce test — voulu (D-018) : re-signer, pas corriger le littéral en silence. | LOT-02 (re-signature D-018 obligatoire) |
| `orientationRulesV1.test.ts:391-395` — fixture `COMPOSITION_PACKS` | idem | Fixture **partielle**, pas la composition réelle : `pack_sommeil_chronobiologie` y porte ses 8 qids réels (conforme à la lecture SQL du jour), mais `pack_stress_chronique_burnout` n'y porte que `['Q_STR_02','Q_STR_05']` (2 des 9 réels) et `pack_digestif_intestin_cerveau` que `['Q_GAS_01']` (1 des 8 réels). **Écart avec le cadrage** : le vérificateur 1 affirmait qu'aucune composition n'était prouvée dans le dépôt ; la critique du cadrage a corrigé en citant cette fixture, mais sans signaler qu'elle est partielle sur 2 packs sur 3. Le LOT-02 doit composer ses suggestions depuis la lecture SQL ci-dessous, pas depuis cette fixture. | LOT-02 (mettre la fixture à jour avec la re-signature) |

### Portail patient

| Surface | Pack(s) | Comportement après retrait | Geste |
|---|---|---|---|
| `api/portail/valider/route.ts:24-33,162` — `resoudrePackBase` | « Base de consultation » — **seul écrivain de `consultation.idPackAssigne` dans tout le dépôt** (confirmé : 1 seul écrivain sur 6 occurrences du champ dans `src/` — l'écriture `:162`, les 4 lectures de `pack-reevaluation/route.ts:78,80,87,101`, et une mention dans son test) | Ce pack reste actif après retrait (décision produit) : aucun changement direct. **Le repli secondaire par nom (`NOM_PACK_BASE = 'BASE DE CONSULTATION'`, majuscules) est MORT, pas un filet** : le nom réel en base est « Base de consultation », et l'égalité Prisma/PostgreSQL est sensible à la casse — ce repli ne peut jamais s'exécuter (voir D-030, réserves). | LOT-03 (recherche insensible à la casse, ou garde anti-démarquage du pack `parDefaut` — D-030 point 4) |
| `api/portail/pack-reevaluation/route.ts:74-108` — `candidat()` | pack de la dernière consultation validée **ou** `parDefaut` | Puisque seul `portail/valider` écrit `idPackAssigne`, et toujours avec le pack de base, le retrait des 6 packs non-base ne peut rendre `dejaRempli` introuvable que sur des consultations historiques (avant que ce soit systématique). Fait SQL : 15 lignes `id_pack_assigne`, une seule valeur, le pack de base. | aucun — voir réponse à la question ouverte plus bas |
| `web/src/lib/patient/packReevaluation.ts:43-51` — `choisirPackPropose` | idem | `candidat = packDejaRempli ?? packParDefaut ?? null` (`:47`), puis `if (!candidat \|\| candidat.nbQuestionnaires<=0) return null` (`:49`). **Asymétrie confirmée** : pack déjà rempli désactivé ⇒ absent du `findMany` (filtré `actif:true`) ⇒ repli sur `parDefaut`, proposition affichée. Pack déjà rempli actif mais `qids.length===0` ⇒ `nbQuestionnaires<=0` ⇒ retourne `null` **sans jamais essayer `parDefaut`** : aucune proposition. Même opérateur `??`, deux issues différentes. | LOT-03 (trancher, cf. question ouverte) |
| `web/src/app/api/portail/assignations/route.ts:140` | — | Le mot « pack » n'apparaît que dans un commentaire (tri secondaire par `createdAt`, référence à `assignBasePack.ts`). **Pas un lecteur réel** malgré le grep positif. | aucun |
| `web/src/components/patient/PropositionPackReevaluation.tsx:42,66` | pack de réévaluation | Seul appelant applicatif de `api/portail/pack-reevaluation`, monté uniquement dans `portail/[token]/questionnaires/page.tsx`. Continue de fonctionner après retrait. | aucun |

### Praticien

| Surface | Pack(s) | Comportement après retrait | Geste |
|---|---|---|---|
| `api/praticien/packs/route.ts:63-70` — `GET`, sans filtre `actif` | les 8 packs, actifs et inactifs | `findMany({orderBy:{createdAt:'desc'}})` : aucun filtre `actif`. Les 7 packs désactivés après retrait restent listés — visible en historique, comme le veut la campagne. | aucun (voulu) |
| `api/praticien/packs/route.ts:86,102` — `POST`, création | tout nouveau pack | `normaliserQids` (`:52-60`) filtre par existence au catalogue et déduplique, mais **ne consulte pas `IDS_SUSPENDUS`** : un pack créé avec un instrument suspendu passe. La revue adversariale du 2026-08-06 a établi que ceci laisse ouvert le chemin que [[D-025]] réserve « aucun garde n'empêche `Q_ALI_09` d'entrer dans un pack » (`docs/DECISIONS.md:119`) décrivait déjà pour cette même route — le retrait des 6 packs ne le ferme pas, il le réduit à un seul pack désormais modifiable. | LOT-03 (D-030 point 4) |
| `api/praticien/packs/route.ts:182,191-193` — `PATCH`, `parDefaut` sans garde | tout pack, actif ou non | `if (payload.parDefaut !== undefined) data.parDefaut = Boolean(...)` (`:182`) : accepté sans vérifier que le pack visé est actif, ni qu'il en reste un autre `parDefaut`. Combiné au repli par nom mort (ligne ci-dessus), démarquer « Base de consultation » par erreur laisserait `resoudrePackBase` sans filet réel. | LOT-03 (D-030 point 4) |
| `web/src/components/PacksPanel.tsx:411,441` — badge et boutons d'action | idem | Badge « Inactif » (`:411`) ; le bloc de boutons (Retirer/Définir par défaut/Désactiver) n'est rendu QUE si `p.actif` (`:441`) — **aucun bouton de réactivation**. | aucun côté UI |
| `api/praticien/packs/route.ts:139,181` — `PATCH`, accepte `actif` | idem | `if (payload.actif !== undefined) data.actif = Boolean(payload.actif)` (`:181`) : réactivation possible par appel API direct, hors UI. `onSubmitEditPack` (`PacksPanel.tsx:200`) n'envoie jamais `actif`. | aucun — dette à consigner dans D-030 |
| `api/praticien/packs/route.ts:210,227` — `DELETE`, soft delete | idem | `tx.pack.update({data:{actif:false}})` : jamais de suppression physique. Mécanisme du retrait de LOT-03. | LOT-03 (l'exécute) |
| `web/src/components/PacksPanel.tsx:80-99` — consommation de `suggestedPackSelection` | packs actifs, recherche par nom normalisé | Cherche parmi `packs.filter(p=>p.actif)` (`:90`). Pack suggéré absent des actifs ⇒ échoue proprement, message `« … » n'existe pas encore parmi les packs actifs.` (`:99`) — pas une erreur, un geste praticien qui n'aboutit à rien. | LOT-03 (avec la ligne suivante) |
| `PatientsPanel.tsx:138,205,912,1056` — state `suggestedPackSelection` | idem | Déclaré (`:138`), initialisé (`:205`), écrit au clic sur « Packs suggérés » (`:912`), transmis en prop (`:1056`). | LOT-03 |
| `PatientsPanel.tsx:750,900-928` — bloc « Packs suggérés » (**porte oubliée par le texte initial du lot**) | `packsRecommandes` de 10 questionnaires (doctrine) | `packsSuggeres` (`:750`) mappe les titres depuis le registre de doctrine, PAS depuis la base : les boutons restent affichés après retrait, avec le titre du pack désactivé. Le clic aboutit au message d'échec ci-dessus — **une porte du parcours qui ignore l'exemption**, exactement la classe de défaut visée par le lot. | LOT-03 (masquer/retirer les boutons pointant vers un pack inactif) |
| `web/src/app/api/praticien/packs/assign/route.ts:48,147,319` | tout pack actif désigné par `idPack` | Assignation directe ligne à ligne, résolution `resolvePackQuestionnaireIds` (`:147`). Seul texte d'e-mail nommant explicitement un pack (`:319`). **Selon la décision produit n°2, ce n'est plus le chemin cible depuis l'orientation** — remplacé par l'ajout à la file d'envoi. | LOT-02/LOT-03 (le bouton d'orientation bascule vers `POST /api/praticien/file-envoi`) |
| `api/praticien/file-envoi/route.ts:155,179-185,196,211` | qids arbitraires, aucune notion de pack | Chemin de remplacement déjà existant et fonctionnel : dédup, plafond 60, verrou de ligne patient. C'est la cible du geste d'envoi. | aucun (déjà l'infrastructure cible) |
| `api/praticien/file-envoi/envoyer/route.ts:26,146,206,263` | — | Claim atomique (`:146`), mail récapitulatif au sujet générique (`:263`, sans nom de pack). Patron déjà identique à `packs/assign` (commentaire `:26`). | aucun |
| `web/prisma/schema.prisma:1347` (`PackProposition`), `:1377` (`EnvoiBrouillon`) | — | `idPack` n'est pas une FK (survit à la désactivation, `:1344`). `EnvoiBrouillon` n'a aucune FK vers `Pack`. Aucun des deux n'est affecté par le retrait. | aucun |
| Libellé UI « Questionnaires & packs » (**surface manquante, ajoutée en revue**) — `SidebarRail.tsx:71`, `MobileBottomNav.tsx:132`, `dashboard/patients/page.tsx:15,18`, `TrajectoiresPanel.tsx:91` | aucun accès aux données `Pack` | Texte seul, dans quatre fichiers distincts (navigation desktop/mobile, titre de page, message d'état vide). Aucun des quatre ne lit `prisma.pack` ni `PACKS_REGISTRY`. Impact nul sur le retrait — mentionné pour l'exhaustivité, pas parce que le retrait le touche. | aucun |

### Doctrine / seed / registre

| Surface | Pack(s) | Comportement après retrait | Geste |
|---|---|---|---|
| `questionnaires-functional.ts:111-144` — `PACKS_REGISTRY` | 16 déclarés, 6 avec `idPackBase` (SOCLE_INIT, STRESS_BURNOUT, SOMMEIL_CHRONO, HUMEUR_NEURO, DIGESTIF_INTESTIN, CARDIO_METABO — tous `phase:'mvp'`), 10 avec `idPackBase:null` (tous `phase:'phase_2'`, jamais créés en base) | Déclaratif, indépendant de `actif` en base. `pack_socle_initial_neuronutrition` (→`PACK_SOCLE_INIT`) est l'un des 5 packs doctrine actifs désactivés par le retrait — la doctrine continuera de le décrire comme existant en base alors qu'il devient inactif. | aucun (registre volontairement indépendant de `actif`) |
| `questionnaires-functional.ts:78,209-268` — `packsRecommandes` (10 questionnaires) | 4 des 6 packs doctrine actifs (source de la porte oubliée, voir Praticien) | — | LOT-03 |
| `questionnaires-functional.ts:158-183` — `packIdDepuisIdBase`/`idBaseDepuisPackId` | — | Traduit `id_pack` ↔ slug doctrine. Un pack praticien (« Base de consultation », « Florence 1 ») n'a pas de correspondance et rend `null` — déjà correct, ne recommande jamais un pack hors doctrine. | aucun |
| `web/src/app/api/praticien/questionnaires/registry/route.ts:8,25` (**surface manquante, ajoutée en revue**) | `PACKS_REGISTRY` entier | `GET` sert `{categories: FUNCTIONAL_CATEGORIES, packs: PACKS_REGISTRY}` (`:25`) tel quel, sans filtre `actif`. Appelée par `PatientsPanel.tsx:272` (`loadRegistry`) et importée par `PacksPanel.tsx:7`. **C'est LE point d'où viennent les titres du bloc « Packs suggérés »** (`PatientsPanel.tsx:288` `packById` → `:750`) — le point où LOT-03 devra filtrer pour fermer la porte oubliée. | LOT-03 (filtrer par `idPackBase` actif, ou par le geste choisi pour la porte oubliée) |
| `web/prisma/seed.ts:255-297` — `PACK_BASE`/`PACK_SEED_BASE` | pack de développement seedé | `idPack:'PACK_SEED_BASE'` ne correspond à AUCUN des 6 `idPackBase` de `PACKS_REGISTRY`. Contenu réaligné le 2026-08-06 (LOT-00, commentaire du fichier) sur la production (5 qids, `Q_SOM_09` inclus), mais l'identifiant reste hors doctrine. Constat déjà connu et accepté au LOT-00, non modifié ici. | aucun (accepté LOT-00) |
| `packRegistry.ts:12-67` — `syncPackToRegistry` | tout pack CRUD praticien | Miroir vers `QuestionnairePack`/`QuestionnairePackQuestionnaire`, appelé aux 3 mutations de `packs/route.ts`. Un `DELETE` (retrait LOT-03) resynchronise donc aussi le registre relationnel. | aucun |
| `packRegistry.ts:89-123` — `resolvePackQuestionnaireIds` | idem | Repli legacy sur `pack.qids` si le registre ne couvre pas exactement le même ensemble. Appelé par `portail/valider:92` et `packs/assign:147`. | aucun |
| `web/src/lib/consultation/packRegistryLogic.ts` (**surface manquante, ajoutée en revue**) — `resolveQidsLogic` | idem | Logique pure (zéro dépendance) derrière `resolvePackQuestionnaireIds` (`packRegistry.ts:89-123`) : compare `registryQids`/`legacyQids`, rend `registryQids` si identiques (cardinal + contenu), `null` sinon. Non affecté par le retrait — c'est une comparaison d'ensembles, indépendante de `actif`. | aucun |
| `web/src/lib/consultation/assignBasePack.ts` (**surface manquante, ajoutée en revue**) — `assignPackToPatient`, `qidsSuspendus` | tout pack résolu par l'appelant | Cœur métier de l'assignation : crée les `Assignation` par qid, écarte les qids déjà ouverts et les `IDS_SUSPENDUS` (`qidsSuspendus`, appliqué en aval — pas à la création du pack, voir la ligne `POST /api/praticien/packs` ci-dessus). Appelé par `portail/valider/route.ts:11` (import), `:122` (`qidsSuspendus`), `:132` (`assignPackToPatient`). Non modifié par le retrait : reçoit toujours le pack que `resoudrePackBase` lui donne. | aucun |
| `web/prisma/backfillQuestionnaireRegistry.ts:89` | tous les packs | Script d'exploitation (`prisma.pack.findMany()`), hors runtime app. Fonctionne sur des packs inactifs sans distinction. | aucun |
| `web/prisma/checkPackRegistryConsistency.ts:35` | idem | Script de contrôle lecture seule, sans filtre `actif` — rapportera aussi les 7 packs désactivés. | aucun |

### Observabilité + RGPD

| Surface | Pack(s) | Comportement après retrait | Geste |
|---|---|---|---|
| `web/src/lib/observability/eventCodes.ts:77-80,86` — **5** codes `ASSIGNATION_PACK_*` (**correction** : le texte initial en comptait 6) | assignation de pack (`packs/assign`) | Télémétrie de l'assignation directe (payload invalide, résolution échouée, e-mail échoué, exception, instrument suspendu), reste valide même si l'usage recule au profit de la file d'envoi (décision n°2). `ASSIGNATION_DEJA_ASSIGNE_ECARTE` (`:90`) est un code voisin, sans le préfixe `PACK`, à ne pas compter dans les 5. **Aucun code équivalent pour la perte de cible d'une règle** — recherché explicitement, absent. | LOT-03 (créer le code d'événement promis par la campagne) |
| `eventCodes.ts:124` — `PACK_REGISTRE_REPLI_LEGACY` | registre relationnel | Événement du repli `resolvePackQuestionnaireIds`, sans rapport direct avec le retrait des packs non-base. | aucun |
| `web/src/lib/assignations/messages.ts:18` | assignation annulée | Message distinct questionnaire unitaire / pack entier. Reste correct pour les assignations déjà créées (append-only, non affectées par la désactivation d'un pack). | aucun |
| `web/src/lib/patient/effacement.ts:101,102` | `PackProposition`, `EnvoiBrouillon` | `tx.packProposition.deleteMany`/`tx.envoiBrouillon.deleteMany` sur effacement RGPD complet. Continue de fonctionner (aucun des deux modèles n'a de FK vers `Pack`). | aucun |

### Tests & E2E & snapshots

| Surface | Pack(s) | Comportement après retrait | Geste |
|---|---|---|---|
| `web/src/components/FichePatientPanel.test.tsx:986` | bouton « Assigner ce pack » | Fixture `packId`/`idPackBase`, teste la présence du bouton. **Correction (attribution)** : cassera au **LOT-02**, pas LOT-03 — c'est le lot qui retire le bouton (`LOT-02-implementation.md:24-26`), avant même qu'un pack soit désactivé en base. | LOT-02 |
| `web/src/components/patient-cockpit/OrientationPanel.test.tsx:29-30` (fixture `cible:{type:'pack',packId:'pack_sommeil_chronobiologie'}`), `:30,138` (`idPackBase`) (**manquant, ajouté en revue**) | pack de recommandation, bouton d'assignation | La fixture `RECOMMANDATION_PACK` construit une cible `pack` pour tester le rendu du bouton (présence/absence selon `idPackBase`). Cassera dès que LOT-02 retire le bouton et que le moteur ne produit plus de cible `pack`. | LOT-02 |
| `web/src/app/api/praticien/orientation/route.test.ts:148-370` (~10 cas à `packId`, traduction `id_pack`↔slug doctrine) (**manquant, ajouté en revue**) | les 3 packs (fixtures type `pack_stress_chronique_burnout`) | Vérifie l'aller-retour `id_pack` base ↔ `PackId` doctrine sur des cas construits (pas les 6 vraies règles, mais le même mécanisme `packIdDepuisIdBase`/`idBaseDepuisPackId` que LOT-02 laisse intact). Cassera si LOT-02 modifie ce mécanisme de traduction ; sinon stable. | LOT-02 (si la traduction change ; sinon aucun) |
| `web/src/lib/questionnaires-functional.test.ts:53` (« les `packsRecommandes` de chaque override pointent vers un pack déclaré ») (**manquant, ajouté en revue**) | `packsRecommandes` (10 questionnaires), `PACKS_REGISTRY` | Banc de doctrine : vérifie l'intégrité du registre (unicité `id_pack`/`PackId`, `packsRecommandes` pointant vers un pack déclaré), indépendant de `actif` en base. | LOT-03, **conditionnel** — seulement si le geste qui ferme la porte oubliée touche `packsRecommandes` ou `PACKS_REGISTRY` (pas garanti : un filtrage côté `PatientsPanel.tsx` ou `registry/route.ts` n'y toucherait pas) |
| `web/src/lib/clinical/verifierRestitutionOrientation.test.ts` (**manquant, ajouté en revue**) | `PACKS_REGISTRY` (vocabulaire fermé, 16 titres) | Teste le garde de restitution sur des textes de synthèse synthétiques et l'ensemble des 16 titres de doctrine — structurel, indépendant de `actif` et des 6 règles réelles. | aucun changement direct attendu par LOT-02 ou LOT-03 tels que cadrés |
| `web/src/app/api/portail/pack-reevaluation/route.test.ts` (**manquant, ajouté en revue**) | pack déjà rempli / `parDefaut` | Mocke `prisma.pack.findMany` et `packProposition` pour exercer `candidat()`/`choisirPackPropose`. C'est ici que les nouveaux cas de l'asymétrie du repli (D-030, réserves) devront s'ajouter. | LOT-03 |
| `web/src/app/api/praticien/packs/assign/route.test.ts` (**manquant, ajouté en revue**) | pack synthétique (`idPack:'PACK_TEST'`, fixture propre au test) | N'utilise aucun `id_pack` réel des 8 packs de production — agnostique du retrait. | aucun changement direct attendu |
| `web/src/app/api/portail/valider/route.test.ts` (**manquant, ajouté en revue**) | `resoudrePackBase` (mock `pack.findFirst`) | C'est le test qui devra couvrir le repli par nom mort (B2, D-030 réserves) et le futur garde anti-démarquage `parDefaut`. | LOT-03 |
| `web/src/lib/patient/packReevaluation.test.ts` (**manquant, ajouté en revue**) | `choisirPackPropose`, `doitProposer` (domaine pur) | Teste directement l'asymétrie `??`/`nbQuestionnaires<=0` (D-030, réserves) — c'est le banc où la trancher au LOT-03 s'écrit. | LOT-03 |
| `web/src/lib/clinical/orientationEngine.test.ts` (**manquant, ajouté en revue**) | fixtures synthétiques `pack_stress_chronique_burnout`/`pack_sommeil_chronobiologie`, construites par un helper `regle()` propre au test (pas la vraie table) | N'importe pas `ORIENTATION_RULES_V1` : les 6 vraies règles ne le font pas rougir. Cassera seulement si `LOT-02-implementation.md` exerce sa clause « retrait minimal » du code mort d'absorption dans `orientationEngine.ts` (fichier probable du lot). | LOT-02, conditionnel au retrait de code mort ; sinon aucun |
| `web/src/app/api/praticien/synthese/orientation.restitution.test.ts:279` (déjà cité en section Orientation comme preuve de `packsTransmis`) | `pack_sommeil_chronobiologie` | `expect(meta.orientationPacksTransmis).toEqual(['pack_sommeil_chronobiologie'])` : assertion qui suppose qu'une recommandation `pack` existe. Rougira dès que LOT-02 re-cible `R2-SOM-05` vers des `questionnaireId`. | LOT-02 |
| `web/src/lib/clinical/orientationService.test.ts` (**manquant, ajouté en revue**) | aucun réel — `prisma.pack.findMany` mocké `[]` sur tous les cas | N'exerce aucune recommandation `pack` avec composition réelle ; teste `tableSignee`/`orientationActive`/le fail-closed sur des `mockRegles` propres au fichier. | aucun changement direct attendu |
| `web/src/app/api/praticien/packs/route.test.ts` (**manquant, ajouté en revue**) | — (test d'autorisation seul, G-TRUST-04) | Vérifie que GET/POST/PATCH/DELETE refusent sans session — ne teste ni `IDS_SUSPENDUS` ni `parDefaut`. C'est le banc où le nouveau cas du garde (D-030 point 4) devra s'ajouter. | LOT-03 |
| `web/src/components/patient/PropositionPackReevaluation.test.tsx` (**manquant, ajouté en revue**) | proposition de réévaluation, rendu UI | Teste le composant à partir de réponses API simulées (refusable, ne réapparaît pas après réponse) — la logique de repli qu'il consomme est testée côté route/domaine (lignes ci-dessus), pas ici. | aucun changement direct attendu |
| `web/src/lib/consultation/assignBasePack.test.ts` (**manquant, ajouté en revue**) | `assignPackToPatient`, `qidsSuspendus` | `qidsSuspendus` est déjà appliqué en aval de la création du pack ; le manque identifié (D-030 point 4) est en amont, à la création (`POST /api/praticien/packs`), hors du périmètre de cette fonction. | aucun changement direct attendu |
| `web/src/lib/correspondance/patient.guard.test.ts:16` | `packs/assign/route.ts` | Garde transversal (journalisation via `journaliserCorrespondancePatient`). Ne casse pas avec le retrait des packs, casserait si la route elle-même disparaissait. | aucun |
| `web/src/lib/portail/hubQuestionnaires.test.ts:121` | pack assigné, priorité dans le hub | Teste la priorité pack vs agenda. Assignations déjà créées non affectées par le retrait. | aucun |
| `web/e2e/portail-pack-reevaluation.spec.ts:63` | pack de réévaluation | E2E bout-en-bout du flux `pack-reevaluation`. Continue de fonctionner (le pack de base reste actif et `parDefaut`). | aucun |
| `web/e2e/portail-parcours.spec.ts:23` | « Base de consultation » | Dépend nommément du pack de base (commentaire : « peut évoluer »). C'est le pack qui survit au retrait. | aucun |
| `web/e2e/visual.spec.ts:132` | page `/dashboard/patients` (monte `PacksPanel`) | Capture un snapshot visuel affichant les packs désactivés avec leur badge. Toute retouche UI de LOT-03 impose une mise à jour de baseline. | LOT-03 |
| `web/e2e/helpers/db.ts:115` | `PackProposition` (fixtures E2E) | `prisma.packProposition.deleteMany({where:{idPatient}})` — nettoyage partagé par plusieurs specs, pas seulement `pack-reevaluation`. | aucun |

*(`orientationRulesV1.test.ts:104-113,391-395` sont des tests aussi, déjà listés dans la section Orientation — non recomptés ici. Les 14 fichiers de tests unitaires/composants signalés manquants en revue sont désormais tous couverts ci-dessus, y compris `orientation.restitution.test.ts` — déjà cité en section Orientation comme preuve de `packsTransmis`, et repris ici pour la même raison.)*

### Scripts d'exploitation et campagne

| Surface | Pack(s) | Comportement après retrait | Geste |
|---|---|---|---|
| `scripts/wn-matrice-consommation.mjs:164` — entrée `packs-consultation` | `resolvePackQuestionnaireIds`/`RaisonRepliLegacy` | Mesure automatiquement les appelants réels (profondeur d'import max 3) : 3 appelants directs (`portail/valider`, `packs/assign`, `packs`), colonnes décision/arbitrage vides. Rejouable (`node scripts/wn-matrice-consommation.mjs`) — source déjà mesurée, ne pas recompter à la main. | aucun |
| `docs/claude/MATRICE_CONSOMMATION.md:30` | idem | Rapport committé (LOT-05, #593, commit `7eb08126`). Cité comme source, pas recompté par LOT-01. | aucun |

### Surfaces vérifiées absentes

Recherchées explicitement, sans consommation de pack trouvée :

| Surface | Pack(s) consommé(s) | Preuve de l'absence | Geste |
|---|---|---|---|
| `web/src/app/api/praticien/metrics/route.ts` | aucun (vérifié) | `grep -n "pack"` : 0 résultat. | aucun |
| `web/src/lib/documents/rendu.ts`, `api/praticien/booklet/route.ts`, `api/praticien/documents/route.ts` | aucun (vérifié) | 0 résultat sur les trois fichiers. Distinct de `api/praticien/synthese/route.ts`, qui EST un consommateur (section Orientation) : la mise en forme du document ne lit aucun pack, le contenu qu'elle reçoit si. | aucun |
| `web/src/components/patient/MonBilan.tsx` | aucun (vérifié) | 0 résultat. | aucun |
| `api/praticien/cockpit`, `api/praticien/fil`, `components/fil/`, `lib/fil/` | aucun (vérifié fonctionnellement) | 0 résultat fonctionnel ; deux commentaires seulement (`lib/fil/cartes.ts:335`, `patient-cockpit/TrajectoirePanel.tsx:52`), aucun code exécutable n'en dépend. | aucun |
| `api/praticien/regles/*` | aucun (vérifié) | 0 résultat sur le dossier entier. | aucun |
| `web/vercel.json` | aucun (vérifié) | Aucune clé `crons` déclarée — aucun job planifié ne peut toucher aux packs. | aucun |
| Emails hors `packs/assign` | aucun (vérifié) | `file-envoi/envoyer/route.ts:263` : sujet et corps génériques (« Questionnaires à compléter… »), sans nom de pack. Seul `packs/assign/route.ts:319` en nomme un. | aucun |

### Lectures SQL datées (2026-08-06, MCP Supabase `execute_sql`, projet `ohnbmypinamzzfhqymlt`)

Requêtes rejouées indépendamment du cadrage, mêmes résultats :

```sql
SELECT id_pack, nom, actif, par_defaut, cardinality(qids) AS nb_qids, qids
FROM packs ORDER BY actif DESC, par_defaut DESC, nom;
```

8 lignes, 7 actives + 1 inactive :

| id_pack | nom | actif | par_defaut | qids (composition réelle) |
|---|---|---|---|---|
| `PACK_-bG21yeIvVYRhrdlYuWIMnFz` | Base de consultation | true | **true** | Q_MOD_03, Q_MOD_01, Q_INF_03, Q_SOM_09, Q_ALI_01 (5) — pack praticien, hors doctrine |
| `PACK_SOCLE_INIT` | Socle initial neuronutrition | true | false | Q_MOD_03, Q_MOD_01, Q_ALI_01, Q_INF_03, Q_SOM_01, Q_SOM_06, Q_NEU_11, Q_STR_04, Q_GAS_01 (9) |
| `PACK_SOMMEIL_CHRONO` | Sommeil et chronobiologie | true | false | Q_SOM_01, Q_SOM_02, Q_SOM_03, Q_SOM_05, Q_SOM_04, Q_SOM_06, Q_INF_03, Q_NEU_11 (8) |
| `PACK_STRESS_BURNOUT` | Stress chronique et burnout | true | false | Q_STR_02, Q_STR_04, Q_STR_03, Q_STR_06, Q_STR_05, Q_STR_08, Q_SOM_01, Q_INF_01, Q_INF_03 (9) |
| `PACK_DIGESTIF_INTESTIN` | Digestif et intestin-cerveau | true | false | Q_GAS_01, Q_GAS_03, Q_ALI_01, Q_STR_02, Q_SOM_01, Q_INF_03, Q_INF_01, Q_MOD_03 (8) |
| `PACK_CARDIO_METABO` | Cardio-métabolique, poids et inflammation | true | false | Q_CAR_01, Q_MOD_01, Q_MOD_02, Q_ALI_01, Q_ALI_02, Q_ALI_03, Q_SOM_01, Q_SOM_03, Q_STR_02 (9) |
| `PACK_b8sda7asd-h_B8x8061uORhc` | Florence 1 | true | false | Q_FIB_02, Q_SOM_01, Q_SOM_03, Q_SOM_07, Q_STR_04, Q_STR_02 (6) — pack praticien, hors doctrine |
| `PACK_HUMEUR_NEURO` | Humeur, motivation et neurochimie | **false** | false | Q_INF_03, Q_NEU_11, Q_NEU_01, Q_NEU_02, Q_NEU_12, Q_NEU_03, Q_SOM_01, Q_SOM_06, Q_MOD_01 (9) |

Conséquence chiffrée pour la campagne : le retrait désactive **6 packs** (5
doctrine actifs + Florence 1), « Base de consultation » restant seul actif.

```sql
SELECT id_pack_assigne, count(*) FROM consultations
WHERE id_pack_assigne IS NOT NULL GROUP BY 1;
```
→ `PACK_-bG21yeIvVYRhrdlYuWIMnFz` (Base de consultation), **15 lignes** — une
seule valeur en base. Confirme l'analyse de code : `portail/valider:162` est le
seul écrivain, et il n'écrit que le pack de base.

```sql
SELECT count(*) AS nb FROM pack_propositions;
```
→ **0 ligne** au 2026-08-06 — le modèle est câblé en runtime mais inutilisé à
ce jour.

### Compositions de remplacement proposées pour le LOT-02

Base retirée des candidats : les qids déjà assignés à l'onboarding par le pack
de base (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_SOM_09`, `Q_ALI_01`) — proposer
à nouveau un questionnaire déjà administré au premier tour n'a pas de sens.
**Source : la lecture SQL ci-dessus, pas la fixture de test** (partielle sur
2 des 3 packs, voir plus haut). Chaque proposition est **à arbitrer
cliniquement au LOT-02, re-signature D-018 obligatoire** (littéral
`SHA_SIGNE_2026_08_04` dans `orientationRulesV1.test.ts:105`) — ce ne sont que
des candidats tirés de la composition existante, pas un arbitrage clinique.

- **`R2-SOM-05` → `pack_sommeil_chronobiologie`** (attente « Améliorer le
  sommeil » + Q_MOD_01 SOMMEIL≤8, bande la plus sévère). Candidats :
  `Q_SOM_01` (PSQI — déjà l'instrument seul proposé par la règle sœur
  `R2-SOM-01`, commentaire `orientationRulesV1.ts:552`), `Q_SOM_02`,
  `Q_SOM_03`, `Q_SOM_04`, `Q_SOM_05`, `Q_SOM_06`, `Q_NEU_11` (HAD). Proposition
  minimale cohérente avec la règle sœur : `Q_SOM_01` seul, ou l'ensemble
  complet pour reproduire l'exploration que le pack visait.
- **`R2-STR-02` → `pack_stress_chronique_burnout`** (1er tour, facteur
  déclenchant « Stress aigu/burn-out » + Q_MOD_01 ADAPTATION_STRESS≤17).
  Candidats : `Q_STR_02` (PSS-10, mesure de stress perçu — déjà cible de
  `R-STR-02` au 2e tour), `Q_STR_05` (BMS-10, risque de burnout — mapping
  explicite en commentaire du fichier : « BMS-10 = Q_STR_05 »), `Q_STR_03`,
  `Q_STR_04`, `Q_STR_06`, `Q_STR_08`, `Q_SOM_01`, `Q_INF_01`. Proposition :
  `Q_STR_02` en priorité (cohérent avec le 2e tour), `Q_STR_05` en second.
- **`R-STR-02` → `pack_stress_chronique_burnout`** (2e tour, Q_STR_02 déjà en
  zone {warning,danger,dark}). Candidats : les mêmes moins `Q_STR_02` (déjà
  mesuré) — `Q_STR_05` (BMS-10), `Q_STR_03`, `Q_STR_04`, `Q_STR_06`,
  `Q_STR_08`, `Q_SOM_01`, `Q_INF_01`. Proposition : `Q_STR_05` en priorité.
- **`R2-GAS-02` → `pack_digestif_intestin_cerveau`** (1er tour, antécédent
  digestif + Q_MOD_03 digestion≥4). Candidats : `Q_GAS_01` (TFD — déjà
  l'instrument seul proposé par la règle sœur `R2-GAS-01` à un seuil plus
  haut, `orientationRulesV1.ts:853`), `Q_GAS_03`, `Q_STR_02`, `Q_SOM_01`,
  `Q_INF_01`. Proposition : `Q_GAS_01` en priorité (cohérent avec `R2-GAS-01`
  et `R-GAS-01`).
- **`R2-ALI-01` → `pack_digestif_intestin_cerveau`** (déclenchée par Q_ALI_01
  SIIN57 défavorable, drapeau `WN_ALI_01_SIIN57`). Mêmes candidats que
  `R2-GAS-02` : `Q_GAS_01`, `Q_GAS_03`, `Q_STR_02`, `Q_SOM_01`, `Q_INF_01`.
  Proposition : `Q_GAS_01` en priorité, même raison.
- **`R-GAS-01` → `pack_digestif_intestin_cerveau`** (2e tour, Q_GAS_01 déjà en
  zone {warning,danger,dark}). Candidats : les mêmes moins `Q_GAS_01` (déjà
  mesuré) — `Q_GAS_03`, `Q_STR_02`, `Q_SOM_01`, `Q_INF_01`. Proposition :
  `Q_GAS_03` en priorité (seul autre instrument digestif du pack).

À noter : `Q_STR_02`, `Q_SOM_01` et `Q_INF_01` reviennent comme candidats à la
fois côté stress et côté digestif — reflet fidèle de la composition réelle des
packs (transversale), pas une erreur de copie.

### Réponses aux questions ouvertes de CAMPAGNE.md

**(a) Les 6 suggestions à `packId` portent-elles déjà des cibles
`questionnaireId` de repli, ou faut-il les composer ?**
Inexistantes par construction. Le type `OrientationSuggestion`
(`orientationRulesV1.ts:118`) est une union stricte — `{questionnaireId,
packId?}` ou `{questionnaireId?, packId}` — et pour les 6 règles concernées,
`suggestions` ne porte qu'une seule entrée, `packId` seul. Composer les
candidats est un geste du LOT-02 (candidats ci-dessus), pas une donnée à
retrouver dans le dépôt.

**(b) Le repli `pack-reevaluation` sur `parDefaut` : acceptable ou à ajuster ?**
Qualifié **acceptable après retrait**. Seul `api/portail/valider/route.ts:162`
écrit `consultation.idPackAssigne`, et il n'écrit toujours que le pack de
base — confirmé par grep (1 seul écrivain sur 6 occurrences du champ dans
`src/` : l'écriture `valider/route.ts:162`, les 4 lectures de
`pack-reevaluation/route.ts:78,80,87,101`, et une mention dans son test) et
par lecture SQL (15 lignes `id_pack_assigne`, une seule valeur : le
pack de base). Le retrait des 6 packs non-base ne peut donc jamais faire
tomber `dejaRempli` en historique récent, et le pack vers lequel le repli
tomberait — « Base de consultation » — reste actif après retrait. Le repli ne
se déclenchera dans les faits que sur d'éventuelles lignes anciennes écrites
par une version antérieure du code, cas déjà couvert par le comportement
actuel. **L'asymétrie documentée reste à trancher au LOT-03** : pack déjà
rempli désactivé → repli sur `parDefaut` (proposition affichée) ; pack déjà
rempli actif mais vide (0 questionnaire) → aucune proposition, pas de repli
(`packReevaluation.ts:47-49`).
