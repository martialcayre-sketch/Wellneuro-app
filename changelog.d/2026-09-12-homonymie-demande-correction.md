### Deux « demandes de correction » qui portaient le même nom — l'ancienne se nomme enfin

Le cockpit en compte deux, et elles n'ont ni le même objet, ni le même remède,
ni la même phase. **Questionnaire** : le patient veut revenir sur ses réponses,
le praticien débloque, en phase Patient. **Objectif** : le patient veut qu'on
reprenne le texte de son objectif, le praticien reformule, en phase
Compréhension. Envoyer le praticien au mauvais endroit lui fait faire le mauvais
geste.

`D-170` avait chargé le suffixe `_objectif` de toute la distinction — c'est-à-
dire la famille **neuve**. **C'était le mauvais côté.** Nommer l'objet du seul
bandeau neuf laisse l'ancien dire « demande de correction » tout court, et c'est
l'ancien qu'un praticien lit depuis des mois comme non ambigu.

Trois surfaces le faisaient, et la pire n'était pas celle qu'on surveillait : le
**pré-vol du Copilote** affichait « Demande de correction du patient » sous une
puce nommant la **voix** — « Patient » — là où ses six voisines nomment l'objet
(Questionnaire, Point d'étape, Épisode, Protocole, Diffusion, Signalement).
Depuis la mise en service du quatrième verbe, cette ligne pouvait se lire comme
l'une ou l'autre des deux demandes.

**Les deux familles nomment désormais la leur.** Côté questionnaire :
`demande_correction_questionnaire`, une puce « Questionnaire », et des bandeaux
qui disent « de questionnaire ». Côté objectif : le suffixe `_objectif`,
inchangé. Le jeton nu `demande_correction` reste réservé à la route du portail,
dont l'objet unique **est** l'objectif.

**La rechute est fermée par une garde, pas par une consigne.**
`homonymieDemandeCorrection.guard.test.ts` tient deux règles — le jeton nu
n'existe que dans la famille objectif, et aucune formule « demande de
correction » écrite au praticien ne tait son objet — avec l'anti-vacuité qui
empêche qu'un renommage de fichier la rende verte et creuse. **Dix mutations
jouées, dix mutants tués**, dont deux contre la garde elle-même.

Le patient, lui, n'est pas touché : il rencontre chacune des deux dans un écran
qui ne parle que d'elle, et renommer ses boutons aurait été du bruit.
