### Instruments du cabinet — créer, importer, relire, publier (2026-07-24)

Le rayon Questionnaires de la Bibliothèque n'offrait que le catalogue en code.
Un praticien peut désormais créer ou importer un questionnaire **privé à son
cabinet**, complet d'emblée : définition (sections, questions likert, échelles
nommées) et grille de score avec bandes d'interprétation.

- **Jamais certifié automatiquement.** Un instrument du cabinet naît en
  brouillon et porte le badge « Cabinet — non certifié » à vie. Il ne devient
  assignable qu'au bout d'un cycle explicite : demande de relecture → écran
  « Relire la grille » (échelle, bandes, score max) → « Grille relue —
  publier ». Toute modification de la définition ou de la grille le repasse
  en brouillon.
- **Table nouvelle `cabinet_instruments`** (migration additive
  `20260723230000_cabinet_instruments_v1`, RLS deny-all, pas de FK praticien —
  le praticien n'existe que par l'email de session). Ids `CAB_xxx`.
- **Scoring restreint par construction** : seuls `sum`, `sum_reversed` et
  `count_threshold` sont admis à la validation — le moteur de score n'a aucun
  catch-all, tout autre type casserait la soumission patient. Bandes
  d'interprétation contiguës, croissantes, couvrant tout l'intervalle
  possible ; `maxTotal` dérivé à la validation, jamais saisi.
- **Resolver commun** `@/lib/instruments` (`resolveDefinition`) : le chemin
  patient (rendu + soumission) et l'aperçu praticien ne distinguent plus
  catalogue et cabinet. Un CAB non publié n'est JAMAIS servi au patient
  (écran « pas encore disponible ») ; seul son praticien le prévisualise.
  File d'envoi : `idsAssignablesPour` = catalogue ∪ CAB publiés du praticien ;
  un CAB dépublié entre l'ajout et l'envoi est filtré à l'envoi.
- **Import JSON/CSV** : shape simple (questions + échelle nommée
  `frequence_0_4` / `intensite_0_3` / `oui_non`) ou complète ; sans grille
  fournie, bande unique « Grille à définir — relecture requise » (warning) et
  avertissement explicite. Le résultat entre toujours en brouillon.
- **Cycle de vie gelé pendant les envois en cours** : la définition et la
  grille d'un instrument sont VERROUILLÉES (409) tant qu'une assignation non
  verrouillée le référence — même garde pour la demande de relecture, qui
  n'est par ailleurs légale que depuis un brouillon (plus de dépublication
  silencieuse). La désactivation reste permise à tout moment : elle ne bloque
  que les nouveaux envois.
- **Passation protégée** : le chemin patient résout l'instrument en mode
  passation — l'assignation fait autorité, un envoi déjà parti est rendu et
  scoré par la grille envoyée même si l'instrument a été désactivé ou
  dépublié entre-temps. Submit défensif, réservé aux ids `CAB_` : sans
  définition résolue, réponse 409 explicite, AUCUNE persistance ni
  verrouillage (plus de perte clinique silencieuse). Les questionnaires
  fonctionnels sans définition au catalogue (Q_PLAINTES, Q_ALI_01…)
  conservent leur flux historique — réponses brutes persistées sans score —
  épinglé par un test. Les instruments du cabinet exigent des réponses
  COMPLÈTES (400 sinon) : le moteur de somme ignore les items omis, ce qui
  fausserait les bandes sur une échelle à minimum non nul.
- **Cloisonnement praticien** : l'aperçu d'un instrument du cabinet exige la
  propriété quel que soit son statut, publié compris ; création et import
  refusent (409) un titre déjà porté par un instrument actif du cabinet ; la
  file d'envoi marque « Indisponible » les items dépubliés ou désactivés au
  lieu de les faire disparaître à l'envoi.
- **Logique clinique — chemin de scoring patient refactoré** : la fonction
  `calculateScore` de `web/src/lib/questions.ts` a été scindée par extraction
  mécanique en `computeScoreFromDef(def, answers)` (le corps intégral après le
  lookup catalogue, à l'identique) + un délégué `calculateScore` inchangé.
  **Aucun changement de comportement pour les instruments du catalogue** :
  le banc `scripts/check_questionnaire_certification.js` (63 questionnaires,
  fixtures certifiées) et les suites de scoring restent verts.
