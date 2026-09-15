---
id: "LOT-03"
titre: "Ce que le patient lit vraiment"
statut: "terminé"
dépend_de: "LOT-00"
---

# LOT-03 — Ce que le patient lit vraiment

## But

Le constructeur fait saisir **trois** actions et affiche « Actions (3/3) ». Le portail
en sert **une** : `const principale = draft.actions[0] ?? null`. Il n'y a ni rang, ni
champ « action principale » dans le contrat — c'est **l'ordre d'insertion** qui décide,
en silence, laquelle des trois le patient verra. Les deux autres n'atteignent le
patient que si elles portent une référence Boussole, et alors sous forme de fiche
alimentaire, pas d'action.

Cinq descriptions de « ce que le patient lira » coexistent dans le dépôt et se
contredisent. Ce lot les réduit à une : **le contrat**.

## Résultat observable

1. Le patient reçoit **les trois actions**.
2. Il lit **sur quel axe on travaille** — le libellé d'axe signé, re-dérivé au serveur.
3. Il lit son **critère J21**, aujourd'hui servi dans le JSON et rendu nulle part.
4. Une intervention non ferme se lit **avec sa phrase d'attente**, jamais comme un
   conseil ferme.
5. Le constructeur porte un marquage exact — « votre patient lira ceci » — qui ne
   ment plus.
6. Le bouton « Ma fiche conseils » ne promet plus une fiche qui n'existe pas.

## Périmètre

- **`app/api/portail/protocole/route.ts`** — brancher `buildPatientProtocolView` à la
  place de la projection manuelle. Le contrat est **écrit, testé, et n'a aucun
  appelant de production** ; il projette les trois actions, `priorityLabel`,
  `followUpCriterion`, `adviceSheetRef`, les limitations et les phrases
  `ATTENTE_PATIENT`, et **refuse un statut inconnu**.
  Conserver la déduplication des `foodCompassRef` sur **toutes** les actions et la
  garde de caducité.
- **`app/api/praticien/ja/cycle/route.ts`** — même correction : cette route se déclare
  « miroir exact de ce que `GET /api/portail/protocole` sert au patient » et recopie
  le même défaut, `actions[0]` comprise.
- **`PatientCompanionHome.tsx`** — rendre les trois actions, le libellé d'axe et le
  critère J21 ; **renommer le bouton** « Ma fiche conseils », qui mène au centre TRUST
  (documents, droits, confidentialité) et n'a aucun rapport avec `adviceSheetRef`.
- **`ProtocolMiniBuilder.tsx`** — le marquage « votre patient lira ceci » sur les
  champs effectivement servis.
- **`resoudreRegleSignee`** — appelé depuis la route patient pour le libellé d'axe.
  Fail-closed : registre non signé ⇒ pas de libellé, jamais de texte fabriqué.

## Hors périmètre

- `adviceSheetRef` **reste `null`** : aucun champ du constructeur ne le renseigne, et
  produire une vraie fiche conseil est une surface neuve. Dette nommée ici, non traitée.
- `ProtocolConsultationPanel`, l'aperçu praticien local, qui décrit fidèlement le
  contrat mais n'est atteignable que par `?validationErgo=c1`.

## Bancs à retourner, et c'est le point délicat

- **`app/api/portail/protocole/route.test.ts:105` FIGE l'amputation** comme
  comportement attendu (« dérive une vue patient-safe », égalité exacte de
  `actionPrincipale`). Il ne se corrige pas : il se **retourne**, et son intitulé doit
  dire ce qu'il garde désormais.
- `PatientCompanionHome.test.tsx` — la fixture n'a qu'une action.
- `patientProtocolView.test.ts` — cesse d'être un test isolé de contrat mort.
- `e2e/portail-parcours.spec.ts` — n'asserte aujourd'hui que l'**absence** d'action.

## Interdits

- Pas de secret, pas de donnée patient réelle, pas de migration.
- **Ne jamais servir au patient** le motif praticien de sélection ni le `rationale`
  du moteur : les fixtures de test les nomment « Raisonnement interne confidentiel »,
  et c'est un banc, pas une convention.
- Aucun seuil inventé.

## L'arbitrage du 2026-09-15, et la prémisse qu'il a fallu corriger

`buildPatientProtocolView` exige une `DecisionCard` **entière**, et aucune table ne
la persiste. Trois voies ont été posées au responsable après vérification du code ;
il a tranché **la recomposition à la lecture** (`D-191` §1), avec le refus visible
des deux côtés (§4) et les gardes de la carte portées à la diffusion — ce dernier
point reste à livrer, il fait la seconde PR du lot.

La dérive de l'empreinte a été **mesurée avant** d'être acceptée : le snapshot est
borné à l'épisode confirmé et l'horodatage vaut sa date de confirmation, donc une
passation nouvelle ne bouge rien. Détail au registre (`D-191` §3).

## Étapes

- [x] Brancher le contrat dans les deux routes.
- [x] Recomposer la carte au serveur (`rejeuCarteDecision`) et garder la fraîcheur.
- [x] Rendre les trois actions, le libellé d'axe et le critère à l'écran patient.
- [x] Dire le refus au patient, et le dire au praticien sur son écran de diffusion.
- [x] Renommer le bouton ; consigner `adviceSheetRef` en dette.
- [x] Retourner les bancs ; fragment `changelog.d/` ; décision `D-191`.
- [x] **PR 2 — les gardes de la carte à la diffusion** (`D-192`) : abstention
      requise et constat de sécurité n'étaient opposés NULLE PART, pas même à
      l'approbation, qui lisait `decision_card_input_hash` sur la ligne du
      brouillon sans jamais construire de carte. Le rejeu y est celui du chemin
      patient, à la lettre : un protocole approuvé est un protocole que le portail
      saura servir.
- [ ] Le marquage « votre patient lira ceci » dans le constructeur — reporté au
      LOT-04, qui touche déjà ces champs pour la citation.

## Ce que le lot a trouvé en chemin, et corrigé

1. **Le carnet alimentaire s'ancrait sur `actions[0]`, quel que soit son type.**
   Invisible tant que toute action neuve naissait `food` ; depuis `D-189`, la
   première action peut être une orientation médecin.
2. **La fixture de son banc posait `type: 'alimentation'`** — un type inexistant au
   contrat, accepté parce que le champ était `string`.
3. **Trois écrans redéclaraient chacun leur type de vue patient** et y coulaient le
   JSON : `tsc` restait vert sur un champ servi et rendu nulle part.

## Tests

T1, T2, puis T3 (le contrat patient est clinique). Baselines côté portail à
régénérer en CI.

## Critères de done

Une seule description de la vue patient subsiste dans le code ; les trois actions
partent ; les bancs qui figeaient l'amputation gardent désormais le contraire.

**Atteints.** Quatre mutations ont été vues ROUGES avant que quoi que ce soit ne
soit déclaré vert : projection réduite à une action → trois bancs rouges ; garde de
fraîcheur neutralisée → un banc rouge ; garde d'abstention neutralisée → un banc
rouge ; garde de constat de sécurité neutralisée → un banc rouge. Restauration
depuis une copie à chaque fois, jamais par `git checkout --`.

Reste hors lot, nommé : le marquage « votre patient lira ceci » dans le
constructeur, reporté au LOT-04 qui touche déjà ces champs.
