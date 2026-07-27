### P0 métrologique, points 2 à 4 — ce que les questionnaires alimentaires n'affirment plus (2026-07-27)

Suite du P0 de l'audit alimentaire
(`docs/claude/propositions/2026-07-26-audit-accompagnement-alimentaire/` §6),
après le point 1 livré en v4. Aucun seuil, aucune bande d'interprétation, aucune
migration modifiés.

**Correctif principal, non prévu au plan : `Q_ALI_03` produisait bien des
grammes et des kilocalories — faux, et à zéro.** `questions.ts` portait un cas
particulier qui émettait `monnier: { proteinesGJour, caloriesBaseEstimees,
caloriesAdditionnelles, caloriesTotalesEstimees }` à partir de sous-scores
`MONNIER_PROT` / `MONNIER_CAL_SUP` qui n'existent pas — les sous-scores servis
s'appellent `P_AN`, `P_VG`, `GL`, `LIP`, `SU`. Les quatre valeurs tombaient donc
à **0, invariant aux réponses** (mesuré aux deux bornes), étaient persistées
dans `scores_json` et transmises au modèle de synthèse, où elles se lisent « 0 g
de protéines par jour, 0 kcal par jour » : un signal de dénutrition sévère,
fabriqué. La passation du 2026-07-25 le porte en base. Le bloc est retiré du
moteur — le recâbler exigerait le poids, les portions et une table de
composition, qu'aucun item ne recueille — et la clé est écartée du prompt par
`scoresPourPrompt` pour couvrir les passations déjà enregistrées, que le retrait
ne réécrit pas. **Le rapport d'audit affirmait le contraire** (« ne calcule ni
g/j ni kcal/j — exact ») : la ligne est corrigée sur place, avec la raison de
l'erreur — la vérification s'était arrêtée à la définition du questionnaire sans
regarder le moteur.

**Point 2 — `Q_ALI_03` ne promet plus ce qu'il ne calcule pas.** Titre et
consignes servies annonçaient une estimation quantitative. Le questionnaire
devient « Fréquences de consommation alimentaire (adapté de la méthode
Monnier) », la mention « repérage rapide validé » quitte le catalogue. Il avait
déjà été administré une fois (1 patient) : la promesse a réellement été servie.

**Point 3 — les seuils de `Q_ALI_01` sont signalés provisoires.** La version
servie compte 14 items cotés 0-3 (/42) et porte le nom du questionnaire SIIN
sans en être une numérisation ; ses quatre bandes n'ont ni DOI, ni publication
primaire, ni étalonnage. Elles restent servies — les rompre casserait 8
passations sur 6 patients — mais le code le dit, sur place, avec le fait
aggravant : ce questionnaire alimente le besoin 1, fondation critique.

**Point 4 — l'IA ne peut plus conclure à une carence.** Section dédiée dans la
consigne système : interdiction d'en déduire une carence (même atténuée en
« probable »), une quantité en grammes ou en kilocalories, un statut biologique,
un HOMA-IR, une homocystéinémie, un statut inflammatoire ou antioxydant, ou un
besoin de supplémentation. Ce qui reste autorisé est nommé : une **exposition
alimentaire déclarée**. `VERSION_PROMPT_SYNTHESE` passe à `synthese-v5` — sans
ce bump, les synthèses produites avec et sans la règle seraient indiscernables
en base.

**La règle s'indexait sur un identifiant que le modèle ne recevait pas.** La
consigne désigne les questionnaires par « identifiants commençant par Q_ALI »,
alors que la route de synthèse ne transmettait que `titre`. `Q_ALI_02`
(« Score d'adhérence à la diète méditerranéenne SIIN ») n'offrait aucun indice
permettant de l'y rattacher. `idQuestionnaire` est désormais transmis.

**Trois gardes ajoutées** (`promptAlimentaire.guard.test.ts`, 9 cas), chacune
vérifiée par mutation : présence de la section et de ses interdictions dans la
consigne ; couplage consigne ↔ charge utile (si la consigne cite l'identifiant,
la route doit le transmettre) ; aucune clé de quantité dans ce qui part au
modèle, pour tous les `Q_ALI_*` aux deux bornes, bloc `monnier` hérité compris.

**Registre.** `formePubliee` de `Q_ALI_01` passe de `"score 0-42"` à `null` : ce
champ affirmait de la **source** ce qui n'est vrai que du **servi**. Les
descriptions de `versionServie` ne sont pas renseignées — le garde du registre
l'interdit tant que `statutContenu` vaut `a_auditer`, et reclasser ce statut est
un acte de certification qui appartient à la campagne corpus.

**Réserves ouvertes, non traitées ici** (revue adversariale du 2026-07-27) :

- L'ancien titre reste gelé dans `assignations.titre` et
  `questionnaire_reponses.titre` ; sur le portail patient, l'en-tête (code) et
  la carte « En cours » (base) afficheront donc les deux libellés côte à côte
  tant qu'aucun backfill n'est passé. Les e-mails déjà envoyés portent l'ancien.
- Les cinq libellés de sous-score de `Q_ALI_03` disent toujours « **Apports** …
  (index) » — le mot retiré du titre survit là où le praticien lit le résultat.
- Les bandes d'interprétation de `Q_ALI_01` continuent de conclure
  (« Alimentation très déséquilibrée — bilan approfondi nécessaire ») alors que
  la description ajoutée dit qu'elles ne concluent pas.
- `description` du catalogue n'est affichée nulle part : la mise en garde
  ajoutée pour `Q_ALI_01` n'atteint aucun œil pour l'instant.
- `buildMiniSynthese` rend « Tous les axes explorés sont peu perturbés » pour
  `Q_ALI_03`, qui ne porte aucune bande — absence d'interprétation lue comme
  normalité.
- L'item `MO10` de `Q_ALI_03` est collecté sans entrer dans aucun sous-score.
- `statutCertification` de `Q_ALI_01` et `Q_ALI_03` reste `repere` alors que le
  registre accepte `suspendu` ; et `nomOfficiel` de `Q_ALI_01` porte toujours le
  nom SIIN dont le servi n'est pas la numérisation.

Ces sept points relèvent d'arbitrages cliniques ou d'un backfill, pas de la
correction de forme livrée ici.

**Validations** : T1 vert ; suite complète verte ; gardes nouvelles vérifiées
par mutation ; `scoring-check` vert ; anti-secrets vert.
