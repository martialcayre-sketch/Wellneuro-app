# Handoff — 2026-09-19 — La borne d'âge devient un déclencheur (D-231)

## 1. Branche et état Git

- Branche `wn-declencheur-age-2026-09-19`, partie de `origin/main` à `006a0757`
  (#1192, `D-230`). Worktree `phases-hash-2026-09-16`.
- Le lot porte aussi une correction de `FILE_ATTENTE.md` faite avant lui : la
  dette du régime alimentaire annonçait un correctif **faux**.

## 2. Objectif de la session

Le chantier 3 des cinq que `D-216` laisse devant l'attestation du catalogue
d'assiettes : **le déclencheur d'âge**, avec la revisite de `DC-43` et la
correction du commentaire d'`anamnese.ts` **dans le même lot** — `D-216` l'exige,
sans quoi le dépôt se contredirait.

## 3. Décisions prises

- **`D-231`**, sur **arbitrage du responsable** : câblage complet, plutôt que la
  forme seule.
- **Deux opérateurs, `>=` et `>`** — les deux formes que les claims emploient.
  `<` et `<=` auraient offert une borne **pédiatrique** qu'aucune source ne
  fonde. Le type refuse ce que la doctrine ne peut pas justifier.
- **Le moteur ne calcule aucun âge** : il reçoit un nombre tranché, comme il
  reçoit son instant de référence. Un seul module en DÉDUIT un âge clinique —
  la colonne était déjà lue par `anneeDeNaissance`, de façon permissive.
- **`estFeuilleInstrument`** remplace la déduction « pas un drapeau, donc un
  instrument » par une affirmation — c'est le vrai correctif du lot.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** le chantier 3 : le vocabulaire porte la borne, le moteur l'évalue,
  `orientationService` fournit l'âge, `DC-43` est revisitée.
- **Ferme** une fragilité que la variante a révélée : huit fichiers déduisaient
  l'instrument d'une absence de drapeau. La prochaine variante ne les rouvrira
  pas.
- **N'atteint pas** : **aucune règle ne porte de borne d'âge**. Le vocabulaire
  l'accepte, la table des indications d'assiette reste **VIDE**, verrou
  **ÉTEINT**. Aucun écran, aucune migration, aucun drapeau.
- **N'atteint pas** la porte du **régime alimentaire** — la méthylation en
  dépend. L'arbitrage est rendu (lire l'`EtatPopulation`, pas un drapeau), le lot
  ne l'est pas.

## 5. Fichiers modifiés

**Neufs** — `web/src/lib/patient/age.ts` et son banc (9 cas) · le fragment
`changelog.d/` du jour · ce handoff.

**Modifiés** — `orientationRulesV1.ts` (variante `age`, `estFeuilleInstrument`) ·
`orientationEngine.ts` (évaluation, `ageAnnees` à l'entrée, complétude) ·
`orientationService.ts` (instant hissé, lecture de `dateNaissance`) ·
`indicationsAssiettesV1.ts` (borne implausible, trois blocs de prose) ·
`anamnese.ts` (le commentaire qui portait l'ancien motif) ·
`CONSTITUTION_CLINIQUE.md` (revisite de `DC-43`) · six bancs · deux mocks élargis
par `importOriginal` · `docs/DECISIONS.md` · `FILE_ATTENTE.md` ·
`docs/claude/SESSION_LOG.md`.

## 6. Validations exécutées

- **`tsc` a servi de garde** : la variante a cassé la compilation dans **huit
  fichiers**, chacun au point exact où la déduction était fausse. Aucun n'a été
  corrigé par un `&& type !== 'age'` — tous par le prédicat.
- **T1** vert (404 tests, anti-secrets OK).
- **Bancs du périmètre** : 53 fichiers, 1 027 tests — `clinical`,
  `biology-library`, `patient`, route d'orientation, forme croisée.
- **Le banc de la borne** éprouve les deux opérateurs à leur frontière (un an
  d'écart), l'âge inconnu **sous ses trois formes** avec sa contre-épreuve,
  l'absence d'instrument, et le comportement **sous un `ou`** — où la garde de
  complétude aurait rendu la borne inatteignable.
- **T2 a été ROUGE au premier passage, et pour la bonne raison.**
  `seuilsLitterauxMotives.guard.test.ts` a relevé les **deux bornes `130`** de
  plausibilité de l'âge comme seuils littéraux non arbitrés. C'est `DC-20` qui
  parle : un nombre purement technique doit être **déclaré** tel. Les deux sont
  entrées aux exemptions **avec leur motif** — hors plage, `ageAnnees` rend
  `null`, et un `null` n'atteint aucun déclencheur : aucune conclusion clinique
  n'en dérive. Aucun seuil n'a été déplacé pour faire verdir un banc.
- **T2 `--fast`** au second passage : voir le commentaire de PR, rapporté tel
  quel.

## 7. Problèmes ouverts

- **La porte du régime alimentaire** reste fermée : dernier chantier avant les
  lignes. Arbitrage rendu, lot à écrire.
- **Le jour où une règle d'orientation portera une borne**, il faudra vérifier
  que son appelant fournit `ageAnnees` — sans quoi la règle serait
  **silencieusement inatteignable**. Le banc qui interdit la borne aujourd'hui le
  dit sur place.
- **`ageAnnees` et `anneeDeNaissance` lisent la même colonne** : l'une refuse, ce
  que l'autre tolère. Un banc épingle les cas où elles divergent, pour que le
  doublon ne passe pas pour un oubli.
- **Numéro `D-231` à vérifier au merge.**

## 8. Prochaine action exacte

1. Ouvrir la PR, **lire la revue Copilot aux TROIS emplacements avant de
   merger** — inline, `.reviews[].body`, et le bloc « Suppressed comments » —
   puis merger avec `--subject` portant le bon `D-NNN`.
2. Ensuite **le régime alimentaire** : un déclencheur qui lit l'`EtatPopulation`,
   sans faire du champ un drapeau. Le moteur devra recevoir l'état de population
   comme il reçoit maintenant l'âge — le chemin est le même.
3. Puis les **lignes d'indication** elles-mêmes, et seulement après l'attestation.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; dossiers de test lus par identifiant.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite — ce lot
  LIT `dateNaissance`, il ne touche pas le schéma.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée.
- **Aucun seuil inventé** : une borne d'âge sans claim qui la porte reste
  interdite, et aucun banc ne peut le dire — seule la relecture le voit.
- Une signature clinique ne se pose jamais par l'outil.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
