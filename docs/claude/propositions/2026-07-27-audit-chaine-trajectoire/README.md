---
id: "2026-07-27-audit-chaine-trajectoire"
titre: "Audit de la chaîne trajectoire patient — ce qu'elle affirme, ce qu'elle mesure"
statut: "rapport — aucun correctif appliqué, arbitrages en attente"
créé_le: "2026-07-27"
base_auditée: "main @ 8cf474e"
---

# Audit de la chaîne trajectoire patient

## 1. Périmètre et méthode

Ce rapport porte sur la chaîne qui produit, à partir des réponses d'un patient,
sa **trajectoire dans le temps** : l'indice global à chaque jalon, le momentum,
le comparateur multi-cycles, le repère de cabinet, et les deux surfaces qui les
rendent — la Fiche-trajectoire praticien et « Mon équilibre » côté patient. Il
couvre les campagnes **SP-CONV** (contrat d'épisode partagé, 2026-07-22) et
**SP-TRAJ** (Fiche-trajectoire 5.0, 2026-07-23), livrées et mergées.

Il fait suite à l'audit de l'accompagnement alimentaire du 2026-07-26, dont il
reprend la question directrice : **qu'est-ce que l'application a le droit
d'affirmer, au vu de ce qu'elle mesure réellement ?**

### Règle de preuve

L'audit alimentaire s'est trompé une fois, sur une ligne qu'il déclarait
« exacte » : la vérification s'était arrêtée à la définition du questionnaire
sans ouvrir le moteur. La leçon est appliquée ici comme règle : **aucun constat
de comportement n'est retenu sur la seule lecture du code.** Chaque constat de
cette catégorie a été établi par une sonde Vitest exécutée contre les fonctions
réelles, dont la sortie est citée telle quelle. Les sondes étaient jetables et
n'ont pas été committées.

La portée de chaque constat a par ailleurs été **mesurée en base de production**,
en lecture seule (outil MCP Supabase `execute_sql`). Cette étape a changé
l'ordre des priorités : elle a montré qu'un des constats les plus graves est
aujourd'hui sans victime, et elle a révélé le fait structurant du §2.

Trois choses ne sont **pas** dans ce rapport : aucun correctif de code, aucune
migration, aucune écriture en base. Le constat central touche un signal clinique
servi ; le corriger relève d'une demande explicite et d'un bump de version, pas
d'une clôture de session.

## 2. Le fait structurant : la chaîne praticien est dormante

Avant d'auditer le comportement d'un moteur, il faut dire s'il tourne. Relevé en
production le 2026-07-27 :

| Table | Lignes |
|---|---|
| `assessment_episodes` | **0** |
| `protocol_drafts` | **0** |
| `protocol_checkins` | **0** |
| `protocol_diffusion_approvals` | **0** |
| `protocol_review_flags` | **0** |
| `patients` | 17 |
| `questionnaire_reponses` | 76 |

**Aucun épisode n'a jamais été confirmé. Aucun protocole n'a jamais été rédigé.**
Les épisodes sont écrits par `POST /api/praticien/protocoles`
(`route.ts:139`, `assessmentEpisode.upsert`) : sans protocole, pas d'épisode.

Conséquence directe : le Spirale-index, le comparateur multi-cycles, la courbe
de momentum et le repère de cabinet — le cœur de SP-TRAJ, six lots et six PR —
**n'ont aucune donnée à afficher en production**. La route
`GET /api/praticien/trajectoire` renvoie systématiquement `cycles: []`, et la
Fiche-trajectoire affiche « Aucun épisode confirmé pour l'instant »
(`TrajectoirePanel.tsx:297`).

Ce n'est pas un défaut de code. C'est un décalage entre l'effort de construction
et l'usage, du même genre que celui relevé au §2 de l'audit alimentaire —
l'observation en avance sur la mesure. Il faut le savoir avant de lire la suite :
**les constats F1 à F4 ne peuvent pas se déclencher côté praticien**, faute de
la moindre donnée. F7 porte lui sur une surface **vivante** — « Mon équilibre »,
qui ne dépend d'aucun épisode — mais reste lui aussi sans victime à ce jour
(§5, portée mesurée). Aucun constat de ce rapport ne décrit un incident en
cours : tous décrivent ce qui se produira à la première trajectoire réelle.

## 3. La chaîne, étage par étage

```
questionnaire_reponses.scores_json.rawAnswers
  └─ construireReponsesParQuestionnaire   (depuisPrisma.ts:38)   dédoublonne, tronque à une date
      └─ calculerEquilibre                (score.ts)             indice global 0-100
          └─ construireHistoriqueEquilibre (depuisPrisma.ts:88)  une lecture par jalon passé
              ├─ resoudreLectureJalon      (momentum.ts:13)      retrouve la lecture d'un jalon
              ├─ calculerDeltaMomentum     (momentum.ts:36)      delta + tendance
              ├─ construireTrajectoire     (trajectoire.ts:68)   cycles, jalons, comparaison
              │   └─ resoudreComparaison   (trajectoire.ts:170)  garde versionScore
              └─ calculerMedianesCabinet   (cabinet.ts:32)       repère de cohorte
                  ├── surface praticien : TrajectoirePanel, MomentumPanel
                  └── surface patient   : MonEquilibreAccueil, MonEquilibreDetail
```

Deux propriétés de cette chaîne commandent tout le reste :

1. **Rien n'est figé.** Aucun score n'est stocké. À chaque lecture, l'historique
   est **recalculé** depuis les réponses brutes avec le moteur courant. Seule
   l'**étiquette** `versionScore` est gelée, à la confirmation d'un épisode
   (`versioning.ts:130`).
2. **Les lectures sont synthétiques.** `construireHistoriqueEquilibre` ne
   produit pas une lecture par réponse reçue : il fabrique une lecture **par
   jalon passé** (T0, J21, J42, J90), datée exactement au jalon, en rejouant
   l'état des réponses connues à cette date.

## 4. Vérification des frontières écrites

Chaque règle du `REGISTRE_FRONTIERES.md` confrontée au code servi.

| Frontière | Ce qu'elle exige | Verdict | Preuve |
|---|---|---|---|
| **A6** — jamais une courbe côté patient | la Spirale est un index, pas un graphe | **tenu** | `MonEquilibreAccueil.tsx:22-48`, frise de points identiques, aucune valeur encodée |
| **A6-R2** — courbe praticien admise si chaque point est un jalon réellement mesuré ; un jalon non mesuré est un trou visible, jamais un 0 | `mesure === true` doit signifier « mesuré » | **défait** | F1 ci-dessous — `mesure` vaut `true` sans aucune réponse nouvelle |
| **A6-R2** — repère de cabinet sur cycles de même `versionScore`, masqué sous n < 5 | cohorte homogène et suffisante | **tenu sur la lettre, défait sur le fond** | `cabinet.ts:47` filtre bien la version ; F1-bis — la cohorte se remplit de cycles fabriqués |
| **A8-1** — T0 par épisode côté praticien, T0 global côté patient | deux ancrages distincts | **tenu** | `trajectoire.ts:88` (ancre épisode) vs `api/patient/equilibre/route.ts:64` (T0 global) |
| **A8-2** — un jalon sans réponse exploitable est « non mesuré », jamais un 0 | absence rendue comme absence | **défait** | F1 — et la règle elle-même est mal formée, voir plus bas |
| **A8-3** — jamais de soustraction entre deux `versionScore` différents | garde de comparabilité | **tenu, mais absolu** | `trajectoire.ts:175-179` ; F4 — la garde ne se relâche jamais |
| **D7** — aucune formulation patient ne porte de chiffre | ni score, ni délai chiffré | **contourné** | F7 — la garde ne couvre pas la surface qui rend le texte |

## 5. Constats

### F1 — Un jalon non mesuré est rendu comme mesuré **[prouvé par exécution]**

`construireHistoriqueEquilibre` (`depuisPrisma.ts:88-107`) produit une lecture à
chaque jalon **passé** dès que des réponses existent **jusqu'à** cette date — et
non des réponses **nouvelles** à ce jalon. Un patient qui a répondu une fois puis
n'est jamais revenu obtient donc une lecture à J21, J42 et J90, toutes égales à
sa valeur de T0.

Sonde exécutée — un patient répond une fois, puis plus rien pendant 120 jours :

```
lectures = [{2026-03-29, 48}, {2026-04-19, 48}, {2026-05-10, 48}, {2026-06-27, 48}]
momentum = {delta: 0, tendance: "stable"}
jalons   = [T0 mesure:true, J21 mesure:true, J42 mesure:true, J90 mesure:true]
```

Ce que le praticien lit alors sur la fiche (`TrajectoirePanel.tsx:322-326`) :

> T0 · indice 48 · 29/03/2026
> J21 · indice 48 · 19/04/2026
> J42 · indice 48 · 10/05/2026
> J90 · indice 48 · 27/06/2026
> Momentum T0 → dernier jalon mesuré : **stable** (écart 0)

Quatre mesures datées pour un questionnaire rempli une fois. Et sur la courbe
(`MomentumPanel.tsx:35-46`), quatre points alignés là où A6-R2 exige un trou.

**La règle A8-2 est elle-même mal formée**, ce qui explique que personne ne l'ait
vu : elle définit « non mesuré » par « `scoresJson.rawAnswers` absent » —
propriété d'une **ligne de réponse** — alors que le calcul agrège **toutes** les
réponses antérieures à la date du jalon. La règle et son implémentation ne
parlent pas du même objet. Il n'existe nulle part de notion de « réponse
nouvelle à ce jalon ».

Aucun test ne couvre ce cas. `depuisPrisma.test.ts` vérifie le dédoublonnage, la
troncature, les jalons futurs et l'ancrage T0 ; `momentum.test.ts` vérifie la
tolérance et le signe du delta. Le scénario « le patient ne revient pas » — le
plus banal d'un suivi longitudinal — n'y figure pas.

C'est la même famille que le veto du besoin 2 et que la quantité `monnier` de
l'audit précédent : **l'absence de mesure rendue comme un résultat.**

### F1-bis — Le repère de cabinet en hérite **[prouvé par exécution]**

`calculerMedianesCabinet` (`cabinet.ts:49-55`) ne retient que les jalons
`mesure === true` — ce qui, sous F1, inclut les jalons fabriqués, dont l'écart à
T0 vaut exactement 0.

Sonde — cinq patients silencieux :

```
{nTotal: 5, masque: false,
 parJalon: [{J21, mediane: 0, n: 5}, {J42, mediane: 0, n: 5}, {J90, mediane: 0, n: 5}]}
```

Le seuil `SEUIL_COHORTE_CABINET = 5` est franchi par une cohorte qui n'est jamais
revenue, et le praticien lit « médiane du cabinet +0 (n=5 cycles comparables) »
(`MomentumPanel.tsx:127`) comme un repère descriptif de sa patientèle. Un repère
de cabinet contaminé est pire qu'un repère absent : il donne une référence à
laquelle comparer un patient réel.

### F2 — La tolérance de jalon est inerte **[vérifié]**

`TOLERANCE_JOURS_JALON = 8` (`constants.ts:130`) permet à `resoudreLectureJalon`
de retenir une lecture réelle proche du centre d'un jalon. Mais les **quatre**
appelants (`api/praticien/equilibre:95`, `api/patient/equilibre:68`,
`protocol/trajectoire:88`, `protocol/resumeJ21:53`) passent tous un historique
**synthétisé exactement aux dates de jalon**. Les écarts entre jalons valent 21,
21 et 48 jours, tous supérieurs à la fenêtre : celle-ci ne peut jamais
sélectionner autre chose que le point central.

Trois des cinq tests de `momentum.test.ts` exercent donc une tolérance
qu'aucun chemin de production n'emprunte. Ce n'est pas un bug — c'est une
couverture de test qui rassure sur une mécanique morte.

### F3 — L'étiquette de version certifie ce que les valeurs n'ont pas **[confirmé visible]**

Documenté depuis #398 dans `constants.ts:24-36` : seule l'étiquette est figée,
les valeurs sont recalculées. La conséquence d'affichage, elle, ne l'était pas :
`TrajectoirePanel.tsx:315` écrit « version de score : v3 » dans le même bloc que
des indices calculés sous v4. L'étiquette atteste une calibration que les nombres
affichés à côté d'elle n'ont pas.

### F4 — Le comparateur, une fois bloqué, ne se débloque jamais **[vérifié]**

`resoudreComparaison` (`trajectoire.ts:170-181`) refuse dès que **deux**
étiquettes coexistent parmi les cycles du patient — sur l'ensemble de son
historique, sans fenêtre glissante. Un seul cycle v3 subsistant interdit donc
toute comparaison **définitivement**, y compris entre deux cycles v4 récents et
parfaitement comparables. Il n'y a pas de reprise automatique.

La garde A8-3 est juste dans son principe et absolue dans son application. Elle
protège d'une soustraction fausse au prix d'un aveuglement permanent.

### F5 — Carnet alimentaire et trajectoire ne se touchent pas **[vérifié]**

`lib/food-observation` et `lib/trajectoire-partagee` ne partagent qu'un seul
fichier, `FichePatientPanel.tsx` — la fiche **praticien**. Côté patient, les deux
mondes sont disjoints. L'épisode du carnet est un gabarit en dur
(`PatientFoodObservationPanel.tsx:44-66`) : même hypothèse, même action
(« Ajouter une source de protéines au petit-déjeuner ») et même fenêtre de
7 jours pour tout patient, alors que le type de décision porte `J7 | J14 | J21`
(`persistence.ts:42`). Aucun lien avec un protocole prescrit — et pour cause,
aucun protocole n'existe (§2). La saisie part en `sessionStorage`
(lignes 97-133) et disparaît à la fermeture de l'onglet.

Ce constat reprend le §4.4 de l'audit alimentaire ; il est ici confirmé depuis
l'autre extrémité de la chaîne.

### F6 — Voir §2

### F7 — Le patient s'entend dire qu'il a fait des bilans qu'il n'a pas faits **[le seul constat sur une surface vivante]**

`api/patient/equilibre/route.ts:94` renvoie au patient `momentum` **et** la série
complète des lectures synthétiques. `MonEquilibreAccueil.tsx` en tire deux
affirmations :

- ligne 45 : « **{n} bilans jalonnent votre parcours**, du début à aujourd'hui » ;
- ligne 14 : « **Stable depuis votre dernier bilan** ».

Sous F1, un patient ayant rempli ses questionnaires une seule fois et n'étant
jamais revenu lit, passé le troisième mois : « **4 bilans** jalonnent votre
parcours » et « Stable depuis votre **dernier bilan** ». Il y a eu un bilan, et
il n'y a pas de dernier bilan. La frise dessine quatre points
(`Frise`, ligne 22 — elle ne s'affiche qu'à partir de deux lectures, seuil que F1
franchit tout seul).

**La garde D7 ne protège pas ces phrases.** `formulations.guard.test.ts` interdit
tout chiffre dans les formulations patient — mais il ne scanne que
`FORMULATIONS_PATIENT` et `LIBELLES_COURTS_PATIENT` (`formulations.ts`), pas les
chaînes rendues par `MonEquilibreAccueil.tsx`. La phrase « {n} bilans jalonnent
votre parcours » porte un chiffre : elle violerait la garde si la garde la
regardait. Même forme que le défaut relevé au §4.4 de l'audit alimentaire, où
`ja5Architecture.test.ts` protège rigoureusement le composant qui n'est pas en
production.

**Portée réelle, mesurée.** Aucun patient n'est concerné aujourd'hui : sur
11 patients porteurs de réponses, 3 ont dépassé J21 et 2 ont dépassé J42 — et
tous ont répondu quelque chose dans leurs 21 premiers jours, donc aucun jalon
n'est fabriqué. F7 est un défaut **latent**. Il se déclenchera au premier patient
qui s'arrête après son bilan initial, c'est-à-dire au premier abandon — la
population qu'un suivi longitudinal doit précisément savoir repérer.

## 6. Priorités

### P0 — Distinguer « pas de nouvelle mesure » de « mesure stable »

Le correctif porte sur `construireHistoriqueEquilibre` : n'émettre une lecture à
un jalon que si au moins une réponse **nouvelle** est arrivée depuis le jalon
précédent. Tout le reste en découle — F1, F1-bis et F7 tombent ensemble, et A6-R2
comme A8-2 redeviennent vraies.

⚠️ **C'est une modification de logique clinique servie** : elle change le
momentum affiché, la frise patient et le repère de cabinet. Bump de
`VERSION_SCORE_EQUILIBRE` v4 → v5, entrée `CHANGELOG.md`, demande explicite du
praticien. À accompagner de deux tests qui manquent aujourd'hui : « le patient
ne revient pas » et « la médiane de cabinet ignore les cycles sans suivi ».

**Reformuler A8-2 dans le registre** dans le même geste : la règle doit parler de
réponse nouvelle au jalon, pas de `rawAnswers` absent d'une ligne.

### P0 bis — Étendre la garde D7 aux surfaces patient

`formulations.guard.test.ts` doit scanner les composants qui rendent du texte au
patient, pas seulement le module de formulations. Sans cela, la garde continuera
d'attester une propriété qu'elle ne contrôle pas. Correctif de test, sans effet
clinique — exécutable indépendamment du P0.

### P1 — Décider du sort de la chaîne praticien dormante

Six lots livrés, zéro donnée (§2). Trois issues possibles, qui appartiennent au
praticien : ouvrir réellement le cycle protocole → épisode en consultation ;
laisser la chaîne en attente et l'assumer comme telle ; ou reconnaître que le
geste de confirmation d'épisode ne trouve pas sa place dans la consultation
réelle et revoir la conception. Ce rapport ne tranche pas, mais **la situation
actuelle — construire et étendre une chaîne que rien n'alimente — est la plus
coûteuse des trois.**

### P2 — Relâcher la garde A8-3 sur une fenêtre

Permettre au comparateur de fonctionner sur les cycles de version homogène les
plus récents, au lieu de se bloquer sur l'historique entier (F4). Sans urgence :
inatteignable tant que la chaîne est vide.

### P3 — Retirer ou câbler la tolérance de jalon

`TOLERANCE_JOURS_JALON` ne sert à rien sur aucun chemin de production (F2). Soit
les lectures deviennent des lectures réelles datées — ce qui redonne sens à la
fenêtre —, soit la constante et ses tests partent. Cosmétique tant que le reste
n'est pas tranché.

## 7. Questions au praticien

Ces quatre questions ne se tranchent pas en lisant du code.

1. **Un patient qui ne revient pas doit-il voir sa trajectoire s'arrêter au
   dernier bilan réel, ou continuer avec une mention explicite du type « en
   attente de votre prochain bilan » ?** La première option est la plus honnête ;
   la seconde évite un écran vide sur le portail.
2. **La chaîne protocole → épisode a-t-elle vocation à être utilisée ?** (§2, P1.)
   Si oui, qu'est-ce qui bloque aujourd'hui côté consultation ?
3. **Le repère de cabinet doit-il exister avec les volumes actuels ?** 17 patients
   et aucun cycle : le seuil n=5 sera franchi par une poignée de dossiers, avec
   ou sans le correctif F1-bis.
4. **Faut-il afficher au praticien l'étiquette `versionScore` d'un cycle** (F3),
   sachant que les valeurs affichées à côté sont recalculées sous la version
   courante ? La retirer serait plus honnête que de la laisser attester le faux.

## 8. Conclusion

La chaîne trajectoire ne souffre pas d'erreurs de calcul. Ses gardes sont
nombreuses, écrites, et la plupart tiennent. Le défaut est ailleurs, et il est
constant d'un bout à l'autre : **elle ne sait pas distinguer une absence d'une
valeur.** Un patient qui ne revient pas est indistinguable d'un patient stable ;
une cohorte qui a disparu est indistinguable d'une cohorte sans évolution ; un
jalon jamais rempli est indistinguable d'un jalon rempli à l'identique.

Deux frontières écrites interdisent exactement cela, mot pour mot — A6-R2 et
A8-2. Elles n'ont pas été violées par une ligne fautive : A8-2 décrit une
propriété d'une ligne de réponse quand le moteur raisonne sur un agrégat. La
règle et le code ne parlaient pas du même objet, et personne ne pouvait le voir
en relisant l'un ou l'autre séparément.

Enfin, le fait le plus important de ce rapport n'est pas un défaut : **rien de
tout cela ne tourne aujourd'hui côté praticien.** Six lots, six PR, et zéro
épisode confirmé. Corriger F1 avant que des données longitudinales réelles
n'arrivent coûte quelques heures ; le corriger après, c'est réécrire des
trajectoires que des patients auront déjà lues.
