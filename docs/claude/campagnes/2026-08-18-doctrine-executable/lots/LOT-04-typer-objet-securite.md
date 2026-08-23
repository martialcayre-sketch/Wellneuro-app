---
id: "LOT-04"
statut: "terminé"
dépend_de: "LOT-01"
---

# LOT-04 — V3a : typer l'objet de sécurité et lui donner son pouvoir d'inhibition

## But

À la fin de ce lot, un signal de sécurité **est un objet typé produit par un
chemin réel**, et il **retire** une proposition au lieu de coexister avec
elle. `DC-23` (le red flag n'est pas des points) et `DC-12` (le claim de
sécurité prime et peut inhiber) mordent à l'exécution.

## État de départ, mesuré

- `SafetyFinding` **existe** (`clinical-engine/types.ts:257`,
  `disposition: 'requires_practitioner_review'`), porté par
  `ClinicalReview.safetyFindings` et normalisé par `clinicalReview.ts:233`.
- **Rien ne le produit** : `chaineC1.ts:315` pose `safetyFindings: 0` en dur,
  et `evaluerAbstentionImporteurs.guard.test.ts` documente la branche
  `safetyFindings > 0` comme inatteignable.
- Ce que le praticien voit vient de `signaux_alerte`
  (`consultation/anamnese.ts:131-144`, douze items) remonté par
  `extraireVigilanceDeterministe` (`contexteClinique.ts:155-161`) : **une
  liste de chaînes de caractères** où rien ne distingue « idées suicidaires »
  de « constipation récente » — ni gravité, ni domaine, ni conduite à tenir.
- `decisionCard.ts:112` sait déjà bloquer sur `safetyFindings.length > 0` :
  **le consommateur du pouvoir d'inhibition est écrit**, il n'a jamais reçu
  d'entrée.

Le lot ne crée donc ni le type, ni le consommateur : il pose **le producteur**
et **la qualification**.

## Périmètre

1. **Qualifier les douze `signaux_alerte`** : gravité, domaine, conduite à
   tenir. La qualification est une **règle clinique** — elle exige sa
   provenance et sa décision `D-xxx`, item par item. Aucune gravité ne
   s'invente au fil du code.
2. **Poser le producteur** : `signaux_alerte` → `SafetyFinding[]`, chemin
   déterministe, versionné, sans LLM.
3. **Brancher l'inhibition** (`DC-12`) : un `SafetyFinding` retire un candidat
   au lieu de s'afficher à côté. Le patron existe et ne s'invente pas —
   [[D-021]] (une sévérité acquise sert de **plancher**, jamais de mesure) et
   [[D-024]] (plancher d'orientation) refusent déjà qu'une sévérité se fasse
   moyenner. `DC-23` est structurellement la généralisation de ces deux
   précédents.
4. **Gardes structurelles**, chacune vue rouge :
   - un `SafetyFinding` n'ajoute ni ne retranche de points, sous aucun nom ;
   - un score global favorable et un signal majeur **coexistent** sans se
     compenser, et le signal reste prioritaire ;
   - la branche `safetyFindings > 0` cesse d'être inatteignable — le banc
     d'abstention qui la documentait comme telle doit être **mis à jour, pas
     contourné**.

## Le point réglementaire, déjà tranché par l'audit

Nommer une « alerte médicale » dans une surface **patient** est ce que
`REGISTRE_FRONTIERES.md` proscrit ; un objet de sécurité **interne au
praticien** ne tombe pas sous cet interdit —
`extraireVigilanceDeterministe` en fait déjà la démonstration en production.
Ce lot ne demande aucune dérogation et n'ouvre aucune surface patient.

## Fichiers probables

- `web/src/lib/clinical-engine/types.ts` (lecture ; extension seulement si le
  type manque d'un axe, et alors avec sa justification)
- `web/src/lib/consultation/anamnese.ts`, `contexteClinique.ts`
- `web/src/lib/clinical-engine/chaineC1.ts`, `clinicalReview.ts`,
  `decisionCard.ts`
- Bancs `*.guard.test.ts` associés ;
  `evaluerAbstentionImporteurs.guard.test.ts` (mise à jour)
- `docs/DECISIONS.md`, `changelog.d/`

## Interdits

- **Aucune gravité, aucun rang, aucun poids inventé** (`DC-19`) : la
  qualification des douze signaux se décide, se source et se date.
- **Aucun champ de score, de probabilité ou de confiance** sur l'objet de
  sécurité, sous quelque nom que ce soit — patron du garde
  `contradictionFinding.guard.test.ts`, et leçon de [[D-044]] où
  `DiscordanceFinding.confidence` avait déjà fait tomber un objet voisin.
- **Aucune surface patient** : l'objet reste interne au praticien.
- Aucun repli fail-open : un signal illisible ou incomplet **ne s'efface
  pas** — précédent `D-072`, où deux replis fail-open retiraient un panel sur
  une date illisible.
- Ne pas élargir au-delà de l'anamnèse : le second producteur (effet
  indésirable) appartient au LOT-05.
- Pas de gate de population ici : c'est le LOT-05, et il attend la colonne du
  LOT-02.

## Dépendances

En amont : LOT-01 (statut réel de `DC-12` et `DC-23`). **Ne dépend pas du
LOT-02** — aucun axe du claim n'est requis pour typer un signal d'anamnèse ;
les deux lots peuvent avancer en parallèle.
En aval : LOT-05 branche son second producteur sur l'objet posé ici.

## Étapes

1. Descendre les douze `signaux_alerte` et proposer leur qualification, avec
   provenance — **s'arrêter et faire trancher** (décision `D-xxx`).
2. Producteur déterministe `signaux_alerte` → `SafetyFinding[]`.
3. Inhibition sur le patron plancher (`D-021`/`D-024`), consommée par
   `decisionCard`.
4. Gardes structurelles, chacune vue rouge par mutation.
5. Mise à jour du banc d'abstention qui documentait la branche inatteignable.
6. T3, revue `wn-reviewer`, passe Codex (classe clinique/scoring, P0).
7. Décision `D-xxx` + fragment `changelog.d/` ; bascule de `DC-12` et `DC-23`.

## Tests

- T3 avant la PR.
- Chaque garde vue rouge sous mutation, témoin vert.
- Un cas où score favorable et signal majeur coexistent : le signal reste
  prioritaire, le score n'est pas modifié d'un point.

## Critères de done

- [x] Qualification des douze signaux décidée, sourcée, datée — aucune
      gravité inventée en passant.
- [x] `SafetyFinding` a un producteur réel ; `safetyFindings: 0` en dur a
      disparu.
- [x] L'inhibition mord : un candidat est **retiré**, pas affiché à côté.
- [x] Aucun champ de certitude sur l'objet ; garde structurelle vue rouge.
- [x] Banc d'abstention mis à jour, jamais contourné.
- [x] T3 joué (Vitest 5529, bancs de certification 402, dérive schéma↔migrations
      *No difference detected*, contrats SQL) ; segment E2E renvoyé au CI sur
      blocage WebKit `D-049`, constaté deux fois sur deux cas DIFFÉRENTS.
- [x] Revue `wn-reviewer` : GO sous réserve, deux correctifs P1 appliqués
      (écran muet, phrase affirmant une lecture non faite), trois inexactitudes
      corrigées, quatre bancs ajoutés, trois constats nommés en réserves 5-7.
- [ ] Passe Codex (bloc de paramètres préparé, geste utilisateur).
- [x] `DC-12` et `DC-23` basculés dans la constitution.
