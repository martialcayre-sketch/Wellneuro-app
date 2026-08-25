---
id: "LOT-05"
titre: "Jalons — l'évaluation ancrée à la version de l'objectif"
statut: "en_cours"
dépend_de: "LOT-04"
---

# LOT-05 — Jalons : l'évaluation avec le patient

## But

Aux jalons J21/J42/J90, inviter le patient (portail, pull) à dire **où il en
est par rapport à son objectif** — réponse en mots, plus une EVA restituée
**brute** (sans seuil, sans bande, sans agrégation), ancrée à la version
exacte de l'objectif.

**Classe P0 (portail/patient) : revue `wn-reviewer` + passe Codex avant PR.**

## Résultat observable

- Sur le portail, quand un jalon est atteint (fenêtre `JOURS_JALON` +
  `TOLERANCE_JOURS_JALON` existantes) et qu'un objectif ratifié ou amendé
  existe : une question d'étape s'affiche — texte libre + EVA facultative.
- La réponse est un événement append-only référençant `idObjectif` (version
  exacte) et le jalon ; deux dates (événement/enregistrement).
- Au cockpit, la trajectoire de l'objectif affiche les réponses d'étape —
  comme un récit, jamais une courbe avec seuils, jamais une moyenne.
- Si un instrument publié (Goal Attainment Scaling) doit un jour structurer
  cette mesure : **décision de provenance dédiée, hors de ce lot** — ce lot
  ne pose aucun barème.

## Périmètre

- Table d'événement (si le LOT-00/LOT-01 ne l'a pas déjà prévue :
  **avenant de migration à confirmation obligatoire**, même régime que le
  LOT-01).
- `web/src/app/api/portail/` (route dédiée ou extension dossier — arbitrage
  en ouverture de lot).
- `web/src/components/patient-companion/` (question d'étape).
- Cockpit : affichage dans la trajectoire.

## Hors périmètre

- Tout rappel/relance automatique (le portail reste en pull).
- Tout calcul sur l'EVA (`DC-19`/`DC-20` — aucun seuil, aucune bande).
- Toute modification du calcul des jalons (`equilibre/constants.ts` se lit,
  ne se modifie pas).

## Fichiers probables

- `web/src/lib/equilibre/constants.ts` (lecture seule — `JOURS_JALON`,
  `TOLERANCE_JOURS_JALON`)
- routes et composants du périmètre

## Interdits

- Pas de note, score dérivé, taux d'atteinte ni classement d'objectifs.
- L'absence de réponse à un jalon n'est jamais rendue comme un manquement
  (`DC-24` — silence ≠ réponse ; libellés non-jugeants).
- Jamais journaliser le texte patient.

## Étapes

**Le lot se livre en DEUX PR**, la migration ne consommant rien et n'étant
consommée par rien dans la sienne (`D-087`).

*PR 1 — la migration (`D-111`)*

- [x] Forme arbitrée : **table propre**, `reponses_jalon_objectif`. Confirmation
      migration obtenue en session le 2026-08-25.
- [x] Table, CHECK, FK RESTRICT, RLS deny-all, **un seul** index de lecture
      (aucun index unique : la Décision 5 les interdit).
- [x] Contrat SQL `alli_jalons_objectif_v1_negatif.sql`, inscrit au CI et joué
      par T3.
- [x] Effacement du dossier couvert nommément (garde de complétude verte).
- [x] T1 ; T3.
- [ ] Revue `wn-reviewer` ; PR ; approbation `release-db` ; **application
      constatée par conteneur**.

*PR 2 — le code, après le constat*

**Préalable non négociable, relevé en revue** : la taxonomie des jalons et les
bornes de l'EVA n'existent **qu'en SQL**. Poser d'abord une constante dérivée de
`JOURS_JALON` **ancre retirée nommément**, et refuser `T0` **à la route**, en
français — sans quoi un chemin qui dérive le jalon de `resoudreJalonDu` obtient
`T0` pour un patient sans cycle confirmé, l'INSERT lève un 23514, et le patient
reçoit un 500 sur un chemin que ni T1 ni T2 ne voient.

- [ ] Route portail (drapeau, auth, fenêtre de jalon, version exacte, bornes).
- [ ] EVA : refuser à la route un décimal ou un hors-bornes. Le cast `INTEGER`
      **arrondit avant tout CHECK** (`5.5` devient `6`) — la base ne peut pas
      voir la valeur d'avant le cast, la garde vit donc à la route.
- [ ] UI portail + rendu cockpit (récit, EVA brute).
- [ ] Gardes vues rouges (append-only, écrivain unique, aucun calcul sur EVA).
- [ ] T1 ; T2 ; revue `wn-reviewer` ; **passe Codex** (P0).

## Tests

- Fenêtre de jalon respectée (dans/hors tolérance) ; ancrage à la version ;
  append-only ; EVA hors bornes refusée par motif ; aucun agrégat exposé.

## Critères de done

- Parcours d'étape complet derrière drapeau ; récit visible au cockpit ;
  revues P0 tracées ; T2/T3 verts.

## Résultats

*PR 1 livrée le 2026-08-25 — la migration seule (`D-111`). Le lot reste ouvert.*

**La première question du lot n'était pas celle que la fiche posait.** Elle
proposait d'arbitrer « route dédiée vs extension » ; la vraie question était en
amont — **aucune table ne pouvait porter l'événement**. `protocol_checkins`, le
seul candidat, est ancrée à un PROTOCOLE (`protocol_draft_id` et
`id_assignation` NOT NULL) et parle en **J7/J14/J21**, quand les jalons de
l'objectif sont ceux de `JOURS_JALON` (**J21/J42/J90**). La fusionner l'aurait
rendue bilingue sur ses DEUX axes : un `J21` y aurait désigné deux moments
différents selon la ligne. C'est le raisonnement de `D-094` §2 pour
l'amendement, retrouvé au même endroit.

**`T0` est refusé comme jalon**, et ce refus a demandé sa propre garde. `T0` est
l'ANCRE des fenêtres, le moment où l'objectif se pose — demander à cet instant
« où en êtes-vous par rapport à votre objectif » n'a pas de sens. Or `T0` est une
valeur parfaitement légitime de `JOURS_JALON` : son exclusion ne se déduit
d'aucun autre cas. Le contrat la lit donc dans la **définition** de la
contrainte, pas seulement par des cas négatifs — ceux-ci testent des valeurs
REFUSÉES, si bien qu'un CHECK élargi à `T0` les aurait tous laissés verts. C'est
la leçon du LOT-01 (`dispositions_proposition_geste_check`), appliquée d'avance.

**L'EVA ne conclut rien.** Bornes 0-10 purement techniques, identifiées comme
telles ; aucune bande, aucun seuil, aucune direction, aucune moyenne, aucun
moteur ne la lit. Régime de `D-088`, appliqué sans l'élargir. Facultative et
nullable sans DEFAULT : la rendre obligatoire forcerait un chiffre là où le
patient n'a que des mots, un DEFAULT fabriquerait une réponse que nul n'a donnée.
Le texte, lui, est obligatoire — sans quoi une ligne serait un chiffre nu déposé
dans un dossier.

**Aucune contrainte d'unicité**, et le contrat asserte cette absence (contrainte
ET index) : répondre deux fois au même jalon fait deux lignes. Un `UNIQUE`
transformerait un second geste en erreur technique, ou pousserait à l'`upsert`.

**Validations.** T1 vert. T3 vert (code 0) : 5 934 Vitest, 418 bancs de contrat,
et les contrats SQL joués contre PostgreSQL — le neuf compris.

**QUATRE mutations vues rouges**, sur une base jetable, témoin vert avant et
après :

1. `T0` légalisé dans la taxonomie → le cas négatif mord ;
2. **la taxonomie élargie à `J180`** — une valeur qu'AUCUN cas négatif ne teste.
   Les six cas restent verts ; seule l'assertion sur la **définition** voit
   l'élargissement. Sans cette mutation-là, le point 8 du contrat aurait pu être
   décoratif sans qu'on le sache ;
3. un index unique posé sur (patient, objectif, jalon) → l'écriture valide « se
   raviser » est refusée, et le contrat le dit avec le bon motif ;
4. la borne haute de l'EVA portée à 100 → le cas négatif mord.

**La revue en a joué dix de plus, toutes rouges** — dont la RLS désactivée, la FK
passée en CASCADE, un `DEFAULT 5` sur l'EVA, une colonne `taux_atteinte` ajoutée
et un CHECK renommé. Et elle a trouvé **un défaut réel que les mutations ne
pouvaient pas voir** : `btrim/1` ne retire que l'espace ASCII, si bien qu'un
texte fait d'une tabulation et d'un retour ligne passait le CHECK censé
l'interdire. Mesuré en base, corrigé dans la migration — **elle n'était pas
encore appliquée**, la fenêtre était ouverte — avec un septième cas négatif, lui
aussi vu rouge sous l'ancienne rédaction. Le trou existe dans les CHECK de texte
**déjà en production** (`amendements_objectif`, 6.0-A) : dette nommée à `D-111`,
sans porteur.

**La mutation qui manquait à ma liste** a été jouée : retirer la ligne
`tx.reponseJalonObjectif.deleteMany` d'`effacement.ts` fait rougir la garde de
complétude, nommément. C'est la seule garde qui protège une donnée patient
**après** un effacement annoncé, et les quatre premières mutations portaient
toutes sur le contrat SQL.
